import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./Viewpage.css";
import { getBoxRemarkText } from "../utils/reportData";

const TRANSACTION_API_URL = "http://127.0.0.1:5000/transaction-history";
const SELECTED_BOXES_STORAGE_KEY = "pxe_selected_boxes";

const ViewPage = () => {
  const reportRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [lookupSerial, setLookupSerial] = useState("");
  const [fetchedBox, setFetchedBox] = useState(null);
  const [selectedBoxes, setSelectedBoxes] = useState(() => {
    try {
      const raw = localStorage.getItem(SELECTED_BOXES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  });
  const [fetchError, setFetchError] = useState(null);
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState("");
  const [issuedBy, setIssuedBy] = useState({
    name: "",
    mobile: "",
    company: "",
    place: "",
    date: "",
    signatureFileName: "",
    signaturePreview: "",
  });
  const [receivedBy, setReceivedBy] = useState({
    name: "",
    mobile: "",
    company: "",
    place: "",
    date: "",
    signatureFileName: "",
    signaturePreview: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    };
  };

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const response = await axios.get(TRANSACTION_API_URL, getAuthHeaders());
        setRecords(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Unable to load PXE status data", error);
      }
    };

    loadRecords();
  }, []);

  const normalizeText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const getBoxSerial = (box) =>
    String(
      box?.boxSerialNumber || box?.serialNumber || box?.pxeSerialNumber || "",
    ).trim();

  const createUniqueId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `box-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const findMatchingBox = (serial) => {
    const normalized = normalizeText(serial);
    if (!normalized) return null;

    const matches = records
      .filter((record) =>
        [record.boxSerialNumber, record.serialNumber, record.pxeSerialNumber]
          .filter(Boolean)
          .some((value) => normalizeText(value) === normalized),
      )
      .sort(
        (a, b) =>
          new Date(b.date || b.createdAt || 0) -
          new Date(a.date || a.createdAt || 0),
      );

    return matches[0] || null;
  };

  const handleFetchBox = () => {
    setFetchError(null);
    setFetchedBox(null);
    setAddError(null);

    if (!lookupSerial.trim()) {
      setFetchError("Enter a box serial number to fetch details.");
      return;
    }

    const box = findMatchingBox(lookupSerial);
    if (!box) {
      setFetchError("No matching PXE box details found.");
      return;
    }

    setFetchedBox(box);
  };

  const handleAddBox = () => {
    setAddError(null);

    if (!fetchedBox) {
      setAddError("Fetch a box first before adding.");
      return;
    }

    const boxSerial = getBoxSerial(fetchedBox);
    if (!boxSerial) {
      setAddError("Selected box does not have a valid serial number.");
      return;
    }

    const normalizedBoxSerial = normalizeText(boxSerial);
    if (
      selectedBoxes.some(
        (item) => normalizeText(item.boxSerialNumber) === normalizedBoxSerial,
      )
    ) {
      setAddError("This box is already added to the report.");
      setAddSuccess("");
      return;
    }

    setSelectedBoxes((prev) => {
      const updated = [
        ...prev,
        {
          id: createUniqueId(),
          boxSerialNumber: boxSerial,
          status:
            fetchedBox.boxStatus ||
            fetchedBox.serviceState ||
            fetchedBox.currentStatus ||
            "N/A",
          date: fetchedBox.date || fetchedBox.createdAt || "",
          type: fetchedBox.transactionType || fetchedBox.action || "N/A",
          to:
            fetchedBox.toOffice ||
            fetchedBox.to ||
            fetchedBox.toLocation ||
            "N/A",
          from: fetchedBox.fromOffice || fetchedBox.from || "N/A",
          remarks: getBoxRemarkText(fetchedBox),
        },
      ];
      localStorage.setItem(SELECTED_BOXES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setLookupSerial("");
    setFetchedBox(null);
    setAddError(null);
    setAddSuccess("Box added successfully.");
    setTimeout(() => setAddSuccess(""), 3000);
  };

  const handleRemoveBox = (boxId) => {
    setSelectedBoxes((prev) => {
      const updated = prev.filter((item) => item.id !== boxId);
      localStorage.setItem(SELECTED_BOXES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateBoxQuantity = (boxId, field, value) => {
    setSelectedBoxes((prev) => {
      const updated = prev.map((item) =>
        item.id === boxId
          ? {
              ...item,
              [field]: Number(value >= 0 ? value : 0),
            }
          : item,
      );
      localStorage.setItem(SELECTED_BOXES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateIssuedBy = (field, value) => {
    setIssuedBy((prev) => ({ ...prev, [field]: value }));
  };

  const updateReceivedBy = (field, value) => {
    setReceivedBy((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureUpload = (type, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (type === "issued") {
      setIssuedBy((prev) => ({
        ...prev,
        signatureFileName: file.name,
        signaturePreview: previewUrl,
      }));
    } else {
      setReceivedBy((prev) => ({
        ...prev,
        signatureFileName: file.name,
        signaturePreview: previewUrl,
      }));
    }
  };

  const cboxQuantity = selectedBoxes.length;
  const totalPowerAdapterQty = selectedBoxes.reduce(
    (sum, item) => sum + Number(item.powerAdapterQty || 0),
    0,
  );
  const totalGpsAntennaQty = selectedBoxes.reduce(
    (sum, item) => sum + Number(item.gpsAntennaQty || 0),
    0,
  );

  const serialColumns = 3;
  const serialRows = (() => {
    const rows = [];
    const perColumn = Math.max(
      1,
      Math.ceil(selectedBoxes.length / serialColumns),
    );
    for (let rowIndex = 0; rowIndex < perColumn; rowIndex += 1) {
      const row = [];
      for (let colIndex = 0; colIndex < serialColumns; colIndex += 1) {
        const itemIndex = colIndex * perColumn + rowIndex;
        const item = selectedBoxes[itemIndex];
        row.push(
          item
            ? {
                slNo: itemIndex + 1,
                serial: item.boxSerialNumber,
              }
            : null,
        );
      }
      rows.push(row);
    }
    return rows;
  })();

  const handleGeneratePdf = async () => {
    if (!reportRef.current) return;

    const element = reportRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save("PXE-Report.pdf");

    // Clear all input fields after generating PDF
    setIssuedBy({
      name: "",
      mobile: "",
      company: "",
      place: "",
      date: "",
      signatureFileName: "",
      signaturePreview: "",
    });
    setReceivedBy({
      name: "",
      mobile: "",
      company: "",
      place: "",
      date: "",
      signatureFileName: "",
      signaturePreview: "",
    });
    setSelectedBoxes([]);
    localStorage.removeItem(SELECTED_BOXES_STORAGE_KEY);
  };

  return (
    <div className="enterprise-page view-page">
      <div className="enterprise-container">
        <div className="page-toolbar">
          <div>
            <p className="page-kicker">Inventory Control</p>
            <h2 className="page-title">PXE Status Report</h2>
            <p className="page-subtitle">
              Fetch a box number, add it to the report, and build the issue
              voucher.
            </p>
          </div>
        </div>

        <section className="enterprise-card lookup-card">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="filter-label">Box Number</label>
              <input
                className="form-control"
                placeholder="Enter C-box serial number"
                value={lookupSerial}
                onChange={(e) => setLookupSerial(e.target.value)}
              />
            </div>
            <div className="col-md-2 d-grid">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFetchBox}
              >
                Fetch
              </button>
            </div>
            <div className="col-md-2 d-grid">
              <button
                type="button"
                className="btn btn-success"
                onClick={handleAddBox}
              >
                Add
              </button>
            </div>
          </div>
          {fetchError && <p className="mt-3 text-danger">{fetchError}</p>}
          {addError && <p className="mt-3 text-danger">{addError}</p>}
          {addSuccess && (
            <div
              className="toast-message alert alert-success mt-3"
              role="alert"
            >
              {addSuccess}
            </div>
          )}

          {fetchedBox && (
            <div className="mt-4">
              <h4>Fetched Box Details</h4>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Box Serial</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>To</th>
                      <th>From</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        {fetchedBox.boxSerialNumber ||
                          fetchedBox.serialNumber ||
                          fetchedBox.pxeSerialNumber ||
                          "N/A"}
                      </td>
                      <td>
                        {fetchedBox.boxStatus ||
                          fetchedBox.serviceState ||
                          fetchedBox.currentStatus ||
                          "N/A"}
                      </td>
                      <td>
                        {fetchedBox.date || fetchedBox.createdAt || "N/A"}
                      </td>
                      <td>
                        {fetchedBox.transactionType ||
                          fetchedBox.action ||
                          "N/A"}
                      </td>
                      <td>
                        {fetchedBox.toOffice ||
                          fetchedBox.to ||
                          fetchedBox.toLocation ||
                          "N/A"}
                      </td>
                      <td>
                        {fetchedBox.fromOffice || fetchedBox.from || "N/A"}
                      </td>
                      <td>
                        {getBoxRemarkText(fetchedBox) || "N/A"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedBoxes.length > 0 && (
            <div className="mt-4">
              <h4>Selected Boxes</h4>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Box Serial</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>To</th>
                      <th>From</th>
                      <th>Nature of Fault / Remarks</th>
                      <th>Power Adapter Qty</th>
                      <th>GPS Antenna Qty</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBoxes.map((item) => (
                      <tr key={item.id}>
                        <td>{item.boxSerialNumber}</td>
                        <td>{item.status}</td>
                        <td>{item.date}</td>
                        <td>{item.type}</td>
                        <td>{item.to}</td>
                        <td>{item.from}</td>
                        <td>{item.remarks || "N/A"}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            value={item.powerAdapterQty ?? 0}
                            onChange={(e) =>
                              updateBoxQuantity(
                                item.id,
                                "powerAdapterQty",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            value={item.gpsAntennaQty ?? 0}
                            onChange={(e) =>
                              updateBoxQuantity(
                                item.id,
                                "gpsAntennaQty",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRemoveBox(item.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <div ref={reportRef}>
          <section className="enterprise-card lookup-card mt-4 report-voucher">
            <div className="report-header-top d-flex justify-content-between align-items-start mb-4 pb-3 border-bottom">
              <div className="report-left">
                <img
                  src="/OIP (1).webp"
                  alt="CDAC logo"
                  className="report-logo-cdac"
                />
                <div className="company-info mt-2">
                  <h6 className="company-name mb-1">
                    Centre for Development of Advanced Computing
                  </h6>
                  <p
                    className="company-address mb-0"
                    style={{ fontSize: "0.7rem", lineHeight: "1.4" }}
                  >
                    Tidel Park, 8th Floor,
                    <br />
                    'D' Block(North &amp; South),
                    <br />
                    No.4 Rajiv Gandhi Salai, Taramani,
                    <br />
                    Chennai- 600113, Tamilnadu (India)
                    <br />
                    Phone: +91-44-22542226/7 / Fax: +91-44-22542294
                  </p>
                </div>
              </div>
              <div className="report-right text-end">
                <h4 className="delivery-challan">DELIVERY CHALLAN</h4>
                <p className="challan-ref">CGPL-DCD31720206</p>
              </div>
            </div>
            <div className="text-center mb-4">
              <h3 className="voucher-title">ISSUE VOUCHER FOR NG-PXE SERVER</h3>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered report-table mb-4">
                <thead>
                  <tr>
                    <th>S No</th>
                    <th>Item</th>
                    <th>Denomination of Qty</th>
                    <th>QTY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>01</td>
                    <td>C-Box</td>
                    <td>EACH</td>
                    <td>{cboxQuantity || 0}</td>
                  </tr>
                  <tr>
                    <td>02</td>
                    <td>Power Adapter</td>
                    <td>EACH</td>
                    <td>{totalPowerAdapterQty || 0}</td>
                  </tr>
                  <tr>
                    <td>03</td>
                    <td>GPS Antenna</td>
                    <td>EACH</td>
                    <td>{totalGpsAntennaQty || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <h5 className="mb-3">SERIAL NUMBER OF C-BOX RECEIVED</h5>
              <div className="table-responsive mb-3">
                <table className="table table-bordered report-table">
                  <thead>
                    <tr>
                      <th>Box Serial</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>To</th>
                      <th>From</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBoxes.map((item) => (
                      <tr key={item.id}>
                        <td>{item.boxSerialNumber}</td>
                        <td>{item.status}</td>
                        <td>{item.date}</td>
                        <td>{item.type}</td>
                        <td>{item.to}</td>
                        <td>{item.from}</td>
                        <td>{item.remarks || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <h5>Issued By</h5>
                <div className="report-field">
                  <label>Name</label>
                  <input
                    className="form-control report-input"
                    value={issuedBy.name}
                    onChange={(e) => updateIssuedBy("name", e.target.value)}
                  />
                </div>
                <div className="report-field">
                  <label>Signature</label>
                  <div className="signature-space"></div>
                </div>
                <div className="report-field">
                  <label>Mob No.</label>
                  <input
                    className="form-control report-input"
                    value={issuedBy.mobile}
                    onChange={(e) => updateIssuedBy("mobile", e.target.value)}
                  />
                </div>
                <div className="report-field">
                  <label>Name of Company</label>
                  <input
                    className="form-control report-input"
                    value={issuedBy.company}
                    onChange={(e) => updateIssuedBy("company", e.target.value)}
                  />
                </div>
                <div className="report-field">
                  <label>Place</label>
                  <input
                    className="form-control report-input"
                    value={issuedBy.place}
                    onChange={(e) => updateIssuedBy("place", e.target.value)}
                  />
                </div>
                <div className="report-field">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control report-input"
                    value={issuedBy.date}
                    onChange={(e) => updateIssuedBy("date", e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <h5>Received By</h5>
                <div className="report-field">
                  <label>Name</label>
                  <input
                    className="form-control report-input"
                    value={receivedBy.name}
                    onChange={(e) => updateReceivedBy("name", e.target.value)}
                  />
                </div>
                <div className="report-field">
                  <label>Signature</label>
                  <div className="signature-space"></div>
                </div>
                <div className="report-field">
                  <label>Mob No.</label>
                  <input
                    className="form-control report-input"
                    value={receivedBy.mobile}
                    onChange={(e) => updateReceivedBy("mobile", e.target.value)}
                  />
                </div>
                <div className="report-field">
                  <label>Name of Company</label>
                  <input
                    className="form-control report-input"
                    value={receivedBy.company}
                    onChange={(e) =>
                      updateReceivedBy("company", e.target.value)
                    }
                  />
                </div>
                <div className="report-field">
                  <label>Place</label>
                  <input
                    className="form-control report-input"
                    value={receivedBy.place}
                    onChange={(e) => updateReceivedBy("place", e.target.value)}
                  />
                </div>
                <div className="report-field">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control report-input"
                    value={receivedBy.date}
                    onChange={(e) => updateReceivedBy("date", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
        <div className="d-flex justify-content-end mt-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGeneratePdf}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPage;
