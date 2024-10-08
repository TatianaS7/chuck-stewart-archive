import React, { useContext } from "react";
import { AppContext } from "./AppContext";

import "../styles/search.css";
import searchIMG from "../../images/search.png";

function Search() {
    const { searchPrints, handlePrintClick, searchQuery, setSearchQuery, searchResults, setDeleteView, setUpdateView } = useContext(AppContext);
    
    function handleFormChange(e) {
        setSearchQuery(e.target.value);
    }

    // Submit Search Function
    function handleSearchSubmit(e) {
        e.preventDefault();
        searchPrints(searchQuery);
    }

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
            <div id="top-half">
                <form id="search-form" onSubmit={handleSearchSubmit}>
                    <input
                    id="search-input"
                    name="search-input"
                    placeholder="Artist, Date, Year, Location, Instrument, Size"
                    onChange={handleFormChange}
                    ></input>
                    <button
                    type="submit"
                    id="search-button"
                    className="btn btn-outline-light"
                    onClick={handleSearchSubmit}
                    >
                    <img src={searchIMG} alt="search" />
                    </button>
                </form>
            </div>

    {searchResults.error && 
        <p id="noResults">No print results!</p>
    }


      <div id="bottom-half">
        {searchResults.count > 0 && (
            <>
                <h5>{searchResults.count} Result(s) for: "{searchQuery}"</h5>

                <div id="results-container">
                    {searchResults.rows.map((print) => (
                        <div className="card" key={print.catalog_number}>
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
                                </div><hr />
        
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
        </div>
    </>
  );
}

export default Search;
