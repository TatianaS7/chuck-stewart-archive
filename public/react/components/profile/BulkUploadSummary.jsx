import React from "react";

function BulkUploadSummary({ validationSummary, selectedRowCount }) {
  if (!validationSummary) return null;

  return (
    <div className="bulk-upload-summary-grid">
      <div className="bulk-upload-summary-block">
        <span className="bulk-upload-summary-value">
          {validationSummary.totalRows}
        </span>
        <span className="bulk-upload-summary-label">Parsed Rows</span>
      </div>
      <div className="bulk-upload-summary-block is-valid">
        <span className="bulk-upload-summary-value">
          {validationSummary.validRows}
        </span>
        <span className="bulk-upload-summary-label">Valid Rows</span>
      </div>
      <div className="bulk-upload-summary-block is-invalid">
        <span className="bulk-upload-summary-value">
          {validationSummary.invalidRows}
        </span>
        <span className="bulk-upload-summary-label">Needs Review</span>
      </div>
      <div className="bulk-upload-summary-block">
        <span className="bulk-upload-summary-value">{selectedRowCount}</span>
        <span className="bulk-upload-summary-label">Selected To Save</span>
      </div>
    </div>
  );
}

export default BulkUploadSummary;
