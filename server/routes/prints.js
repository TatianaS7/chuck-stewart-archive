const express = require("express");
const router = express.Router();
const Print = require("../models/print");
const PrintChangeLog = require("../models/printChangeLog");
const User = require("../models/user");
const { check, validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { uploadToAzure, deleteBlob, generateSasUrl } = require("../azure-blob");
const { v4: uuidv4 } = require("uuid");

function resolveContainer(size) {
  const map = {
    "11x14": "11x14-images",
    "11x14C": "11x14c-images",
    "16x20": "16x20-images",
  };
  return map[size] || null;
}

const CERTIFICATE_CONTAINER = "print-certificates";

function getBlobExtension(base64Data) {
  if (base64Data.startsWith("data:application/pdf")) return "pdf";
  if (base64Data.startsWith("data:image/png")) return "png";
  if (base64Data.startsWith("data:image/webp")) return "webp";
  return "jpg";
}

async function logPrintChange({ action, catalogNumber, description, req }) {
  const changedBy =
    req.session?.email || req.body?.changed_by || req.body?.email || "System";

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

const BULK_REQUIRED_FIELDS = [
  "status",
  "catalog_number",
  "artist",
  "date",
  "size",
];
const BULK_STATUS_VALUES = ["Available", "Sold", "Unavailable"];
const BULK_SIZE_VALUES = ["11x14", "16x20", "11x14C"];
const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
];
const WORD_EXTENSIONS = ["doc", "docx"];
const YEAR_TOKEN_REGEX = /^19\d{2}$/;
const SIZE_TOKEN_REGEX = /^(11x14c?|16x20|11x14)$/;

function getFileExtension(fileName = "") {
  const parts = String(fileName).toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function getFileBaseName(fileName = "") {
  return String(fileName)
    .replace(/\.[^.]+$/, "")
    .trim();
}

function normalizeCatalogMatchValue(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenizeCatalogMatchValue(value = "") {
  const normalized = normalizeCatalogMatchValue(value);
  return normalized ? normalized.split(/\s+/) : [];
}

function findCatalogMatchAtPositions(
  catalogEntries,
  fileTokens,
  positions,
  predicate,
) {
  for (const position of positions) {
    for (const entry of catalogEntries) {
      if (predicate && !predicate(entry)) {
        continue;
      }

      if (position + entry.catalogTokens.length > fileTokens.length) {
        continue;
      }

      const isMatch = entry.catalogTokens.every(
        (token, tokenIndex) => fileTokens[position + tokenIndex] === token,
      );

      if (isMatch) {
        return entry.catalog_number;
      }
    }
  }

  return null;
}

function buildCatalogMatcher(prints = []) {
  const catalogEntries = prints
    .map((print) => {
      const catalogTokens = tokenizeCatalogMatchValue(print.catalog_number);

      return {
        catalog_number: print.catalog_number,
        catalogTokens,
        compactCatalog: catalogTokens.join(""),
      };
    })
    .filter((entry) => entry.catalogTokens.length)
    .sort((left, right) => {
      if (right.catalogTokens.length !== left.catalogTokens.length) {
        return right.catalogTokens.length - left.catalogTokens.length;
      }

      return right.compactCatalog.length - left.compactCatalog.length;
    });

  return (fileName = "") => {
    const fileBaseName = getFileBaseName(fileName);
    const fileTokens = tokenizeCatalogMatchValue(fileBaseName);
    const reviewNotes = [];

    if (!fileTokens.length) {
      return {
        catalogNumber: null,
        reviewNotes,
      };
    }

    const yearIndex = fileTokens.findIndex((token) =>
      YEAR_TOKEN_REGEX.test(token),
    );
    const positionsAfterYear = [];
    const allPositions = [];

    for (let index = 0; index < fileTokens.length; index += 1) {
      allPositions.push(index);

      if (yearIndex >= 0 && index > yearIndex) {
        positionsAfterYear.push(index);
      }
    }

    if (yearIndex === -1) {
      reviewNotes.push(
        "Could not find a 19xx year in the file name. Catalog matching used fallback parsing.",
      );
    }

    if (
      fileTokens.some(
        (token, index) => index > yearIndex && SIZE_TOKEN_REGEX.test(token),
      )
    ) {
      reviewNotes.push(
        "File name includes a size token after the year. Review the matched catalog number before upload.",
      );
    }

    const leadingZeroMatch =
      yearIndex >= 0
        ? findCatalogMatchAtPositions(
            catalogEntries,
            fileTokens,
            positionsAfterYear,
            (entry) => entry.catalogTokens[0]?.startsWith("0"),
          )
        : null;

    if (leadingZeroMatch) {
      return {
        catalogNumber: leadingZeroMatch,
        reviewNotes,
      };
    }

    const postYearMatch =
      yearIndex >= 0
        ? findCatalogMatchAtPositions(
            catalogEntries,
            fileTokens,
            positionsAfterYear,
          )
        : null;

    if (postYearMatch) {
      reviewNotes.push(
        "Matched a catalog number after the year, but it did not follow the usual leading-zero pattern.",
      );
      return {
        catalogNumber: postYearMatch,
        reviewNotes,
      };
    }

    const fallbackPositionMatch = findCatalogMatchAtPositions(
      catalogEntries,
      fileTokens,
      allPositions,
    );

    if (fallbackPositionMatch) {
      reviewNotes.push(
        "Matched the catalog number outside the expected position after the year. Review before upload.",
      );
      return {
        catalogNumber: fallbackPositionMatch,
        reviewNotes,
      };
    }

    const compactFileName = fileTokens.join("");
    const compactMatch = catalogEntries.find(
      (entry) =>
        entry.compactCatalog && compactFileName.includes(entry.compactCatalog),
    );

    if (compactMatch) {
      reviewNotes.push(
        "Matched the catalog number using compact fallback parsing. Review before upload.",
      );
    }

    return {
      catalogNumber: compactMatch ? compactMatch.catalog_number : null,
      reviewNotes,
    };
  };
}

function countDuplicates(values = []) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

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
    category: normalizeOptionalBulkValue(row.category),
    signed:
      row.signed === true ||
      ["true", "yes", "1"].includes(String(row.signed).toLowerCase()),
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
      issues.push(`Status must be one of: ${BULK_STATUS_VALUES.join(", ")}.`);
    }

    if (data.size && !BULK_SIZE_VALUES.includes(data.size)) {
      issues.push(`Size must be one of: ${BULK_SIZE_VALUES.join(", ")}.`);
    }

    if (
      data.catalog_number &&
      duplicateCatalogNumbers.has(data.catalog_number)
    ) {
      issues.push("Catalog number appears more than once in this file.");
    }

    if (
      data.catalog_number &&
      existingCatalogNumbers.has(data.catalog_number)
    ) {
      issues.push("Catalog number already exists in the archive.");
    }

    if (data.status !== "Sold" && data.date_sold) {
      issues.push("Date sold should only be set when status is Sold.");
    }

    if (data.category && !["Musicians", "Other"].includes(data.category)) {
      issues.push("Category must be one of: Musicians, Other.");
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
      duplicateFileCatalogs: duplicateCatalogNumbers.size,
      existingCatalogDuplicates: existingCatalogNumbers.size,
    },
  };
}

