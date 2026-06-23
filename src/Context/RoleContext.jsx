import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "./AuthContext";

const RoleContext = createContext(null);

export const RoleProvider = ({ children }) => {
  const { currentUser } = useAuth();

  const value = useMemo(() => {
    const role = (currentUser?.role || "GUEST").toUpperCase();
    return {
      role,
      isAdmin: role === "ADMIN",
      isUser: role === "USER",
    };
  }, [currentUser]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
};
