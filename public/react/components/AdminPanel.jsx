import React from "react";

function AdminPanel({ activeSection, onSectionChange }) {
	const items = [
		{ key: "profile", label: "Overview" },
		{ key: "changeLog", label: "View Change Log" },
		{ key: "bulkUpload", label: "Bulk Upload" },
		{ key: "inviteUser", label: "Invite New User" },
		{ key: "updateUser", label: "Update User Information" },
	];

	return (
		<aside id="admin-panel">
			<h5 id="admin-panel-title">Admin Panel</h5>

			<div id="admin-panel-buttons">
				{items.map((item) => (
					<button
						key={item.key}
						type="button"
						className={`admin-panel-btn ${activeSection === item.key ? "is-active" : ""}`}
						onClick={() => onSectionChange(item.key)}
					>
						{item.label}
					</button>
				))}
			</div>
		</aside>
	);
}

export default AdminPanel;
