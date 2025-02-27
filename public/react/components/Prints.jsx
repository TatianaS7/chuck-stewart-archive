import React, { useContext } from "react";
import { AppContext } from "./AppContext";

import "../styles/prints.css";

function Prints() {
    const { printCount, isSignedIn, setDeleteView, setUpdateView, allPrints, handlePrintClick } = useContext(AppContext);
    
    function handleDeleteBtnClick(print) {
        handlePrintClick(print);
        setDeleteView(true);
    }

    function handleEditBtnClick(print) {
        handlePrintClick(print);
        setUpdateView(true);
    }
    
    return (
        <>
            {isSignedIn && allPrints && printCount === 0 && (
                <h5 id="no-prints-message">No prints in the database yet!</h5>)}

            {isSignedIn && allPrints && printCount > 0 && (
                <>
                    <h5 id="print-count">Print Count: {printCount}</h5>

                    <div id="prints-container">
                        {allPrints && allPrints.map((print, idx) => (
                            <div className="card" key={idx}>
                                <div className="card-body">
                                    <div className="img-name-catalog">
                                        <div className="header-left">
                                            <div className="thumbnail">
                                                <img src={print.image ? print.image : `/images/default-thumbnail.jpg`} alt={print.catalog_number}></img>
                                            </div>    
                                            <h3 className="card-title">{print.artist} | {print.catalog_number}</h3>
                                        </div>
                                        <div className="control-buttons">
                                            <button id="edit-button" className="btn btn-outline-dark" onClick={() => handleEditBtnClick(print)}>Edit</button>
                                            <button id="delete-button" className="btn btn-outline-danger" onClick={() => handleDeleteBtnClick(print)}>Delete</button>
                                        </div>
                                    </div><hr/>

                                    <div className="data">
                                        <div className="left-side">
                                            <p className="card-text"><b>Size:</b> {print.size}</p>
                                            <p className="card-text"><b>Date:</b> {print.date}</p>
                                            <p className="card-text"><b>Location:</b> {print.location ? print.location : ''}</p>
                                            <p className="card-text"><b>Instrument:</b> {print.instrument ? print.instrument : ''}</p>
                                        </div>    
                                        <div className="right-side">
                                            <p className="card-text"><b>Status:</b> {print.status}</p>
                                            <p className="card-text"><b>Notes:</b> {print.notes ? print.notes : ''}</p>
                                            <p className="card-text"><b>Date Sold:</b> {print.date_sold ? print.date_sold : ''}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    )
}

export default Prints;