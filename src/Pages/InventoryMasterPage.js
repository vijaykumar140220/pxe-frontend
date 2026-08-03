import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import SortableHeader from "../Components/SortableHeader";
import { nextSortConfig, sortTableRows } from "../utils/tableSort";
import {
  BOX_SERIAL_INPUT_PATTERN,
  BOX_SERIAL_PATTERN_TEXT,
  isValidBoxSerial,
  normalizeBoxSerial,
} from "../utils/boxSerialValidation";
import "./InventoryMasterPage.css";

const API_URL = "http://127.0.0.1:5000/inventory-master";

const initialForm = {
  serialNumber: "",
  itemName: "",
  category: "",
  invoiceNumber: "",
  purchaseDate: "",
  purchasePrice: "",
  vendor: "",
  warranty: "",
};

const columns = [
  { key: "serialNumber", label: "Serial Number" },
  { key: "itemName", label: "Item Name" },
  { key: "category", label: "Category" },
  { key: "invoiceNumber", label: "Invoice Number" },
  { key: "purchaseDate", label: "Purchase Date" },
  { key: "purchasePrice", label: "Purchase Price" },
  { key: "vendor", label: "Vendor" },
  { key: "warranty", label: "Warranty" },
];

const fieldPlaceholders = {
  serialNumber: "BOSS-CBOX000004",
  itemName: "Enter item name",
  category: "Enter category",
  invoiceNumber: "Enter invoice number",
  purchaseDate: "Select purchase date",
  purchasePrice: "Enter purchase price",
  vendor: "Enter vendor name",
  warranty: "Enter warranty details",
};

const renderHoverContent = (value) => {
  const text = String(value || "").trim() || "N/A";
  const words = text.split(/\s+/).filter(Boolean);
  const preview = words.length > 1 ? `${words[0]}...` : text;

  return (
    <span className="inventory-tooltip" data-tooltip={text}>
      {preview}
    </span>
  );
};

const getCellValue = (row, labels) => {
  const normalizeHeader = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
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

const formatDisplayDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).trim();
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
};

