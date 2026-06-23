import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { FiKey, FiLogOut, FiShield, FiUser, FiX } from "react-icons/fi";
import Logo from "./Logo";
import { useAuth } from "../Context/AuthContext";

const initialPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const mongoIdPattern = /^[a-f\d]{24}$/i;

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser, isAuthenticated, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    dispatch({ type: "LOGOUT" });
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const openResetPassword = () => {
    setProfileOpen(false);
    setResetOpen(true);
    setPasswordForm(initialPasswordForm);
    setPasswordErrors({});
  };

  const closeResetPassword = () => {
    setResetOpen(false);
    setPasswordForm(initialPasswordForm);
    setPasswordErrors({});
  };

  const validatePasswordForm = () => {
    const nextErrors = {};
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[*@!#%&()^~{}]).{8,}$/;

    if (!passwordForm.currentPassword) {
      nextErrors.currentPassword = "Enter the admin-created password";
    }

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

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!validatePasswordForm()) return;

    if (!currentUser?.email) {
      toast.error("User session is missing. Please login again.");
      return;
    }

    try {
      setSavingPassword(true);
      let authUserId = currentUser.id;
      let authUser = null;

      if (!mongoIdPattern.test(String(authUserId || ""))) {
        const response = await axios.get("http://127.0.0.1:5000/auth/users");
        authUser = response.data?.find(
          (user) => user.email?.toLowerCase() === currentUser.email.toLowerCase(),
        );
        authUserId = authUser?._id;
      }

      if (!authUserId) {
        toast.error("Unable to find this user in auth collection. Please login again.");
        return;
      }

      try {
        await axios.put(`http://127.0.0.1:5000/auth/users/${authUserId}/password`, passwordForm);
      } catch (error) {
        const message = String(error.response?.data?.message || error.response?.data || "");

        if (error.response?.status !== 404 && !message.includes("Cannot PUT")) {
          throw error;
        }

        if (!authUser) {
          const response = await axios.get("http://127.0.0.1:5000/auth/users");
          authUser = response.data?.find((user) => user._id === authUserId);
        }

        const fallbackResponse = await axios.put(`http://127.0.0.1:5000/auth/users/${authUserId}`, {
          name: authUser?.name || currentUser.username,
          employeeId: authUser?.employeeId || currentUser.employeeId,
          email: authUser?.email || currentUser.email,
          mobile: authUser?.mobile || "",
          department: authUser?.department || currentUser.department,
          designation: authUser?.designation || currentUser.designation,
          role: authUser?.role || currentUser.role?.toLowerCase(),
          changePasswordOnly: true,
          ...passwordForm,
        });

        if (fallbackResponse.data?.message !== "Password changed successfully") {
          throw new Error("Password route is not active. Please restart the backend server.");
        }
      }

      toast.success("Password changed successfully");
      closeResetPassword();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <header className={`app-header ${isAuthenticated ? "app-header--secure" : ""}`}>
      <div className="app-header__inner">
        <Logo />
        <div className="app-header__copy">
          <p className="app-header__eyebrow">Enterprise Inventory Management</p>
          <h1>PXE - BOX MANAGEMENT SYSTEM</h1>
        </div>
        <div className="app-header__actions">
          {isAuthenticated ? (
            <>
              <div className="header-profile-menu" ref={profileRef}>
                <button
                  type="button"
                  className="header-avatar"
                  aria-label="Open profile menu"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((open) => !open)}
                >
                  <FiUser />
                </button>
                {profileOpen && (
                  <div className="header-profile-dropdown">
                    <button type="button" onClick={openResetPassword}>
                      <FiKey /> Reset Password
                    </button>
                  </div>
                )}
              </div>
              <div className="header-profile">
                <span>{currentUser?.username || "User"}</span>
                <strong><FiShield /> {currentUser?.role === "ADMIN" ? "Administrator" : "Authorized User"}</strong>
              </div>
              <button
                type="button"
                className="enterprise-btn enterprise-btn--danger header-logout"
                onClick={handleLogout}
              >
                <FiLogOut /> Logout
              </button>
            </>
          ) : (
            <span className="header-secure-text"></span>
          )}
        </div>
      </div>
      {isAuthenticated && (
        <div className="government-security-bar">
          <FiShield />
          <span>Authorized Personnel Only. All activities are monitored and audited.</span>
         
        </div>
      )}
      {resetOpen && (
        <div className="password-modal" role="dialog" aria-modal="true" aria-label="Reset password">
          <form className="password-card" onSubmit={handleResetPassword} noValidate>
            <div className="password-card__header">
              <div>
                <h3>Reset Password</h3>
                <p>Enter the password created by admin, then set your new password.</p>
              </div>
              <button type="button" aria-label="Close reset password" onClick={closeResetPassword}>
                <FiX />
              </button>
            </div>

            <PasswordField
              label="Old Password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              error={passwordErrors.currentPassword}
              onChange={handlePasswordChange}
            />
            <PasswordField
              label="New Password"
              name="newPassword"
              value={passwordForm.newPassword}
              error={passwordErrors.newPassword}
              onChange={handlePasswordChange}
            />
            <PasswordField
              label="Confirm New Password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              error={passwordErrors.confirmPassword}
              onChange={handlePasswordChange}
            />

            <div className="password-card__actions">
              <button type="button" className="enterprise-btn enterprise-btn--secondary" onClick={closeResetPassword}>
                Cancel
              </button>
              <button type="submit" className="enterprise-btn enterprise-btn--primary" disabled={savingPassword}>
                Change Password
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};

const PasswordField = ({ label, name, value, error, onChange }) => (
  <div className="password-field">
    <label>{label}</label>
    <input name={name} type="password" value={value} onChange={onChange} />
    {error && <p>{error}</p>}
  </div>
);

export default Header;
