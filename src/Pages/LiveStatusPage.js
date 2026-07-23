import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import SortableHeader from "../Components/SortableHeader";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";
import "./LiveStatusPage.css";

const LIVE_STATUS_API_URL =
  "http://127.0.0.1:5000/transaction-history/live-status";

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
  const tableColSpan = 1 + columns.length;

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
      cdacStock: { count: 0, serviceable: 0, unserviceable: 0 },
      cdacLoan: { count: 0, serviceable: 0, unserviceable: 0 },
      eduquity: { count: 0, serviceable: 0, unserviceable: 0 },
      aheesa: { count: 0, serviceable: 0, unserviceable: 0 },
      examCentre: { count: 0, serviceable: 0, unserviceable: 0 },
      flashingHub: { count: 0, serviceable: 0, unserviceable: 0 },
      policeCustody: { count: 0, serviceable: 0, unserviceable: 0 },
      notTraced: { count: 0, serviceable: 0, unserviceable: 0 },
      other: { count: 0, serviceable: 0, unserviceable: 0 },
    };

    records.forEach((record) => {
      const location = (record.location || "").toUpperCase();
      const currentStatus = (record.currentStatus || "").toUpperCase();
      const isServiceable = currentStatus === "SERVICEABLE";
      const statusKey = isServiceable ? "serviceable" : "unserviceable";
      const isPoliceCustody =
        location.includes("POLICE") || currentStatus.includes("POLICE");
      const isNotTraced =
        location.includes("NOT TRACED") || currentStatus.includes("NOT TRACED");

      if (isPoliceCustody) {
        breakdown.policeCustody.count += 1;
      } else if (isNotTraced) {
        breakdown.notTraced.count += 1;
      } else if (location.includes("STOCK")) {
        breakdown.cdacStock.count += 1;
        breakdown.cdacStock[statusKey] += 1;
      } else if (location.includes("LOAN")) {
        breakdown.cdacLoan.count += 1;
        breakdown.cdacLoan[statusKey] += 1;
      } else if (location.includes("EDUQUITY")) {
        breakdown.eduquity.count += 1;
        breakdown.eduquity[statusKey] += 1;
      } else if (location.includes("AHEESA")) {
        breakdown.aheesa.count += 1;
        breakdown.aheesa[statusKey] += 1;
      } else if (location.includes("EXAM")) {
        breakdown.examCentre.count += 1;
        breakdown.examCentre[statusKey] += 1;
      } else if (location.includes("FLASHING")) {
        breakdown.flashingHub.count += 1;
        breakdown.flashingHub[statusKey] += 1;
      } else {
        breakdown.other.count += 1;
        breakdown.other[statusKey] += 1;
      }
    });

    return breakdown;
  }, [records]);

  const getRowCount = (row) => row.count;
  const getRowTotal = (row) => row.count;

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
              <option value="Police Custody">Police Custody</option>
              <option value="Not Traced">Not Traced</option>
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
                  <th>Count</th>
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
                  <td>
                    <strong>{getRowCount(locationStatusBreakdown.cdacStock)}</strong>
                  </td>
                  <td>{locationStatusBreakdown.cdacStock.serviceable}</td>
                  <td>{locationStatusBreakdown.cdacStock.unserviceable}</td>
                  <td>
                    <strong>{getRowTotal(locationStatusBreakdown.cdacStock)}</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>C-DAC (On Loan)</strong>
                  </td>
                  <td>
                    <strong>{getRowCount(locationStatusBreakdown.cdacLoan)}</strong>
                  </td>
                  <td>{locationStatusBreakdown.cdacLoan.serviceable}</td>
                  <td>{locationStatusBreakdown.cdacLoan.unserviceable}</td>
                  <td>
                    <strong>{getRowTotal(locationStatusBreakdown.cdacLoan)}</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Eduquity</strong>
                  </td>
                  <td>
                    <strong>{getRowCount(locationStatusBreakdown.eduquity)}</strong>
                  </td>
                  <td>{locationStatusBreakdown.eduquity.serviceable}</td>
                  <td>{locationStatusBreakdown.eduquity.unserviceable}</td>
                  <td>
                    <strong>{getRowTotal(locationStatusBreakdown.eduquity)}</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Aheesa</strong>
                  </td>
                  <td>
                    <strong>{getRowCount(locationStatusBreakdown.aheesa)}</strong>
                  </td>
                  <td>{locationStatusBreakdown.aheesa.serviceable}</td>
                  <td>{locationStatusBreakdown.aheesa.unserviceable}</td>
                  <td>
                    <strong>{getRowTotal(locationStatusBreakdown.aheesa)}</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Exam Centre</strong>
                  </td>
                  <td>
                    <strong>{getRowCount(locationStatusBreakdown.examCentre)}</strong>
                  </td>
                  <td>{locationStatusBreakdown.examCentre.serviceable}</td>
                  <td>{locationStatusBreakdown.examCentre.unserviceable}</td>
                  <td>
                    <strong>{getRowTotal(locationStatusBreakdown.examCentre)}</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Flashing Hub</strong>
                  </td>
                  <td>
                    <strong>{getRowCount(locationStatusBreakdown.flashingHub)}</strong>
                  </td>
                  <td>{locationStatusBreakdown.flashingHub.serviceable}</td>
                  <td>{locationStatusBreakdown.flashingHub.unserviceable}</td>
                  <td>
                    <strong>{getRowTotal(locationStatusBreakdown.flashingHub)}</strong>
                  </td>
                </tr>
                <tr className="live-breakdown-row--highlight">
                  <td>
                    <strong>Police Custody</strong>
                  </td>
                  <td>
                    <strong>{getRowCount(locationStatusBreakdown.policeCustody)}</strong>
                  </td>
                  <td>{locationStatusBreakdown.policeCustody.serviceable}</td>
                  <td>{locationStatusBreakdown.policeCustody.unserviceable}</td>
                  <td>
                    <strong>{getRowTotal(locationStatusBreakdown.policeCustody)}</strong>
                  </td>
                </tr>
                <tr className="live-breakdown-row--highlight">
                  <td>
                    <strong>Not Traced</strong>
                  </td>
                  <td>
                    <strong>{getRowCount(locationStatusBreakdown.notTraced)}</strong>
                  </td>
                  <td>{locationStatusBreakdown.notTraced.serviceable}</td>
                  <td>{locationStatusBreakdown.notTraced.unserviceable}</td>
                  <td>
                    <strong>{getRowTotal(locationStatusBreakdown.notTraced)}</strong>
                  </td>
                </tr>
                <tr className="live-breakdown-total">
                  <td>
                    <strong>TOTAL</strong>
                  </td>
                  <td>
                    <strong>{records.length}</strong>
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
