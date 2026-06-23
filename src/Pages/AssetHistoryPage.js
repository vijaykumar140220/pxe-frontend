import React, { useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiActivity,
  FiBox,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import SortableHeader from "../Components/SortableHeader";
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
  const [serialInput, setSerialInput] = useState("");
  const [searchedSerial, setSearchedSerial] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "asc",
  });

  const chronologicalHistory = useMemo(() => {
    const serial = normalizeSerial(searchedSerial);
    if (!serial) return [];
    return sortHistory(records.filter((record) => normalizeSerial(record.boxSerialNumber) === serial));
  }, [records, searchedSerial]);

  const history = useMemo(
    () => sortTableRows(chronologicalHistory, sortConfig, (record, key) => displayValue(record[key])),
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
      toast.error(error.response?.data?.message || "Unable to load asset history");
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

  return (
    <div className="enterprise-page asset-history-page">
      <div className="enterprise-container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Asset History</p>
            <h2 className="page-title">PXE Box Complete Transaction History</h2>
            <p className="page-subtitle">
              Search by box serial number to review purchase, issue, receipt, location and status changes.
            </p>
          </div>
          <div className="toolbar-actions">
            <button
              type="button"
              className="enterprise-btn enterprise-btn--secondary"
              onClick={refreshHistory}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "asset-history-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        <form id="asset-history-search" className="enterprise-card asset-history-search" onSubmit={handleSearch}>
          <label>
            <span>Enter Serial Number</span>
            <input
              value={serialInput}
              onChange={(event) => setSerialInput(event.target.value)}
              placeholder="BOSS-CBOX0024"
            />
          </label>
          <button type="submit" className="enterprise-btn enterprise-btn--primary" disabled={loading}>
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
                <strong>{displayValue(latestRecord?.toLocation) || "N/A"}</strong>
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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" className="asset-history-empty">Loading asset history...</td>
                  </tr>
                ) : searchedSerial && history.length ? (
                  history.map((record, index) => (
                    <tr key={record._id || `${record.boxSerialNumber}-${record.date}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{formatDate(record.date)}</td>
                      <td><strong>{displayValue(record.boxSerialNumber)}</strong></td>
                      <td>{displayValue(record.transactionType) || "N/A"}</td>
                      <td>{displayValue(record.fromName) || "N/A"}</td>
                      <td>{displayValue(record.fromOffice) || "N/A"}</td>
                      <td>{displayValue(record.fromLocation) || "N/A"}</td>
                      <td>{displayValue(record.toName) || "N/A"}</td>
                      <td>{displayValue(record.toOffice) || "N/A"}</td>
                      <td>{displayValue(record.toLocation) || "N/A"}</td>
                      <td><span className="asset-history-status">{displayValue(record.boxStatus) || "N/A"}</span></td>
                      <td>{displayValue(record.remarks) || "N/A"}</td>
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
                      Search a box serial number to view complete transaction history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AssetHistoryPage;
