import React, { useContext, useMemo, useState } from "react";
import apiURL from "../../api";
import { AppContext } from "../AppContext";
import BulkUploadStatusPanel from "./BulkUploadStatusPanel";
import BulkUploadSummary from "./BulkUploadSummary";
import BulkUploadReviewTable from "./BulkUploadReviewTable";
import {
  buildImportBatches,
  buildReviewRows,
  mergeImportedValidation,
  normalizeReviewData,
  parseSelectedFile,
  requestBulkValidation,
} from "./bulkUploadUtils";

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
      updateStatus("parsing", "Parsing CSV rows for review...", "working");
      const parsedResult = await parseSelectedFile(selectedFile);
      setParserWarnings(parsedResult.warnings);
      await validateRowsForReview(parsedResult.rows);
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

        <BulkUploadStatusPanel statusInfo={statusInfo} />

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

        <BulkUploadSummary
          validationSummary={validationSummary}
          selectedRowCount={selectedRowCount}
        />

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

        <BulkUploadReviewTable
          reviewRows={reviewRows}
          selectedRowCount={selectedRowCount}
          invalidRowCount={invalidRowCount}
          onRowSelectionChange={handleRowSelectionChange}
          onRowFieldChange={handleRowFieldChange}
        />
      </div>
    </div>
  );
}

export default BulkUploadSection;
