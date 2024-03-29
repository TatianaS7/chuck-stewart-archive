import React, { useState, useEffect } from "react";

function Auth({ setEmail, setPassword, handleSignInSubmit }) {
    function handleEmailChange(e) {
        setEmail(e.target.value);
    }

    function handlePasswordChange(e) {
        setPassword(e.target.value)
    }


    return (
        <>
            <h5 style={{textAlign: 'center', color: 'white', margin: '30px', fontWeight: '300'}}>Admin Login</h5>

            <form id="admin-login" onSubmit={handleSignInSubmit}>
                <input type="email" id="email" placeholder="Email" required onChange={handleEmailChange}></input>
                <input type="password" id="password" placeholder="Password" required onChange={handlePasswordChange}></input>

                <button type="button" id="sign-in-btn" className="btn btn-outline-light" onClick={handleSignInSubmit}>Enter</button>
            </form>
        </>
    )

}

export default Auth;

