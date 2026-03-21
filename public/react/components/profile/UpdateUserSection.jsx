import React from "react";

function UpdateUserSection({ userData, onChangePassword }) {
  return (
    <div className="admin-section-card">
      <h6>Update User Information</h6>
      <p>Current admin account details:</p>
      <p>
        <b>Name:</b> {userData && userData.first_name}{" "}
        {userData && userData.last_name}
      </p>
      <p>
        <b>Email:</b> {userData && userData.email}
      </p>
      <p className="admin-subtle">
        A full user edit form can be connected here when backend endpoints are
        ready.
      </p>

      <div className="profile-quick-actions">
        <button id="change-pw" className="btn btn-outline-light" onClick={onChangePassword}>
          Change Password
        </button>
      </div>
    </div>
  );
}

export default UpdateUserSection;
