import Papa from "papaparse";
import apiURL from "../../api";

export function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizeReviewData(row = {}) {
  return {
    status: String(row.status || "").trim(),
    catalog_number: String(row.catalog_number || "").trim(),
    artist: String(row.artist || "").trim(),
    date: String(row.date || "").trim(),
    size: String(row.size || "").trim(),
    category: String(row.category || "").trim(),
    signed:
      row.signed === true ||
      ["true", "yes", "1"].includes(String(row.signed).toLowerCase()),
    location: String(row.location || "").trim(),
    instrument: String(row.instrument || "").trim(),
    notes: String(row.notes || "").trim(),
    date_sold: String(row.date_sold || "").trim(),
  };
}

export function buildReviewRows(validatedRows, previousRows = []) {
  const previousSelection = new Map(
    previousRows.map((row) => [row.rowNumber, row.selected]),
  );

  return validatedRows.map((row) => ({
    ...row,
    selected: previousSelection.has(row.rowNumber)
      ? previousSelection.get(row.rowNumber) && row.canImport
      : row.canImport,
  }));
}

export async function requestBulkValidation(rows) {
  const res = await fetch(`${apiURL}/prints/bulk/validate`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rows }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Unable to validate bulk upload.");
  }

  return data;
}

export async function requestBulkAssetValidation(assetType, files) {
  const res = await fetch(`${apiURL}/prints/bulk/assets/validate`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assetType, files }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Unable to validate bulk assets.");
  }

  return data;
}

export async function requestBulkImageImport(rows) {
  const res = await fetch(`${apiURL}/prints/bulk/images/import`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rows }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Unable to import bulk images.");
  }

  return data;
}

export async function parseSelectedFile(file) {
  const fileText = await file.text();

  const parseResult = Papa.parse(fileText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  const warnings = parseResult.errors.map((error) => {
    const rowNumber = Number.isInteger(error.row) ? error.row + 2 : "Unknown";
    return `Row ${rowNumber}: ${error.message}`;
  });

  const rows = parseResult.data
    .map((row, index) => ({
      rowNumber: index + 2,
      data: normalizeReviewData(row),
    }))
    .filter((row) => Object.values(row.data).some((value) => value));

  if (!rows.length) {
    throw new Error("The selected CSV did not contain any usable data rows.");
  }

  return {
    rows,
    warnings,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error(`Unable to read file ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export async function parseSelectedAssetFiles(fileList) {
  const files = Array.from(fileList || []);

  if (!files.length) {
    throw new Error("The selected folder did not contain any files.");
  }

  const parsedFiles = await Promise.all(
    files.map(async (file, index) => ({
      rowNumber: index + 1,
      fileName: file.name,
      content: await readFileAsDataUrl(file),
    })),
  );

  return {
    files: parsedFiles,
    warnings: [],
  };
}

function parseImageFileName(fileName) {
  const baseName = String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .trim();

  const tokens = baseName
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const yearIndex = tokens.findIndex((token) => /^19\d{2}$/.test(token));
  const year = yearIndex >= 0 ? tokens[yearIndex] : "";

  let catalogNumber = "";
  if (yearIndex >= 0) {
    const afterYear = tokens.slice(yearIndex + 1);
    const preferredCatalog = afterYear.find((token) =>
      /^0[\w-]*$/i.test(token),
    );
    const fallbackCatalog = afterYear.find((token) =>
      /^\d[\w-]*$/i.test(token),
    );
    catalogNumber = preferredCatalog || fallbackCatalog || "";
  }

  const sizeToken = tokens.find((token) => /^(11x14c?|16x20)$/i.test(token));
  const normalizedSize = sizeToken
    ? sizeToken.toLowerCase() === "11x14c"
      ? "11x14C"
      : sizeToken.toLowerCase()
    : "";

  const artistTokens = yearIndex > 0 ? tokens.slice(0, yearIndex) : [];
  const artist = artistTokens.join(" ");

  return {
    status: "Available",
    catalog_number: catalogNumber,
    artist,
    date: year,
    size: normalizedSize,
    category: "",
    signed: false,
    location: "",
    instrument: "",
    notes: "",
    date_sold: "",
  };
}

export async function parseSelectedImageFiles(fileList) {
  const files = Array.from(fileList || []);

  if (!files.length) {
    throw new Error("The selected folder did not contain any files.");
  }

  const parsedFiles = await Promise.all(
    files.map(async (file, index) => {
      const rowNumber = index + 1;
      return {
        rowNumber,
        fileName: file.name,
        content: await readFileAsDataUrl(file),
        data: parseImageFileName(file.name),
      };
    }),
  );

  const rows = parsedFiles.map((file) => ({
    rowNumber: file.rowNumber,
    data: file.data,
  }));

  return {
    files: parsedFiles.map(({ rowNumber, fileName, content }) => ({
      rowNumber,
      fileName,
      content,
    })),
    rows,
    warnings: [],
  };
}

export function mergeImportedValidation(existingRows, validatedRows) {
  const validatedByRowNumber = new Map(
    validatedRows.map((row) => [row.rowNumber, row]),
  );

  return existingRows.map((row) => {
    const nextRow = validatedByRowNumber.get(row.rowNumber);

    if (!nextRow) return row;

    return {
      ...nextRow,
      selected: row.selected && nextRow.canImport,
    };
  });
}

export function buildImportBatches(rows, batchSize = 10) {
  const batches = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    batches.push(rows.slice(index, index + batchSize));
  }
  return batches;
}
