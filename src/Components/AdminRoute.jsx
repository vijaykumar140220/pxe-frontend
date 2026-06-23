import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useRole } from "../Context/RoleContext";

const AdminRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { isAdmin } = useRole();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  return children;
};

export default AdminRoute;
