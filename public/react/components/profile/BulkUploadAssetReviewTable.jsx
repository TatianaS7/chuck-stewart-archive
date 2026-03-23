import React from "react";

function BulkUploadAssetReviewTable({
  reviewRows,
  selectedCount,
  invalidCount,
  onRowSelectionChange,
}) {
  if (!reviewRows.length) return null;

  return (
    <>
      <div className="bulk-upload-review-header">
        <div>
          <b>Asset Review</b>
          <p className="admin-subtle">
            Review filename matching, duplicate checks, and certificate PDF requirements before upload.
          </p>
        </div>
        <div className="bulk-upload-review-totals">
          <span>{selectedCount} selected</span>
          <span>{invalidCount} invalid</span>
        </div>
      </div>

      <div className="bulk-upload-review-table-wrapper">
        <table className="bulk-upload-review-table bulk-upload-asset-table">
          <thead>
            <tr>
              <th>Upload</th>
              <th>Row</th>
              <th>File Name</th>
              <th>Catalog #</th>
              <th>Validation</th>
              <th>Review Notes</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {reviewRows.map((row) => (
              <tr key={`${row.rowNumber}-${row.fileName}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={!row.canImport}
                    onChange={() => onRowSelectionChange(row.rowNumber)}
                  />
                </td>
                <td>{row.rowNumber}</td>
                <td>{row.fileName}</td>
                <td>{row.catalogNumber || "-"}</td>
                <td>
                  <span
                    className={`bulk-upload-validation-pill ${
                      row.canImport ? "is-valid" : "is-invalid"
                    }`}
                  >
                    {row.canImport ? "Ready" : "Needs Fix"}
                  </span>
                </td>
                <td>
                  {row.reviewNotes?.length ? (
                    <ul className="bulk-upload-issues-list">
                      {row.reviewNotes.map((note) => (
                        <li key={`${row.rowNumber}-${note}`}>{note}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="bulk-upload-no-issues">None</span>
                  )}
                </td>
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
  );
}

export default BulkUploadAssetReviewTable;
