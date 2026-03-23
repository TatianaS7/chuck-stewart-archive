import React, { useContext, useMemo, useState } from "react";
import apiURL from "../../api";
import { AppContext } from "../AppContext";
import BulkUploadAssetReviewTable from "./BulkUploadAssetReviewTable";
import BulkUploadStatusPanel from "./BulkUploadStatusPanel";
import BulkUploadSummary from "./BulkUploadSummary";
import BulkUploadReviewTable from "./BulkUploadReviewTable";
import {
  buildImportBatches,
  buildReviewRows,
  mergeImportedValidation,
  normalizeReviewData,
  parseSelectedImageFiles,
  parseSelectedAssetFiles,
  parseSelectedFile,
  requestBulkImageImport,
  requestBulkAssetValidation,
  requestBulkValidation,
} from "./bulkUploadUtils";

const MODE_CONFIG = {
  records: {
    label: "Print Records",
    helperText:
      "Upload a CSV file, review each parsed row, and save only the records you approve.",
    inputLabel: "CSV File",
    accept: ".csv,text/csv",
    validateLabel: "Validate File",
    revalidateLabel: "Re-Validate Review",
    saveLabel: "Save Selected Rows",
    emptyStatus:
      "Select a CSV file, validate it, review the rows, then save approved records.",
  },
  images: {
    label: "Print Images",
    helperText:
      "Select a folder of image files. Each file name will be parsed into a new print row, then reviewed and edited before creating prints and uploading images to size-based Azure containers.",
    inputLabel: "Image Folder",
    accept: "image/*,.tif,.tiff,.bmp",
    validateLabel: "Validate Folder",
    revalidateLabel: "Re-Validate Files",
    saveLabel: "Upload Selected Files",
    emptyStatus:
      "Select an image folder, review the prefilled print data, then upload approved rows.",
  },
  certificates: {
    label: "Certificates",
    helperText:
      "Select a folder of certificate PDFs. File names can include artist name, year, catalog number, paper type, and sometimes size. ",
    inputLabel: "Certificate Folder",
    accept: ".pdf,.doc,.docx",
    validateLabel: "Validate Folder",
    revalidateLabel: "Re-Validate Files",
    saveLabel: "Upload Selected Files",
    emptyStatus:
      "Select a certificate folder, validate PDF readiness and duplicates, then upload approved files.",
  },
};