async function validateBulkAssetFiles(assetType, files = []) {
  const matchingPrints = await Print.findAll({
    attributes: [
      "catalog_number",
      "size",
      "blob_name",
      "certificate_blob_name",
    ],
  });

  const matchCatalogNumber = buildCatalogMatcher(matchingPrints);

  const normalizedFiles = files.map((file, index) => {
    const matchResult = matchCatalogNumber(file?.fileName || file?.name || "");

    return {
      rowNumber: Number.isInteger(file?.rowNumber) ? file.rowNumber : index + 1,
      fileName: String(file?.fileName || file?.name || "").trim(),
      content: file?.content || null,
      catalogNumber: matchResult.catalogNumber,
      reviewNotes: matchResult.reviewNotes,
    };
  });

  const catalogNumbers = normalizedFiles
    .map((file) => file.catalogNumber)
    .filter(Boolean);

  const fileNames = normalizedFiles
    .map((file) => file.fileName)
    .filter(Boolean);
  const duplicateCatalogCounts = countDuplicates(catalogNumbers);
  const duplicateFileNameCounts = countDuplicates(fileNames);

  const duplicateCatalogNumbers = new Set(
    Object.entries(duplicateCatalogCounts)
      .filter(([, count]) => count > 1)
      .map(([catalogNumber]) => catalogNumber),
  );

  const duplicateFileNames = new Set(
    Object.entries(duplicateFileNameCounts)
      .filter(([, count]) => count > 1)
      .map(([fileName]) => fileName),
  );

  const printByCatalogNumber = new Map(
    matchingPrints.map((print) => [print.catalog_number, print]),
  );

  const rows = normalizedFiles.map((file) => {
    const catalogNumber = file.catalogNumber;
    const fileExtension = getFileExtension(file.fileName);
    const matchingPrint = printByCatalogNumber.get(catalogNumber);
    const issues = [];
    const reviewNotes = [...(file.reviewNotes || [])];

    if (!file.fileName) {
      issues.push("File name is required.");
    }

    if (!catalogNumber) {
      if (assetType === "images") {
        reviewNotes.push(
          "Could not match any existing catalog number from the file name. This file can be reviewed and uploaded later after a matching print record exists.",
        );
      } else {
        issues.push(
          "Could not match any existing catalog number from the file name.",
        );
      }
    }

    if (catalogNumber && duplicateCatalogNumbers.has(catalogNumber)) {
      issues.push(
        "Catalog number appears more than once in the selected folder.",
      );
    }

    if (file.fileName && duplicateFileNames.has(file.fileName)) {
      issues.push("File name appears more than once in the selected folder.");
    }

    if (!matchingPrint) {
      if (assetType === "images") {
        reviewNotes.push(
          "No matching print found for this catalog number. This image will be skipped until a matching print record exists.",
        );
      } else {
        issues.push("No matching print found for this catalog number.");
      }
    }

    if (assetType === "images") {
      if (!IMAGE_EXTENSIONS.includes(fileExtension)) {
        issues.push(
          "Image files must be jpg, jpeg, png, webp, gif, bmp, tif, or tiff.",
        );
      }

      if (matchingPrint?.blob_name) {
        issues.push("Print already has an image associated with it.");
      }
    }

    if (assetType === "certificates") {
      if (WORD_EXTENSIONS.includes(fileExtension)) {
        issues.push("Word files must be converted to PDF before upload.");
      } else if (fileExtension !== "pdf") {
        issues.push("Certificate files must be PDF.");
      }

      if (matchingPrint?.certificate_blob_name) {
        issues.push("Print already has a certificate associated with it.");
      }
    }

    return {
      rowNumber: file.rowNumber,
      fileName: file.fileName,
      catalogNumber,
      assetType,
      issues,
      reviewNotes,
      canImport: issues.length === 0,
    };
  });

  const validFiles = rows.filter((row) => row.canImport).length;
  const missingPrints = rows.filter((row) =>
    row.issues.includes("No matching print found for this catalog number."),
  ).length;
  const duplicateCatalogEntries = rows.filter((row) =>
    row.issues.includes(
      "Catalog number appears more than once in the selected folder.",
    ),
  ).length;
  const duplicateFileEntries = rows.filter((row) =>
    row.issues.includes(
      "File name appears more than once in the selected folder.",
    ),
  ).length;
  const existingAssetDuplicates = rows.filter((row) =>
    row.issues.some((issue) => issue.includes("already has")),
  ).length;
  const conversionRequired = rows.filter((row) =>
    row.issues.includes("Word files must be converted to PDF before upload."),
  ).length;
  const reviewFlaggedFiles = rows.filter(
    (row) => row.reviewNotes?.length,
  ).length;
  const unmatchedFiles = rows.filter(
    (row) =>
      !row.catalogNumber ||
      row.issues.includes("No matching print found for this catalog number."),
  ).length;

  return {
    rows,
    summary: {
      totalFiles: rows.length,
      validFiles,
      invalidFiles: rows.length - validFiles,
      duplicateCatalogEntries,
      duplicateFileEntries,
      existingAssetDuplicates,
      missingPrints,
      conversionRequired,
      reviewFlaggedFiles,
      unmatchedFiles,
    },
  };
}

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

