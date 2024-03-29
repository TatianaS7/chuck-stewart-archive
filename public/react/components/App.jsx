import React, { useState, useEffect } from "react";
import Auth from "./Auth";
import NavBar from "./NavBar";
import Prints from "./Prints";
import NewPrintForm from "./NewPrintForm";
import apiURL from "../api";

function App() {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [email, setEmail] = useState(null);
    const [password, setPassword] = useState(null);

    const [allPrintsView, setAllPrintsView] = useState(false);
    const [searchView, setSearchView] = useState(false);
    const [addPrintView, setAddPrintView] = useState(false)

    const [allPrints, setAllPrints] = useState([]);
    const [newPrintData, setNewPrintData] = useState([{
        catalog_number: '',
        artist: '',
        image: null,
        date: '',
        location: null,
        size: '',
        instrument: null,
        status: '',
        notes: null,
        date_sold: null
    }]);


    // Login Function
    async function handleSignInSubmit() {
        try {
            const res = await fetch(`${apiURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email,password })
            })
            if (!res.ok) {
                throw new Error('Failed to sign in');
            }
            setIsSignedIn(true);
            setLoginView(false)
        } catch (error) {
            console.error('Error signing in', error)
        }
    }

    // Fetch All Prints Function
    async function fetchPrints() {
        try {
            const res = await fetch(`${apiURL}/prints/all`);
            const printData = await res.json();

            if(!printData) {
                throw new Error('Error fetching prints')
            }
                
            setAllPrints(printData)
        } catch (error) {
            console.error('Error fetching prints')
        }
    }



    // Sign Out function
    function handleSignOut() {
        setEmail(null);
        setPassword(null)
        setIsSignedIn(false)
    };

    // Toggle Views Functions
    function allPrintsClick() {
        fetchPrints()

        setAllPrintsView(true);
        setSearchView(false)
        setAddPrintView(false);
    }
    
    function addPrintClick() {
        setAddPrintView(true);
        setSearchView(false);
        setAllPrintsView(false)
    };

    function searchPrintsClick() {
        setSearchView(true);
        setAddPrintView(false);
        setAllPrints(false)
    } 

    
    return (
        <main>
            <NavBar isSignedIn={isSignedIn} handleSignOut={handleSignOut} />

            {isSignedIn &&
                <div id="toggle-views">
                    <button type="button" className="view-title" onClick={allPrintsClick} >All Prints</button>
                    <button type="button" className="view-title" onClick={searchPrintsClick}>Search</button>
                    <button type="button" className="view-title" onClick={addPrintClick}>Add Print</button>
                </div>
            }

            {!isSignedIn ? 
                <Auth email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleSignInSubmit={handleSignInSubmit} />
            : isSignedIn && allPrintsView ?
                <Prints allPrints={allPrints} isSignedIn={isSignedIn} />
            : isSignedIn && addPrintView ?
                <NewPrintForm setNewPrintData={setNewPrintData} addPrintView={addPrintView}/>
            : isSignedIn && searchView &&
                <p>Search Coming Soon!</p>
            }

        </main>
    )
}


export default App;