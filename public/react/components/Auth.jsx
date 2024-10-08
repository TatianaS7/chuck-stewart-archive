import React, { useContext } from "react";
import { AppContext } from "./AppContext";

import "../styles/auth.css";

function Auth() {
    const { setEmail, setPassword, isSignedIn, handleSignInSubmit } = useContext(AppContext);

    function handleEmailChange(e) {
        setEmail(e.target.value);
        console.log(e.target.value)
    }

    function handlePasswordChange(e) {
        setPassword(e.target.value)
        console.log(e.target.value)
    }


    return (
        <>
            <h5 style={{textAlign: 'center', color: 'white', margin: '30px', fontWeight: '300'}}>Admin Login</h5>

            <form id="admin-login" onSubmit={handleSignInSubmit}>
                <input type="email" id="email" placeholder="Email" required onChange={handleEmailChange}></input>
                <input type="password" id="password" placeholder="Password" required onChange={handlePasswordChange}></input>

                <button type="button" id="sign-in-btn" className="btn btn-outline-light" onClick={handleSignInSubmit}>Enter</button>
            </form>
            
            {!isSignedIn && (
                <div id="error-msg"></div>
            )}
        </>
    )

}

export default Auth;

