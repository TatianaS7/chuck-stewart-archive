import React from "react";
import avatar from '../../images/avatar.png'; 

function NavBar({ isSignedIn, handleSignOut, profileViewClick }) {


    return (
        <>
            <div id="navbar">
                {isSignedIn && (
                    <>
                        <button type="button" id="profile-btn" onClick={profileViewClick}><img src={avatar} id="avatar-icon"></img></button>
                        <button type="button" id="sign-out-btn" className="btn btn-outline-light" onClick={handleSignOut}>Sign Out</button>
                    </>
                )}
            </div>

                <div id="header-div">
                    <h1 id="header">Chuck Stewart Archive</h1>
                </div>
        </>
    )
}


export default NavBar;