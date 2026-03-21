import React, { useEffect, useState } from "react";
import apiURL from "../../api";

function ChangeLogSection() {
  const [changeLog, setChangeLog] = useState([]);
  const [isLoadingChangeLog, setIsLoadingChangeLog] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [logFilters, setLogFilters] = useState({
    action: "ALL",
    user: "",
    catalog: "",
    from: "",
    to: "",
  });

  useEffect(() => {
    async function loadChangeLog() {
      setIsLoadingChangeLog(true);
      try {
        const query = new URLSearchParams();
        if (logFilters.action && logFilters.action !== "ALL")
          query.append("action", logFilters.action);
        if (logFilters.user.trim())
          query.append("user", logFilters.user.trim());
        if (logFilters.catalog.trim())
          query.append("catalog", logFilters.catalog.trim());
        if (logFilters.from) query.append("from", logFilters.from);
        if (logFilters.to) query.append("to", logFilters.to);

        const url = query.toString()
          ? `${apiURL}/prints/change-log?${query.toString()}`
          : `${apiURL}/prints/change-log`;

        const res = await fetch(url, {
          credentials: "include",
        });
        const data = await res.json();
        setChangeLog(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading change log", error);
        setChangeLog([]);
      } finally {
        setIsLoadingChangeLog(false);
      }
    }

    loadChangeLog();
  }, [logFilters]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setLogFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function clearLogFilters() {
    setLogFilters({
      action: "ALL",
      user: "",
      catalog: "",
      from: "",
      to: "",
    });
  }

  function handleSort(key) {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  }

  function getSortIndicator(key) {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  }

  function getSortedChangeLog() {
    const rows = [...changeLog];
    const { key, direction } = sortConfig;

    rows.sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      if (key === "createdAt") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }

  return (
    <div className="admin-section-card">
      <h6>Recent Change Log</h6>

      <div className="log-filters-grid">
        <select
          name="action"
          value={logFilters.action}
          onChange={handleFilterChange}
        >
          <option value="ALL">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>

        <input
          type="text"
          name="user"
          placeholder="Filter by user"
          value={logFilters.user}
          onChange={handleFilterChange}
        />

        <input
          type="text"
          name="catalog"
          placeholder="Filter by catalog #"
          value={logFilters.catalog}
          onChange={handleFilterChange}
        />

        <input
          type="date"
          name="from"
          value={logFilters.from}
          onChange={handleFilterChange}
        />

        <input
          type="date"
          name="to"
          value={logFilters.to}
          onChange={handleFilterChange}
        />

        <button
          type="button"
          className="btn btn-outline-light"
          onClick={clearLogFilters}
        >
          Clear Filters
        </button>
      </div>

      {isLoadingChangeLog ? (
        <p>Loading change log...</p>
      ) : changeLog.length === 0 ? (
        <p>No change log entries yet.</p>
      ) : (
        <div className="change-log-table-wrapper">
          <table className="change-log-table">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    className="log-sort-btn"
                    onClick={() => handleSort("createdAt")}
                  >
                    Timestamp {getSortIndicator("createdAt")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="log-sort-btn"
                    onClick={() => handleSort("action")}
                  >
                    Action {getSortIndicator("action")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="log-sort-btn"
                    onClick={() => handleSort("changed_by_name")}
                  >
                    Name {getSortIndicator("changed_by_name")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="log-sort-btn"
                    onClick={() => handleSort("changed_by_email")}
                  >
                    Email {getSortIndicator("changed_by_email")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="log-sort-btn"
                    onClick={() => handleSort("description")}
                  >
                    Description {getSortIndicator("description")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedChangeLog().map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.action}</td>
                  <td>{entry.changed_by_name}</td>
                  <td>{entry.changed_by_email}</td>
                  <td>{entry.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ChangeLogSection;