router.post("/bulk/assets/validate", async (req, res, next) => {
  try {
    const assetType = req.body?.assetType;
    const files = Array.isArray(req.body?.files) ? req.body.files : [];

    if (!["images", "certificates"].includes(assetType)) {
      return res.status(400).json({
        message: "assetType must be either images or certificates.",
      });
    }

    if (!files.length) {
      return res.status(400).json({
        message: "Provide at least one file to validate.",
        rows: [],
        summary: {
          totalFiles: 0,
          validFiles: 0,
          invalidFiles: 0,
          duplicateCatalogEntries: 0,
          duplicateFileEntries: 0,
          existingAssetDuplicates: 0,
          missingPrints: 0,
          conversionRequired: 0,
        },
      });
    }

    const validation = await validateBulkAssetFiles(assetType, files);
    res.status(200).json(validation);
  } catch (error) {
    console.error("Error validating bulk assets", error);
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
    let skippedCount = 0;
    const skippedFiles = [];

    for (const row of validation.rows) {
      const createdPrint = await Print.create({
        ...row.data,
        image: null,
        blob_name: null,
        certificate: null,
        certificate_blob_name: null,
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

router.post("/bulk/images/import", async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

    if (!rows.length) {
      return res.status(400).json({
        message: "Provide at least one reviewed row to import.",
      });
    }

    const rowsForValidation = rows.map((row, index) => ({
      rowNumber: Number.isInteger(row?.rowNumber) ? row.rowNumber : index + 1,
      data: row?.data || row,
    }));

    const validation = await validateBulkRows(rowsForValidation);
    const invalidRows = validation.rows.filter((row) => !row.canImport);

    if (invalidRows.length) {
      return res.status(400).json({
        message: "Resolve validation issues before importing images.",
        ...validation,
      });
    }

    const rowSourceByNumber = new Map(
      rows.map((row, index) => [
        Number.isInteger(row?.rowNumber) ? row.rowNumber : index + 1,
        row,
      ]),
    );

    const missingImageRows = validation.rows.filter((row) => {
      const source = rowSourceByNumber.get(row.rowNumber);
      return !source?.image;
    });

    if (missingImageRows.length) {
      return res.status(400).json({
        message: "Each selected row must include an image file.",
        missingImageRows: missingImageRows.map((row) => row.rowNumber),
      });
    }

    const importedCatalogNumbers = [];

    for (const row of validation.rows) {
      const source = rowSourceByNumber.get(row.rowNumber);
      const containerName = resolveContainer(row.data.size);

      if (!containerName) {
        return res.status(400).json({
          message: `Unable to resolve image container for size ${row.data.size}.`,
        });
      }

      const ext = getBlobExtension(source.image);
      const blobName = `${row.data.catalog_number}-${uuidv4()}.${ext}`;
      const imageUrl = await uploadToAzure(
        containerName,
        blobName,
        source.image,
      );

      const createdPrint = await Print.create({
        ...row.data,
        image: imageUrl,
        blob_name: blobName,
        certificate: null,
        certificate_blob_name: null,
      });

      importedCatalogNumbers.push(createdPrint.catalog_number);

      await logPrintChange({
        action: "CREATE",
        catalogNumber: createdPrint.catalog_number,
        description: `Bulk imported print ${createdPrint.catalog_number} with image for ${createdPrint.artist}.`,
        req,
      });
    }

    res.status(201).json({
      message: `Imported ${importedCatalogNumbers.length} image record(s) successfully.`,
      importedCount: importedCatalogNumbers.length,
      importedCatalogNumbers,
    });
  } catch (error) {
    console.error("Error importing bulk images", error);
    next(error);
  }
});

router.post("/bulk/assets/import", async (req, res, next) => {
  try {
    const assetType = req.body?.assetType;
    const files = Array.isArray(req.body?.files) ? req.body.files : [];

    if (!["images", "certificates"].includes(assetType)) {
      return res.status(400).json({
        message: "assetType must be either images or certificates.",
      });
    }

    if (!files.length) {
      return res.status(400).json({
        message: "Provide at least one reviewed file to import.",
      });
    }

    const validation = await validateBulkAssetFiles(assetType, files);
    const invalidRows = validation.rows.filter((row) => !row.canImport);

    if (invalidRows.length) {
      return res.status(400).json({
        message: "Resolve validation issues before importing files.",
        ...validation,
      });
    }

    const importedCatalogNumbers = [];
    let skippedCount = 0;
    const skippedFiles = [];
    const validatedRowsByNumber = new Map(
      validation.rows.map((row) => [row.rowNumber, row]),
    );

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const rowNumber = Number.isInteger(file?.rowNumber)
        ? file.rowNumber
        : index + 1;
      const catalogNumber = validatedRowsByNumber.get(rowNumber)?.catalogNumber;

      if (!catalogNumber) {
        skippedCount += 1;
        skippedFiles.push(file.fileName || file.name || `Row ${rowNumber}`);
        continue;
      }

      const print = await Print.findOne({
        where: {
          catalog_number: catalogNumber,
        },
      });

      if (!print) {
        skippedCount += 1;
        skippedFiles.push(file.fileName || file.name || `Row ${rowNumber}`);
        continue;
      }

      const ext = getFileExtension(file.fileName || file.name);

      if (assetType === "images") {
        const containerName = resolveContainer(print.size);
        if (!containerName) {
          continue;
        }

        const blobName = `${catalogNumber}-${uuidv4()}.${ext}`;
        const imageUrl = await uploadToAzure(
          containerName,
          blobName,
          file.content,
        );

        await print.update({
          image: imageUrl,
          blob_name: blobName,
        });
      }

      if (assetType === "certificates") {
        const certificateBlobName = `cert-${catalogNumber}-${uuidv4()}.${ext}`;
        const certificateUrl = await uploadToAzure(
          CERTIFICATE_CONTAINER,
          certificateBlobName,
          file.content,
        );

        await print.update({
          certificate: certificateUrl,
          certificate_blob_name: certificateBlobName,
        });
      }

      importedCatalogNumbers.push(catalogNumber);

      await logPrintChange({
        action: "UPDATE",
        catalogNumber,
        description: `Bulk uploaded ${assetType === "images" ? "image" : "certificate"} for print ${catalogNumber}.`,
        req,
      });
    }

    res.status(201).json({
      message:
        skippedCount > 0
          ? `Imported ${importedCatalogNumbers.length} ${assetType} file(s). Skipped ${skippedCount} unmatched file(s).`
          : `Imported ${importedCatalogNumbers.length} ${assetType} file(s) successfully.`,
      importedCount: importedCatalogNumbers.length,
      importedCatalogNumbers,
      skippedCount,
      skippedFiles,
    });
  } catch (error) {
    console.error("Error importing bulk assets", error);
    next(error);
  }
});

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
      const certExt = getBlobExtension(req.body.certificate);
      const newCertificateBlobName = `cert-${uuidv4()}.${certExt}`;
      certificateUrl = await uploadToAzure(
        CERTIFICATE_CONTAINER,
        newCertificateBlobName,
        req.body.certificate,
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
