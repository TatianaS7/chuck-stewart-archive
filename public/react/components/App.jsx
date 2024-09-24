import React, { useState, useEffect } from "react";
import apiURL from "../api";

import Auth from "./Auth";
import Profile from "./Profile";
import NavBar from "./NavBar";
import Prints from "./Prints";
import NewPrintForm from "./NewPrintForm";
import Search from "./Search";
import DeletePrint from "./DeletePrint";
import UpdatePrintForm from "./UpdatePrintForm";


function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState(null);
  const [userData, setUserData] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    email: email,
    current_password: "",
    new_password: "",
    confirm_password: ""
  });


  const [allPrintsView, setAllPrintsView] = useState(true);
  const [searchView, setSearchView] = useState(false);
  const [addPrintView, setAddPrintView] = useState(false);
  const [deleteView, setDeleteView] = useState(false);
  const [updateView, setUpdateView] = useState(false);
  const [profileView, setProfileView] = useState(false);

  const [allPrints, setAllPrints] = useState([]);
  const [printCount, setPrintCount] = useState(0);

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

  const [currentPrint, setCurrentPrint] = useState(null);


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
      setAllPrintsView(true);
      await fetchProfile();
      await fetchPrints();

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

  // Update User Password
  async function updatePassword() {
    try {
      const res = await fetch(`${apiURL}/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordForm)
      });
      const data = await res.json();
      console.log(data);
    } catch (error) {
      console.error('Error updating password', error)
    }
  }

  // Get User Profile
  async function fetchProfile() {
    try {
      const res = await fetch(`${apiURL}/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!data) {
        throw new Error('Error fetching profile');
      }
      console.log(data);
      setUserData(data);
    } catch (error) {
      console.error('Error fetching prints', error)
    }
  }


// Fetch All Prints Function
async function fetchPrints() {
  try {
    const res = await fetch(`${apiURL}/prints/all`);
    const printData = await res.json();

    if (!printData) {
      throw new Error("Error fetching prints");
    }
    console.log(printData);
    setAllPrints(printData.allPrints);
    setPrintCount(printData.count);
  } catch (error) {
    console.error("Error fetching prints", error);
  }
}

useEffect(() => {
  fetchPrints();
}, []);

  // Add New Print Function
  async function addPrint() {
    try {
      const res = await fetch(`${apiURL}/prints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPrintData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error adding print: ${errorText}`);
      }

      const data = await res.json();
      console.log(data)
      setAllPrints([...allPrints, data]);
      setPrintCount(printCount + 1);

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
    } catch (error) {
      console.error("Error adding print", error);
    }
  }

  // Validates New Print Form
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


  //Delete Print Function
  async function deletePrints(catalog_number) {
    try {
      console.log(catalog_number);
      const res = await fetch(`${apiURL}/prints/${catalog_number}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      console.log(data)
    } catch (error) {
      console.error('Error deleting print', error)
    }
  }


  // Update Print Function
  async function updatePrint(catalog_number, updatedData) {
    try {
      const res = await fetch(`${apiURL}/prints/update/${catalog_number}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      })
      const data = await res.json();  
      console.log(data);
      setAllPrints([...allPrints, data])
      await fetchPrints();

      if (!data) {
        throw new Error("Error adding print");
      }

    } catch (error) {
      console.error('Error updating print', error)
    }
  }



  // Sets Current Print
  function handlePrintClick(print) {
    console.log(print);
    setCurrentPrint(print);
  }


  // Toggle Views Functions
  function allPrintsClick() {
    fetchPrints();

    setAllPrintsView(true);
    setSearchView(false);
    setAddPrintView(false);
    setProfileView(false);
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

  function profileViewClick() {
    setProfileView(!profileView);
    setAllPrintsView(false);
    setAddPrintView(false);
    setSearchView(false);
  }


  return (
    <main>
      <NavBar isSignedIn={isSignedIn} handleSignOut={handleSignOut} profileViewClick={profileViewClick} />

      <DeletePrint 
        currentPrint={currentPrint} 
        setCurrentPrint={setCurrentPrint} 
        deletePrints={deletePrints} 
        allPrintsClick={allPrintsClick} 
        deleteView={deleteView} 
        setDeleteView={setDeleteView}  />
      <UpdatePrintForm 
        currentPrint={currentPrint}
        setCurrentPrint={setCurrentPrint} 
        allPrintsClick={allPrintsClick} 
        updatePrint={updatePrint} 
        validateForm={validateForm}
        updateView={updateView}
        setUpdateView={setUpdateView}
        fetchPrints={fetchPrints}
      />

      {/* Show Menu When Signed In */}
      {isSignedIn ? (
        <div id="toggle-views">
          <button type="button" className="view-title" onClick={allPrintsClick}>
            All Prints
          </button>
          <button type="button" className="view-title" onClick={searchPrintsClick}>
            Search
          </button>
          <button type="button" className="view-title" onClick={addPrintClick}>
            Add Print
          </button>
        </div>
      ) : !isSignedIn && (
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
        <Prints 
          allPrints={allPrints} 
          printCount={printCount}
          isSignedIn={isSignedIn} 
          handlePrintClick={handlePrintClick} 
          setDeleteView={setDeleteView}
          setUpdateView={setUpdateView}
        />
      ) : // Show Add Print Form When Signed In && Add Print view is Toggled
      isSignedIn && addPrintView ? (
        <NewPrintForm
          newPrintData={newPrintData}
          setNewPrintData={setNewPrintData}
          addPrintView={addPrintView}
          addPrint={addPrint}
          validateForm={validateForm}
          allPrintsClick={allPrintsClick}
        />
      ) : 
        // Show Search Bar When Signed In && Search View is Toggled
        isSignedIn && searchView ? (
          <Search
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            searchPrints={searchPrints}
            handlePrintClick={handlePrintClick}
            setDeleteView={setDeleteView}
            setUpdateView={setUpdateView}
          />
        ) : 
        // Show Profile When Signed In & Profile View is Toggled
        isSignedIn && profileView && (
          <Profile profileView={profileView} setProfileView={setProfileView} userData={userData} email={email} password={password} fetchProfile={fetchProfile} passwordForm={passwordForm} setPasswordForm={setPasswordForm} updatePassword={updatePassword} />
      )}
    </main>
  );
}

export default App;
