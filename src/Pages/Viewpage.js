import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUsersRequest,
  deleteUserRequest,
  resetUserResponse,
} from "../Redux/Action";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Viewpage.css";
import { useAuth } from "../Context/AuthContext";
import { useRole } from "../Context/RoleContext";
import SortableHeader from "../Components/SortableHeader";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";

const ViewPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { logout } = useAuth();
  const { isAdmin } = useRole();

  const { loading, users, deleteUserResponse } = useSelector(
    (state) => state.user,
  );

  const [filters, setFilters] = useState({
    serial: "",
    date: "",
    type: "",
    to: "",
    state: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "pxeSerialNumber",
    direction: "asc",
  });
  const recordsPerPage = 10;

  const actionOptions = ["ISSUED", "RECEIPT", "OTHERS"];

  useEffect(() => {
    dispatch(fetchUsersRequest());
  }, [dispatch]);

  useEffect(() => {
    if (deleteUserResponse) {
      toast.success("Record deleted successfully!");
      dispatch(fetchUsersRequest());
      dispatch(resetUserResponse());
    }
  }, [deleteUserResponse, dispatch]);


  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("loginTimestamp");

      logout();
      dispatch({ type: "LOGOUT" });

      toast.success("Logged out successfully");
      
      navigate("/"); 
    }
  };

  const exportToExcel = () => {
    if (filteredUsers.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const exportData = filteredUsers.map(
      ({ _id, __v, createdAt, updatedAt, ...rest }) => rest,
    );
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PXE_Inventory");
    const fileName = `PXE_Export_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Excel file exported successfully!");
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        const formattedData = rawData.map((item) => {
          let rawDate = item["Date"] || item["date"];
          const d = new Date(rawDate);

          return {
            date: !isNaN(d.getTime())
              ? d.toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            pxeSerialNumber: String(
              item["Serial Number"] || item["pxeSerialNumber"] || "",
            ),
            transactionType: String(
              item["Action"] || item["transactionType"] || "",
            ).toUpperCase(),
            from: String(item["Location"] || item["from"] || "N/A"),
            to: String(item["To"] || item["to"] || "Warehouse"),
            reason: String(
              item["Reason"] || item["reason"] || "Bulk Excel Import",
            ),
            serviceState: String(
              item["Status"] || item["serviceState"] || "SERVICEABLE",
            ).toUpperCase(),
            remarks: String(item["Remarks"] || item["remarks"] || "Ok"),
          };
        });

        const response = await fetch(
          "http://localhost:5000/crud-operations/bulk",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formattedData),
          },
        );

        if (response.ok) {
          toast.success(`${formattedData.length} records imported!`);
          dispatch(fetchUsersRequest());
        } else {
          throw new Error("Server rejected data. Check console.");
        }
      } catch (err) {
        toast.error(`Import Error: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const formatDateToDisplay = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const getTypeBadge = (type) => {
    const upperType = type?.toUpperCase() || "N/A";
    let bgColor = "#6c757d";
    if (upperType === "ISSUED" || upperType === "ISSUE") bgColor = "#00bad1";
    if (upperType === "RETURNED" || upperType === "RECEIPT")
      bgColor = "#f1a500";
    if (upperType === "REPAIR SENT") bgColor = "#6f42c1";
    if (upperType === "DISPOSED") bgColor = "#dc3545";
    if (upperType === "INITIAL DATA PORTING") bgColor = "#28a745";

    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "0.75rem",
          fontWeight: "bold",
          color: "white",
          display: "inline-block",
          backgroundColor: bgColor,
          minWidth: "100px",
        }}
      >
        {upperType}
      </span>
    );
  };

  const getStateBadge = (state) => {
    const upperState = state?.toUpperCase();
    const isServiceable = upperState === "SERVICEABLE";
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "0.75rem",
          fontWeight: "bold",
          color: "white",
          display: "inline-block",
          backgroundColor: isServiceable ? "#28a745" : "#dc3545",
        }}
      >
        {upperState || "N/A"}
      </span>
    );
  };

  const filteredUsers = useMemo(() => {
    const matchingUsers = users.filter((user) => {
      const matchSerial = (user.pxeSerialNumber || "")
        .toLowerCase()
        .includes(filters.serial.toLowerCase());
      const matchDate = filters.date
        ? user.date?.split("T")[0] === filters.date
        : true;

      let matchType = true;
      if (filters.type) {
        const dbType = (user.transactionType || "").toUpperCase();
        const filterVal = filters.type.toUpperCase();

        if (filterVal === "ISSUED" || filterVal === "ISSUE") {
          matchType = dbType === "ISSUED" || dbType === "ISSUE";
        } else {
          matchType = dbType === filterVal;
        }
      }

      const matchTo = (user.to || "")
        .toLowerCase()
        .includes(filters.to.toLowerCase());
      const matchState = filters.state
        ? (user.serviceState || "").toUpperCase() === filters.state.toUpperCase()
        : true;
      return matchSerial && matchDate && matchType && matchTo && matchState;
    });

    return sortTableRows(matchingUsers, sortConfig);
  }, [filters, sortConfig, users]);

  const handleSort = (key) => {
    setSortConfig((current) => nextSortConfig(current, key));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);
  const pageStartIndex = (currentPage - 1) * recordsPerPage;
  const paginatedUsers = filteredUsers.slice(
    pageStartIndex,
    pageStartIndex + recordsPerPage,
  );

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="enterprise-page view-page">
      <div className="enterprise-container">
      <div className="page-toolbar">
        <div>
          <p className="page-kicker">Inventory Control</p>
          <h2 className="page-title">PXE Inventory List</h2>
          <p className="page-subtitle">
            Track box movement, serviceability, destinations, and operational remarks.
          </p>
        </div>
        <div className="toolbar-actions">
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept=".xlsx, .xls"
            onChange={handleImportExcel}
          />
          {isAdmin && (
            <>
              <button
                className="enterprise-btn enterprise-btn--warning"
                onClick={() => fileInputRef.current.click()}
              >
                Import Excel
              </button>
              <button
                className="enterprise-btn enterprise-btn--primary"
                onClick={() => navigate("/add")}
              >
                Add New PXE
              </button>
              <button
                className="enterprise-btn enterprise-btn--secondary"
                onClick={() => navigate("/register")}
              >
                User Management
              </button>
            </>
          )}
          <button
            className="enterprise-btn enterprise-btn--success"
            onClick={exportToExcel}
          >
            Export Excel
          </button>
          <button
            className="enterprise-btn enterprise-btn--danger"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="search-card enterprise-card">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="filter-label">Serial Number</label>
            <input
              name="serial"
              className="form-control"
              placeholder="Search..."
              value={filters.serial}
              onChange={handleFilterChange}
            />
          </div>
          <div className="col-md-2">
            <label className="filter-label">Filter Date</label>
            <input
              type="date"
              name="date"
              className="form-control"
              value={filters.date}
              onChange={handleFilterChange}
            />
          </div>
          <div className="col-md-2">
            <label className="filter-label">Action (Type)</label>
            <select
              name="type"
              className="form-select"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="">All Actions</option>
              {actionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="filter-label">To</label>
            <input
              name="to"
              className="form-control"
              placeholder="Destination..."
              value={filters.to}
              onChange={handleFilterChange}
            />
          </div>
          <div className="col-md-2">
            <label className="filter-label">State</label>
            <select
              name="state"
              className="form-select"
              value={filters.state}
              onChange={handleFilterChange}
            >
              <option value="">All States</option>
              <option value="SERVICEABLE">SERVICEABLE</option>
              <option value="UN-SERVICEABLE">UN-SERVICEABLE</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container enterprise-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 custom-table">
            <thead>
              <tr className="text-center">
                <th className="ps-4">S.No</th>
                <SortableHeader label="Date" sortKey="date" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="PXE Serial Number" sortKey="pxeSerialNumber" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Type" sortKey="transactionType" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="From" sortKey="from" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="To" sortKey="to" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="State" sortKey="serviceState" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader
                  label="Remarks"
                  sortKey="remarks"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="remarks-column"
                />
                {isAdmin && <th className="pe-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? "9" : "8"} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? "9" : "8"} className="text-center py-4 text-muted">
                    No records match.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => (
                  <tr key={user._id || index} className="text-center">
                    <td className="ps-4 fw-bold">{pageStartIndex + index + 1}</td>
                    <td>{formatDateToDisplay(user.date)}</td>
                    <td className="fw-semibold box-serial-name">
                      {user.pxeSerialNumber}
                    </td>
                    <td>{getTypeBadge(user.transactionType)}</td>
                    <td className="text-capitalize">{user.from}</td>
                    <td className="text-capitalize">{user.to}</td>
                    <td>{getStateBadge(user.serviceState)}</td>
                    <td className="remarks-column">{user.remarks || "Ok"}</td>
                    {isAdmin && (
                      <td className="pe-4">
                        <button
                          className="table-action table-action--edit"
                          onClick={() =>
                            navigate("/add", { state: { userToEdit: user } })
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="table-action table-action--delete"
                          onClick={() => {
                            if (window.confirm("Delete record?"))
                              dispatch(deleteUserRequest(user._id));
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {filteredUsers.length > recordsPerPage && (
        <div className="pagination-bar" aria-label="PXE inventory pagination">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          >
            Previous
          </button>
          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  className={`pagination-page ${
                    currentPage === pageNumber ? "is-active" : ""
                  }`}
                  aria-current={currentPage === pageNumber ? "page" : undefined}
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(page + 1, totalPages))
            }
          >
            Next
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default ViewPage;
