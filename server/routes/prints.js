const express = require("express");
const router = express.Router();
const Print = require("../models/print");
const PrintChangeLog = require("../models/printChangeLog");
const User = require("../models/user");
const { check, validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { uploadToAzure, deleteBlob, generateSasUrl } = require("../azure-blob");
const { v4: uuidv4 } = require("uuid");

// Helper function to resolve container name based on size
function resolveContainer(size) {
  const map = {
    "11x14": "11x14-images",
    "11x14C": "11x14c-images",
    "16x20": "16x20-images",
  };
  return map[size] || null;
}

function getBlobExtension(base64Data) {
    if (base64Data.startsWith('data:image/png')) return 'png';
    if (base64Data.startsWith('data:image/webp')) return 'webp';
    return 'jpg';
}

async function logPrintChange({ action, catalogNumber, description, req }) {
  const changedBy = req.session?.email || req.body?.changed_by || req.body?.email || "System";

  await PrintChangeLog.create({
    action,
    print_catalog_number: catalogNumber,
    description,
    changed_by: changedBy,
  });
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "(empty)";
  return String(value);
}

const BULK_REQUIRED_FIELDS = ["status", "catalog_number", "artist", "date", "size"];
const BULK_STATUS_VALUES = ["Available", "Sold", "Unavailable"];
const BULK_SIZE_VALUES = ["11x14", "16x20", "11x14C"];

function sanitizeBulkValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeOptionalBulkValue(value) {
  const sanitized = sanitizeBulkValue(value);
  return sanitized ? sanitized : null;
}

function normalizeBulkRow(row = {}) {
  return {
    status: sanitizeBulkValue(row.status),
    catalog_number: sanitizeBulkValue(row.catalog_number),
    artist: sanitizeBulkValue(row.artist),
    date: sanitizeBulkValue(row.date),
    size: sanitizeBulkValue(row.size),
    location: normalizeOptionalBulkValue(row.location),
    instrument: normalizeOptionalBulkValue(row.instrument),
    notes: normalizeOptionalBulkValue(row.notes),
    date_sold: normalizeOptionalBulkValue(row.date_sold),
  };
}

async function validateBulkRows(rows = []) {
  const normalizedRows = rows.map((row, index) => ({
    rowNumber: Number.isInteger(row?.rowNumber) ? row.rowNumber : index + 2,
    data: normalizeBulkRow(row?.data || row),
  }));

  const catalogNumbers = normalizedRows
    .map((row) => row.data.catalog_number)
    .filter(Boolean);

  const catalogCounts = catalogNumbers.reduce((counts, catalogNumber) => {
    counts[catalogNumber] = (counts[catalogNumber] || 0) + 1;
    return counts;
  }, {});

  const duplicateCatalogNumbers = new Set(
    Object.entries(catalogCounts)
      .filter(([, count]) => count > 1)
      .map(([catalogNumber]) => catalogNumber),
  );

  const existingPrints = catalogNumbers.length
    ? await Print.findAll({
        where: {
          catalog_number: {
            [Op.in]: catalogNumbers,
          },
        },
        attributes: ["catalog_number"],
      })
    : [];

  const existingCatalogNumbers = new Set(
    existingPrints.map((print) => print.catalog_number),
  );

  const validatedRows = normalizedRows.map((row) => {
    const issues = [];
    const { data } = row;

    BULK_REQUIRED_FIELDS.forEach((field) => {
      if (!data[field]) {
        issues.push(`${field.replace("_", " ")} is required.`);
      }
    });

    if (data.status && !BULK_STATUS_VALUES.includes(data.status)) {
      issues.push(`status must be one of: ${BULK_STATUS_VALUES.join(", ")}.`);
    }

    if (data.size && !BULK_SIZE_VALUES.includes(data.size)) {
      issues.push(`size must be one of: ${BULK_SIZE_VALUES.join(", ")}.`);
    }

    if (data.catalog_number && duplicateCatalogNumbers.has(data.catalog_number)) {
      issues.push("catalog number appears more than once in this file.");
    }

    if (data.catalog_number && existingCatalogNumbers.has(data.catalog_number)) {
      issues.push("catalog number already exists in the archive.");
    }

    if (data.status !== "Sold" && data.date_sold) {
      issues.push("date sold should only be set when status is Sold.");
    }

    return {
      rowNumber: row.rowNumber,
      data,
      issues,
      canImport: issues.length === 0,
    };
  });

  const validRows = validatedRows.filter((row) => row.canImport).length;

  return {
    rows: validatedRows,
    summary: {
      totalRows: validatedRows.length,
      validRows,
      invalidRows: validatedRows.length - validRows,
    },
  };
}

// Get All Prints
router.get("/all", async (req, res, next) => {
  try {
    const allPrints = await Print.findAll();
    const count = await Print.count();

    // Attach SAS URLs to prints with images
    const printsWithSas = allPrints.map((print) => {
        if (print.blob_name) {
          const containerName = resolveContainer(print.size);
          return {
            ...print.toJSON(),
            image: generateSasUrl(containerName, print.blob_name),
          }
        }
        return print.toJSON();
      });

    res.status(200).json({ count, allPrints: printsWithSas });
  } catch (error) {
    console.error('Error fetching prints:', error.message || error);
    next(error);
  }
});

// Add a Print
router.post(
  "/",
  [
    check("catalog_number")
      .not()
      .isEmpty()
      .trim()
      .withMessage("Catalog # is Required"),
    check("artist").not().isEmpty().trim().withMessage("Artist is Required"),
    check("date").not().isEmpty().trim().withMessage("Date is required"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty())
      return res.status(400).json({ error: errors.array() });

    try {
      let imageUrl = null;
      let blobName = null;

      if (req.body.image) {
        const containerName = resolveContainer(req.body.size);
        if (!containerName)
          return res.status(400).json({ error: "Invalid image size" });

        const ext = getBlobExtension(req.body.image);
        blobName = `${uuidv4()}.${ext}`;
        imageUrl = await uploadToAzure(containerName, blobName, req.body.image);
      }

      const newPrint = await Print.create({
        status: req.body.status,
        catalog_number: req.body.catalog_number,
        artist: req.body.artist,
        image: imageUrl ? imageUrl : null,
        blob_name: blobName,
        date: req.body.date,
        size: req.body.size,
        location: req.body.location,
        instrument: req.body.instrument,
        notes: req.body.notes,
        date_sold: req.body.date_sold,
      });

      await logPrintChange({
        action: "CREATE",
        catalogNumber: newPrint.catalog_number,
        description: `Created print ${newPrint.catalog_number} for ${newPrint.artist} with status ${newPrint.status} and size ${newPrint.size}.`,
        req,
      });

      res.status(200).json(newPrint);
    } catch (error) {
      console.error("Error adding print", error);
      next(error);
    }
  },
);

router.post("/bulk/validate", async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

    if (!rows.length) {
      return res.status(400).json({
        message: "Provide at least one row to validate.",
        rows: [],
        summary: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
        },
      });
    }

    const validation = await validateBulkRows(rows);
    res.status(200).json(validation);
  } catch (error) {
    console.error("Error validating bulk upload", error);
    next(error);
  }
});

