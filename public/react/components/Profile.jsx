import React, { useEffect, useState } from "react";
import { Modal } from 'react-bootstrap'

function Profile({ profileView, userData, password, email, fetchProfile, passwordForm, setPasswordForm, updatePassword }) {
    const [show, setShow] = useState(false);
    const [successfulChange, setSuccessfulChange] = useState(null);    

    function handlePWClick() {
        setShow(true)
    }

    function handleCloseModal() {
        setShow(false)
        setSuccessfulChange(null)
    }

    function handleFormChange(e) {
        const { name, value } = e.target;
        setPasswordForm({
            ...passwordForm,
            [name]: value
        })
    }

    async function handlePasswordSubmit() {
        try {
            if(passwordForm.new_password !== passwordForm.confirm_password) {
                console.error("Passwords do not match");
                return;
            }
            await updatePassword(email, passwordForm);
            setSuccessfulChange(true);
            // setShow(false);
        } catch (error) {
            setSuccessfulChange(false);
            console.error('Error updating password', error)
        }
    }

    return (
        <>
            {profileView && (
                <>
                    <h1 className="view-title">User Profile</h1>
                    
                    <div id="user-data-div">
                        <div id="user-profile-data">
                            <h6>Full Name</h6>
                            <p>{userData && userData.first_name} {userData && userData.last_name}</p>
                            
                            <h6>Email</h6>
                            <p>{userData && userData.email}</p>
                        </div>

                        <div id="password-div">
                            <h6>Password</h6>
                            <button id="change-pw" className="btn btn-outline-light" onClick={() => handlePWClick()}>Change Password</button>
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
                        <div>
                            <label htmlFor="current_password">Current Password</label><br/>
                            <input type="password" id="current_password" name="current_password" onChange={handleFormChange}></input><br/>
                        </div>

                        <div>
                            <label htmlFor="new_password">New Password</label><br/>
                            <input type="password" name="new_password" onChange={handleFormChange}></input><br/>

                            <label htmlFor="confirm_password">Confirm Password</label><br/>
                            <input type="password" name="confirm_password" onChange={handleFormChange}></input>
                        </div>
                    </form>
                    <div id="change-response">
                        {successfulChange ? 
                        <p style={{color: 'green'}}>Password Changed Successfully</p>
                        : successfulChange === false &&
                        <p style={{color: 'red'}}>Password Change Unsuccessful</p>
                        }

                    </div>
                    </Modal.Body>

                    <Modal.Footer>
                        {successfulChange === null ?
                            <>
                                <button type="button" className="btn btn-outline-danger" onClick={handleCloseModal} >Cancel</button>
                                <button type="button" className="btn btn-dark" onClick={handlePasswordSubmit}>Submit</button>
                            </>
                            : successfulChange && 
                            <button type="button" className="btn btn-dark" onClick={handleCloseModal}>Close</button> 
                        }
                    </Modal.Footer>
            </Modal>
        </>
    )
}


export default Profile;