function BulkUploadSection() {
  const { fetchPrints } = useContext(AppContext);
  const [uploadMode, setUploadMode] = useState("records");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAssetFiles, setSelectedAssetFiles] = useState([]);
  const [assetFiles, setAssetFiles] = useState([]);
  const [reviewRows, setReviewRows] = useState([]);
  const [assetReviewRows, setAssetReviewRows] = useState([]);
  const [validationSummary, setValidationSummary] = useState(null);
  const [assetSummary, setAssetSummary] = useState(null);
  const [statusInfo, setStatusInfo] = useState({
    phase: "idle",
    tone: "idle",
    message: MODE_CONFIG.records.emptyStatus,
    progress: null,
  });
  const [parserWarnings, setParserWarnings] = useState([]);
  const [assetWarnings, setAssetWarnings] = useState([]);
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

  const selectedAssetCount = useMemo(
    () => assetReviewRows.filter((row) => row.selected).length,
    [assetReviewRows],
  );

  const invalidAssetCount = useMemo(
    () => assetReviewRows.filter((row) => row.issues.length > 0).length,
    [assetReviewRows],
  );

  const summaryItems = useMemo(() => {
    if (uploadMode === "records" && validationSummary) {
      return [
        { label: "Parsed Rows", value: validationSummary.totalRows },
        { label: "Valid Rows", value: validationSummary.validRows, tone: "valid" },
        { label: "Needs Review", value: validationSummary.invalidRows, tone: "invalid" },
        { label: "Selected To Save", value: selectedRowCount },
        { label: "Duplicate Catalogs", value: validationSummary.duplicateFileCatalogs || 0 },
        { label: "Already In Archive", value: validationSummary.existingCatalogDuplicates || 0 },
      ];
    }

    if (uploadMode === "images" && validationSummary) {
      return [
        { label: "Parsed Rows", value: validationSummary.totalRows },
        { label: "Valid Rows", value: validationSummary.validRows, tone: "valid" },
        { label: "Needs Review", value: validationSummary.invalidRows, tone: "invalid" },
        { label: "Selected To Upload", value: selectedRowCount },
        { label: "Duplicate Catalogs", value: validationSummary.duplicateFileCatalogs || 0 },
        { label: "Already In Archive", value: validationSummary.existingCatalogDuplicates || 0 },
      ];
    }

    if (uploadMode === "certificates" && assetSummary) {
      return [
        { label: "Files Found", value: assetSummary.totalFiles },
        { label: "Valid Files", value: assetSummary.validFiles, tone: "valid" },
        { label: "Needs Review", value: assetSummary.invalidFiles, tone: "invalid" },
        { label: "Selected To Upload", value: selectedAssetCount },
        { label: "Duplicate Catalogs", value: assetSummary.duplicateCatalogEntries || 0 },
        { label: "Duplicate File Names", value: assetSummary.duplicateFileEntries || 0 },
        { label: "Existing Assets", value: assetSummary.existingAssetDuplicates || 0 },
        {
          label: uploadMode === "images" ? "Unmatched Files" : "Missing Prints",
          value: assetSummary.unmatchedFiles || assetSummary.missingPrints || 0,
        },
        { label: "Flagged For Review", value: assetSummary.reviewFlaggedFiles || 0 },
        { label: "PDF Conversion Needed", value: assetSummary.conversionRequired || 0 },
      ];
    }

    return [];
  }, [uploadMode, validationSummary, selectedRowCount, assetSummary, selectedAssetCount]);

  const activeWarnings =
    uploadMode === "certificates" ? assetWarnings : parserWarnings;

  function updateStatus(phase, message, tone = phase, progress = null) {
    setStatusInfo({ phase, tone, message, progress });
  }

  function resetReviewState(nextMode = uploadMode) {
    setReviewRows([]);
    setAssetReviewRows([]);
    setValidationSummary(null);
    setAssetSummary(null);
    setParserWarnings([]);
    setAssetWarnings([]);
    updateStatus("idle", MODE_CONFIG[nextMode].emptyStatus, "idle");
  }

  function handleModeChange(e) {
    const nextMode = e.target.value;
    setUploadMode(nextMode);
    setSelectedFile(null);
    setSelectedAssetFiles([]);
    setAssetFiles([]);
    resetReviewState(nextMode);
  }

  async function validateRowsForReview(rows, previousRows = [], sourceFiles = []) {
    updateStatus("validating", "Validating rows against archive rules...", "working");
    const validation = await requestBulkValidation(rows);
    const nextRows = buildReviewRows(validation.rows, previousRows).map((row) => {
      const previous = previousRows.find((previousRow) => previousRow.rowNumber === row.rowNumber);
      const source = sourceFiles.find((file) => file.rowNumber === row.rowNumber);

      return {
        ...row,
        sourceFileName: source?.fileName || previous?.sourceFileName || "",
      };
    });

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

  async function validateAssetsForReview(files, previousRows = []) {
    updateStatus("validating", "Validating files against archive records...", "working");
    const validation = await requestBulkAssetValidation(uploadMode, files);
    const nextRows = buildReviewRows(validation.rows, previousRows);

    setAssetReviewRows(nextRows);
    setAssetSummary(validation.summary);

    if (validation.summary.invalidFiles > 0) {
      updateStatus(
        "review",
        `${validation.summary.invalidFiles} file(s) need attention before upload. Review duplicates, missing matches, and file type issues.`,
        "warning",
      );
    } else {
      updateStatus(
        "review",
        `Validation complete. ${validation.summary.validFiles} file(s) are ready for upload.`,
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

  function handleAssetFolderChange(e) {
    const files = Array.from(e.target.files || []);
    setSelectedAssetFiles(files);
    setAssetFiles([]);
    setAssetReviewRows([]);
    setAssetSummary(null);
    setAssetWarnings([]);
    setReviewRows([]);
    setValidationSummary(null);
    setParserWarnings([]);

    if (files.length) {
      updateStatus(
        "idle",
        `Selected ${files.length} file(s). Validate the folder to begin review.`,
        "idle",
      );
      return;
    }

    updateStatus("idle", MODE_CONFIG[uploadMode].emptyStatus, "idle");
  }

  async function handleValidateFile() {
    if (uploadMode === "records" && !selectedFile) return;
    if (uploadMode !== "records" && !selectedAssetFiles.length) return;

    setIsValidating(true);
    resetReviewState(uploadMode);

    try {
      if (uploadMode === "records") {
        updateStatus("reading", "Reading CSV file from disk...", "working");
        updateStatus("parsing", "Parsing CSV rows for review...", "working");
        const parsedResult = await parseSelectedFile(selectedFile);
        setParserWarnings(parsedResult.warnings);
        await validateRowsForReview(parsedResult.rows);
      } else if (uploadMode === "images") {
        updateStatus("reading", "Reading selected files from folder...", "working");
        updateStatus("parsing", "Parsing image file names into print rows...", "working");
        const parsedResult = await parseSelectedImageFiles(selectedAssetFiles);
        setAssetFiles(parsedResult.files);
        setParserWarnings(parsedResult.warnings);
        await validateRowsForReview(parsedResult.rows, [], parsedResult.files);
      } else {
        updateStatus("reading", "Reading selected files from folder...", "working");
        const parsedResult = await parseSelectedAssetFiles(selectedAssetFiles);
        setAssetFiles(parsedResult.files);
        setAssetWarnings(parsedResult.warnings);
        await validateAssetsForReview(parsedResult.files);
      }
    } catch (error) {
      resetReviewState(uploadMode);
      updateStatus("error", error.message || "Unable to validate file.", "error");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleRevalidateReview() {
    if (uploadMode === "records" && !reviewRows.length) return;
    if (uploadMode === "certificates" && !assetReviewRows.length) return;
    if (uploadMode !== "certificates" && !reviewRows.length) return;

    setIsValidating(true);

    try {
      if (uploadMode === "records") {
        const rows = reviewRows.map((row) => ({
          rowNumber: row.rowNumber,
          data: normalizeReviewData(row.data),
        }));

        await validateRowsForReview(rows, reviewRows);
      } else if (uploadMode === "images") {
        const rows = reviewRows.map((row) => ({
          rowNumber: row.rowNumber,
          data: normalizeReviewData(row.data),
        }));

        await validateRowsForReview(rows, reviewRows, assetFiles);
      } else {
        const files = assetReviewRows
          .map((row) => {
            const sourceFile = assetFiles.find((file) => file.rowNumber === row.rowNumber);
            if (!sourceFile) return null;
            return {
              rowNumber: row.rowNumber,
              fileName: row.fileName,
              content: sourceFile.content,
            };
          })
          .filter(Boolean);

        await validateAssetsForReview(files, assetReviewRows);
      }
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

  function handleAssetSelectionChange(rowNumber) {
    setAssetReviewRows((prev) =>
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
    if (uploadMode === "certificates") {
      const selectedFiles = assetReviewRows.filter((row) => row.selected);

      if (!selectedFiles.length) {
        updateStatus("review", "Select at least one valid file to upload.", "warning");
        return;
      }

      setIsImporting(true);

      try {
        updateStatus("revalidating", "Re-validating selected files before upload...", "working");

        const selectedPayload = selectedFiles
          .map((row) => {
            const sourceFile = assetFiles.find((file) => file.rowNumber === row.rowNumber);
            if (!sourceFile) return null;
            return {
              rowNumber: row.rowNumber,
              fileName: row.fileName,
              content: sourceFile.content,
            };
          })
          .filter(Boolean);

        const revalidated = await requestBulkAssetValidation(uploadMode, selectedPayload);

        if (revalidated.summary.invalidFiles > 0) {
          setAssetReviewRows((prev) => mergeImportedValidation(prev, revalidated.rows));
          updateStatus(
            "review",
            "Some selected files are no longer valid. Review the flagged files and try again.",
            "warning",
          );
          return;
        }

        const batches = buildImportBatches(selectedPayload, 10);
        let importedCount = 0;
        let skippedCount = 0;

        for (let index = 0; index < batches.length; index += 1) {
          const batch = batches[index];
          updateStatus(
            "saving",
            `Uploading batch ${index + 1} of ${batches.length}...`,
            "working",
            {
              current: index,
              total: batches.length,
            },
          );

          const res = await fetch(`${apiURL}/prints/bulk/assets/import`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              assetType: uploadMode,
              files: batch,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            if (Array.isArray(data.rows)) {
              setAssetReviewRows((prev) => mergeImportedValidation(prev, data.rows));
            }
            throw new Error(data.message || "Bulk asset upload failed.");
          }

          importedCount += data.importedCount || batch.length;
          skippedCount += data.skippedCount || 0;

          updateStatus(
            "saving",
            `Processed ${importedCount} of ${selectedFiles.length} selected file(s)...`,
            "working",
            {
              current: index + 1,
              total: batches.length,
            },
          );
        }

        await fetchPrints();
        setSelectedAssetFiles([]);
        setAssetFiles([]);
        setAssetReviewRows([]);
        setAssetSummary(null);
        setAssetWarnings([]);
        updateStatus(
          skippedCount > 0 ? "review" : "complete",
          skippedCount > 0
            ? `Uploaded ${importedCount} ${uploadMode} file(s). Skipped ${skippedCount} unmatched file(s).`
            : `Uploaded ${importedCount} ${uploadMode} file(s) successfully.`,
          skippedCount > 0 ? "warning" : "success",
        );
      } catch (error) {
        updateStatus("error", error.message || "Bulk asset upload failed.", "error");
      } finally {
        setIsImporting(false);
      }

      return;
    }

    if (uploadMode === "images") {
      const selectedRows = reviewRows.filter((row) => row.selected);

      if (!selectedRows.length) {
        updateStatus("review", "Select at least one valid row to upload.", "warning");
        return;
      }

      setIsImporting(true);

      try {
        updateStatus("revalidating", "Re-validating selected rows before upload...", "working");

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

        const uploadRows = revalidated.rows
          .map((row) => {
            const sourceFile = assetFiles.find((file) => file.rowNumber === row.rowNumber);
            if (!sourceFile) return null;
            return {
              rowNumber: row.rowNumber,
              data: row.data,
              image: sourceFile.content,
              fileName: sourceFile.fileName,
            };
          })
          .filter(Boolean);

        const batches = buildImportBatches(uploadRows, 10);
        let importedCount = 0;

        for (let index = 0; index < batches.length; index += 1) {
          const batch = batches[index];
          updateStatus(
            "saving",
            `Uploading batch ${index + 1} of ${batches.length}...`,
            "working",
            {
              current: index + 1,
              total: batches.length,
            },
          );

          const data = await requestBulkImageImport(batch);
          importedCount += data.importedCount || batch.length;
        }

        await fetchPrints();
        setSelectedAssetFiles([]);
        setAssetFiles([]);
        setReviewRows([]);
        setValidationSummary(null);
        setParserWarnings([]);
        updateStatus(
          "complete",
          `Created and uploaded ${importedCount} image record(s) successfully.`,
          "success",
        );
      } catch (error) {
        updateStatus("error", error.message || "Bulk image upload failed.", "error");
      } finally {
        setIsImporting(false);
      }

      return;
    }

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
      <p>{MODE_CONFIG[uploadMode].helperText}</p>

      <div className="bulk-upload-card">
        <label htmlFor="bulk-upload-mode"><b>Upload Type</b></label>
        <select
          id="bulk-upload-mode"
          className="bulk-upload-mode-select"
          value={uploadMode}
          onChange={handleModeChange}
        >
          <option value="records">Print Records (CSV)</option>
          <option value="images">Print Images</option>
          <option value="certificates">Certificates</option>
        </select>

        <label htmlFor="bulk-upload-file"><b>{MODE_CONFIG[uploadMode].inputLabel}</b></label>
        {uploadMode === "records" ? (
          <input
            id="bulk-upload-file"
            type="file"
            accept={MODE_CONFIG[uploadMode].accept}
            onChange={handleFileChange}
          />
        ) : (
          <input
            id="bulk-upload-file"
            type="file"
            accept={MODE_CONFIG[uploadMode].accept}
            multiple
            directory=""
            webkitdirectory=""
            onChange={handleAssetFolderChange}
          />
        )}

        <p className="admin-subtle">
          {uploadMode === "records"
            ? "Suggested columns: catalog_number, artist, status, date, size, location, instrument, notes, date_sold"
            : uploadMode === "images"
              ? "Image filenames are parsed into the same fields as New Print. Review and correct every row, especially size, before upload."
              : "Certificate filenames can include artist name, year, catalog number, paper type, and sometimes size. Use PDFs when possible; Word files must be converted before upload."}
        </p>

        <BulkUploadStatusPanel statusInfo={statusInfo} />

        <div className="bulk-upload-actions">
          <button
            type="button"
            className="btn btn-outline-light"
            disabled={
              uploadMode === "records"
                ? !selectedFile || isValidating || isImporting
                : !selectedAssetFiles.length || isValidating || isImporting
            }
            onClick={handleValidateFile}
          >
            {MODE_CONFIG[uploadMode].validateLabel}
          </button>
          <button
            type="button"
            className="btn btn-outline-light"
            disabled={
              uploadMode !== "certificates"
                ? !reviewRows.length || isValidating || isImporting
                : !assetReviewRows.length || isValidating || isImporting
            }
            onClick={handleRevalidateReview}
          >
            {MODE_CONFIG[uploadMode].revalidateLabel}
          </button>
          <button
            type="button"
            className="btn btn-dark"
            disabled={
              uploadMode !== "certificates"
                ? !reviewRows.length || !selectedRowCount || isValidating || isImporting
                : !assetReviewRows.length || !selectedAssetCount || isValidating || isImporting
            }
            onClick={handleImportRows}
          >
            {MODE_CONFIG[uploadMode].saveLabel}
          </button>
        </div>

        {uploadMode === "records" && selectedFile && (
          <p className="bulk-upload-filename">Selected: {selectedFile.name}</p>
        )}

        {uploadMode !== "records" && selectedAssetFiles.length > 0 && (
          <p className="bulk-upload-filename">
            Selected: {selectedAssetFiles.length} file(s)
          </p>
        )}

        <BulkUploadSummary summaryItems={summaryItems} />

        {activeWarnings.length > 0 && (
          <div className="bulk-upload-warning-box">
            <b>Parser warnings</b>
            <ul className="bulk-upload-issues-list">
              {activeWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {uploadMode !== "certificates" ? (
          <BulkUploadReviewTable
            reviewRows={reviewRows}
            selectedRowCount={selectedRowCount}
            invalidRowCount={invalidRowCount}
            showSourceFileName={uploadMode === "images"}
            onRowSelectionChange={handleRowSelectionChange}
            onRowFieldChange={handleRowFieldChange}
          />
        ) : (
          <BulkUploadAssetReviewTable
            reviewRows={assetReviewRows}
            selectedCount={selectedAssetCount}
            invalidCount={invalidAssetCount}
            onRowSelectionChange={handleAssetSelectionChange}
          />
        )}
      </div>
    </div>
  );
}

export default BulkUploadSection;
