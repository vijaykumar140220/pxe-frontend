import React from "react";
import { NavLink } from "react-router-dom";
import { useRole } from "../Context/RoleContext";
import {
  FiActivity,
  FiClipboard,
  FiFileText,
  FiGrid,
  FiSearch,
  FiSettings,
  FiUsers,
  FiX,
} from "react-icons/fi";
import Logo from "./Logo";

const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin } = useRole();

  return (
    <>
      <div
        className={`app-sidebar__backdrop ${isOpen ? "is-open" : ""}`}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        id="app-mobile-nav"
        className={`app-sidebar ${isOpen ? "is-open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="app-sidebar__panel">
          <div className="app-sidebar__top">
            <Logo compact />
            <button
              type="button"
              className="app-sidebar__close-btn"
              aria-label="Close navigation menu"
              onClick={onClose}
            >
              <FiX />
            </button>
          </div>
          <nav className="app-sidebar__nav">
            <NavLink onClick={onClose} to="/dashboard" className="app-sidebar__link">
              <span className="app-sidebar__icon app-sidebar__icon--dashboard"><FiGrid /></span>
              <span>Dashboard</span>
            </NavLink>
            {isAdmin && (
              <NavLink onClick={onClose} to="/inventory-master" className="app-sidebar__link">
                <span className="app-sidebar__icon app-sidebar__icon--inventory"><FiClipboard /></span>
                <span>Inventory Master</span>
              </NavLink>
            )}
            <NavLink onClick={onClose} to="/transaction-history" className="app-sidebar__link">
              <span className="app-sidebar__icon app-sidebar__icon--transaction"><FiActivity /></span>
              <span>Transaction History</span>
            </NavLink>
            <NavLink onClick={onClose} to="/live-status" className="app-sidebar__link">
              <span className="app-sidebar__icon app-sidebar__icon--live"><FiActivity /></span>
              <span>Live Status</span>
            </NavLink>
            <NavLink onClick={onClose} to="/reports" className="app-sidebar__link">
              <span className="app-sidebar__icon app-sidebar__icon--reports"><FiFileText /></span>
              <span>Reports</span>
            </NavLink>
            {isAdmin && (
              <NavLink onClick={onClose} to="/register" className="app-sidebar__link">
                <span className="app-sidebar__icon app-sidebar__icon--users"><FiUsers /></span>
                <span>User Management</span>
              </NavLink>
            )}
            <NavLink onClick={onClose} to="/asset-history" className="app-sidebar__link">
              <span className="app-sidebar__icon app-sidebar__icon--history"><FiSearch /></span>
              <span>Asset History</span>
            </NavLink>
            {isAdmin && (
              <NavLink onClick={onClose} to="/settings" className="app-sidebar__link">
                <span className="app-sidebar__icon app-sidebar__icon--settings"><FiSettings /></span>
                <span>Settings</span>
              </NavLink>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
