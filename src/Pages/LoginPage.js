import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { FaRedoAlt, FaSpinner, FaShieldAlt } from "react-icons/fa";
import { useAuth } from "../Context/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Login.css";

const CAPTCHA_LENGTH = 5;
const CAPTCHA_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const createCaptcha = () =>
  Array.from({ length: CAPTCHA_LENGTH }, () =>
    CAPTCHA_CHARSET[Math.floor(Math.random() * CAPTCHA_CHARSET.length)],
  ).join("");

const LoginPage = () => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [captcha, setCaptcha] = useState(() => createCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { login, loginWithExternalToken } = useAuth();

  const setPasswordStrength = () => {};

  const validate = () => {
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = "Email is required";
    if (!form.password.trim()) nextErrors.password = "Password is required";
    else if (form.password.trim().length < 8)
      nextErrors.password = "Password must be at least 8 characters";
    if (!captchaInput.trim()) nextErrors.captcha = "CAPTCHA is required";
    else if (captchaInput.trim().toUpperCase() !== captcha)
      nextErrors.captcha = "CAPTCHA does not match";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      toast.error("Please enter valid credentials");
      setCaptcha(createCaptcha());
      setCaptchaInput("");
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
      setCaptcha(createCaptcha());
      setCaptchaInput("");
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
        setCaptcha(createCaptcha());
        setCaptchaInput("");
        navigate("/dashboard");
      } catch (err) {
        toast.error(err.response?.data?.message || "Login failed");
        setCaptcha(createCaptcha());
        setCaptchaInput("");
      } finally {
        setLoading(false);
      }
    }

    setLoading(false);
  };

  return (
    <main
      className="pxe-hero-page"
      style={{ backgroundImage: "url('/login.jpeg')" }}
    >
      <div className="pxe-hero-page__overlay" aria-hidden="true" />
      <div className="pxe-hero-page__content">
        <section className="pxe-login-panel" aria-label="Login form">
          <div className="pxe-login-panel__shine" aria-hidden="true" />
          <div className="pxe-brand-block">
            <span className="pxe-brand-heading__eyebrow">PXE</span>
            <h1 className="pxe-brand-heading__title">PXE Management System</h1>
            <p className="pxe-brand-heading__subtitle">Secure Enterprise Login</p>
          </div>

          <form className="pxe-form" onSubmit={handleSubmit} noValidate id="login-form">
            <div className="pxe-form-group">
              <label htmlFor="username" className="form-label pxe-label">
                Email
              </label>
              <div className={`pxe-input ${errors.username ? "is-invalid" : ""}`}>
                <span className="pxe-input__icon" aria-hidden="true">
                  <i className="bi bi-person" />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="pxe-input__field"
                  placeholder="Enter email"
                  value={form.username}
                  onChange={(e) => {
                    setForm((current) => ({ ...current, username: e.target.value }));
                    if (errors.username) {
                      setErrors((current) => ({ ...current, username: "" }));
                    }
                  }}
                />
              </div>
              {errors.username && (
                <div className="invalid-feedback d-block pxe-field-error">
                  {errors.username}
                </div>
              )}
            </div>

            <div className="pxe-form-group">
              <label htmlFor="password" className="form-label pxe-label">
                Password
              </label>
              <div className={`pxe-input pxe-input--password ${errors.password ? "is-invalid" : ""}`}>
                <span className="pxe-input__icon" aria-hidden="true">
                  <i className="bi bi-lock" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="pxe-input__field"
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showPassword ? "bi-eye" : "bi-eye-slash"}`} />
                </button>
              </div>
              {errors.password && (
                <div className="invalid-feedback d-block pxe-field-error">
                  {errors.password}
                </div>
              )}
            </div>

            <div className="pxe-form-group pxe-form-group--captcha">
              <label htmlFor="captcha" className="form-label pxe-label">
                CAPTCHA
              </label>
              <div className={`pxe-captcha ${errors.captcha ? "is-invalid" : ""}`}>
                <div className="pxe-captcha__field">
                  <div className="pxe-captcha__challenge" aria-label={`CAPTCHA code ${captcha}`}>
                    <span>{captcha}</span>
                  </div>
                  <input
                    id="captcha"
                    name="captcha"
                    type="text"
                    className="pxe-captcha__input"
                    placeholder="Enter the code above"
                    autoComplete="off"
                    spellCheck="false"
                    value={captchaInput}
                    onChange={(e) => {
                      setCaptchaInput(e.target.value);
                      if (errors.captcha) {
                        setErrors((current) => ({ ...current, captcha: "" }));
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn pxe-captcha__refresh"
                  onClick={() => {
                    setCaptcha(createCaptcha());
                    setCaptchaInput("");
                    setErrors((current) => ({ ...current, captcha: "" }));
                  }}
                  aria-label="Refresh CAPTCHA"
                  title="Refresh CAPTCHA"
                >
                  <FaRedoAlt />
                </button>
              </div>
              {errors.captcha && (
                <div className="invalid-feedback d-block pxe-field-error">
                  {errors.captcha}
                </div>
              )}
            </div>

            <button type="submit" className="btn pxe-login-btn" disabled={loading}>
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
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
