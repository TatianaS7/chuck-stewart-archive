import React from "react";
import searchIMG from "../../images/search.png";

function Search({ searchQuery, setSearchQuery, searchResults, searchPrints }) {
  function handleFormChange(e) {
    setSearchQuery(e.target.value);
  }

  // Submit Search Function
  function handleSearchSubmit(e) {
    e.preventDefault();
    searchPrints(searchQuery);
  }

  return (
    <>
    {searchResults.length === 0 && (
        <>
            <div id="top-half">
                <form id="search-form">
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
        </>
    )}

    {searchResults.error && 
        <p id="noResults">No Results Found!</p>
    }


      <div id="bottom-half">
        {searchResults.count > 0 && (
            <>
                <h5>{searchResults.count} Results for: "{searchQuery}"</h5>

                <div id="results-container">
                    {searchResults.rows.map((print) => (
                        <div className="card" key={print.catalog_number}>
                            <div className="card-body">
                                <div className="img-name-catalog">
                                    <div className="thumbnail">
                                        <img src={print.image ? print.image : `/images/default-thumbnail.jpg`} alt={print.catalog_number}></img>
                                    </div>
                                    <h3 className="card-title">{print.artist} | {print.catalog_number}</h3>
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
                                        <p className="card-text"><b>Date Sold:</b>{print.date_sold ? print.date_sold : ''}</p>
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
