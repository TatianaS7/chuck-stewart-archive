import React from "react";

function BulkUploadSummary({ summaryItems }) {
  if (!summaryItems?.length) return null;

  return (
    <div className="bulk-upload-summary-grid">
      {summaryItems.map((item) => (
        <div
          key={item.label}
          className={`bulk-upload-summary-block ${item.tone ? `is-${item.tone}` : ""}`}
        >
          <span className="bulk-upload-summary-value">{item.value}</span>
          <span className="bulk-upload-summary-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default BulkUploadSummary;
