import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./RegisterPage.css";

const initialForm = {
  fullName: "",
  employeeId: "",
  email: "",
  mobile: "",
  department: "",
  designation: "",
  assetHistoryAccess: "YES",
  password: "",
  confirmPassword: "",
  role: "USER",
};

const fieldPlaceholders = {
  fullName: "Enter full name",
  employeeId: "Enter employee ID",
  email: "Enter email address",
  mobile: "Enter mobile number",
  department: "Enter department",
  designation: "Enter designation",
  assetHistoryAccess: "",
  password: "Enter password",
  confirmPassword: "Confirm password",
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors = {};
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    const mobileRegex = /^[6-9]\d{9}$/;
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[*@!#%&()^~{}]).{8,}$/;

    Object.entries(form).forEach(([key, value]) => {
      if (!String(value).trim()) nextErrors[key] = "This field is required";
    });

    if (form.email && !emailRegex.test(form.email)) {
      nextErrors.email = "Enter a valid email address";
    }

    if (form.mobile && !mobileRegex.test(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10 digit mobile number";
    }

    if (form.password && !strongPassword.test(form.password)) {
      nextErrors.password =
        "Use 8+ chars with uppercase, lowercase, number and special character";
    }

    if (form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await axios.post("http://127.0.0.1:5000/auth/register", {
        ...form,
        name: form.fullName,
        role: form.role.toLowerCase(),
      });
      toast.success(`${form.role} account created successfully`);
      setForm(initialForm);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="enterprise-page register-page">
      <div className="enterprise-container">
        <form className="enterprise-card register-card" onSubmit={handleSubmit} noValidate>
          <div className="register-card__header">
            <div>
              <h3>Account Creation</h3>
              <p>Identity, department and role details are required for audit records.</p>
            </div>
          </div>

          <div className="register-grid">
            <Field
              label="Full Name"
              name="fullName"
              value={form.fullName}
              error={errors.fullName}
              onChange={handleChange}
            />
            <Field
              label="Employee ID"
              name="employeeId"
              value={form.employeeId}
              error={errors.employeeId}
              onChange={handleChange}
            />
            <Field
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              error={errors.email}
              onChange={handleChange}
            />
            <Field
              label="Mobile Number"
              name="mobile"
              value={form.mobile}
              error={errors.mobile}
              onChange={handleChange}
            />
            <Field
              label="Department"
              name="department"
              value={form.department}
              error={errors.department}
              onChange={handleChange}
            />
            <Field
              label="Designation"
              name="designation"
              value={form.designation}
              error={errors.designation}
              onChange={handleChange}
            />
            <div className="register-field">
              <label>Asset History Access</label>
              <select
                name="assetHistoryAccess"
                value={form.assetHistoryAccess}
                onChange={handleChange}
              >
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </select>
              {errors.assetHistoryAccess && <p>{errors.assetHistoryAccess}</p>}
            </div>
            <Field
              label="Password"
              name="password"
              type="password"
              value={form.password}
              error={errors.password}
              onChange={handleChange}
            />
            <Field
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              error={errors.confirmPassword}
              onChange={handleChange}
            />

            <div className="register-field">
              <label>Role</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
              {errors.role && <p>{errors.role}</p>}
            </div>
          </div>

          <div className="register-actions">
            <button
              type="submit"
              className="enterprise-btn enterprise-btn--primary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting && <span className="register-button-spinner" aria-hidden="true" />}
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
            <button
              type="button"
              className="enterprise-btn enterprise-btn--secondary"
              onClick={() => {
                setForm(initialForm);
                setErrors({});
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="enterprise-btn enterprise-btn--danger"
              onClick={() => navigate("/")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, name, type = "text", value, error, onChange }) => (
  <div className="register-field">
    <label>{label}</label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={fieldPlaceholders[name] || ""}
    />
    {error && <p>{error}</p>}
  </div>
);

export default RegisterPage;
