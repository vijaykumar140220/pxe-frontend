import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import SortableHeader from "../Components/SortableHeader";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";
import "./TransactionRegisterPage.css";

const API_URL = "http://127.0.0.1:5000/transaction-history";

const initialForm = {
  date: "",
  boxSerialNumber: "",
  transactionType: "",
  fromName: "",
  fromOffice: "",
  fromLocation: "",
  toName: "",
  toOffice: "",
  toLocation: "",
  boxStatus: "",
  remarks: "",
};

const importBlankValue = "\u200B";

const columns = [
  { key: "date", label: "Date", required: true },
  { key: "boxSerialNumber", label: "Box Serial Number", required: true },
  { key: "transactionType", label: "Transaction Type", required: true },
  { key: "fromName", label: "From (Name)" },
  { key: "fromOffice", label: "From (Office)" },
  { key: "fromLocation", label: "From (Location)" },
  { key: "toName", label: "To (Name)" },
  { key: "toOffice", label: "To (Office)" },
  { key: "toLocation", label: "To (Location)" },
  { key: "boxStatus", label: "Box Status" },
  { key: "remarks", label: "Remarks" },
];

const transactionTypes = ["PURCHASE", "ISSUE", "RECEIPT", "ON LOAN"];
const boxStatuses = ["SERVICEABLE", "UN-SERVICEABLE", "NOT TRACED", "TAMPERED"];
const officeOptions = [
  "TOUCHLINE TECHNOLOGIES PVT LTD",
  "CDAC",
  "EDUQUITY",
  "AHEESA",
  "EXAM CENTRE",
  "STOCK",
  "LOAN",
  "FLASHING HUB",
];
const defaultLocationOptions = [
  "THIRUVANANTHAPURAM",
  "AGARTALA",
  "AGRA",
  "AHMEDABAD",
  "AIZWAL",
  "AMRAVATI",
  "ASANSOL",
  "BADDI",
  "BALASORE",
  "BAREILLY",
  "BELAGAVI",
  "BENGALURU",
  "BERHAMPORE",
  "BHAGALPUR",
  "BHOPAL",
  "BHUBANESHWAR",
  "BIKANER",
  "BILASPUR",
  "BURDWAN",
  "CHANDIGARH MOHALI",
  "CHENNAI",
  "CHHAPRA",
  "CHHATRAPATI SAMBHAJI NAGAR",
  "CHURACHANDPUR",
  "COIMBATORE",
  "CUTTACK",
  "DARBHANGA",
  "DEHRADUN",
  "DHANBAD",
  "DIBRUGARH",
  "DIMAPUR",
  "DURG BHILAI",
  "DURGAPUR",
  "ELURU",
  "ERNAKULAM",
  "GANGTOK",
  "GAYA",
  "GORAKHPUR",
  "GUNTUR",
  "GUWAHATI",
  "GWALIOR",
  "HALDWANI",
  "HAMIRPUR",
  "HUBBALLI",
  "HYDERABAD",
  "IMPHAL",
  "INDORE",
  "ITANAGAR",
  "JABALPUR",
  "JAIPUR",
  "JALGAON",
  "JAMMU",
  "JAMSHEDPUR",
  "JHANSI",
  "JODHPUR",
  "JORHAT",
  "KAKINADA",
  "KALABURAGI",
  "KALYANI",
  "KANNUR",
  "KANPUR",
  "KARIMNAGAR",
  "KAVARATTI",
  "KOHIMA",
  "KOLHAPUR",
  "KOLKATA",
  "KOLLAM",
  "KOTTAYAM",
  "KOZHIKODE",
  "KRISHNAGIRI",
  "KURNOOL",
  "LEH",
  "LUCKNOW",
  "MADURAI",
  "MANGALURU",
  "MEERUT",
  "MUMBAI",
  "MUNGER",
  "MUZAFFARPUR",
  "MYSURU",
  "NAGPUR",
  "NANDED",
  "NASHIK",
  "NELLORE",
  "NEW DELHI",
  "NOIDA",
  "PATIALA",
  "PATNA",
  "PRAYAGRAJ",
  "PUNE",
  "PURNIA",
  "RAIPUR",
  "RAJAHMUNDRY",
  "RAJKOT",
  "RANCHI",
  "ROORKEE",
  "SAGAR",
  "SALEM",
  "SAMBA",
  "SAMBALPUR",
  "SHILLONG",
  "SHIMLA",
  "SHIVAMOGGA",
  "SIKAR",
  "SILIGURI",
  "SRI VIJAYA PURAM",
  "SRINAGAR",
  "SURAT",
  "THRISSUR",
  "TIRUCHIRAPALLI",
  "TIRUNELVELI",
  "UDUPI",
  "VELLORE",
  "VIJAYAWADA",
  "VISHAKHAPATNAM",
  "WARANGAL",
];

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getCellValue = (row, labels) => {
  const normalizedLabels = labels.map(normalizeHeader);
  const foundKey = Object.keys(row).find((key) =>
    normalizedLabels.includes(normalizeHeader(key)),
  );
  return foundKey ? row[foundKey] : "";
};