router.post("/bulk/import", async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

    if (!rows.length) {
      return res.status(400).json({
        message: "Provide at least one reviewed row to import.",
      });
    }

    const validation = await validateBulkRows(rows);
    const invalidRows = validation.rows.filter((row) => !row.canImport);

    if (invalidRows.length) {
      return res.status(400).json({
        message: "Resolve validation issues before importing.",
        ...validation,
      });
    }

    const importedCatalogNumbers = [];

    for (const row of validation.rows) {
      const createdPrint = await Print.create({
        ...row.data,
        image: null,
        blob_name: null,
      });

      importedCatalogNumbers.push(createdPrint.catalog_number);

      await logPrintChange({
        action: "CREATE",
        catalogNumber: createdPrint.catalog_number,
        description: `Bulk imported print ${createdPrint.catalog_number} for ${createdPrint.artist} with status ${createdPrint.status} and size ${createdPrint.size}.`,
        req,
      });
    }

    res.status(201).json({
      message: `Imported ${importedCatalogNumbers.length} prints successfully.`,
      importedCount: importedCatalogNumbers.length,
      importedCatalogNumbers,
    });
  } catch (error) {
    console.error("Error importing bulk upload", error);
    next(error);
  }
});

// Get Recent Print Change Log
router.get("/change-log", async (req, res, next) => {
  try {
    const { action, user, catalog, from, to } = req.query;
    const where = {};

    if (action && action !== "ALL") {
      where.action = action;
    }

    if (user) {
      where.changed_by = { [Op.like]: `%${user}%` };
    }

    if (catalog) {
      where.print_catalog_number = { [Op.like]: `%${catalog}%` };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) {
        const inclusiveEnd = new Date(to);
        inclusiveEnd.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = inclusiveEnd;
      }
    }

    const logs = await PrintChangeLog.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 200,
    });

    const userEmails = [...new Set(logs.map((log) => log.changed_by).filter((value) => value && value.includes("@")))];
    const users = await User.findAll({
      where: {
        email: {
          [Op.in]: userEmails,
        },
      },
      attributes: ["email", "first_name", "last_name"],
    });

    const userByEmail = new Map(
      users.map((user) => [
        user.email,
        `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown User",
      ]),
    );

    const formattedLogs = logs.map((log) => {
      const email = log.changed_by && log.changed_by.includes("@") ? log.changed_by : "N/A";
      const name = email !== "N/A" ? userByEmail.get(email) || "Unknown User" : "System";

      return {
        ...log.toJSON(),
        action: String(log.action || "").toLowerCase(),
        changed_by_name: name,
        changed_by_email: email,
      };
    });

    res.status(200).json(formattedLogs);
  } catch (error) {
    console.error("Error fetching change log", error);
    next(error);
  }
});

// Delete a Print
router.delete("/:catalogNumber", async (req, res, next) => {
  try {
    const print = await Print.findOne({
      where: {
        catalog_number: req.params.catalogNumber,
      },
    });

    if (!print) {
      return res.status(404).json({
        error: `No print found with catalog number ${req.params.catalogNumber}`,
      });
    }

    // If print had image, delete from Azure Blob Storage
    if (print.image) {
      const imageUrl = new URL(print.image);
      const containerName = imageUrl.pathname.split("/")[1];
      await deleteBlob(containerName, print.blob_name);
    }

    const deletedCatalog = print.catalog_number;
    const deletedArtist = print.artist;

    await print.destroy();

    await logPrintChange({
      action: "DELETE",
      catalogNumber: deletedCatalog,
      description: `Deleted print ${deletedCatalog} for ${deletedArtist}.`,
      req,
    });

    const allPrints = await Print.findAll();
    const count = await Print.count();
    res.status(200).json({
      message: "Print deleted successfully!",
      current_prints: { count, allPrints },
    });
  } catch (error) {
    console.error("Internal Server Error", error);
    next(error);
  }
});

// Update a Print
router.put("/update/:catalogNumber", async (req, res, next) => {
  try {
    const print = await Print.findOne({
      where: {
        catalog_number: req.params.catalogNumber,
      },
    });

    if (!print) {
      return res.status(404).json({
        error: `No print found with catalog number: ${req.params.catalogNumber}`,
      });
    }

    const previousPrintData = print.toJSON();
    let imageUrl = print.image;
    let blobName = print.blob_name;

    const isNewImage = req.body.image && req.body.image.startsWith('data:image');

    if (req.body.removeImage && print.blob_name) {
      // User explicitly removed the image in the edit form
      const containerName = resolveContainer(print.size);
      if (containerName) {
        await deleteBlob(containerName, print.blob_name);
      }
      imageUrl = null;
      blobName = null;
    } else if (isNewImage) {
      const containerName = resolveContainer(req.body.size || print.size);
      if (!containerName) {
        return res.status(400).json({ error: "Invalid image size" });
      }

      const ext = getBlobExtension(req.body.image);
      const newBlobName = `${uuidv4()}.${ext}`;
      imageUrl = await uploadToAzure(
        containerName,
        newBlobName,
        req.body.image,
      );
      blobName = newBlobName;

      // Delete Old Image
      if (print.blob_name) {
        const oldContainerName = resolveContainer(print.size);
        if (oldContainerName) {
          await deleteBlob(oldContainerName, print.blob_name);
        }
      }
    }

    await print.update({
      status: req.body.status,
      catalog_number: req.body.catalog_number,
      artist: req.body.artist,
      image: imageUrl,
      blob_name: blobName,
      date: req.body.date,
      size: req.body.size,
      location: req.body.location,
      instrument: req.body.instrument,
      notes: req.body.notes,
      date_sold: req.body.date_sold,
    });

    const changedFields = [];
    const comparableFields = [
      "status",
      "catalog_number",
      "artist",
      "date",
      "size",
      "location",
      "instrument",
      "notes",
      "date_sold",
    ];

    comparableFields.forEach((field) => {
      if (previousPrintData[field] !== print[field]) {
        const fieldName = field.replace("_", " ");
        changedFields.push(
          `${fieldName}: ${formatValue(previousPrintData[field])} -> ${formatValue(print[field])}`,
        );
      }
    });

    if (req.body.removeImage) {
      changedFields.push("image: present -> removed");
    } else if (isNewImage) {
      changedFields.push(
        previousPrintData.blob_name ? "image: replaced" : "image: added",
      );
    }

    const description = changedFields.length
      ? `Updated print ${print.catalog_number}. Changes: ${changedFields.join("; ")}.`
      : `Updated print ${print.catalog_number}: no visible field changes.`;

    await logPrintChange({
      action: "UPDATE",
      catalogNumber: print.catalog_number,
      description,
      req,
    });
    

    res.status(200).json(print);
  } catch (error) {
    console.error("Error updating print", error);
    next(error);
  }
});

module.exports = router;
