import React, { useState, useEffect } from "react";
import Auth from "./Auth";
import NavBar from "./NavBar";
import Prints from "./Prints";
import apiURL from "../api";

function App() {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [loginView, setLoginView] = useState(false);
    const [email, setEmail] = useState(null);
    const [password, setPassword] = useState(null);

    const [allPrints, setAllPrints] = useState([]);


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
    useEffect(() => {
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
        if (isSignedIn) {
            fetchPrints();    
        }
    }, [isSignedIn])

    // Sign Out function
    function handleSignOut() {
        setEmail(null);
        setPassword(null)
        setIsSignedIn(false)
    };

    
    return (
        <main>
            <NavBar isSignedIn={isSignedIn} handleSignOut={handleSignOut} />

            {!isSignedIn ? 
                <Auth email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleSignInSubmit={handleSignInSubmit} />
            :
                <Prints allPrints={allPrints} isSignedIn={isSignedIn} />
            }
        </main>
    )
}


export default App;