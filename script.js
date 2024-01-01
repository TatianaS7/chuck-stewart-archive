const apiBaseUrl = "http://localhost:5501";

//Search Database
document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.querySelector("#search-form");
    const searchInput = document.querySelector("#search-input");    

    const resultsContainer = document.querySelector("#results-container");

function searchDatabase(query) {
    
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

                console.log("Image URL:", record.image);

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
                                <p class="card-text">Year: ${record.year}</p>
                                <p class="card-text">Location: ${record.location || null}</p>
                                <p class="card-text">Instrument: ${record.instrument || null}</p>
                            </div>
                            <div class="right-side">
                                <p class="card-text">Status: ${record.status}</p>
                                <p class="card-text">Notes: ${record.notes || null}</p>
                            </div>
                        </div>
                    </div>
                </div><br>`;
                    })
        } else {
            resultsHTML += "<p style='color: white';>No records found.</p>"
        }
        resultsContainer.innerHTML += resultsHTML;
    })
        .catch(error => {
          console.error("Search error:", error);     
        })
};

    if (searchForm && searchInput) {
        searchForm.addEventListener("submit", function(event) {
            event.preventDefault();
        
            const query = searchInput.value.trim();
        
            if (query !== "") {
                searchDatabase(query);
            }
        })    
    };
});


//Toggle Search Database
const searchDatabaseBtn = document.querySelector("#toggle-search-database");
const searchDBcontent = document.querySelector("#searchDBcontent");

function toggleSearchDB() {
    searchDBcontent.style.display = 'block';
    addRecordsForm.style.display = 'none';
}

searchDatabaseBtn.addEventListener("click", toggleSearchDB);


//Toggle New Records
const addRecordsBtn = document.querySelector("#toggle-add-records");
const addRecordsForm = document.querySelector("#add-records-form");

function toggleNewRecords() {
    addRecordsForm.style.display = 'block';
    searchDBcontent.style.display = 'none';
}

addRecordsBtn.addEventListener("click", toggleNewRecords);

//Add New Records
const statusDropdown = document.querySelector("#status-dropdown");
const printCatalogNumber = document.querySelector("#catalog_number");
const printArtist = document.querySelector("#artist");
const printImage = document.querySelector("#image");
const printYear = document.querySelector("#year");
const printLocation = document.querySelector("#location");
const printSize = document.querySelector("#size");
const printInstrument = document.querySelector("#instrument");
const printNotes = document.querySelector("#notes");

function submitForm() {
    const selectedOption = statusDropdown.value;

        const printData = {
            status: selectedOption,
            catalog_number: printCatalogNumber.value,
            artist: printArtist.value,
            year: printYear.value,
            image: printImage.value,
            location: printLocation.value,
            size: printSize.value,
            instrument: printInstrument.value,
            notes: printNotes.value,
        };
        insertRecord(printData);
    }
    addRecordsForm.addEventListener('submit', function(event) {
        event.preventDefault();
        submitForm();
});

function insertRecord(printData) {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(printData),
    }
    fetch(apiBaseUrl + "/api/database/new", options)
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
        })
        .catch((error) => {
            console.error(error);
        })
    };

