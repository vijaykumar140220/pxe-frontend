import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiEdit2,
  FiKey,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiTrash2,
  FiUserCheck,
  FiX,
} from "react-icons/fi";
import SortableHeader from "../Components/SortableHeader";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";
import "./SettingsPage.css";

const USERS_API_URL = "http://127.0.0.1:5000/auth/users";

const emptyForm = {
  name: "",
  employeeId: "",
  email: "",
  mobile: "",
  department: "",
  designation: "",
  role: "user",
};

const emptyPasswordForm = {
  newPassword: "",
  confirmPassword: "",
};

const fieldPlaceholders = {
  name: "Enter full name",
  employeeId: "Enter employee ID",
  email: "Enter email address",
  mobile: "Enter mobile number",
  department: "Enter department",
  designation: "Enter designation",
  newPassword: "Enter new password",
  confirmPassword: "Confirm new password",
};

const columns = [
  { key: "name", label: "Name" },
  { key: "employeeId", label: "Employee ID" },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "role", label: "Role" },
];

const toForm = (user) => ({
  name: user.name || "",
  employeeId: user.employeeId || "",
  email: user.email || "",
  mobile: user.mobile || "",
  department: user.department || "",
  designation: user.designation || "",
  role: String(user.role || "user").toLowerCase(),
});

const SettingsPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  const fetchUsers = useCallback(async (notify = false) => {
    try {
      setLoading(true);
      const response = await axios.get(USERS_API_URL);
      setUsers(Array.isArray(response.data) ? response.data : []);
      if (notify) toast.success("Register credentials refreshed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load register credentials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matchingUsers = !term ? users : users.filter((user) =>
      [user.name, user.employeeId, user.email, user.mobile, user.department, user.designation, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );

    return sortTableRows(matchingUsers, sortConfig);
  }, [search, sortConfig, users]);

  const handleSort = (key) => {
    setSortConfig((current) => nextSortConfig(current, key));
  };

  const closeEditor = () => {
    setEditingUser(null);
    setForm(emptyForm);
  };

  const openEditor = (user) => {
    setEditingUser(user);
    setForm(toForm(user));
  };

  const openPasswordReset = (user) => {
    setResettingUser(user);
    setPasswordForm(emptyPasswordForm);
    setPasswordErrors({});
  };

  const closePasswordReset = () => {
    setResettingUser(null);
    setPasswordForm(emptyPasswordForm);
    setPasswordErrors({});
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors((current) => ({ ...current, [name]: "" }));
  };

  const validatePasswordForm = () => {
    const nextErrors = {};
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[*@!#%&()^~{}]).{8,}$/;

    if (!passwordForm.newPassword) {
      nextErrors.newPassword = "Enter a new password";
    } else if (!strongPassword.test(passwordForm.newPassword)) {
      nextErrors.newPassword =
        "Use 8+ chars with uppercase, lowercase, number and special character";
    }

    if (!passwordForm.confirmPassword) {
      nextErrors.confirmPassword = "Confirm the new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingUser?._id) return;

    try {
      setSaving(true);
      const response = await axios.put(`${USERS_API_URL}/${editingUser._id}`, form);
      const updatedUser = response.data?.user || { ...editingUser, ...form };
      setUsers((current) => current.map((user) => (user._id === editingUser._id ? updatedUser : user)));
      toast.success("Register credential updated");
      closeEditor();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update register credential");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const label = user.name || user.email || "this register";
    if (!window.confirm(`Delete ${label}? This action cannot be undone.`)) return;

    try {
      await axios.delete(`${USERS_API_URL}/${user._id}`);
      setUsers((current) => current.filter((item) => item._id !== user._id));
      toast.success("Register credential deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete register credential");
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!resettingUser?._id || !validatePasswordForm()) return;

    try {
      setSaving(true);
      await axios.put(`${USERS_API_URL}/${resettingUser._id}/admin-reset-password`, passwordForm);
      toast.success(`Password reset for ${resettingUser.name || resettingUser.email}`);
      closePasswordReset();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to reset user password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="enterprise-page settings-page">
      <div className="enterprise-container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Administrative Settings</p>
            <h2 className="page-title">Register Credentials</h2>
            <p className="page-subtitle">
              Manage registered account access details without loading the dashboard module.
            </p>
          </div>
          <div className="toolbar-actions">
            <button
              type="button"
              className="enterprise-btn enterprise-btn--secondary"
              onClick={() => fetchUsers(true)}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "settings-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        <section className="settings-summary">
          <article className="enterprise-card settings-stat settings-stat--blue">
            <FiUserCheck />
            <div>
              <span>Total Registers</span>
              <strong>{users.length}</strong>
            </div>
          </article>
          <article className="enterprise-card settings-stat settings-stat--green">
            <FiShield />
            <div>
              <span>Admins</span>
              <strong>{users.filter((user) => user.role === "admin").length}</strong>
            </div>
          </article>
          <article className="enterprise-card settings-stat settings-stat--gray">
            <FiSettings />
            <div>
              <span>Users</span>
              <strong>{users.filter((user) => user.role !== "admin").length}</strong>
            </div>
          </article>
        </section>

        <section className="enterprise-card settings-card">
          <div className="settings-card__header">
            <div>
              <h3>Credential Directory</h3>
              <p>Registered identities, roles and department details.</p>
            </div>
            <label className="settings-search">
              <FiSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, role..."
              />
            </label>
          </div>

          <div className="settings-table-wrap">
            <table className="settings-table">
              <thead>
                <tr>
                  {columns.map(({ key, label }) => (
                    <SortableHeader
                      key={key}
                      label={label}
                      sortKey={key}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  ))}
                  <th>Password</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="settings-empty">Loading register credentials...</td>
                  </tr>
                ) : filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td><strong>{user.name || "N/A"}</strong></td>
                      <td>{user.employeeId || "N/A"}</td>
                      <td>{user.email || "N/A"}</td>
                      <td>{user.mobile || "N/A"}</td>
                      <td>{user.department || "N/A"}</td>
                      <td>{user.designation || "N/A"}</td>
                      <td><span className={`settings-role settings-role--${user.role || "user"}`}>{user.role || "user"}</span></td>
                      <td><span className="settings-password">Protected</span></td>
                      <td>
                        <div className="settings-actions">
                          <button type="button" title="Edit register" onClick={() => openEditor(user)}>
                            <FiEdit2 />
                          </button>
                          <button type="button" title="Reset password" className="is-warning" onClick={() => openPasswordReset(user)}>
                            <FiKey />
                          </button>
                          <button type="button" title="Delete register" className="is-danger" onClick={() => handleDelete(user)}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="settings-empty">No register credentials found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {editingUser && (
        <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Edit register credential">
          <form className="enterprise-card settings-editor" onSubmit={handleSubmit}>
            <div className="settings-editor__header">
              <div>
                <h3>Edit Register</h3>
                <p>{editingUser.email}</p>
              </div>
              <button type="button" title="Close editor" onClick={closeEditor}>
                <FiX />
              </button>
            </div>

            <div className="settings-editor__grid">
              <Field label="Full Name" name="name" value={form.name} onChange={handleChange} required />
              <Field label="Employee ID" name="employeeId" value={form.employeeId} onChange={handleChange} />
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
              <Field label="Mobile" name="mobile" value={form.mobile} onChange={handleChange} />
              <Field label="Department" name="department" value={form.department} onChange={handleChange} />
              <Field label="Designation" name="designation" value={form.designation} onChange={handleChange} />
              <div className="settings-field">
                <label>Role</label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="settings-editor__actions">
              <button type="button" className="enterprise-btn enterprise-btn--secondary" onClick={closeEditor}>
                Cancel
              </button>
              <button type="submit" className="enterprise-btn enterprise-btn--primary" disabled={saving}>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {resettingUser && (
        <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Reset user password">
          <form className="enterprise-card settings-editor settings-password-editor" onSubmit={handlePasswordSubmit}>
            <div className="settings-editor__header">
              <div>
                <h3>Reset User Password</h3>
                <p>{resettingUser.name || resettingUser.email}</p>
              </div>
              <button type="button" title="Close reset password" onClick={closePasswordReset}>
                <FiX />
              </button>
            </div>

            <div className="settings-editor__grid settings-editor__grid--single">
              <Field
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                error={passwordErrors.newPassword}
                onChange={handlePasswordChange}
                required
              />
              <Field
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                error={passwordErrors.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="settings-editor__actions">
              <button type="button" className="enterprise-btn enterprise-btn--secondary" onClick={closePasswordReset}>
                Cancel
              </button>
              <button type="submit" className="enterprise-btn enterprise-btn--primary" disabled={saving}>
                Reset Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, name, type = "text", value, error, onChange, required = false }) => (
  <div className="settings-field">
    <label>{label}</label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={fieldPlaceholders[name]}
      required={required}
    />
    {error && <p>{error}</p>}
  </div>
);

export default SettingsPage;
