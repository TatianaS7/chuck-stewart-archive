import React, { useState, useEffect } from "react";

function NewPrintForm({ setNewPrintData }) {

    function handleFormChange(e) {
        const { name, value } = e.target;
        setNewPrintData({
            [name]: value,
        })
    }

    return (
        <>
            <form id="add-records-form">

                <div id="status-fields">
                    <label for="status">Status</label>
                    <select id="status-dropdown" name="status">
                        <option value="Available">Available</option>
                        <option value="Unavailable">Unavailable</option>
                        <option value="Sold">Sold</option>
                    </select><hr/>
                </div>

            <div id="flex-container">

                <div id="left-side">
                    <label for="catalog_number">Catalog #:</label><br/>
                    <input type="text" id="catalog_number" name="catalog_number" required onChange={handleFormChange}></input><br/>

                    <label for="artist">Artist(s):</label><br/>
                    <input type="text" id="artist" name="artist" required onChange={handleFormChange}></input><br/>

                    <label for="year">Date:</label><br/>
                    <input type="text" id="year" name="date" required onChange={handleFormChange}></input><br/>

                    <label for="">Image:</label><br/>
                    <input type="url" id="image" name="image" onChange={handleFormChange}></input><br/>

                    <label for="size">Size:</label><br/>
                    <input type="text" id="size" name="size" required onChange={handleFormChange}></input><br/>
                </div>

                <div id="right-side">
                    <br/><label for="location">Location:</label><br/>
                    <input type="text" id="location" name="location" onChange={handleFormChange}></input><br/>

                    <label for="instrument">Instrument:</label><br/>
                    <input type="text" id="instrument" name="instrument" onChange={handleFormChange}></input><br/><br/>
                    
                    <label for="notes">Notes:</label><br/>
                    <textarea type="text" id="notes" name="notes" cols="36" rows="3" onChange={handleFormChange}></textarea><br/>

                    <label for="date_sold">Date Sold:</label><br/>
                    <input type="text" id="date_sold" name="date_sold" onChange={handleFormChange}></input>
                </div>

            </div><br/>

            <div id="submit-div">
                <button type="submit" id="submit-record-btn" class="btn btn-outline-light">Submit</button>
            </div>
        </form>
    </>
    )
}

export default NewPrintForm;