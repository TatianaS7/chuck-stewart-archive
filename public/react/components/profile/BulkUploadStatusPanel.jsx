import React from "react";

function BulkUploadStatusPanel({ statusInfo }) {
  return (
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
  );
}

export default BulkUploadStatusPanel;