const formatExcelDate = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return "";
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value).trim()
    : parsed.toISOString().split("T")[0];
};

const blankForImport = (value) => (String(value || "").trim() ? value : importBlankValue);

const normalizeExcelRow = (row) => {
  const date = formatExcelDate(getCellValue(row, ["Date"]));
  const boxSerialNumber = String(
    getCellValue(row, ["Box Serial Number", "Serial Number", "PXE Serial Number", "Box Serial No"]),
  ).trim();
  const transactionType = String(getCellValue(row, ["Transaction Type", "Type", "Action"])).trim();

  return {
    date: blankForImport(date),
    boxSerialNumber: blankForImport(boxSerialNumber),
    transactionType: blankForImport(transactionType),
    fromName: String(getCellValue(row, ["From (Name)", "From Name", "From"])).trim(),
    fromOffice: String(getCellValue(row, ["From (Office)", "From Office"])).trim(),
    fromLocation: String(getCellValue(row, ["From (Location)", "From Location", "Location"])).trim(),
    toName: String(getCellValue(row, ["To (Name)", "To Name", "To"])).trim(),
    toOffice: String(getCellValue(row, ["To (Office)", "To Office"])).trim(),
    toLocation: String(getCellValue(row, ["To (Location)", "To Location"])).trim(),
    boxStatus: String(getCellValue(row, ["Box Status", "Status", "Service State"])).trim(),
    remarks: String(getCellValue(row, ["Remarks", "Remark", "Notes"])).trim(),
  };
};

const displayValue = (value) => String(value || "").replace(/\u200B/g, "");

