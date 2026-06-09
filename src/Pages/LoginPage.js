import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import "./Login.css";

const LoginPage = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "Admin",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const validateForm = () => {
    let valid = true;
    let newErrors = { email: "", password: "" };

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

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const res = await axios.post("http://127.0.0.1:5000/auth/login", form);
      const token = res.data.access_token;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("loginTimestamp", new Date().getTime().toString());

        dispatch({
          type: "LOGIN_SUCCESS",
          payload: token,
        });
        toast.success("Login Successful!");
        navigate("/dashboard");
      } else {
        toast.error("Token not received");
      }
    } catch (err) {
      console.error(err);
      if (err.response) {
        toast.error(err.response.data.message || "Login Failed");
      } else {
        toast.error("Server not reachable");
      }
    }
  };

  return (
    <div className="login-container">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="login-card">
        <h2 className="login-title">LOGIN TO YOUR ACCOUNT</h2>

        <form onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label className="login-label">Email Address</label>
            <div
              className={`input-wrapper ${errors.email ? "input-error" : ""}`}
            >
              <input
                type="email"
                className="login-input"
                placeholder="Enter Email"
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
              <input
                type="password"
                className="login-input"
                placeholder="Enter Password"
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

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
