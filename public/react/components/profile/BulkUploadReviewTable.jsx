import React from "react";
import { editableFields } from "./bulkUploadConfig";

function BulkUploadReviewTable({
  reviewRows,
  selectedRowCount,
  invalidRowCount,
  showSourceFileName = false,
  onRowSelectionChange,
  onRowFieldChange,
}) {
  if (!reviewRows.length) return null;

  return (
    <>
      <div className="bulk-upload-review-header">
        <div>
          <b>Manual Review</b>
          <p className="admin-subtle">
            Edit any values that need correction, deselect rows you do not want
            to save, then re-validate before import.
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
              {showSourceFileName && <th>Source File</th>}
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
                    onChange={() => onRowSelectionChange(row.rowNumber)}
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
                {showSourceFileName && (
                  <td>
                    <span className="bulk-upload-source-file">{row.sourceFileName || "-"}</span>
                  </td>
                )}
                {editableFields.map((field) => (
                  <td key={`${row.rowNumber}-${field}`}>
                    {field === "status" ? (
                      <select
                        value={row.data[field] || ""}
                        onChange={(e) =>
                          onRowFieldChange(row.rowNumber, field, e.target.value)
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
                          onRowFieldChange(row.rowNumber, field, e.target.value)
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
                          onRowFieldChange(row.rowNumber, field, e.target.value)
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
                          onRowFieldChange(
                            row.rowNumber,
                            field,
                            e.target.value === "true",
                          )
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
                          onRowFieldChange(row.rowNumber, field, e.target.value)
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
  );
}

export default BulkUploadReviewTable;
