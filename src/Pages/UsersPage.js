import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import SortableHeader from "../Components/SortableHeader";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";

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
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        padding: "40px",
        color: "white",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          marginBottom: "40px",
        }}
      >
        Registered Users
      </h1>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#1e293b",
        }}
      >
        <thead>
          <tr>
            <SortableHeader
              label="Name"
              sortKey="name"
              sortConfig={sortConfig}
              onSort={handleSort}
              style={thStyle}
            />
            <SortableHeader
              label="Email"
              sortKey="email"
              sortConfig={sortConfig}
              onSort={handleSort}
              style={thStyle}
            />
            <SortableHeader
              label="Role"
              sortKey="role"
              sortConfig={sortConfig}
              onSort={handleSort}
              style={thStyle}
            />
          </tr>
        </thead>

        <tbody>
          {sortedUsers.map((user, index) => (
            <tr key={index}>
              <td style={tdStyle}>{user.name}</td>
              <td style={tdStyle}>{user.email}</td>
              <td style={tdStyle}>{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = {
  border: "1px solid #334155",
  padding: "15px",
  background: "#334155",
  textAlign: "center",
};

const tdStyle = {
  border: "1px solid #334155",
  padding: "15px",
  textAlign: "center",
};

export default UsersPage;
