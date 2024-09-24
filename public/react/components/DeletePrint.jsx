import React, { useState, useEffect } from "react";
import { Modal } from 'react-bootstrap'


function DeletePrint({ currentPrint, setCurrentPrint, deletePrints, allPrintsClick, deleteView, setDeleteView }) {
    const [showDelete, setShowDelete] = useState(false);
    

    useEffect(() => {
        if (deleteView && currentPrint !== null) {
            setShowDelete(true)
        }     
    }, [deleteView, currentPrint])

    async function handleDeleteClick() {
        await deletePrints(currentPrint.catalog_number);
        setShowDelete(false);
        setDeleteView(false);
        allPrintsClick();
    }

    function handleCloseDeleteModal() {
        setShowDelete(false);
        setCurrentPrint(null);
        setDeleteView(false);
    }

    useEffect(() => {
        if (!showDelete) {
            allPrintsClick();
        }
    }, [showDelete]);

    return (
        <>
            {currentPrint &&  (
                    <Modal show={showDelete} onHide={handleCloseDeleteModal} >
                    <Modal.Header>
                        <Modal.Title>Delete Print</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <h5>Are you sure you'd like to delete this print from the database?</h5><br />

                        <div className="printData">
                            {currentPrint.image && 
                                <img id="delete-img" src={currentPrint.image}></img>
                            }
                            <p><b>Artist: </b>{currentPrint.artist}</p>
                            <p><b>Catalog #: </b>{currentPrint.catalog_number}</p>
                        </div>

                    </Modal.Body>
                    <Modal.Footer>
                        <button id="cancel" className="btn btn-outline-success" onClick={handleCloseDeleteModal}>Cancel</button>
                        <button id="continue" className="btn btn-danger" onClick={handleDeleteClick}>Delete</button>
                    </Modal.Footer>
                </Modal>
            )}
        </>
    )
}

export default DeletePrint;