import React, { createContext, useState, useEffect } from "react";
import apiURL from "../api";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
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
            const errorMessage = document.getElementById("error-msg");
            errorMessage.innerHTML = "Incorrect email or password";
            errorMessage.style.color = "red";
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
        // console.log(printData);
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
        setProfileView(true);
        setAllPrintsView(false);
        setAddPrintView(false);
        setSearchView(false);
      }

    return (
        <AppContext.Provider value={{
            isSignedIn, setIsSignedIn,
            email, setEmail,
            password, setPassword,
            userData, setUserData,
            passwordForm, setPasswordForm,
            allPrintsView, setAllPrintsView,
            searchView, setSearchView,
            addPrintView, setAddPrintView,
            deleteView, setDeleteView,
            updateView, setUpdateView,
            profileView, setProfileView,
            allPrints, setAllPrints,
            printCount, setPrintCount,
            newPrintData, setNewPrintData,
            searchQuery, setSearchQuery,
            searchResults, setSearchResults,
            currentPrint, setCurrentPrint,
            handleSignInSubmit,
            handleSignOut,
            updatePassword,
            fetchProfile,
            fetchPrints,
            addPrint,
            validateForm,
            searchPrints,
            deletePrints,
            updatePrint,
            handlePrintClick,
            allPrintsClick,
            addPrintClick,
            searchPrintsClick,
            profileViewClick
        }}>
            {children}
        </AppContext.Provider>
    );
}