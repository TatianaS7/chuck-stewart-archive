import React from "react";

function NewPrintForm({ setNewPrintData, addPrint }) {
    
    function handleFormChange(e) {
        const { name, value } = e.target;
        setNewPrintData(prevData => ({
            ...prevData,
            [name]: value,
        }))
    }

    return (
        <>
            <form id="add-records-form">

                <div id="status-fields">
                    <label htmlFor="status">Status</label>
                    <select id="status-dropdown" name="status" onChange={handleFormChange}>
                        <option value="Available">Available</option>
                        <option value="Unavailable">Unavailable</option>
                        <option value="Sold">Sold</option>
                    </select><hr/>
                </div>

            <div id="flex-container">

                <div id="left-side">
                    <label htmlFor="catalog_number">Catalog #:</label><br/>
                    <input type="text" name="catalog_number" required onChange={handleFormChange}></input><br/>

                    <label htmlFor="artist">Artist(s):</label><br/>
                    <input type="text" name="artist" required onChange={handleFormChange}></input><br/>

                    <label htmlFor="image">Image:</label><br/>
                    <input type="url" name="image" onChange={handleFormChange}></input><br/>

                    <label htmlFor="date">Date:</label><br/>
                    <input type="text" name="date" required onChange={handleFormChange}></input><br/>


                    <label htmlFor="size">Size:</label><br/>
                    <input type="text" name="size" onChange={handleFormChange} required></input><br/>
                </div>

                <div id="right-side">
                    <br/><label htmlFor="location">Location:</label><br/>
                    <input type="text" name="location" onChange={handleFormChange}></input><br/>

                    <label htmlFor="instrument">Instrument:</label><br/>
                    <input type="text" name="instrument" onChange={handleFormChange}></input><br/><br/>
                    
                    <label htmlFor="notes">Notes:</label><br/>
                    <textarea type="text" name="notes" cols="36" rows="3" onChange={handleFormChange}></textarea><br/>

                    <label htmlFor="date_sold">Date Sold:</label><br/>
                    <input type="text" name="date_sold" onChange={handleFormChange}></input>
                </div>

            </div><br/>

            <div id="submit-div">
                <button type="button" id="submit-record-btn" className="btn btn-outline-light" onClick={addPrint}>Submit</button>
            </div>
        </form>
    </>
    )
}

export default NewPrintForm;