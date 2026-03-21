import React from "react";

function OverviewSection({ userData, allPrints, printCount }) {
  const availablePrints = allPrints.filter((print) => print.status === "Available").length;
  const soldPrints = allPrints.filter((print) => print.status === "Sold").length;
  const unavailablePrints = allPrints.filter((print) => print.status === "Unavailable").length;

  function formatDate(dateValue) {
    if (!dateValue) return "N/A";
    return new Date(dateValue).toLocaleDateString();
  }

  return (
    <div id="profile-overview-grid">
      <section className="profile-card">
        <div className="profile-header-row">
          <div className="profile-avatar">{userData?.first_name?.[0] || "A"}</div>
          <div>
            <h5 className="profile-card-title">Account Snapshot</h5>
            <p className="profile-subtle">Overview of your admin account and archive access.</p>
          </div>
        </div>

        <div className="profile-data-grid">
          <div>
            <h6>Full Name</h6>
            <p>{userData && userData.first_name} {userData && userData.last_name}</p>
          </div>
          <div>
            <h6>Email</h6>
            <p>{userData && userData.email}</p>
          </div>
          <div>
            <h6>Role</h6>
            <p>Archive Admin</p>
          </div>
          <div>
            <h6>Member Since</h6>
            <p>{formatDate(userData?.createdAt)}</p>
          </div>
        </div>
      </section>

      <section className="profile-card stats-card">
        <h5 className="profile-card-title">Archive Summary</h5>
        <p className="profile-subtle">Current print inventory at a glance.</p>

        <div className="stats-grid">
          <div className="stat-block">
            <span className="stat-value">{printCount || 0}</span>
            <span className="stat-label">Total Prints</span>
          </div>
          <div className="stat-block">
            <span className="stat-value">{availablePrints}</span>
            <span className="stat-label">Available</span>
          </div>
          <div className="stat-block">
            <span className="stat-value">{soldPrints}</span>
            <span className="stat-label">Sold</span>
          </div>
          <div className="stat-block">
            <span className="stat-value">{unavailablePrints}</span>
            <span className="stat-label">Unavailable</span>
          </div>
        </div>

        <div className="profile-health-row">
          <span>Security Status</span>
          <span className="health-pill">Protected</span>
        </div>
      </section>
    </div>
  );
}

export default OverviewSection;
