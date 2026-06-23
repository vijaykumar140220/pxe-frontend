import "./App.css";
import React, { useEffect } from "react";
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

const AppContent = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    let logoutTimer;
    if (isAuthenticated) {
      const tenMinutes = 10 * 60 * 1000;
      logoutTimer = setTimeout(() => {
        logout();
        dispatch({ type: "LOGOUT" });
        alert("Session expired after 10 minutes. Please login again.");
      }, tenMinutes);
    }
    return () => clearTimeout(logoutTimer);
  }, [isAuthenticated, dispatch, logout]);

  return (
    <div className="App">
      <Header />
      <div className={`app-shell ${isAuthenticated ? "app-shell--with-sidebar" : ""}`}>
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
                <AdminRoute>
                  <AssetHistoryPage />
                </AdminRoute>
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
      <Toaster position="top-center" reverseOrder={false} />
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

