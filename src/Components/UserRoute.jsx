import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useRole } from "../Context/RoleContext";

const UserRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { isUser } = useRole();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isUser) return <Navigate to="/" replace />;

  return children;
};

export default UserRoute;
