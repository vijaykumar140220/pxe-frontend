import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import SortableHeader from "../Components/SortableHeader";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";
import "./LiveStatusPage.css";

const API_URL = "http://127.0.0.1:5000/crud-operations/live-status";

const columns = [
  { key: "serialNumber", label: "Serial Number" },
  { key: "lastUpdated", label: "Last Updated" },
  { key: "currentCity", label: "Current City" },
  { key: "location", label: "Location" },
  { key: "currentStatus", label: "Current Status" },
];

const LiveStatusPage = () => {
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

  const fetchLiveStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      setRecords(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load live status");
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
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / recordsPerPage));
  const pageStartIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = sortedRecords.slice(
    pageStartIndex,
    pageStartIndex + recordsPerPage,
  );

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

  const serviceableCount = records.filter(
    (record) => record.currentStatus?.toUpperCase() === "SERVICEABLE",
  ).length;
  const unserviceableCount = records.filter(
    (record) => record.currentStatus?.toUpperCase() === "UN-SERVICEABLE",
  ).length;

  return (
    <div className="enterprise-page live-status-page">
      <div className="enterprise-container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Live Status</p>
            <h2 className="page-title">PXE Box Live Status</h2>
            <p className="page-subtitle">
              Current place and status for each unique PXE box from Transaction History.
            </p>
          </div>
          <div className="toolbar-actions">
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

        <div className="enterprise-card live-table-card">
          <div className="live-table-toolbar">
            <span>
              Showing {filteredRecords.length === 0 ? 0 : pageStartIndex + 1}-
              {Math.min(pageStartIndex + recordsPerPage, filteredRecords.length)} of{" "}
              {filteredRecords.length}
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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      Loading live status...
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No live status records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record, index) => {
                    const status = record.currentStatus || "N/A";
                    const isServiceable = status.toUpperCase() === "SERVICEABLE";
                    return (
                      <tr key={record._id || record.serialNumber}>
                        <td>{pageStartIndex + index + 1}</td>
                        <td className="fw-semibold text-primary">
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
      </div>
    </div>
  );
};

export default LiveStatusPage;
