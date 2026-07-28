import React, { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { FaSpinner, FaShieldAlt } from "react-icons/fa";
import { useAuth } from "../Context/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Login.css";

const LoginPage = () => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [strength, setStrength] = useState(0);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { login, loginWithExternalToken } = useAuth();

  const strengthLabel = useMemo(() => {
    if (strength <= 1) return "Weak";
    if (strength === 2) return "Fair";
    if (strength === 3) return "Strong";
    return "Very Strong";
  }, [strength]);

  const setPasswordStrength = (value) => {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    setStrength(score);
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = "Username is required";
    if (!form.password.trim()) nextErrors.password = "Password is required";
    else if (form.password.trim().length < 8)
      nextErrors.password = "Password must be at least 8 characters";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      toast.error("Please enter valid credentials");
      return;
    }

    setLoading(true);
    try {
      const session = login({
        email: form.username,
        password: form.password,
      });
      dispatch({ type: "LOGIN_SUCCESS", payload: session.token });
      toast.success("Welcome back to PXE Box Management System");
      navigate("/dashboard");
      return;
    } catch {
      try {
        const res = await axios.post("http://127.0.0.1:5000/auth/login", {
          email: form.username,
          password: form.password,
        });

        const token = res.data.access_token;
        if (!token) throw new Error("Token not received");

        const session = loginWithExternalToken({
          id: res.data.user?._id,
          email: form.username,
          token,
          role: res.data.user?.role || res.data.role || "USER",
          username: res.data.user?.name || res.data.username || form.username,
          assetHistoryAccess:
            res.data.user?.assetHistoryAccess ||
            res.data.assetHistoryAccess ||
            "NO",
        });

        dispatch({ type: "LOGIN_SUCCESS", payload: session.token });
        toast.success("Welcome back to PXE Box Management System");
        navigate("/dashboard");
      } catch (err) {
        toast.error(err.response?.data?.message || "Login failed");
      } finally {
        setLoading(false);
      }
    }

    setLoading(false);
  };

  return (
    <div className="pxe-login-page is-dark">
      <div className="pxe-login-glow pxe-login-glow--one" aria-hidden="true" />
      <div className="pxe-login-glow pxe-login-glow--two" aria-hidden="true" />
      <div
        className="pxe-login-glow pxe-login-glow--three"
        aria-hidden="true"
      />

      <nav className="pxe-login-navbar" aria-label="Primary">
        <div className="pxe-login-navbar__brand">
          <img
            src="/logo.png"
            alt="PXE logo"
            className="pxe-login-navbar__logo"
          />
          <div>
            <strong>PXE BOX</strong>
            <span>Management System</span>
          </div>
        </div>
      </nav>

      <div className="container-fluid pxe-login-shell">
        <div className="pxe-login-card">
          <aside className="pxe-login-card__visual">
            <img
              src="/login.jpeg"
              alt="PXE deployment environment"
              className="pxe-login-card__image"
            />
            <div className="pxe-login-card__overlay" />
            <div className="pxe-login-card__visual-copy">
              <p>PXE Deployment</p>
              <h2>Enterprise control for box operations</h2>
              <span>
                Centralized deployment, inventory, boot workflows, and server
                health visibility in one secure workspace.
              </span>
            </div>
          </aside>

          <section className="pxe-login-card__panel">
            <div className="pxe-brand-block text-center">
              <img src="/logo.png" alt="PXE logo" className="pxe-brand-logo" />
              <div className="pxe-brand-heading">
                <span className="pxe-brand-heading__eyebrow">PXE</span>
                <h1>Management System</h1>
              </div>
              <p>Centralized. Automated. Scalable.</p>
            </div>

            <form
              className="pxe-form"
              onSubmit={handleSubmit}
              noValidate
              id="login-form"
            >
              <div className="mb-3">
                <label htmlFor="username" className="form-label pxe-label">
                  Username
                </label>
                <div
                  className={`input-group pxe-input ${errors.username ? "is-invalid" : ""}`}
                >
                  <span className="input-group-text">
                    <i className="bi bi-person" />
                  </span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    className="form-control"
                    placeholder="Enter username"
                    value={form.username}
                    onChange={(e) => {
                      setForm((current) => ({
                        ...current,
                        username: e.target.value,
                      }));
                      if (errors.username) {
                        setErrors((current) => ({ ...current, username: "" }));
                      }
                    }}
                  />
                  {errors.username && (
                    <div className="invalid-feedback d-block">
                      {errors.username}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-2">
                <label htmlFor="password" className="form-label pxe-label">
                  Password
                </label>
                <div
                  className={`input-group pxe-input ${errors.password ? "is-invalid" : ""}`}
                >
                  <span className="input-group-text">
                    <i className="bi bi-lock" />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((current) => ({ ...current, password: value }));
                      setPasswordStrength(value);
                      if (errors.password) {
                        setErrors((current) => ({ ...current, password: "" }));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn pxe-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <i
                      className={`bi ${showPassword ? "bi-eye" : "bi-eye-slash"}`}
                    />
                  </button>
                  {errors.password && (
                    <div className="invalid-feedback d-block">
                      {errors.password}
                    </div>
                  )}
                </div>
                <div className="pxe-strength mt-2">
                  <div className={`pxe-strength__bar strength-${strength}`} />
                  <span>{strengthLabel}</span>
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 mb-4">
                <label className="form-check pxe-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.rememberMe}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        rememberMe: e.target.checked,
                      }))
                    }
                  />
                  <span className="form-check-label">Remember Me</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn pxe-login-btn w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="pxe-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <FaShieldAlt />
                    Login
                  </>
                )}
              </button>
            </form>

            <div className="pxe-footer mt-4 pt-3">
              <span>© 2026 PXE Box Management System</span>
              <span className="pxe-footer__dot" />
              <span>v2.0</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
