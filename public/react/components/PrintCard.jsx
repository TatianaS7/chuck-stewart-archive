import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { IoIosDownload, IoIosPrint } from "react-icons/io";

function PrintCard({ print, onEdit, onDelete }) {
    const [showCertificatePreview, setShowCertificatePreview] = useState(false);

    function isPdfFile(value) {
        if (!value) return false;
        return value.includes("application/pdf") || value.toLowerCase().includes(".pdf");
    }

    function handleOpenCertificatePreview() {
        setShowCertificatePreview(true);
    }

    function handleCloseCertificatePreview() {
        setShowCertificatePreview(false);
    }

    function handlePlaceholderAction(action) {
        console.log(`${action} certificate placeholder for`, print.catalog_number);
    }

    return (
        <>
            <div className="card">
                <div className="card-body">
                    <div className="img-name-catalog">
                        <div className="header-left">
                            <div className="thumbnail">
                                <img
                                    src={print.image ? print.image : `/images/default-thumbnail.jpg`}
                                    alt={print.catalog_number}
                                />
                            </div>
                            <div>
                                <h3 className="card-title">{print.artist} | {print.catalog_number}</h3>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm certificate-btn"
                                    onClick={handleOpenCertificatePreview}
                                >
                                    View Certificate
                                </button>
                                <div className="print-badges">
                                    {print.category && (
                                        <span className={`print-badge badge-${print.category.toLowerCase()}`}>
                                            {print.category}
                                        </span>
                                    )}
                                    <span className={`print-badge ${print.signed ? "badge-signed" : "badge-unsigned"}`}>
                                        {print.signed ? "Signed" : "Unsigned"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="control-buttons">
                            <button className="btn btn-outline-dark" onClick={() => onEdit(print)}>Edit</button>
                            <button className="btn btn-outline-danger" onClick={() => onDelete(print)}>Delete</button>
                        </div>
                    </div>

                    <hr />

                    <div className="data">
                        <div className="left-side">
                            <p className="card-text"><b>Size:</b> {print.size}</p>
                            <p className="card-text"><b>Date:</b> {print.date}</p>
                            <p className="card-text"><b>Location:</b> {print.location || ''}</p>
                            <p className="card-text"><b>Instrument:</b> {print.instrument || ''}</p>
                        </div>
                        <div className="right-side">
                            <p className="card-text"><b>Status:</b> {print.status}</p>
                            <p className="card-text"><b>Signed:</b> {print.signed ? 'Yes' : 'No'}</p>
                            <p className="card-text"><b>Notes:</b> {print.notes || ''}</p>
                            <p className="card-text"><b>Date Sold:</b> {print.date_sold || ''}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Modal show={showCertificatePreview} onHide={handleCloseCertificatePreview} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Certificate Preview</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="certificate-preview-content">
                        <p className="certificate-preview-title">{print.artist} | {print.catalog_number}</p>
                            {print.certificate ? (
                                <div className="certificate-preview-image-wrap">
                                    {isPdfFile(print.certificate) ? (
                                        <iframe
                                            src={print.certificate}
                                            title={`Certificate ${print.catalog_number}`}
                                            className="certificate-preview-frame"
                                        />
                                    ) : (
                                        <img
                                            src={print.certificate}
                                            alt={`Certificate ${print.catalog_number}`}
                                            className="certificate-preview-image"
                                        />
                                    )}
                                </div>
                            ) : (
                                <p className="certificate-preview-empty">
                                    No certificate file is associated with this print yet.
                                </p>
                            )}
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
}

export default PrintCard;
