import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import SortableHeader from "../Components/SortableHeader";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useAuth } from "../Context/AuthContext";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";
import "./LiveStatusPage.css";

const LIVE_STATUS_API_URL =
  "http://127.0.0.1:5000/transaction-history/live-status";
const TRANSACTION_HISTORY_API_URL = "http://127.0.0.1:5000/transaction-history";

const columns = [
  { key: "serialNumber", label: "Serial Number" },
  { key: "lastUpdated", label: "Last Updated" },
  { key: "currentCity", label: "Current City" },
  { key: "location", label: "Location" },
  { key: "currentStatus", label: "Current Status" },
];

const formatISODate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const LiveStatusPage = () => {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "serialNumber",
    direction: "asc",
  });
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingRecord, setSavingRecord] = useState(false);

  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";

  const fetchLiveStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(LIVE_STATUS_API_URL);
      setRecords(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to load live status",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
  }, []);

  const filteredRecords = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        !searchTerm ||
        [
          record.serialNumber,
          record.currentCity,
          record.location,
          record.currentStatus,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchTerm));

      const matchesStatus =
        !statusFilter ||
        record.currentStatus?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const sortedRecords = useMemo(
    () => sortTableRows(filteredRecords, sortConfig),
    [filteredRecords, sortConfig],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(sortedRecords.length / recordsPerPage),
  );
  const pageStartIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = sortedRecords.slice(
    pageStartIndex,
    pageStartIndex + recordsPerPage,
  );
  const tableColSpan = 1 + columns.length + (isAdmin ? 1 : 0);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handlePageSizeChange = (event) => {
    setRecordsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortConfig((current) => nextSortConfig(current, key));
    setCurrentPage(1);
  };

  const formatDate = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setEditForm({
      boxSerialNumber: record.serialNumber || "",
      toLocation: record.currentCity || "",
      toOffice: record.location || "",
      boxStatus: record.currentStatus || "",
      date: formatISODate(record.lastUpdated),
    });
  };

  const closeEditDialog = () => {
    setEditingRecord(null);
    setEditForm({});
  };

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingRecord?._id) return;

    try {
      setSavingRecord(true);
      await axios.put(`${TRANSACTION_HISTORY_API_URL}/${editingRecord._id}`, {
        boxSerialNumber: editForm.boxSerialNumber,
        toLocation: editForm.toLocation,
        toOffice: editForm.toOffice,
        boxStatus: editForm.boxStatus,
        date: editForm.date,
      });
      toast.success("Live status updated");
      closeEditDialog();
      fetchLiveStatus();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update live status",
      );
    } finally {
      setSavingRecord(false);
    }
  };

  const handleDelete = async (record) => {
    if (!record?._id) return;
    if (
      !window.confirm(
        `Delete live status for ${record.serialNumber || "this record"}?`,
      )
    )
      return;

    try {
      await axios.delete(`${TRANSACTION_HISTORY_API_URL}/${record._id}`);
      toast.success("Live status deleted");
      fetchLiveStatus();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to delete live status",
      );
    }
  };

  const exportExcel = () => {
    if (sortedRecords.length === 0) {
      toast.error("No live status records available to export");
      return;
    }

    const exportRows = sortedRecords.map((record, index) => ({
      "S.No": index + 1,
      "Serial Number": record.serialNumber || "",
      "Last Updated": formatDate(record.lastUpdated),
      "Current City": record.currentCity || "",
      Location: record.location || "",
      "Current Status": record.currentStatus || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Live Status");
    XLSX.writeFile(workbook, "PXE_Live_Status.xlsx");
    toast.success("Live status exported");
  };

  const serviceableCount = records.filter(
    (record) => record.currentStatus?.toUpperCase() === "SERVICEABLE",
  ).length;
  const unserviceableCount = records.filter(
    (record) => record.currentStatus?.toUpperCase() === "UN-SERVICEABLE",
  ).length;

  const locationStatusBreakdown = useMemo(() => {
    const breakdown = {
      cdacStock: { serviceable: 0, unserviceable: 0 },
      cdacLoan: { serviceable: 0, unserviceable: 0 },
      eduquity: { serviceable: 0, unserviceable: 0 },
      aheesa: { serviceable: 0, unserviceable: 0 },
      examCentre: { serviceable: 0, unserviceable: 0 },
      flashingHub: { serviceable: 0, unserviceable: 0 },
      notTraced: { serviceable: 0, unserviceable: 0 },
      other: { serviceable: 0, unserviceable: 0 },
    };

    records.forEach((record) => {
      const location = (record.location || "").toUpperCase();
      const isServiceable =
        record.currentStatus?.toUpperCase() === "SERVICEABLE";
      const statusKey = isServiceable ? "serviceable" : "unserviceable";

      if (location.includes("STOCK")) {
        breakdown.cdacStock[statusKey] += 1;
      } else if (location.includes("LOAN")) {
        breakdown.cdacLoan[statusKey] += 1;
      } else if (location.includes("EDUQUITY")) {
        breakdown.eduquity[statusKey] += 1;
      } else if (location.includes("AHEESA")) {
        breakdown.aheesa[statusKey] += 1;
      } else if (location.includes("EXAM")) {
        breakdown.examCentre[statusKey] += 1;
      } else if (location.includes("FLASHING")) {
        breakdown.flashingHub[statusKey] += 1;
      } else if (location.includes("NOT TRACED")) {
        breakdown.notTraced[statusKey] += 1;
      } else {
        breakdown.other[statusKey] += 1;
      }
    });

    return breakdown;
  }, [records]);

  return (
    <div className="enterprise-page live-status-page">
      <div className="enterprise-container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Live Status</p>
            <h2 className="page-title">PXE Box Live Status</h2>
            <p className="page-subtitle">
              Current place and status for each unique PXE box from Transaction
              History.
            </p>
          </div>
          <div className="toolbar-actions">
            <button
              type="button"
              className="enterprise-btn enterprise-btn--success"
              onClick={exportExcel}
              disabled={loading || sortedRecords.length === 0}
            >
              Export Excel
            </button>
            <button
              type="button"
              className="enterprise-btn enterprise-btn--primary"
              onClick={fetchLiveStatus}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="live-summary-grid">
          <div className="enterprise-card live-summary-card">
            <span>Total Boxes</span>
            <strong>{records.length}</strong>
          </div>
          <div className="enterprise-card live-summary-card live-summary-card--ok">
            <span>Serviceable</span>
            <strong>{serviceableCount}</strong>
          </div>
          <div className="enterprise-card live-summary-card live-summary-card--alert">
            <span>Un-Serviceable</span>
            <strong>{unserviceableCount}</strong>
          </div>
        </div>

        <div className="enterprise-card live-filter-card">
          <div>
            <label className="filter-label">Search</label>
            <input
              className="form-control"
              value={search}
              placeholder="Serial, city, location, status..."
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div>
            <label className="filter-label">Current Status</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="Serviceable">Serviceable</option>
              <option value="Un-serviceable">Un-Serviceable</option>
            </select>
          </div>
          <div>
            <label className="filter-label">Rows Per Page</label>
            <select
              className="form-select"
              value={recordsPerPage}
              onChange={handlePageSizeChange}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className="enterprise-card live-breakdown-card">
          <div className="live-breakdown-header">
            <div>
              <h3>Location & Status Breakdown</h3>
              <p>Current custody and serviceability classification</p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm mb-0 live-breakdown-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Serviceable</th>
                  <th>Un-Serviceable</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>C-DAC Stock (CDAC)</strong>
                  </td>
                  <td>{locationStatusBreakdown.cdacStock.serviceable}</td>
                  <td>{locationStatusBreakdown.cdacStock.unserviceable}</td>
                  <td>
                    <strong>
                      {locationStatusBreakdown.cdacStock.serviceable +
                        locationStatusBreakdown.cdacStock.unserviceable}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>C-DAC (On Loan)</strong>
                  </td>
                  <td>{locationStatusBreakdown.cdacLoan.serviceable}</td>
                  <td>{locationStatusBreakdown.cdacLoan.unserviceable}</td>
                  <td>
                    <strong>
                      {locationStatusBreakdown.cdacLoan.serviceable +
                        locationStatusBreakdown.cdacLoan.unserviceable}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Eduquity</strong>
                  </td>
                  <td>{locationStatusBreakdown.eduquity.serviceable}</td>
                  <td>{locationStatusBreakdown.eduquity.unserviceable}</td>
                  <td>
                    <strong>
                      {locationStatusBreakdown.eduquity.serviceable +
                        locationStatusBreakdown.eduquity.unserviceable}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Aheesa</strong>
                  </td>
                  <td>{locationStatusBreakdown.aheesa.serviceable}</td>
                  <td>{locationStatusBreakdown.aheesa.unserviceable}</td>
                  <td>
                    <strong>
                      {locationStatusBreakdown.aheesa.serviceable +
                        locationStatusBreakdown.aheesa.unserviceable}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Exam Centre</strong>
                  </td>
                  <td>{locationStatusBreakdown.examCentre.serviceable}</td>
                  <td>{locationStatusBreakdown.examCentre.unserviceable}</td>
                  <td>
                    <strong>
                      {locationStatusBreakdown.examCentre.serviceable +
                        locationStatusBreakdown.examCentre.unserviceable}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Flashing Hub</strong>
                  </td>
                  <td>{locationStatusBreakdown.flashingHub.serviceable}</td>
                  <td>{locationStatusBreakdown.flashingHub.unserviceable}</td>
                  <td>
                    <strong>
                      {locationStatusBreakdown.flashingHub.serviceable +
                        locationStatusBreakdown.flashingHub.unserviceable}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Not Traced</strong>
                  </td>
                  <td>{locationStatusBreakdown.notTraced.serviceable}</td>
                  <td>{locationStatusBreakdown.notTraced.unserviceable}</td>
                  <td>
                    <strong>
                      {locationStatusBreakdown.notTraced.serviceable +
                        locationStatusBreakdown.notTraced.unserviceable}
                    </strong>
                  </td>
                </tr>
                <tr className="live-breakdown-total">
                  <td>
                    <strong>TOTAL</strong>
                  </td>
                  <td>
                    <strong>{serviceableCount}</strong>
                  </td>
                  <td>
                    <strong>{unserviceableCount}</strong>
                  </td>
                  <td>
                    <strong>{records.length}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="enterprise-card live-table-card">
          <div className="live-table-toolbar">
            <span>
              Showing {filteredRecords.length === 0 ? 0 : pageStartIndex + 1}-
              {Math.min(
                pageStartIndex + recordsPerPage,
                filteredRecords.length,
              )}{" "}
              of {filteredRecords.length}
            </span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 custom-table live-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  {columns.map(({ key, label }) => (
                    <SortableHeader
                      key={key}
                      label={label}
                      sortKey={key}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  ))}
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tableColSpan} className="text-center py-4">
                      Loading live status...
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColSpan}
                      className="text-center py-4 text-muted"
                    >
                      No live status records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record, index) => {
                    const status = record.currentStatus || "N/A";
                    const isServiceable =
                      status.toUpperCase() === "SERVICEABLE";
                    return (
                      <tr key={record._id || record.serialNumber}>
                        <td>{pageStartIndex + index + 1}</td>
                        <td className="fw-semibold box-serial-name">
                          {record.serialNumber}
                        </td>
                        <td>{formatDate(record.lastUpdated)}</td>
                        <td>{record.currentCity || ""}</td>
                        <td>{record.location || ""}</td>
                        <td>
                          <span
                            className={`live-status-badge ${
                              isServiceable
                                ? "live-status-badge--ok"
                                : "live-status-badge--alert"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary live-action-icon"
                                title="Edit record"
                                aria-label="Edit record"
                                onClick={() => openEditDialog(record)}
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger live-action-icon"
                                title="Delete record"
                                aria-label="Delete record"
                                onClick={() => handleDelete(record)}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredRecords.length > 0 && (
            <div className="pagination-bar live-pagination">
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              >
                Previous
              </button>
              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1,
                  )
                  .map((page, index, pages) => (
                    <React.Fragment key={page}>
                      {index > 0 && page - pages[index - 1] > 1 && (
                        <span className="pagination-gap">...</span>
                      )}
                      <button
                        type="button"
                        className={`pagination-page ${
                          currentPage === page ? "is-active" : ""
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
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

        {editingRecord && (
          <div
            className="modal d-block"
            tabIndex="-1"
            role="dialog"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <form onSubmit={handleSaveEdit}>
                  <div className="modal-header">
                    <h5 className="modal-title">Edit Live Status</h5>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={closeEditDialog}
                    ></button>
                  </div>
                  <div className="modal-body row g-3">
                    <div className="col-12">
                      <label className="form-label">Box Serial Number</label>
                      <input
                        className="form-control"
                        name="boxSerialNumber"
                        value={editForm.boxSerialNumber || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Current City</label>
                      <input
                        className="form-control"
                        name="toLocation"
                        value={editForm.toLocation || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Location</label>
                      <input
                        className="form-control"
                        name="toOffice"
                        value={editForm.toOffice || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Current Status</label>
                      <input
                        className="form-control"
                        name="boxStatus"
                        value={editForm.boxStatus || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date</label>
                      <input
                        className="form-control"
                        type="date"
                        name="date"
                        value={formatISODate(editForm.date)}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeEditDialog}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingRecord}
                    >
                      {savingRecord ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStatusPage;
