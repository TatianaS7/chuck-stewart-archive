import React from "react";

function InviteUserSection() {
  return (
    <div className="admin-section-card">
      <h6>Invite User</h6>
      <p>Use this area to add a future invite flow for new admins.</p>
      <div className="admin-placeholder-row">
        <input type="email" placeholder="Email address" disabled />
        <button type="button" className="btn btn-outline-light" disabled>
          Send Invite
        </button>
      </div>
    </div>
  );
}

export default InviteUserSection;
