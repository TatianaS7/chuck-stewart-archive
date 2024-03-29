import React, {useState, useEffect} from "react";

function Prints({ allPrints, isSignedIn }) {

    
    return (
        <>
            <div id="prints-container">

            {isSignedIn && allPrints && 
                allPrints.map((print, idx) => (
                    <div className="card" key={idx}>
                        <div className="card-body">
                            <div className="img-name-catalog">
                                <div className="thumbnail">
                                    <img src={print.image ? print.image : `/images/default-thumbnail.jpg`} alt="thumbnail"></img>
                                </div>    
                                <h3 className="card-title">{print.artist} | {print.catalog_number}</h3>
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
                                    <p className="card-text"><b>Date Sold:</b>{print.date_sold ? print.date_sold : ''}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            }

            </div>
        </>
    )
}

export default Prints;