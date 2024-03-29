import React from "react";

function NavBar({ isSignedIn, handleSignOut }) {


    return (
        <>
            <div id="navbar">
                {isSignedIn &&
                    <button type="button" id="sign-out-btn" className="btn btn-outline-light" onClick={handleSignOut}>Sign Out</button>
                }
            </div>

                <div id="header-div">
                    <h1 id="header">Chuck Stewart Archive</h1>
                </div>
        </>
    )
}


export default NavBar;