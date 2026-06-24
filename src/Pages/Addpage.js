import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  addUserRequest,
  editUserRequest,
  resetUserResponse,
} from "../Redux/Action";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Addpage.css";
import { useAuth } from "../Context/AuthContext";
import {
  BOX_SERIAL_INPUT_PATTERN,
  BOX_SERIAL_PATTERN_TEXT,
  normalizeBoxSerial,
} from "../utils/boxSerialValidation";

const AddPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const getUsernameFromToken = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return "Admin";

      const base64Url = token.split(".")[1];
      if (!base64Url) return "Admin";

      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );

      const decoded = JSON.parse(jsonPayload);

      if (decoded.email) {
        const namePart = decoded.email.split("@")[0];
        return namePart.charAt(0).toUpperCase() + namePart.slice(1);
      }

      return decoded.username || decoded.name || "Admin";
    } catch (error) {
      console.error("Failed to parse token payload:", error);
      return "Admin";
    }
  };

  const username = currentUser?.username || getUsernameFromToken();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("name");
      localStorage.removeItem("user");
      localStorage.removeItem("loginTimestamp");
      logout();

      toast.success("Logged out successfully");
      navigate("/");
    }
  };

  const { loading, addUserResponse, editUserResponse, error } = useSelector(
    (state) => state.user,
  );

  const userToEdit = location.state?.userToEdit || null;

  const formik = useFormik({
    initialValues: {
      pxeSerialNumber: userToEdit?.pxeSerialNumber || "",
      date: userToEdit?.date || "",
      transactionType: userToEdit?.transactionType || "",
      from: userToEdit?.from || "",
      to: userToEdit?.to || "",
      reason: userToEdit?.reason || "",
      serviceState: userToEdit?.serviceState || "",
      remarks: userToEdit?.remarks || "",
    },

    validationSchema: Yup.object({
      pxeSerialNumber: Yup.string()
        .transform((value) => normalizeBoxSerial(value))
        .matches(new RegExp(`^${BOX_SERIAL_INPUT_PATTERN}$`), BOX_SERIAL_PATTERN_TEXT)
        .required("Required"),
      date: Yup.string().required("Required"),
      transactionType: Yup.string().required("Required"),
      from: Yup.string().required("Required"),
      to: Yup.string().required("Required"),
      reason: Yup.string().required("Required"),
      serviceState: Yup.string().required("Required"),
      remarks: Yup.string().required("Required"),
    }),

    enableReinitialize: true,

    onSubmit: (values) => {
      if (userToEdit) {
        dispatch(editUserRequest({ ...values, id: userToEdit._id }));
      } else {
        dispatch(addUserRequest(values));
      }
    },
  });

  useEffect(() => {
    if (addUserResponse) {
      toast.success("Successfully Added!");
      formik.resetForm();
      dispatch(resetUserResponse());
    } else if (editUserResponse) {
      toast.success("Successfully Updated!");
      dispatch(resetUserResponse());
    }
  }, [addUserResponse, editUserResponse, dispatch]);

  return (
    <div className="enterprise-page add-page">
      <div className="enterprise-container add-page__container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Inventory Record</p>
            <h2 className="page-title">
              {userToEdit ? "Edit PXE Details" : "Add PXE Details"}
            </h2>
            <p className="page-subtitle">
              Capture movement, location, and serviceability details for each PXE box.
            </p>
          </div>

          <div className="toolbar-actions">
            <span className="user-chip">
              Welcome, <strong>{username}</strong>
            </span>
            <button
              type="button"
              className="enterprise-btn enterprise-btn--secondary"
              onClick={() => navigate("/")}
            >
              View List
            </button>
            <button
              type="button"
              className="enterprise-btn enterprise-btn--danger"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="custom-card enterprise-card">
          <div className="form-section-header">
            <div>
              <h3>{userToEdit ? "Update Inventory Entry" : "New Inventory Entry"}</h3>
              <p>Fields marked by validation must be completed before saving.</p>
            </div>
          </div>

          <div className="card-body p-4 p-lg-5">
            <form onSubmit={formik.handleSubmit}>
              <div className="row g-4 mb-4">
                <div className="col-md-4">
                  <label className="form-label fw-semibold">PXE Serial Number</label>
                  <input
                    type="text"
                    name="pxeSerialNumber"
                    className={`form-control form-control-lg ${
                      formik.touched.pxeSerialNumber && formik.errors.pxeSerialNumber
                        ? "is-invalid"
                        : ""
                    }`}
                    placeholder="Enter serial number"
                    onChange={(event) =>
                      formik.setFieldValue("pxeSerialNumber", normalizeBoxSerial(event.target.value))
                    }
                    value={formik.values.pxeSerialNumber}
                    pattern={BOX_SERIAL_INPUT_PATTERN}
                    title={BOX_SERIAL_PATTERN_TEXT}
                    required
                  />
                  {formik.touched.pxeSerialNumber &&
                    formik.errors.pxeSerialNumber && (
                      <div className="invalid-feedback">
                        {formik.errors.pxeSerialNumber}
                      </div>
                    )}
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Date</label>
                  <input
                    type="date"
                    name="date"
                    className={`form-control form-control-lg ${
                      formik.touched.date && formik.errors.date ? "is-invalid" : ""
                    }`}
                    onChange={formik.handleChange}
                    value={formik.values.date}
                    required
                  />
                  {formik.touched.date && formik.errors.date && (
                    <div className="invalid-feedback">{formik.errors.date}</div>
                  )}
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Transaction Type</label>
                  <select
                    name="transactionType"
                    className={`form-select form-select-lg ${
                      formik.touched.transactionType && formik.errors.transactionType
                        ? "is-invalid"
                        : ""
                    }`}
                    onChange={formik.handleChange}
                    value={formik.values.transactionType}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="ISSUE">ISSUE</option>
                    <option value="RECEIPT">RECEIPT</option>
                    <option value="OTHERS">OTHERS</option>
                  </select>
                  {formik.touched.transactionType &&
                    formik.errors.transactionType && (
                      <div className="invalid-feedback">
                        {formik.errors.transactionType}
                      </div>
                    )}
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">From</label>
                  <input
                    type="text"
                    name="from"
                    className={`form-control form-control-lg ${
                      formik.touched.from && formik.errors.from ? "is-invalid" : ""
                    }`}
                    placeholder="Source location"
                    onChange={formik.handleChange}
                    value={formik.values.from}
                    required
                  />
                  {formik.touched.from && formik.errors.from && (
                    <div className="invalid-feedback">{formik.errors.from}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">To</label>
                  <input
                    type="text"
                    name="to"
                    className={`form-control form-control-lg ${
                      formik.touched.to && formik.errors.to ? "is-invalid" : ""
                    }`}
                    placeholder="Destination location"
                    onChange={formik.handleChange}
                    value={formik.values.to}
                    required
                  />
                  {formik.touched.to && formik.errors.to && (
                    <div className="invalid-feedback">{formik.errors.to}</div>
                  )}
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Reason</label>
                  <input
                    type="text"
                    name="reason"
                    className={`form-control form-control-lg ${
                      formik.touched.reason && formik.errors.reason
                        ? "is-invalid"
                        : ""
                    }`}
                    placeholder="Reason for transaction"
                    onChange={formik.handleChange}
                    value={formik.values.reason}
                    required
                  />
                  {formik.touched.reason && formik.errors.reason && (
                    <div className="invalid-feedback">{formik.errors.reason}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Serviceability State</label>
                  <select
                    name="serviceState"
                    className={`form-select form-select-lg ${
                      formik.touched.serviceState && formik.errors.serviceState
                        ? "is-invalid"
                        : ""
                    }`}
                    onChange={formik.handleChange}
                    value={formik.values.serviceState}
                    required
                  >
                    <option value="">Select State</option>
                    <option value="SERVICEABLE">SERVICEABLE</option>
                    <option value="UN-SERVICEABLE">UN-SERVICEABLE</option>
                  </select>
                  {formik.touched.serviceState && formik.errors.serviceState && (
                    <div className="invalid-feedback">{formik.errors.serviceState}</div>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <label className="form-label fw-semibold">Remarks</label>
                <textarea
                  name="remarks"
                  className={`form-control ${
                    formik.touched.remarks && formik.errors.remarks
                      ? "is-invalid"
                      : ""
                  }`}
                  rows="3"
                  placeholder="Add any additional notes"
                  onChange={formik.handleChange}
                  value={formik.values.remarks}
                  required
                />
                {formik.touched.remarks && formik.errors.remarks && (
                  <div className="invalid-feedback d-block">{formik.errors.remarks}</div>
                )}
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <button
                    type="submit"
                    className="enterprise-btn enterprise-btn--primary w-100 form-submit-btn"
                    disabled={loading}
                  >
                    {loading && (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    )}
                    {userToEdit ? "Update Details" : "Save Details"}
                  </button>
                </div>
                <div className="col-md-6">
                  <button
                    type="button"
                    className="enterprise-btn enterprise-btn--secondary w-100 form-submit-btn"
                    onClick={() => formik.resetForm()}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger mt-4 text-center border-0 shadow-sm">
                  {typeof error === "object" ? error.message : JSON.stringify(error)}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPage;
