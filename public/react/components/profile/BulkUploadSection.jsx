import React, { useContext, useMemo, useState } from "react";
import Papa from "papaparse";
import apiURL from "../../api";
import { AppContext } from "../AppContext";

function BulkUploadSection() {
  const { fetchPrints } = useContext(AppContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reviewRows, setReviewRows] = useState([]);
  const [validationSummary, setValidationSummary] = useState(null);
  const [statusInfo, setStatusInfo] = useState({
    phase: "idle",
    tone: "idle",
    message: "Select a CSV file, validate it, review the rows, then save approved records.",
    progress: null,
  });
  const [parserWarnings, setParserWarnings] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const editableFields = [
    "status",
    "catalog_number",
    "artist",
    "date",
    "size",
    "category",
    "signed",
    "location",
    "instrument",
    "notes",
    "date_sold",
  ];

  const selectedRowCount = useMemo(
    () => reviewRows.filter((row) => row.selected).length,
    [reviewRows],
  );

  const invalidRowCount = useMemo(
    () => reviewRows.filter((row) => row.issues.length > 0).length,
    [reviewRows],
  );

  function updateStatus(phase, message, tone = phase, progress = null) {
    setStatusInfo({ phase, tone, message, progress });
  }

  function normalizeHeader(header) {
    return String(header || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function normalizeReviewData(row = {}) {
    return {
      status: String(row.status || "").trim(),
      catalog_number: String(row.catalog_number || "").trim(),
      artist: String(row.artist || "").trim(),
      date: String(row.date || "").trim(),
      size: String(row.size || "").trim(),
      category: String(row.category || "").trim(),
      signed: row.signed === true || ["true", "yes", "1"].includes(String(row.signed).toLowerCase()),
      location: String(row.location || "").trim(),
      instrument: String(row.instrument || "").trim(),
      notes: String(row.notes || "").trim(),
      date_sold: String(row.date_sold || "").trim(),
    };
  }

  function buildReviewRows(validatedRows, previousRows = []) {
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

  async function requestBulkValidation(rows) {
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

  async function parseSelectedFile() {
    const fileText = await selectedFile.text();

    updateStatus("parsing", "Parsing CSV rows for review...", "working");

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

    setParserWarnings(warnings);
    return rows;
  }

  async function validateRowsForReview(rows, previousRows = []) {
    updateStatus("validating", "Validating rows against archive rules...", "working");
    const validation = await requestBulkValidation(rows);
    const nextRows = buildReviewRows(validation.rows, previousRows);

    setReviewRows(nextRows);
    setValidationSummary(validation.summary);

    if (validation.summary.invalidRows > 0) {
      updateStatus(
        "review",
        `${validation.summary.invalidRows} row(s) need attention before import. Review and re-validate when ready.`,
        "warning",
      );
    } else {
      updateStatus(
        "review",
        `Validation complete. ${validation.summary.validRows} row(s) are ready for manual review and import.`,
        "success",
      );
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setReviewRows([]);
    setValidationSummary(null);
    setParserWarnings([]);

    if (file) {
      updateStatus("idle", `Selected ${file.name}. Validate the file to begin review.`, "idle");
      return;
    }

    updateStatus(
      "idle",
      "Select a CSV file, validate it, review the rows, then save approved records.",
      "idle",
    );
  }

  async function handleValidateFile() {
    if (!selectedFile) return;

    setIsValidating(true);
    setReviewRows([]);
    setValidationSummary(null);
    setParserWarnings([]);

    try {
      updateStatus("reading", "Reading CSV file from disk...", "working");
      const parsedRows = await parseSelectedFile();
      await validateRowsForReview(parsedRows);
    } catch (error) {
      setReviewRows([]);
      setValidationSummary(null);
      updateStatus("error", error.message || "Unable to validate file.", "error");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleRevalidateReview() {
    if (!reviewRows.length) return;

    setIsValidating(true);

    try {
      const rows = reviewRows.map((row) => ({
        rowNumber: row.rowNumber,
        data: normalizeReviewData(row.data),
      }));

      await validateRowsForReview(rows, reviewRows);
    } catch (error) {
      updateStatus("error", error.message || "Unable to re-validate reviewed rows.", "error");
    } finally {
      setIsValidating(false);
    }
  }

  function handleRowFieldChange(rowNumber, field, value) {
    setReviewRows((prev) =>
      prev.map((row) =>
        row.rowNumber === rowNumber
          ? {
              ...row,
              data: {
                ...row.data,
                [field]: value,
              },
            }
          : row,
      ),
    );
  }

  function handleRowSelectionChange(rowNumber) {
    setReviewRows((prev) =>
      prev.map((row) =>
        row.rowNumber === rowNumber
          ? {
              ...row,
              selected: row.canImport ? !row.selected : false,
            }
          : row,
      ),
    );
  }

  function mergeImportedValidation(existingRows, validatedRows) {
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

  function buildImportBatches(rows, batchSize = 10) {
    const batches = [];
    for (let index = 0; index < rows.length; index += batchSize) {
      batches.push(rows.slice(index, index + batchSize));
    }
    return batches;
  }

  async function handleImportRows() {
    const selectedRows = reviewRows.filter((row) => row.selected);

    if (!selectedRows.length) {
      updateStatus("review", "Select at least one valid row to import.", "warning");
      return;
    }

    setIsImporting(true);

    try {
      updateStatus("revalidating", "Re-validating selected rows before saving...", "working");

      const selectedPayload = selectedRows.map((row) => ({
        rowNumber: row.rowNumber,
        data: normalizeReviewData(row.data),
      }));

      const revalidated = await requestBulkValidation(selectedPayload);

      if (revalidated.summary.invalidRows > 0) {
        setReviewRows((prev) => mergeImportedValidation(prev, revalidated.rows));
        updateStatus(
          "review",
          "Some selected rows are no longer valid. Review the flagged rows and try again.",
          "warning",
        );
        return;
      }

      const batches = buildImportBatches(revalidated.rows, 10);
      let importedCount = 0;

      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index];
        updateStatus(
          "saving",
          `Saving batch ${index + 1} of ${batches.length}...`,
          "working",
          {
            current: index,
            total: batches.length,
          },
        );

        const res = await fetch(`${apiURL}/prints/bulk/import`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rows: batch }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (Array.isArray(data.rows)) {
            setReviewRows((prev) => mergeImportedValidation(prev, data.rows));
          }
          throw new Error(data.message || "Bulk import failed.");
        }

        importedCount += data.importedCount || batch.length;

        updateStatus(
          "saving",
          `Processed ${importedCount} of ${selectedRows.length} selected row(s)...`,
          "working",
          {
            current: index + 1,
            total: batches.length,
          },
        );
      }

      await fetchPrints();
      setSelectedFile(null);
      setReviewRows([]);
      setValidationSummary(null);
      setParserWarnings([]);
      updateStatus("complete", `Imported ${selectedRows.length} print record(s) successfully.`, "success");
    } catch (error) {
      updateStatus("error", error.message || "Bulk import failed.", "error");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="admin-section-card">
      <h6>Bulk Upload Prints</h6>
      <p>Upload a CSV file, review each parsed row, and save only the records you approve.</p>

      <div className="bulk-upload-card">
        <label htmlFor="bulk-upload-file"><b>CSV File</b></label>
        <input
          id="bulk-upload-file"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
        />

        <p className="admin-subtle">
          Suggested columns: catalog_number, artist, status, date, size, location,
          instrument, notes, date_sold
        </p>

        <div className={`bulk-upload-status bulk-upload-status-${statusInfo.tone}`}>
          <p className="bulk-upload-status-phase">{statusInfo.phase}</p>
          <p className="bulk-upload-status-message">{statusInfo.message}</p>
          {statusInfo.progress && (
            <div className="bulk-upload-progress">
              <div
                className="bulk-upload-progress-bar"
                style={{
                  width: `${Math.round(
                    (statusInfo.progress.current / statusInfo.progress.total) * 100,
                  )}%`,
                }}
              />
            </div>
          )}
        </div>

        <div className="bulk-upload-actions">
          <button
            type="button"
            className="btn btn-outline-light"
            disabled={!selectedFile || isValidating || isImporting}
            onClick={handleValidateFile}
          >
            Validate File
          </button>
          <button
            type="button"
            className="btn btn-outline-light"
            disabled={!reviewRows.length || isValidating || isImporting}
            onClick={handleRevalidateReview}
          >
            Re-Validate Review
          </button>
          <button
            type="button"
            className="btn btn-dark"
            disabled={!reviewRows.length || !selectedRowCount || isValidating || isImporting}
            onClick={handleImportRows}
          >
            Save Selected Rows
          </button>
        </div>

        {selectedFile && (
          <p className="bulk-upload-filename">Selected: {selectedFile.name}</p>
        )}

        {validationSummary && (
          <div className="bulk-upload-summary-grid">
            <div className="bulk-upload-summary-block">
              <span className="bulk-upload-summary-value">{validationSummary.totalRows}</span>
              <span className="bulk-upload-summary-label">Parsed Rows</span>
            </div>
            <div className="bulk-upload-summary-block is-valid">
              <span className="bulk-upload-summary-value">{validationSummary.validRows}</span>
              <span className="bulk-upload-summary-label">Valid Rows</span>
            </div>
            <div className="bulk-upload-summary-block is-invalid">
              <span className="bulk-upload-summary-value">{validationSummary.invalidRows}</span>
              <span className="bulk-upload-summary-label">Needs Review</span>
            </div>
            <div className="bulk-upload-summary-block">
              <span className="bulk-upload-summary-value">{selectedRowCount}</span>
              <span className="bulk-upload-summary-label">Selected To Save</span>
            </div>
          </div>
        )}

        {parserWarnings.length > 0 && (
          <div className="bulk-upload-warning-box">
            <b>Parser warnings</b>
            <ul className="bulk-upload-issues-list">
              {parserWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {reviewRows.length > 0 && (
          <>
            <div className="bulk-upload-review-header">
              <div>
                <b>Manual Review</b>
                <p className="admin-subtle">
                  Edit any values that need correction, deselect rows you do not want to save,
                  then re-validate before import.
                </p>
              </div>
              <div className="bulk-upload-review-totals">
                <span>{selectedRowCount} selected</span>
                <span>{invalidRowCount} invalid</span>
              </div>
            </div>

            <div className="bulk-upload-review-table-wrapper">
              <table className="bulk-upload-review-table">
                <thead>
                  <tr>
                    <th>Save</th>
                    <th>Row</th>
                    <th>Validation</th>
                    {editableFields.map((field) => (
                      <th key={field}>{field.replace("_", " ")}</th>
                    ))}
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!row.canImport}
                          onChange={() => handleRowSelectionChange(row.rowNumber)}
                        />
                      </td>
                      <td>{row.rowNumber}</td>
                      <td>
                        <span
                          className={`bulk-upload-validation-pill ${
                            row.canImport ? "is-valid" : "is-invalid"
                          }`}
                        >
                          {row.canImport ? "Ready" : "Needs Fix"}
                        </span>
                      </td>
                      {editableFields.map((field) => (
                        <td key={`${row.rowNumber}-${field}`}>
                          {field === "status" ? (
                            <select
                              value={row.data[field] || ""}
                              onChange={(e) =>
                                handleRowFieldChange(row.rowNumber, field, e.target.value)
                              }
                            >
                              <option value="">Select status</option>
                              <option value="Available">Available</option>
                              <option value="Sold">Sold</option>
                              <option value="Unavailable">Unavailable</option>
                            </select>
                          ) : field === "size" ? (
                            <select
                              value={row.data[field] || ""}
                              onChange={(e) =>
                                handleRowFieldChange(row.rowNumber, field, e.target.value)
                              }
                            >
                              <option value="">Select size</option>
                              <option value="11x14">11x14</option>
                              <option value="16x20">16x20</option>
                              <option value="11x14C">11x14C</option>
                            </select>
                          ) : field === "category" ? (
                            <select
                              value={row.data[field] || ""}
                              onChange={(e) =>
                                handleRowFieldChange(row.rowNumber, field, e.target.value)
                              }
                            >
                              <option value="">No category</option>
                              <option value="Musicians">Musicians</option>
                              <option value="Other">Other</option>
                            </select>
                          ) : field === "signed" ? (
                            <select
                              value={String(row.data[field] ?? false)}
                              onChange={(e) =>
                                handleRowFieldChange(row.rowNumber, field, e.target.value === "true")
                              }
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={row.data[field] || ""}
                              onChange={(e) =>
                                handleRowFieldChange(row.rowNumber, field, e.target.value)
                              }
                            />
                          )}
                        </td>
                      ))}
                      <td>
                        {row.issues.length ? (
                          <ul className="bulk-upload-issues-list">
                            {row.issues.map((issue) => (
                              <li key={`${row.rowNumber}-${issue}`}>{issue}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="bulk-upload-no-issues">No issues</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BulkUploadSection;
