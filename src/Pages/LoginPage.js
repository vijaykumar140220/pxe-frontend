import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { FiLock, FiMail, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../Context/AuthContext";
import "./Login.css";

const createCaptcha = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
};

const LoginPage = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "Admin",
  });
  const [captchaText, setCaptchaText] = useState(() => createCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    captcha: "",
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { login, loginWithExternalToken } = useAuth();

  const validateForm = () => {
    let valid = true;
    let newErrors = { email: "", password: "", captcha: "" };

    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!form.email) {
      newErrors.email = "Email Address is required";
      valid = false;
    } else if (!emailRegex.test(form.email)) {
      newErrors.email = "Email must be lowercase and contain @ and .";
      valid = false;
    }

    const specialCharRegex = /[*@!#%&()^~{}]+/;
    if (!form.password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (!specialCharRegex.test(form.password)) {
      newErrors.password = "Password must contain one special character";
      valid = false;
    }

    if (!captchaInput.trim()) {
      newErrors.captcha = "Captcha is required";
      valid = false;
    } else if (captchaInput.trim().toUpperCase() !== captchaText) {
      newErrors.captcha = "Captcha does not match";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const refreshCaptcha = () => {
    setCaptchaText(createCaptcha());
    setCaptchaInput("");
    if (errors.captcha) setErrors({ ...errors, captcha: "" });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const session = login({
        email: form.email,
        password: form.password,
      });

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: session.token,
      });

      toast.success("Login Successful!");
      navigate("/dashboard");
      return;
    } catch {
      try {
        const res = await axios.post("http://127.0.0.1:5000/auth/login", form);
        const token = res.data.access_token;

        if (token) {
          const session = loginWithExternalToken({
            id: res.data.user?._id,
            email: form.email,
            token,
            role: res.data.user?.role || res.data.role || "USER",
            username: res.data.user?.name || res.data.username,
            assetHistoryAccess:
              res.data.user?.assetHistoryAccess ||
              res.data.assetHistoryAccess ||
              "NO",
          });

          dispatch({
            type: "LOGIN_SUCCESS",
            payload: session.token,
          });
          toast.success("Login Successful!");
          navigate("/dashboard");
        } else {
          toast.error("Token not received");
          refreshCaptcha();
        }
      } catch (err) {
        console.error(err);
        if (err.response) {
          toast.error(err.response.data.message || "Login Failed");
        } else {
          toast.error("Invalid credentials or server not reachable");
        }
        refreshCaptcha();
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-monitor-strip">PXE- PORTAL</div>

      <div className="login-card">
        <div className="login-card__heading">
          <h2 className="login-title">System Login</h2>
          {/* <p className="login-subtitle">
            Enter your organizational credentials to proceed
          </p> */}
        </div>

        <form onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label className="login-label">UserName</label>
            <div
              className={`input-wrapper ${errors.email ? "input-error" : ""}`}
            >
              <span className="input-symbol" aria-hidden="true">
                <FiMail />
              </span>
              <input
                type="email"
                className="login-input"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
              />
              {errors.email && <span className="error-icon">!</span>}
            </div>
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="login-label">Password</label>
            <div
              className={`input-wrapper ${errors.password ? "input-error" : ""}`}
            >
              <span className="input-symbol" aria-hidden="true">
                <FiLock />
              </span>
              <input
                type="password"
                className="login-input"
                placeholder="************"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
              />
              {errors.password && <span className="error-icon">!</span>}
            </div>
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          <div className="form-group">
            <label className="login-label">Captcha</label>
            <div className="captcha-row">
              <div className="captcha-code" aria-label="Captcha code">
                {captchaText}
              </div>
              <button
                type="button"
                className="captcha-refresh"
                onClick={refreshCaptcha}
                aria-label="Refresh captcha"
                title="Refresh captcha"
              >
                <FiRefreshCw aria-hidden="true" />
              </button>
              <div
                className={`input-wrapper captcha-input ${
                  errors.captcha ? "input-error" : ""
                }`}
              >
                <input
                  type="text"
                  className="login-input"
                  placeholder="Enter characters"
                  value={captchaInput}
                  onChange={(e) => {
                    setCaptchaInput(e.target.value.toUpperCase());
                    if (errors.captcha) setErrors({ ...errors, captcha: "" });
                  }}
                />
                {errors.captcha && <span className="error-icon">!</span>}
              </div>
            </div>
            {errors.captcha && <p className="error-text">{errors.captcha}</p>}
          </div>

          <div className="login-options">
            {/* <label className="remember-option">
              <input type="checkbox" />
              <span>Remember device</span>
            </label> */}
            {/* <button type="button" className="forgot-link">
              Forgot access?
            </button> */}
          </div>

          <button type="submit" className="login-btn">
            LOGIN
          </button>
        </form>

        <div className="security-note">
          <strong>Security Protocol:</strong> If You Forget your password please
          Contact Admin.
        </div>

        {/* <button type="button" className="admin-contact">
          Contact System Administrator
        </button> */}
      </div>
    </div>
  );
};

export default LoginPage;
