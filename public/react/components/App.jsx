import React, { useState, useEffect } from "react";
import Auth from "./Auth";
import NavBar from "./NavBar";
import Prints from "./Prints";
import NewPrintForm from "./NewPrintForm";
import Search from "./Search";
import apiURL from "../api";

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState(null);

  const [allPrintsView, setAllPrintsView] = useState(false);
  const [searchView, setSearchView] = useState(false);
  const [addPrintView, setAddPrintView] = useState(false);

  const [allPrints, setAllPrints] = useState([]);
  const [newPrintData, setNewPrintData] = useState({
    status: "",
    catalog_number: "",
    artist: "",
    image: null,
    date: "",
    size: "",
    location: null,
    instrument: null,
    notes: null,
    date_sold: null,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (isAuthenticated) {
      setIsSignedIn(true);
    }
  }, []);

  // Login Function
  async function handleSignInSubmit() {
    try {
      const res = await fetch(`${apiURL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        throw new Error("Failed to sign in");
      }
      localStorage.setItem("isAuthenticated", "true");
      setIsSignedIn(true);
    } catch (error) {
      console.error("Error signing in", error);
    }
  }

  // Sign Out function
  function handleSignOut() {
    localStorage.removeItem("isAuthenticated");
    setEmail(null);
    setPassword(null);
    setIsSignedIn(false);
  }

  // Fetch All Prints Function
  async function fetchPrints() {
    try {
      const res = await fetch(`${apiURL}/prints/all`);
      const printData = await res.json();

      if (!printData) {
        throw new Error("Error fetching prints");
      }

      setAllPrints(printData);
    } catch (error) {
      console.error("Error fetching prints", error);
    }
  }

  // Add New Print Function
  async function addPrint() {
    try {
      console.log(newPrintData);
      const res = await fetch(`${apiURL}/prints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPrintData),
      });

      const data = await res.json();
      setAllPrints([...allPrints, data]);

      if (!data) {
        throw new Error("Error adding print");
      }
      setNewPrintData({
        status: "",
        catalog_number: "",
        artist: "",
        image: null,
        date: "",
        size: "",
        location: null,
        instrument: null,
        notes: null,
        date_sold: null,
      });
      setAllPrintsView(true);
    } catch (error) {
      console.error("Error adding print", error);
    }
  }

  // Validates Form
  function validateForm() {
    return Object.values(newPrintData).every((value) => value !== "");
  }

  // Search Prints Function
  async function searchPrints(searchQuery) {
    try {
      console.log(searchQuery);
      const encodedQuery = encodeURIComponent(searchQuery);

      const res = await fetch(`${apiURL}/search?query=${encodedQuery}`);
      const data = await res.json();
      console.log(data);
      setSearchResults(data);

      if (!data) {
        throw new Error("No results found");
      }
    } catch (error) {
      console.error("Error searching prints", error);
    }
  }

  // Toggle Views Functions
  function allPrintsClick() {
    fetchPrints();

    setAllPrintsView(true);
    setSearchView(false);
    setAddPrintView(false);
  }

  function addPrintClick() {
    setAddPrintView(true);
    setSearchView(false);
    setAllPrintsView(false);
  }

  function searchPrintsClick() {
    setSearchView(true);
    setAddPrintView(false);
    setAllPrintsView(false);
    setSearchResults([]);
    setSearchQuery("");
  }

  return (
    <main>
      <NavBar isSignedIn={isSignedIn} handleSignOut={handleSignOut} />

      {/* Show Menu When Signed In */}
      {isSignedIn ? (
        <div id="toggle-views">
          <button type="button" className="view-title" onClick={allPrintsClick}>
            All Prints
          </button>
          <button
            type="button"
            className="view-title"
            onClick={searchPrintsClick}
          >
            Search
          </button>
          <button type="button" className="view-title" onClick={addPrintClick}>
            Add Print
          </button>
        </div>
      ) : (
        // Show Sign In Form When Not Signed In
        <Auth
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          handleSignInSubmit={handleSignInSubmit}
        />
      )}

      {/* Show All Prints When Signed In AND All Prints View is Toggled  */}
      {isSignedIn && allPrintsView ? (
        <Prints allPrints={allPrints} isSignedIn={isSignedIn} />
      ) : // Show Add Print Form When Signed In && Add Print view is Toggled
      isSignedIn && addPrintView ? (
        <NewPrintForm
          newPrintData={newPrintData}
          setNewPrintData={setNewPrintData}
          addPrintView={addPrintView}
          addPrint={addPrint}
          validateForm={validateForm}
        />
      ) : (
        // Show Search Bar When Signed In && Search View is Toggled
        isSignedIn &&
        searchView && (
          <Search
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            searchPrints={searchPrints}
          />
        )
      )}
    </main>
  );
}

export default App;
