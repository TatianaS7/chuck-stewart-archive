import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "./AppContext";
import { Modal } from 'react-bootstrap'

import "../styles/updatePrintForm.css";


function UpdatePrintForm({ allPrintsClick, updatePrint, fetchPrints }) {
    const { currentPrint, setCurrentPrint, updateView, setUpdateView } = useContext(AppContext);
    const [show, setShow] = useState(false);
    const [updatedData, setUpdatedData] = useState(null);

    useEffect(() => {
        if (updateView && currentPrint !== null) {
            setShow(true);
            setUpdatedData(currentPrint);
        }
    }, [updateView, currentPrint]);


    function handleFormChange(e) {
        const { name, value, files } = e.target;
        if(name === 'image' && files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = () => {
                setUpdatedData(prevData => ({
                    ...prevData,
                    image: reader.result,
                }))
            };
            reader.readAsDataURL(file);
        } else {
            setUpdatedData(prevData => ({
                ...prevData,
                [name]: value,
            }))
        }
    }

    function handleUpdateClick(updatedData) {
        updatePrint(updatedData.catalog_number, updatedData);
        setShow(false);
    }

    function handleCloseModal() {
        setShow(false);
        setCurrentPrint(null);
        setUpdateView(false);
    }

    useEffect(() => {
        if (!show) {
            fetchPrints();
            allPrintsClick();
        }
    }, [show]);




    return (
        <Modal show={show} onHide={handleCloseModal} size="xl">
            <Modal.Header>
                <Modal.Title>Update Print</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {updatedData && (
                    <form id="add-records-form" style={{color: 'black', fontWeight: '2pt'}}>

                    <div>
                        <label htmlFor="status-dropdown">Status</label><br/>
                        <select id="status-dropdown" name="status" value={updatedData.status} onChange={handleFormChange} required>
                            <option value=''>Select Status</option>
                            <option value="Available">Available</option>
                            <option value="Unavailable">Unavailable</option>
                            <option value="Sold">Sold</option>
                        </select><hr/>
                    </div>

                    <div id="flex-container">

                    <div id="left-side">
                        <label htmlFor="catalog_number">Catalog #:</label><br/>
                        <input type="text" id="catalog_number" name="catalog_number" value={updatedData.catalog_number} onChange={handleFormChange} required></input><br/>

                        <label htmlFor="artist">Artist(s):</label><br/>
                        <input type="text" id="artist" name="artist" value={updatedData.artist} onChange={handleFormChange} required></input><br/>

                        <label htmlFor="image">Image:</label><br/>
                        {updatedData.image && (
                            <div>
                                <img id="img-preview" src={updatedData.image} alt="current"></img><br/>
                                <input type="file" id="image" name="image" accept="image/*" onChange={handleFormChange}></input><br/>
                            </div>
                        )}

                        <label htmlFor="date">Date:</label><br/>
                        <input type="text" id="date" name="date" value={updatedData && updatedData.date} onChange={handleFormChange} required></input><br/>


                        <label htmlFor="size-dropdown">Size:</label><br/>
                        <select id="size-dropdown" name="size" value={updatedData.size} onChange={handleFormChange} required>
                            <option value=''>Select Size</option>
                            <option value='11x14'>11x14</option>
                            <option value='11x14C'>11x14C</option>
                            <option value='16x20'>16x20</option>
                        </select>
                    </div>

                    <div id="right-side">
                        <br/><label htmlFor="location">Location:</label><br/>
                        <input type="text" id="location" name="location" value={updatedData && updatedData.location} onChange={handleFormChange}></input><br/>

                        <label htmlFor="instrument">Instrument:</label><br/>
                        <input type="text" id="instrument" name="instrument" value={updatedData && updatedData.instrument} onChange={handleFormChange}></input><br/><br/>
                        
                        <label htmlFor="notes">Notes:</label><br/>
                        <textarea type="text" id="notes" name="notes" value={updatedData && updatedData.notes} cols="36" rows="3" onChange={handleFormChange}></textarea><br/>

                        <label htmlFor="date_sold">Date Sold:</label><br/>
                        <input type="text" id="date_sold" name="date_sold" value={updatedData && updatedData.date_sold} onChange={handleFormChange}></input>
                    </div>

                    </div><br/>

                    </form>
                )}
            </Modal.Body>
            <Modal.Footer>
                <div id="submit-div" style={{gap: '1em'}}>
                    <button type="submit" id="submit-record-btn" className="btn btn-danger" onClick={handleCloseModal}>Cancel</button>
                    <button type="submit" id="submit-record-btn" className="btn btn-dark" onClick={() => handleUpdateClick(updatedData)}>Save</button>
                </div>
            </Modal.Footer>
        </Modal>


    )
}

export default UpdatePrintForm