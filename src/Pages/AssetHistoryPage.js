import React, { useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiActivity,
  FiBox,
  FiClock,
  FiEdit2,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import SortableHeader from "../Components/SortableHeader";
import { useAuth } from "../Context/AuthContext";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";
import "./AssetHistoryPage.css";

const API_URL = "http://127.0.0.1:5000/transaction-history";

const normalizeSerial = (value) =>
  String(value || "")
    .replace(/\u200B/g, "")
    .trim()
    .toUpperCase();

const displayValue = (value) => String(value || "").replace(/\u200B/g, "");

const asDate = (value) => {
  const date = new Date(displayValue(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = asDate(value);
  if (!date) return displayValue(value) || "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const sortHistory = (records) =>
  [...records].sort((a, b) => {
    const dateA = asDate(a.date)?.getTime() || 0;
    const dateB = asDate(b.date)?.getTime() || 0;
    if (dateA !== dateB) return dateA - dateB;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });

const columns = [
  { key: "date", label: "Transaction History (Date)" },
  { key: "boxSerialNumber", label: "Box Serial Number" },
  { key: "transactionType", label: "Transaction Type" },
  { key: "fromName", label: "From (Name)" },
  { key: "fromOffice", label: "From (Office)" },
  { key: "fromLocation", label: "From (Location)" },
  { key: "toName", label: "To (Name)" },
  { key: "toOffice", label: "To (Office)" },
  { key: "toLocation", label: "To (Location)" },
  { key: "boxStatus", label: "Box Status" },
  { key: "remarks", label: "Remarks" },
];

const AssetHistoryPage = () => {
  const { currentUser } = useAuth();
  const [serialInput, setSerialInput] = useState("");
  const [searchedSerial, setSearchedSerial] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "asc",
  });
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingRecord, setSavingRecord] = useState(false);

  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";

  const chronologicalHistory = useMemo(() => {
    const serial = normalizeSerial(searchedSerial);
    if (!serial) return [];
    return sortHistory(
      records.filter(
        (record) => normalizeSerial(record.boxSerialNumber) === serial,
      ),
    );
  }, [records, searchedSerial]);

  const history = useMemo(
    () =>
      sortTableRows(chronologicalHistory, sortConfig, (record, key) =>
        displayValue(record[key]),
      ),
    [chronologicalHistory, sortConfig],
  );

  const latestRecord = chronologicalHistory[chronologicalHistory.length - 1];

  const handleSort = (key) => {
    setSortConfig((current) => nextSortConfig(current, key));
  };

  const loadHistory = async (serial) => {
    const normalizedSerial = normalizeSerial(serial);

    if (!normalizedSerial) {
      toast.error("Enter a box serial number");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      setRecords(Array.isArray(response.data) ? response.data : []);
      setSearchedSerial(normalizedSerial);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to load asset history",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    loadHistory(serialInput);
  };

  const refreshHistory = () => {
    if (!searchedSerial) {
      toast.error("Search a box serial number first");
      return;
    }
    setSerialInput(searchedSerial);
    loadHistory(searchedSerial);
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setEditForm({
      transactionType: record.transactionType || "",
      fromName: record.fromName || "",
      fromOffice: record.fromOffice || "",
      fromLocation: record.fromLocation || "",
      toName: record.toName || "",
      toOffice: record.toOffice || "",
      toLocation: record.toLocation || "",
      boxStatus: record.boxStatus || "",
      remarks: record.remarks || "",
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
      await axios.put(`${API_URL}/${editingRecord._id}`, editForm);
      toast.success("Transaction updated");
      closeEditDialog();
      loadHistory(searchedSerial);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update transaction",
      );
    } finally {
      setSavingRecord(false);
    }
  };

  const handleDelete = async (record) => {
    if (!record?._id) return;
    if (
      !window.confirm(
        `Delete transaction ${record.boxSerialNumber || "this record"}?`,
      )
    )
      return;

    try {
      await axios.delete(`${API_URL}/${record._id}`);
      toast.success("Transaction deleted");
      loadHistory(searchedSerial);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to delete transaction",
      );
    }
  };

  return (
    <div className="enterprise-page asset-history-page">
      <div className="enterprise-container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Asset History</p>
            <h2 className="page-title">PXE Box Complete Transaction History</h2>
            <p className="page-subtitle">
              Search by box serial number to review purchase, issue, receipt,
              location and status changes.
            </p>
          </div>
          <div className="toolbar-actions">
            <button
              type="button"
              className="enterprise-btn enterprise-btn--secondary"
              onClick={refreshHistory}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "asset-history-spin" : ""} />{" "}
              Refresh
            </button>
          </div>
        </div>

        <form
          id="asset-history-search"
          className="enterprise-card asset-history-search"
          onSubmit={handleSearch}
        >
          <label>
            <span>Enter Serial Number</span>
            <input
              value={serialInput}
              onChange={(event) => setSerialInput(event.target.value)}
              placeholder="BOSS-CBOX000004"
            />
          </label>
          <button
            type="submit"
            className="enterprise-btn enterprise-btn--primary"
            disabled={loading}
          >
            <FiSearch /> Search
          </button>
        </form>

        {searchedSerial && (
          <section className="asset-history-summary">
            <article className="enterprise-card asset-history-stat asset-history-stat--blue">
              <FiBox />
              <div>
                <span>Box Serial Number</span>
                <strong>{searchedSerial}</strong>
              </div>
            </article>
            <article className="enterprise-card asset-history-stat asset-history-stat--green">
              <FiActivity />
              <div>
                <span>Total Transactions</span>
                <strong>{history.length}</strong>
              </div>
            </article>
            <article className="enterprise-card asset-history-stat asset-history-stat--gray">
              <FiMapPin />
              <div>
                <span>Current Location</span>
                <strong>
                  {displayValue(latestRecord?.toLocation) || "N/A"}
                </strong>
              </div>
            </article>
            <article className="enterprise-card asset-history-stat asset-history-stat--amber">
              <FiClock />
              <div>
                <span>Last Transaction</span>
                <strong>{formatDate(latestRecord?.date)}</strong>
              </div>
            </article>
          </section>
        )}

        <section className="enterprise-card asset-history-card">
          <div className="asset-history-card__header">
            <div>
              <h3>Transaction History</h3>
              <p>
                {searchedSerial
                  ? `${history.length} matching transaction${history.length === 1 ? "" : "s"} found`
                  : "Enter a serial number to load asset history"}
              </p>
            </div>
          </div>

          <div className="asset-history-table-wrap">
            <table className="asset-history-table">
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
                    <td colSpan="12" className="asset-history-empty">
                      Loading asset history...
                    </td>
                  </tr>
                ) : searchedSerial && history.length ? (
                  history.map((record, index) => (
                    <tr
                      key={
                        record._id ||
                        `${record.boxSerialNumber}-${record.date}-${index}`
                      }
                    >
                      <td>{index + 1}</td>
                      <td>{formatDate(record.date)}</td>
                      <td>
                        <strong>{displayValue(record.boxSerialNumber)}</strong>
                      </td>
                      <td>{displayValue(record.transactionType) || "N/A"}</td>
                      <td>{displayValue(record.fromName) || "N/A"}</td>
                      <td>{displayValue(record.fromOffice) || "N/A"}</td>
                      <td>{displayValue(record.fromLocation) || "N/A"}</td>
                      <td>{displayValue(record.toName) || "N/A"}</td>
                      <td>{displayValue(record.toOffice) || "N/A"}</td>
                      <td>{displayValue(record.toLocation) || "N/A"}</td>
                      <td>
                        <span className="asset-history-status">
                          {displayValue(record.boxStatus) || "N/A"}
                        </span>
                      </td>
                      <td>{displayValue(record.remarks) || "N/A"}</td>
                      {isAdmin && (
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary asset-history-action"
                              title="Edit transaction"
                              aria-label={`Edit ${record.boxSerialNumber || "transaction"}`}
                              onClick={() => openEditDialog(record)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger asset-history-action"
                              title="Delete transaction"
                              aria-label={`Delete ${record.boxSerialNumber || "transaction"}`}
                              onClick={() => handleDelete(record)}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : searchedSerial ? (
                  <tr>
                    <td colSpan="12" className="asset-history-empty">
                      No transaction history found for {searchedSerial}.
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="12" className="asset-history-empty">
                      Search a box serial number to view complete transaction
                      history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {editingRecord && (
          <div
            className="modal d-block"
            tabIndex="-1"
            role="dialog"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-lg" role="document">
              <div className="modal-content">
                <form onSubmit={handleSaveEdit}>
                  <div className="modal-header">
                    <h5 className="modal-title">Edit Transaction</h5>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={closeEditDialog}
                    ></button>
                  </div>
                  <div className="modal-body row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Transaction Type</label>
                      <input
                        className="form-control"
                        name="transactionType"
                        value={editForm.transactionType || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">From Name</label>
                      <input
                        className="form-control"
                        name="fromName"
                        value={editForm.fromName || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">From Office</label>
                      <input
                        className="form-control"
                        name="fromOffice"
                        value={editForm.fromOffice || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">From Location</label>
                      <input
                        className="form-control"
                        name="fromLocation"
                        value={editForm.fromLocation || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">To Name</label>
                      <input
                        className="form-control"
                        name="toName"
                        value={editForm.toName || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">To Office</label>
                      <input
                        className="form-control"
                        name="toOffice"
                        value={editForm.toOffice || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">To Location</label>
                      <input
                        className="form-control"
                        name="toLocation"
                        value={editForm.toLocation || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Box Status</label>
                      <input
                        className="form-control"
                        name="boxStatus"
                        value={editForm.boxStatus || ""}
                        onChange={handleEditFieldChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Remarks</label>
                      <textarea
                        className="form-control"
                        name="remarks"
                        rows="3"
                        value={editForm.remarks || ""}
                        onChange={handleEditFieldChange}
                      ></textarea>
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

export default AssetHistoryPage;
