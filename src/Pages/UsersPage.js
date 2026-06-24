import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import SortableHeader from "../Components/SortableHeader";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";
import "./UsersPage.css";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  const getUsers = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/auth/users"
      );

      console.log(res.data);

      setUsers(res.data);

    } catch (err) {
      console.log(err);
      alert("Failed to fetch users");
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  const sortedUsers = useMemo(
    () => sortTableRows(users, sortConfig),
    [sortConfig, users],
  );

  const handleSort = (key) => {
    setSortConfig((current) => nextSortConfig(current, key));
  };

  return (
    <div className="enterprise-page users-page">
      <div className="enterprise-container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Access Control</p>
            <h2 className="page-title">Registered Users</h2>
            <p className="page-subtitle">Review user accounts and roles in one clean table.</p>
          </div>
        </div>

        <div className="enterprise-card users-table-card">
          <div className="users-table-toolbar">
            <strong>{sortedUsers.length}</strong>
            <span>Total users</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 custom-table users-table">
              <thead>
                <tr>
                  <SortableHeader
                    label="Name"
                    sortKey="name"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Email"
                    sortKey="email"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Role"
                    sortKey="role"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </tr>
              </thead>

              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-muted">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((user) => (
                    <tr key={user._id || user.email}>
                      <td className="fw-semibold">{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`users-role users-role--${String(user.role || "user").toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
