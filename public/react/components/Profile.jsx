import React, { useEffect, useState } from "react";
import { Modal } from 'react-bootstrap'

function Profile({ profileView, setProfileView, userData, email, password, fetchProfile }) {
    const [show, setShow] = useState(false);

    function handlePWClick() {
        setShow(true)
    }

    function handleCloseModal() {
        setShow(false)
    }

    return (
        <>
            {profileView && (
                <>
                    <h1 className="view-title">User Profile</h1>
                    
                    <div id="user-data-div">
                        <div id="user-profile-data">
                            <h5>Full Name</h5>
                            <p>{userData && userData.first_name} {userData && userData.last_name}</p>
                            
                            <h5>Email</h5>
                            <p>{userData && userData.email}</p>
                        </div>

                        <div id="password-div">
                            <h5>Password</h5>
                            <button id="change-pw" className="btn btn-light" onClick={() => handlePWClick()}>Change Password</button>
                        </div>
                    </div>
                </>
            )}

            <Modal show={show} onHide={handleCloseModal}>
                <Modal.Header>
                    <Modal.Title>Update Password</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <form id="updatePW">
                        <label htmlFor="current-password">Current Password</label><br/>
                        <input type="password" name="current-password"></input><br/>

                        <label htmlFor="new-password">New Password</label><br/>
                        <input type="password" name="new-password"></input><br/>

                        <label htmlFor="confirmed-password">Confirm Password</label><br/>
                        <input type="password" name="confirmed-password"></input>
                    </form>
                    </Modal.Body>

                    <Modal.Footer>
                        <button type="button" className="btn btn-outline-danger" onClick={handleCloseModal} >Cancel</button>
                        <button type="button" className="btn btn-light">Submit</button>
                    </Modal.Footer>
            </Modal>
        </>
    )
}


export default Profile;