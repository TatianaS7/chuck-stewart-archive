import React, { useState, useContext } from "react";
import { AppContext } from "./AppContext";
import AdminPanel from "./AdminPanel";
import OverviewSection from "./profile/OverviewSection";
import ChangeLogSection from "./profile/ChangeLogSection";
import BulkUploadSection from "./profile/BulkUploadSection";
import InviteUserSection from "./profile/InviteUserSection";
import UpdateUserSection from "./profile/UpdateUserSection";
import PasswordModal from "./profile/PasswordModal";

import "../styles/profile.css";

function Profile() {
    const { updatePassword, profileView, userData, email, passwordForm, setPasswordForm, allPrints, printCount } = useContext(AppContext);
    const [show, setShow] = useState(false);
    const [successfulChange, setSuccessfulChange] = useState(null);
    const [activeSection, setActiveSection] = useState("profile");

    function handlePWClick() {
        setShow(true)
    }

    function handleCloseModal() {
        setShow(false)
        setSuccessfulChange(null)
    }

    async function handlePasswordSubmit() {
        try {
            if(passwordForm.new_password !== passwordForm.confirm_password) {
                console.error("Passwords do not match");
                setSuccessfulChange(false);
                return;
            }
            await updatePassword(email, passwordForm);
            setSuccessfulChange(true);
        } catch (error) {
            setSuccessfulChange(false);
            console.error('Error updating password', error)
        }
    }

    function renderAdminSection() {
        if (activeSection === "changeLog") {
            return <ChangeLogSection />;
        }

        if (activeSection === "bulkUpload") {
            return <BulkUploadSection />;
        }

        if (activeSection === "inviteUser") {
            return <InviteUserSection />;
        }

        if (activeSection === "updateUser") {
            return <UpdateUserSection userData={userData} onChangePassword={handlePWClick} />;
        }

        return <OverviewSection userData={userData} allPrints={allPrints} printCount={printCount} />;
    }

    return (
        <>
            {profileView && (
                <>
                    <h1 className="view-title">Admin Controls</h1>
                    
                    <div id="profile-layout">
                        <AdminPanel activeSection={activeSection} onSectionChange={setActiveSection} />

                        <div id="user-data-div">
                            {renderAdminSection()}
                        </div>
                    </div>
                </>
            )}

            <PasswordModal
                show={show}
                successfulChange={successfulChange}
                passwordForm={passwordForm}
                setPasswordForm={setPasswordForm}
                onClose={handleCloseModal}
                onSubmit={handlePasswordSubmit}
            />
        </>
    )
}


export default Profile;