const parseWarrantyYears = (value) => {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

const getDaysLeftFromWarranty = (purchaseDate, warranty) => {
  const years = parseWarrantyYears(warranty);
  if (!purchaseDate || !Number.isFinite(years)) return "";

  const startDate = new Date(purchaseDate);
  if (Number.isNaN(startDate.getTime())) return "";

  const expiryDate = new Date(startDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + years);
  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfExpiry = new Date(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate(),
  );

  const daysLeft = Math.ceil((startOfExpiry - startOfToday) / dayMs);

  if (daysLeft < 0) return "Expired";
  return `${daysLeft} days left`;
};

const normalizeExcelRow = (row) => ({
  serialNumber: String(
    getCellValue(row, [
      "Serial Number",
      "PXE Serial Number",
      "Box Serial Number",
      "Serial No",
      "Serial",
      "serialNumber",
    ]),
  ).trim(),
  itemName: String(
    getCellValue(row, ["Item Name", "Item", "Product", "Description", "itemName"]),
  ).trim(),
  category: String(getCellValue(row, ["Category", "Type", "Model", "category"])).trim(),
  invoiceNumber: String(
    getCellValue(row, [
      "Invoice Number",
      "Invoice No",
      "Invoice",
      "Bill Number",
      "Bill No",
      "invoiceNumber",
    ]),
  ).trim(),
  purchaseDate: formatExcelDate(
    getCellValue(row, [
      "Purchase Date",
      "Purchased Date",
      "Date Of Purchase",
      "Date",
      "purchaseDate",
    ]),
  ),
  purchasePrice: Number(
    String(
      getCellValue(row, [
        "Purchase Price",
        "Price",
        "Cost",
        "Amount",
        "Rate",
        "purchasePrice",
      ]),
    ).replace(/[^0-9.-]/g, ""),
  ),
  vendor: String(getCellValue(row, ["Vendor", "Supplier", "Seller", "vendor"])).trim(),
  warranty: String(
    getCellValue(row, ["Warranty", "Warranty Period", "Guarantee", "warranty"]),
  ).trim(),
});

const getImportValidationMessage = (rows) => {
  const requiredFields = columns.map(({ key, label }) => ({ key, label }));

  for (const [index, row] of rows.entries()) {
    const missing = requiredFields
      .filter(({ key }) => {
        const value = row[key];
        return value === "" || value === null || value === undefined;
      })
      .map(({ label }) => label);

    if (missing.length > 0) {
      return `Row ${index + 2}: missing ${missing.join(", ")}`;
    }

    if (!Number.isFinite(row.purchasePrice) || row.purchasePrice <= 0) {
      return `Row ${index + 2}: purchase price must be a valid number`;
    }

    if (!isValidBoxSerial(row.serialNumber)) {
      return `Row ${index + 2}: serial number must be ${BOX_SERIAL_PATTERN_TEXT}`;
    }
  }

  return "";
};

const InventoryMasterPage = () => {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [records, setRecords] = useState([]);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [customPageSize, setCustomPageSize] = useState("");
  const [recordRange, setRecordRange] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "serialNumber",
    direction: "asc",
  });

  const fetchRecords = async () => {
    try {
      const response = await axios.get(API_URL);
      setRecords(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load inventory master");
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const sortedRecords = useMemo(
    () => sortTableRows(records, sortConfig),
    [records, sortConfig],
  );
  const rangeStartIndex = recordRange
    ? Math.min(Math.max(recordRange.start - 1, 0), sortedRecords.length)
    : null;
  const rangeEndIndex = recordRange
    ? Math.min(recordRange.end, sortedRecords.length)
    : null;
  const totalPages = recordRange
    ? 1
    : Math.max(1, Math.ceil(sortedRecords.length / recordsPerPage));
  const pageStartIndex = recordRange
    ? rangeStartIndex
    : (currentPage - 1) * recordsPerPage;
  const pageEndIndex = recordRange
    ? rangeEndIndex
    : pageStartIndex + recordsPerPage;
  const paginatedRecords = useMemo(
    () => sortedRecords.slice(pageStartIndex, pageEndIndex),
    [sortedRecords, pageStartIndex, pageEndIndex],
  );
  const showingStart = paginatedRecords.length === 0 ? 0 : pageStartIndex + 1;
  const showingEnd = pageStartIndex + paginatedRecords.length;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const updatePageSize = (value) => {
    const nextSize = Number(value);
    if (!Number.isFinite(nextSize) || nextSize < 1) return;
    setRecordRange(null);
    setRecordsPerPage(nextSize);
    setCustomPageSize(String(nextSize));
    setCurrentPage(1);
  };

  const applyCountInput = (value) => {
    const text = String(value).trim();
    if (!text) {
      setRecordRange(null);
      setCustomPageSize("");
      setCurrentPage(1);
      return;
    }

    const rangeMatch = text.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);

      if (start < 1 || end < 1 || start > end) {
        toast.error("Enter range like 20-30");
        return;
      }

      if (start > sortedRecords.length) {
        toast.error(`Only ${sortedRecords.length} records available`);
        return;
      }

      setRecordRange({ start, end });
      setCustomPageSize(`${start}-${end}`);
      setCurrentPage(1);
      return;
    }

    updatePageSize(text);
  };

  const handleSort = (key) => {
    setSortConfig((current) => nextSortConfig(current, key));
    setCurrentPage(1);
  };

  const validate = () => {
    const nextErrors = {};
    columns.forEach(({ key }) => {
      if (!String(form[key]).trim()) nextErrors[key] = "Required";
    });

    const duplicateSerial = records.some(
      (record) =>
        record._id !== editingId &&
        record.serialNumber?.toLowerCase() === form.serialNumber.trim().toLowerCase(),
    );
    if (duplicateSerial) nextErrors.serialNumber = "Serial number already exists";
    if (form.serialNumber.trim() && !isValidBoxSerial(form.serialNumber)) {
      nextErrors.serialNumber = BOX_SERIAL_PATTERN_TEXT;
    }

    if (form.purchasePrice && Number(form.purchasePrice) <= 0) {
      nextErrors.purchasePrice = "Enter a valid price";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "serialNumber" ? normalizeBoxSerial(value) : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, form);
        toast.success("Inventory master item updated");
      } else {
        await axios.post(API_URL, form);
        toast.success("Inventory master item saved");
      }
      setForm(initialForm);
      setEditingId(null);
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save item");
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
          .filter((row) => Object.values(row).some((value) => String(value).trim()));

        if (payload.length === 0) {
          toast.error("No valid inventory rows found in Excel");
          return;
        }

        const validationMessage = getImportValidationMessage(payload);
        if (validationMessage) {
          toast.error(validationMessage);
          return;
        }

        await axios.post(`${API_URL}/bulk`, payload);
        toast.success(`${payload.length} inventory master records imported`);
        fetchRecords();
      } catch (error) {
        const message =
          error.response?.data?.message ||
          error.message ||
          "Excel import failed";
        toast.error(message);
      } finally {
        event.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportExcel = () => {
    if (records.length === 0) {
      toast.error("No inventory master records available to export");
      return;
    }

    const exportRows = records.map((record, index) => ({
      "S.No": index + 1,
      "Serial Number": record.serialNumber || "",
      "Item Name": record.itemName || "",
      Category: record.category || "",
      "Invoice Number": record.invoiceNumber || "",
      "Purchase Date": record.purchaseDate || "",
      "Purchase Price": record.purchasePrice || "",
      Vendor: record.vendor || "",
      Warranty: record.warranty || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Master");
    XLSX.writeFile(workbook, "Inventory_Master_Export.xlsx");
    toast.success("Inventory master exported");
  };

  const handleEdit = (record) => {
    setForm(
      columns.reduce(
        (nextForm, { key }) => ({
          ...nextForm,
          [key]: record[key] ?? "",
        }),
        {},
      ),
    );
    setEditingId(record._id);
    setErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setErrors({});
  };

  const handleDelete = async (record) => {
    if (!record._id) {
      toast.error("Unable to delete this item");
      return;
    }

    const confirmed = window.confirm(
      `Delete inventory master item ${record.serialNumber}?`,
    );
    if (!confirmed) return;

    try {
      setDeletingId(record._id);
      await axios.delete(`${API_URL}/${record._id}`);
      toast.success("Inventory master item deleted");
      if (editingId === record._id) clearForm();
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="enterprise-page inventory-master-page">
      <div className="enterprise-container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Inventory Master</p>
            <h2 className="page-title">PXE Box Master</h2>
            <p className="page-subtitle">
              Maintain unique PXE box details for purchase, vendor, and warranty records.
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
          <form className="enterprise-card master-form" onSubmit={handleSubmit} noValidate>
            <div className="master-form__grid">
              {columns.map(({ key, label }) => (
                <div className="master-field" key={key}>
                  <label>{label}</label>
                  <input
                    name={key}
                    type={
                      key === "purchaseDate"
                        ? "date"
                        : key === "purchasePrice"
                          ? "number"
                          : "text"
                    }
                    value={form[key]}
                    onChange={handleChange}
                    placeholder={fieldPlaceholders[key]}
                    pattern={key === "serialNumber" ? BOX_SERIAL_INPUT_PATTERN : undefined}
                    title={key === "serialNumber" ? BOX_SERIAL_PATTERN_TEXT : undefined}
                    required
                  />
                  {errors[key] && <p>{errors[key]}</p>}
                </div>
              ))}
            </div>
            <div className="master-form__actions">
              {editingId && (
                <button
                  type="button"
                  className="enterprise-btn enterprise-btn--secondary"
                  onClick={clearForm}
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="enterprise-btn enterprise-btn--success"
                disabled={loading}
              >
                {editingId ? "Update Master Item" : "Save Records"}
              </button>
              <button
                type="button"
                className="enterprise-btn enterprise-btn--secondary"
                onClick={clearForm}
              >
                Clear
              </button>
            </div>
          </form>
        )}

        <div className="enterprise-card master-table-card">
          <div className="master-table-toolbar">
            <div>
              <strong>{records.length}</strong> Total PXE records
              <span>
                Showing {showingStart}-{showingEnd}
              </span>
            </div>
            <div className="master-page-size">
              <label>Rows per page</label>
              <select
                value={recordsPerPage}
                onChange={(event) => updatePageSize(event.target.value)}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <input
                type="text"
                inputMode="numeric"
                placeholder="20-30"
                value={customPageSize}
                onChange={(event) => setCustomPageSize(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyCountInput(customPageSize);
                }}
                onBlur={() => {
                  if (customPageSize) applyCountInput(customPageSize);
                }}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 custom-table master-table">
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-muted">
                      No inventory master records found.
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-muted">
                      No records found for this range.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record, index) => (
                    <tr key={record._id || record.serialNumber}>
                      <td>{pageStartIndex + index + 1}</td>
                      <td className="fw-semibold box-serial-name">{record.serialNumber}</td>
                      <td className="item-name-cell">{record.itemName}</td>
                      <td>{record.category}</td>
                      <td className="invoice-number-cell">{record.invoiceNumber}</td>
                      <td className="purchase-date-cell">{formatDisplayDate(record.purchaseDate)}</td>
                      <td>{record.purchasePrice}</td>
                      <td className="vendor-column">{renderHoverContent(record.vendor)}</td>
                      <td
                        title={record.warranty ? `Warranty: ${record.warranty}` : undefined}
                      >
                        {getDaysLeftFromWarranty(record.purchaseDate, record.warranty) ||
                          record.warranty}
                      </td>
                      <td>
                        <div className="master-actions">
                          <button
                            type="button"
                            title="Edit item"
                            aria-label={`Edit ${record.serialNumber}`}
                            onClick={() => handleEdit(record)}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            title="Delete item"
                            aria-label={`Delete ${record.serialNumber}`}
                            className="is-danger"
                            disabled={deletingId === record._id}
                            onClick={() => handleDelete(record)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {records.length > 0 && !recordRange && (
            <div className="master-pagination" aria-label="Inventory master pagination">
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

export default InventoryMasterPage;
