import React from "react";
import { NavLink } from "react-router-dom";
import { useRole } from "../Context/RoleContext";
import { FiActivity, FiClipboard, FiFileText, FiGrid, FiSearch, FiSettings, FiUsers } from "react-icons/fi";

const Sidebar = () => {
  const { isAdmin } = useRole();

  return (
    <aside className="app-sidebar" aria-label="Government portal navigation">
      <nav className="app-sidebar__nav">
        <NavLink to="/dashboard" className="app-sidebar__link">
          <span className="app-sidebar__icon app-sidebar__icon--dashboard"><FiGrid /></span>
          Dashboard
        </NavLink>
        {/*
        <NavLink to="/" className="app-sidebar__link">
          <span className="app-sidebar__icon"><FiBox /></span>
          Inventory Management
        </NavLink>
        */}
        {isAdmin && (
          <NavLink to="/inventory-master" className="app-sidebar__link">
            <span className="app-sidebar__icon app-sidebar__icon--inventory"><FiClipboard /></span>
            Inventory Master
          </NavLink>
        )}
        <NavLink to="/transaction-history" className="app-sidebar__link">
          <span className="app-sidebar__icon app-sidebar__icon--transaction"><FiActivity /></span>
          Transaction History
        </NavLink>
        <NavLink to="/live-status" className="app-sidebar__link">
          <span className="app-sidebar__icon app-sidebar__icon--live"><FiActivity /></span>
          Live Status
        </NavLink>
        <NavLink to="/reports" className="app-sidebar__link">
          <span className="app-sidebar__icon app-sidebar__icon--reports"><FiFileText /></span>
          Reports
        </NavLink>
        {isAdmin && (
          <NavLink to="/register" className="app-sidebar__link">
            <span className="app-sidebar__icon app-sidebar__icon--users"><FiUsers /></span>
            User Management
          </NavLink>
        )}
        <NavLink to="/asset-history" className="app-sidebar__link">
          <span className="app-sidebar__icon app-sidebar__icon--history"><FiSearch /></span>
          Asset History
        </NavLink>
        {isAdmin && (
          <NavLink to="/settings" className="app-sidebar__link">
            <span className="app-sidebar__icon app-sidebar__icon--settings"><FiSettings /></span>
            Settings
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
