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
