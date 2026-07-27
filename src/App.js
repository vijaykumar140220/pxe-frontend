import "./App.css";
import React, { useEffect, useState } from "react";
import { Provider, useDispatch } from "react-redux";
import store from "./Redux/store";
import AddPage from "./Pages/Addpage";
import ViewPage from "./Pages/Viewpage";
import LoginPage from "./Pages/LoginPage";
import RegisterPage from "./Pages/RegisterPage";
import AssetHistoryPage from "./Pages/AssetHistoryPage";
import DashboardPage from "./Pages/DashboardPage";
import InventoryMasterPage from "./Pages/InventoryMasterPage";
import LiveStatusPage from "./Pages/LiveStatusPage";
import SettingsPage from "./Pages/SettingsPage";
import TransactionRegisterPage from "./Pages/TransactionRegisterPage";
import UnauthorizedPage from "./Pages/UnauthorizedPage";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Sidebar from "./Components/Sidebar";
import ProtectedRoute from "./Components/ProtectedRoute";
import AdminRoute from "./Components/AdminRoute";
import { AuthProvider, useAuth } from "./Context/AuthContext";
import { RoleProvider } from "./Context/RoleContext";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import "react-toastify/dist/ReactToastify.css";

const INACTIVITY_LIMIT = 60 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousedown",
  "mousemove",
  "scroll",
  "touchstart",
];

const AppContent = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, logout } = useAuth();
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    const loadingTimer = window.setTimeout(() => setIsAppLoading(false), 1400);
    return () => window.clearTimeout(loadingTimer);
  }, []);

  useEffect(() => {
    let logoutTimer;

    if (!isAuthenticated) return undefined;

    let lastActivityWrite = 0;
    let sessionExpired = false;

    const expireSession = () => {
      if (sessionExpired) return;
      sessionExpired = true;
      logout();
      dispatch({ type: "LOGOUT" });
      alert("Session expired after 1 hour of inactivity. Please login again.");
    };

    const scheduleExpiry = () => {
      clearTimeout(logoutTimer);
      const lastActivity =
        Number(localStorage.getItem("lastActivityTimestamp")) || Date.now();
      const remainingTime = INACTIVITY_LIMIT - (Date.now() - lastActivity);

      if (remainingTime <= 0) {
        expireSession();
        return;
      }

      logoutTimer = setTimeout(expireSession, remainingTime);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivityWrite < 1000) return;
      lastActivityWrite = now;
      localStorage.setItem("lastActivityTimestamp", now.toString());
      scheduleExpiry();
    };

    if (!localStorage.getItem("lastActivityTimestamp")) {
      localStorage.setItem("lastActivityTimestamp", Date.now().toString());
    }

    scheduleExpiry();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity);
    });
    document.addEventListener("visibilitychange", scheduleExpiry);

    return () => {
      clearTimeout(logoutTimer);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      document.removeEventListener("visibilitychange", scheduleExpiry);
    };
  }, [isAuthenticated, dispatch, logout]);

  return (
    <div className="App">
      {isAppLoading && (
        <div className="app-loader" role="status" aria-label="Loading PXE Portal">
          <div className="app-loader__content">
            <div className="app-loader__logo-wrap">
              <span className="app-loader__ring app-loader__ring--outer" />
              <span className="app-loader__ring app-loader__ring--inner" />
              <img
                className="app-loader__logo"
                src="/log.png"
                alt="PXE Portal"
              />
            </div>
            <p className="app-loader__label">Securing your workspace</p>
            <div className="app-loader__progress" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      )}
      <Header />
      <div
        className={`app-shell ${isAuthenticated ? "app-shell--with-sidebar" : ""}`}
      >
        {isAuthenticated && <Sidebar />}
        <main className="app-main">
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ViewPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/add"
              element={
                <AdminRoute>
                  <AddPage />
                </AdminRoute>
              }
            />

            <Route
              path="/register"
              element={
                <AdminRoute>
                  <RegisterPage />
                </AdminRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory-master"
              element={
                <AdminRoute>
                  <InventoryMasterPage />
                </AdminRoute>
              }
            />

            <Route
              path="/asset-history"
              element={
                <ProtectedRoute>
                  <AssetHistoryPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transaction-register"
              element={
                <ProtectedRoute>
                  <TransactionRegisterPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transaction-history"
              element={
                <ProtectedRoute>
                  <TransactionRegisterPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/live-status"
              element={
                <ProtectedRoute>
                  <LiveStatusPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ViewPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              }
            />

            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      <Footer />
      <Toaster
        position="top-center"
        reverseOrder={false}
        containerStyle={{ top: 16, zIndex: 99999 }}
      />
    </div>
  );
};

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <RoleProvider>
            <AppContent />
          </RoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