const formatDate = (value) => {
  const cleanValue = displayValue(value);
  if (!cleanValue) return "";
  const parsed = new Date(cleanValue);
  if (Number.isNaN(parsed.getTime())) return cleanValue;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const TransactionRegisterPage = () => {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [records, setRecords] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [locationOptions, setLocationOptions] = useState(defaultLocationOptions);
  const [newLocation, setNewLocation] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });

  const fetchRecords = async () => {
    try {
      const response = await axios.get(API_URL);
      setRecords(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load transaction register");
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const sortedRecords = useMemo(
    () => sortTableRows(records, sortConfig, (record, key) => displayValue(record[key])),
    [records, sortConfig],
  );
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / recordsPerPage));
  const pageStartIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = useMemo(
    () => sortedRecords.slice(pageStartIndex, pageStartIndex + recordsPerPage),
    [sortedRecords, pageStartIndex, recordsPerPage],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const validateForm = () => {
    const nextErrors = {};
    columns.forEach(({ key, label, required }) => {
      if (required && !String(form[key]).trim()) nextErrors[key] = `${label} is required`;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleAddLocation = () => {
    const location = newLocation.trim().toUpperCase();
    if (!location) return;

    if (locationOptions.includes(location)) {
      toast.error("Location already exists");
      return;
    }

    setLocationOptions((prev) => [...prev, location].sort());
    setNewLocation("");
    toast.success("Location added to dropdown");
  };

  const handleSort = (key) => {
    setSortConfig((current) => nextSortConfig(current, key));
    setCurrentPage(1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      await axios.post(API_URL, form);
      toast.success("Transaction saved");
      setForm(initialForm);
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      try {
        const workbook = XLSX.read(readerEvent.target.result, {
          type: "binary",
          cellDates: true,
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const payload = rows
          .map(normalizeExcelRow)
          .filter((row) =>
            Object.values(row).some((value) => displayValue(value).trim()),
          );

        if (payload.length === 0) {
          toast.error("No valid transaction rows found in Excel");
          return;
        }

        await axios.post(`${API_URL}/bulk`, payload);
        toast.success(`${payload.length} transaction records imported`);
        fetchRecords();
      } catch (error) {
        toast.error(error.response?.data?.message || error.message || "Excel import failed");
      } finally {
        event.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportExcel = () => {
    if (records.length === 0) {
      toast.error("No transaction records available to export");
      return;
    }

    const exportRows = records.map((record, index) => ({
      "S.No": index + 1,
      Date: formatDate(record.date),
      "Box Serial Number": displayValue(record.boxSerialNumber),
      "Transaction Type": displayValue(record.transactionType),
      "From (Name)": displayValue(record.fromName),
      "From (Office)": displayValue(record.fromOffice),
      "From (Location)": displayValue(record.fromLocation),
      "To (Name)": displayValue(record.toName),
      "To (Office)": displayValue(record.toOffice),
      "To (Location)": displayValue(record.toLocation),
      "Box Status": displayValue(record.boxStatus),
      Remarks: displayValue(record.remarks),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaction Register");
    XLSX.writeFile(workbook, "Transaction_Register_Export.xlsx");
    toast.success("Transaction register exported");
  };

  return (
    <div className="enterprise-page transaction-register-page">
      <div className="enterprise-container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Transaction Register</p>
            <h2 className="page-title">PXE Box Transaction Register</h2>
            <p className="page-subtitle">
              Record purchase, issue, receipt, and transfer transactions for each box.
            </p>
          </div>
          <div className="toolbar-actions">
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
            />
            <button
              type="button"
              className="enterprise-btn enterprise-btn--primary"
              onClick={() => setShowForm((value) => !value)}
            >
              {showForm ? "Hide Form" : "Add Manual"}
            </button>
            <button
              type="button"
              className="enterprise-btn enterprise-btn--warning"
              onClick={() => fileInputRef.current.click()}
            >
              Import Excel
            </button>
            <button
              type="button"
              className="enterprise-btn enterprise-btn--secondary"
              onClick={exportExcel}
            >
              Export Excel
            </button>
          </div>
        </div>

        {showForm && (
          <form className="enterprise-card transaction-form" onSubmit={handleSubmit} noValidate>
            <div className="location-add-row">
              <label>Add Location</label>
              <input
                value={newLocation}
                placeholder="Type new location"
                onChange={(event) => setNewLocation(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddLocation();
                  }
                }}
              />
              <button
                type="button"
                className="enterprise-btn enterprise-btn--secondary"
                onClick={handleAddLocation}
              >
                Add
              </button>
            </div>
            <div className="transaction-form__grid">
              {columns.map(({ key, label }) => (
                <div className="transaction-field" key={key}>
                  <label>{label}</label>
                  {key === "transactionType" ? (
                    <select name={key} value={form[key]} onChange={handleChange}>
                      <option value="">Select type</option>
                      {transactionTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  ) : key === "fromOffice" || key === "toOffice" ? (
                    <select name={key} value={form[key]} onChange={handleChange}>
                      <option value="">Select office</option>
                      {officeOptions.map((office) => (
                        <option key={office} value={office}>
                          {office}
                        </option>
                      ))}
                    </select>
                  ) : key === "fromLocation" || key === "toLocation" ? (
                    <select name={key} value={form[key]} onChange={handleChange}>
                      <option value="">Select location</option>
                      {locationOptions.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  ) : key === "boxStatus" ? (
                    <select name={key} value={form[key]} onChange={handleChange}>
                      <option value="">Select status</option>
                      {boxStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={key}
                      type={key === "date" ? "date" : "text"}
                      value={form[key]}
                      onChange={handleChange}
                    />
                  )}
                  {errors[key] && <p>{errors[key]}</p>}
                </div>
              ))}
            </div>
            <div className="transaction-form__actions">
              <button
                type="submit"
                className="enterprise-btn enterprise-btn--success"
                disabled={loading}
              >
                Save Transaction
              </button>
              <button
                type="button"
                className="enterprise-btn enterprise-btn--secondary"
                onClick={() => {
                  setForm(initialForm);
                  setErrors({});
                }}
              >
                Clear
              </button>
            </div>
          </form>
        )}

        <div className="enterprise-card transaction-table-card">
          <div className="transaction-table-toolbar">
            <div>
              <strong>{records.length}</strong> transaction records
              <span>
                Showing {records.length === 0 ? 0 : pageStartIndex + 1}-
                {Math.min(pageStartIndex + recordsPerPage, records.length)}
              </span>
            </div>
            <div className="transaction-page-size">
              <label>Rows per page</label>
              <select
                value={recordsPerPage}
                onChange={(event) => {
                  setRecordsPerPage(Number(event.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 custom-table transaction-table">
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
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center py-4 text-muted">
                      No transaction records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record, index) => (
                    <tr key={record._id || `${record.boxSerialNumber}-${index}`}>
                      <td>{pageStartIndex + index + 1}</td>
                      <td>{formatDate(record.date)}</td>
                      <td className="fw-semibold text-primary">{displayValue(record.boxSerialNumber)}</td>
                      <td>{displayValue(record.transactionType)}</td>
                      <td>{displayValue(record.fromName)}</td>
                      <td>{displayValue(record.fromOffice)}</td>
                      <td>{displayValue(record.fromLocation)}</td>
                      <td>{displayValue(record.toName)}</td>
                      <td>{displayValue(record.toOffice)}</td>
                      <td>{displayValue(record.toLocation)}</td>
                      <td>{displayValue(record.boxStatus)}</td>
                      <td>{displayValue(record.remarks)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {records.length > 0 && (
            <div className="transaction-pagination">
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
                  .filter((page) => {
                    if (currentPage <= 3) {
                      return page <= 4 || page === totalPages;
                    }

                    if (currentPage >= totalPages - 2) {
                      return page === 1 || page >= totalPages - 3;
                    }

                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .map((page, index, pages) => (
                    <React.Fragment key={page}>
                      {index > 0 && page - pages[index - 1] > 1 && (
                        <span className="pagination-gap" aria-hidden="true">
                          ...
                        </span>
                      )}
                      <button
                        type="button"
                        className={`pagination-page ${
                          currentPage === page ? "is-active" : ""
                        }`}
                        aria-current={currentPage === page ? "page" : undefined}
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
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
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

export default TransactionRegisterPage;
