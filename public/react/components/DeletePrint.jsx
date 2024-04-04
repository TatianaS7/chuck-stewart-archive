import React, { useState, useEffect } from "react";
import { Modal } from 'react-bootstrap'


function DeletePrint({ currentPrint, deletePrints, fetchPrints, allPrintsClick }) {
    const [show, setShow] = useState(false);
    

    useEffect(() => {
        if (currentPrint !== null) {
            setShow(true)
        }    
    }, [currentPrint])

    function handleDeleteClick() {
        deletePrints(currentPrint.catalog_number);
        setShow(false);
        allPrintsClick();
    }

    useEffect(() => {
        fetchPrints();
    }, [deletePrints])

    function handleCloseModal() {
        setShow(false);
    }

    return (
        <>
            {currentPrint &&  (
                    <Modal show={show} onHide={handleCloseModal}>
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
                        <button id="cancel" className="btn btn-outline-success" onClick={handleCloseModal}>Cancel</button>
                        <button id="continue" className="btn btn-danger" onClick={handleDeleteClick}>Delete</button>
                    </Modal.Footer>
                </Modal>
            )}
        </>
    )
}

export default DeletePrint;