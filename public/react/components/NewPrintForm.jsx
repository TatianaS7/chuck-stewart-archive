import React from "react";

import "../styles/NewPrintForm.css";

function NewPrintForm({ validateForm, setNewPrintData, addPrint, allPrintsClick }) {
    
    function handleFormChange(e) {
        const { name, value } = e.target;
        setNewPrintData(prevData => ({
            ...prevData,
            [name]: value,
        }))
    }

    function handleNewPrintSubmit() {
        addPrint();
        allPrintsClick();
    }

    return (
        <>
            <form id="add-records-form">

                <div id="status-fields">
                    <label htmlFor="status-dropdown">Status</label>
                    <select id="status-dropdown" name="status" onChange={handleFormChange} required>
                        <option value=''>Select Status</option>
                        <option value="Available">Available</option>
                        <option value="Unavailable">Unavailable</option>
                        <option value="Sold">Sold</option>
                    </select><hr/>
                </div>

            <div id="flex-container">

                <div id="left-side">
                    <label htmlFor="catalog_number">Catalog #:</label><br/>
                    <input type="text" id="catalog_number" name="catalog_number" onChange={handleFormChange} required></input><br/>

                    <label htmlFor="artist">Artist(s):</label><br/>
                    <input type="text" id="artist" name="artist" onChange={handleFormChange} required></input><br/>

                    <label htmlFor="image">Image:</label><br/>
                    <input type="url" id="image" name="image" onChange={handleFormChange}></input><br/>

                    <label htmlFor="date">Date:</label><br/>
                    <input type="text" id="date" name="date" onChange={handleFormChange} required></input><br/>


                    <label htmlFor="size-dropdown">Size:</label><br/>
                    <select id="size-dropdown" name="size" onChange={handleFormChange} required>
                        <option value=''>Select Size</option>
                        <option value='11x14'>11x14</option>
                        <option value='11x14C'>11x14C</option>
                        <option value='16x20'>16x20</option>
                    </select>
                </div>

                <div id="right-side">
                    <br/><label htmlFor="location">Location:</label><br/>
                    <input type="text" id="location" name="location" onChange={handleFormChange}></input><br/>

                    <label htmlFor="instrument">Instrument:</label><br/>
                    <input type="text" id="instrument" name="instrument" onChange={handleFormChange}></input><br/><br/>
                    
                    <label htmlFor="notes">Notes:</label><br/>
                    <textarea type="text" id="notes" name="notes" cols="36" rows="3" onChange={handleFormChange}></textarea><br/>

                    <label htmlFor="date_sold">Date Sold:</label><br/>
                    <input type="text" id="date_sold" name="date_sold" onChange={handleFormChange}></input>
                </div>

            </div><br/>

            <div id="submit-div">
                <button type="submit" id="submit-record-btn" className="btn btn-outline-light" onClick={handleNewPrintSubmit} disabled={!validateForm()}>Submit</button>
            </div>
        </form>
    </>
    )
}

export default NewPrintForm;