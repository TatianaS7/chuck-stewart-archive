const apiBaseUrl = "http://localhost:5501";

const searchForm = document.querySelector("#search-form");
const searchButton = document.querySelector("#search-button");
const searchInput = document.querySelector("#search-input");
const resultsContainer = document.querySelector("#results-container");

function searchDatabase(query) {
    // const response = getresponse();

    const options = {
        method: "GET",
    };

    resultsContainer.innerHTML = "";
    
    fetch(apiBaseUrl + `/api/database/search?q=${encodeURIComponent(query)}`, options)
        .then(response => response.json())
        .then(searchResults => {
            console.log(searchResults);

            let resultsHTML = "";
        if (searchResults.search && searchResults.search.length > 0) {
            searchResults.search.forEach(record => {
    
                resultsHTML += `
                <div class="card">
                    <div class="card-body">
                        <div class="img-name-catalog">
                            <div class="thumbnail">
                                <img src="${record.image || `/images/default-thumbnail.jpg`}" alt="thumbnail">
                            </div>    
                            <h5 class="card-title">${record.artist} | ${record.catalog_number}</h5>
                        </div>
                        <div class="photo-data">
                            <div class="left-side">
                                <p class="card-text">Size: ${record.size}</p>
                                <p class="card-text">Year: ${record.year} | Location: ${record.location || null}</p>
                                <p class="card-text">Instrument: ${record.instrument || null}</p>
                            </div>
                            <div class="right-side">
                                <p class="card-text">Status: ${record.status}</p>
                                <p class="card-text">Notes: ${record.notes || null}</p>
                            </div>
                        </div>
                    </div>
                </div><br>`;
            });
        } else {
            resultsHTML += "<p style='color: white';>No records found</p>"
        }
        resultsContainer.innerHTML += resultsHTML;
    })
        .catch(error => {
          console.error("Search error:", error);     
        })
};


searchButton.addEventListener("click", function(event) {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (query !== "") {
        searchDatabase(query);
    }
});