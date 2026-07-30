import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext(null);

const SESSION_KEY = "pxeAuthUser";
const USERS_KEY = "pxeRegisteredUsers";
const SESSION_LIMIT = 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "lastActivityTimestamp";

const defaultAdmin = {
  id: 1,
  fullName: "PXE System Administrator",
  username: "Admin",
  employeeId: "PXE-ADMIN-001",
  email: "admin@gmail.com",
  mobile: "9999999999",
  department: "Enterprise Inventory",
  designation: "System Administrator",
  assetHistoryAccess: "YES",
  role: "ADMIN",
  password: "Admin@123",
};

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeRole = (role) => (role || "USER").toUpperCase();

const createToken = (user) =>
  `pxe-token-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getStoredUsers = () => {
  const users = readJson(USERS_KEY, []);
  const hasAdmin = users.some(
    (user) => user.email?.toLowerCase() === defaultAdmin.email,
  );
  return hasAdmin ? users : [defaultAdmin, ...users];
};

const clearStoredSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("name");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("loginTimestamp");
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const session = readJson(SESSION_KEY, null);
    const lastActivityTimestamp =
      Number(localStorage.getItem(LAST_ACTIVITY_KEY)) ||
      Number(localStorage.getItem("loginTimestamp"));

    if (!session || !lastActivityTimestamp) return null;
    if (Date.now() - lastActivityTimestamp > SESSION_LIMIT) {
      clearStoredSession();
      return null;
    }

    return session;
  });

  useEffect(() => {
    const users = getStoredUsers();
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, []);

  const persistSession = useCallback((user) => {
    const session = {
      id: user.id || user._id,
      name: user.name || user.fullName || user.username || user.email,
      username: user.username || user.fullName || user.email,
      fullName: user.fullName || user.username || user.email,
      email: user.email,
      employeeId: user.employeeId,
      department: user.department,
      designation: user.designation,
      assetHistoryAccess: user.assetHistoryAccess || "NO",
      role: normalizeRole(user.role),
      token: user.token || createToken(user),
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem("token", session.token);
    localStorage.setItem("name", session.name);
    localStorage.setItem("username", session.username);
    localStorage.setItem("role", session.role);
    localStorage.setItem("loginTimestamp", Date.now().toString());
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    setCurrentUser(session);
    return session;
  }, []);

  const login = useCallback(({ email, password }) => {
    const users = getStoredUsers();
    const matchedUser = users.find(
      (user) =>
        user.email?.toLowerCase() === email.toLowerCase() &&
        user.password === password,
    );

    if (!matchedUser) {
      throw new Error("Invalid email address or password");
    }

    return persistSession(matchedUser);
  }, [persistSession]);

  const loginWithExternalToken = useCallback(
    ({
      id,
      email,
      token,
      username,
      role = "USER",
      assetHistoryAccess = "NO",
    }) =>
      persistSession({
        id,
        email,
        token,
        name: username || email.split("@")[0],
        username: username || email.split("@")[0],
        fullName: username || email.split("@")[0],
        role,
        assetHistoryAccess,
      }),
    [persistSession],
  );

  const logout = useCallback(() => {
    clearStoredSession();
    setCurrentUser(null);
  }, []);

  const createAccount = useCallback((account) => {
    const users = getStoredUsers();
    const emailExists = users.some(
      (user) => user.email?.toLowerCase() === account.email.toLowerCase(),
    );
    const employeeExists = users.some(
      (user) => user.employeeId?.toLowerCase() === account.employeeId.toLowerCase(),
    );

    if (emailExists) throw new Error("Email address already exists");
    if (employeeExists) throw new Error("Employee ID already exists");

    const newUser = {
      id: Date.now(),
      fullName: account.fullName,
      name: account.fullName,
      username: account.fullName,
      employeeId: account.employeeId,
      email: account.email,
      mobile: account.mobile,
      department: account.department,
      designation: account.designation,
      assetHistoryAccess: account.assetHistoryAccess || "NO",
      role: normalizeRole(account.role),
      password: account.password,
    };

    localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
    return newUser;
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser?.token),
      login,
      loginWithExternalToken,
      logout,
      createAccount,
      users: getStoredUsers,
    }),
    [
      currentUser,
      createAccount,
      login,
      loginWithExternalToken,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
