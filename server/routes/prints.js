const express = require("express");
const router = express.Router();
const Print = require("../models/print");
const PrintChangeLog = require("../models/printChangeLog");
const User = require("../models/user");
const { check, validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { uploadToAzure, deleteBlob, generateSasUrl } = require("../azure-blob");
const { v4: uuidv4 } = require("uuid");
const { requireAuth } = require("../middleware/requireAuth");
const { convertWordToPdfDataUrl } = require("../utils/certificate-converter");

function resolveContainer(size) {
  const map = {
    "11x14": "11x14-images",
    "11x14C": "11x14c-images",
    "16x20": "16x20-images",
  };
  return map[size] || null;
}

const CERTIFICATE_CONTAINER = "print-certificates";

function isWordDataUrl(value = "") {
  return (
    typeof value === "string" &&
    (value.startsWith("data:application/msword") ||
      value.startsWith(
        "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ))
  );
}

function getBlobExtension(base64Data) {
  if (base64Data.startsWith("data:application/pdf")) return "pdf";
  if (base64Data.startsWith("data:image/png")) return "png";
  if (base64Data.startsWith("data:image/webp")) return "webp";
  return "jpg";
}

async function logPrintChange({ action, catalogNumber, description, req }) {
  const changedBy =
    req.auth?.email || req.body?.changed_by || req.body?.email || "System";

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

router.use(requireAuth);

router.get("/all", async (req, res, next) => {
  try {
    const allPrints = await Print.findAll();
    const count = await Print.count();

    const printsWithSas = allPrints.map((print) => {
      const payload = print.toJSON();

      if (print.blob_name) {
        const containerName = resolveContainer(print.size);
        if (containerName) {
          payload.image = generateSasUrl(containerName, print.blob_name);
        }
      }

      if (print.certificate_blob_name) {
        payload.certificate = generateSasUrl(
          CERTIFICATE_CONTAINER,
          print.certificate_blob_name,
        );
      }

      return payload;
    });

    res.status(200).json({ count, allPrints: printsWithSas });
  } catch (error) {
    console.error("Error fetching prints:", error.message || error);
    next(error);
  }
});

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
      let certificateUrl = null;
      let certificateBlobName = null;

      if (req.body.image) {
        const containerName = resolveContainer(req.body.size);
        if (!containerName) {
          return res.status(400).json({ error: "Invalid image size" });
        }

        const ext = getBlobExtension(req.body.image);
        blobName = `${uuidv4()}.${ext}`;
        imageUrl = await uploadToAzure(containerName, blobName, req.body.image);
      }

      if (req.body.certificate) {
        const certExt = getBlobExtension(req.body.certificate);
        certificateBlobName = `cert-${uuidv4()}.${certExt}`;
        certificateUrl = await uploadToAzure(
          CERTIFICATE_CONTAINER,
          certificateBlobName,
          req.body.certificate,
        );
      }

      const newPrint = await Print.create({
        status: req.body.status,
        catalog_number: req.body.catalog_number,
        artist: req.body.artist,
        image: imageUrl,
        blob_name: blobName,
        certificate: certificateUrl,
        certificate_blob_name: certificateBlobName,
        date: req.body.date,
        size: req.body.size,
        location: req.body.location,
        instrument: req.body.instrument,
        notes: req.body.notes,
        date_sold: req.body.date_sold,
        category: req.body.category || null,
        signed: req.body.signed === true || req.body.signed === "true",
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

    const userEmails = [
      ...new Set(
        logs
          .map((log) => log.changed_by)
          .filter((value) => value && value.includes("@")),
      ),
    ];

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
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          "Unknown User",
      ]),
    );

    const formattedLogs = logs.map((log) => {
      const email =
        log.changed_by && log.changed_by.includes("@") ? log.changed_by : "N/A";
      const name =
        email !== "N/A" ? userByEmail.get(email) || "Unknown User" : "System";

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

    if (print.blob_name) {
      const containerName = resolveContainer(print.size);
      if (containerName) {
        await deleteBlob(containerName, print.blob_name);
      }
    }

    if (print.certificate_blob_name) {
      await deleteBlob(CERTIFICATE_CONTAINER, print.certificate_blob_name);
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
    let certificateUrl = print.certificate;
    let certificateBlobName = print.certificate_blob_name;

    const isNewImage =
      req.body.image && req.body.image.startsWith("data:image");
    const isNewCertificate =
      req.body.certificate && req.body.certificate.startsWith("data:");

    if (req.body.removeImage && print.blob_name) {
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

      if (print.blob_name) {
        const oldContainerName = resolveContainer(print.size);
        if (oldContainerName) {
          await deleteBlob(oldContainerName, print.blob_name);
        }
      }
    }

    if (req.body.removeCertificate && print.certificate_blob_name) {
      await deleteBlob(CERTIFICATE_CONTAINER, print.certificate_blob_name);
      certificateUrl = null;
      certificateBlobName = null;
    } else if (isNewCertificate) {
      let certificateContent = req.body.certificate;
      let certExt = getBlobExtension(certificateContent);

      if (isWordDataUrl(certificateContent)) {
        certificateContent = await convertWordToPdfDataUrl({
          fileName:
            req.body.certificateFileName ||
            `${print.catalog_number || "certificate"}.docx`,
          content: certificateContent,
        });
        certExt = "pdf";
      }

      const newCertificateBlobName = `cert-${uuidv4()}.${certExt}`;
      certificateUrl = await uploadToAzure(
        CERTIFICATE_CONTAINER,
        newCertificateBlobName,
        certificateContent,
      );
      certificateBlobName = newCertificateBlobName;

      if (print.certificate_blob_name) {
        await deleteBlob(CERTIFICATE_CONTAINER, print.certificate_blob_name);
      }
    }

    await print.update({
      status: req.body.status,
      catalog_number: req.body.catalog_number,
      artist: req.body.artist,
      image: imageUrl,
      blob_name: blobName,
      certificate: certificateUrl,
      certificate_blob_name: certificateBlobName,
      date: req.body.date,
      size: req.body.size,
      location: req.body.location,
      instrument: req.body.instrument,
      notes: req.body.notes,
      date_sold: req.body.date_sold,
      category:
        req.body.category !== undefined
          ? req.body.category || null
          : print.category,
      signed:
        req.body.signed !== undefined
          ? req.body.signed === true || req.body.signed === "true"
          : print.signed,
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
      "category",
      "signed",
    ];

    comparableFields.forEach((field) => {
      if (previousPrintData[field] !== print[field]) {
        const fieldName = field.replace("_", " ");
        changedFields.push(
          `${fieldName}: ${formatValue(previousPrintData[field])} -> ${formatValue(
            print[field],
          )}`,
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

    if (req.body.removeCertificate) {
      changedFields.push("certificate: present -> removed");
    } else if (isNewCertificate) {
      changedFields.push(
        previousPrintData.certificate_blob_name
          ? "certificate: replaced"
          : "certificate: added",
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
