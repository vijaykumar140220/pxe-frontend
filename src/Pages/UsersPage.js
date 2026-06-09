import React, { useEffect, useState } from "react";
import axios from "axios";

const UsersPage = () => {
  const [users, setUsers] = useState([]);

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
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Role</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user, index) => (
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
};

const tdStyle = {
  border: "1px solid #334155",
  padding: "15px",
  textAlign: "center",
};

export default UsersPage;