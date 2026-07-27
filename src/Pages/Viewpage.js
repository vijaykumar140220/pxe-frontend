import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import "./Viewpage.css";
import { getBoxRemarkText } from "../utils/reportData";

const TRANSACTION_API_URL = "http://127.0.0.1:5000/transaction-history";
const SELECTED_BOXES_STORAGE_KEY = "pxe_selected_boxes";
const CHALLAN_SEQUENCE_STORAGE_KEY = "pxe_challan_daily_sequence";

const getChallanDatePart = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
};

const getCurrentChallanSerial = () => {
  const date = getChallanDatePart();

  try {
    const storedSequence = JSON.parse(
      localStorage.getItem(CHALLAN_SEQUENCE_STORAGE_KEY),
    );
    if (
      storedSequence?.date === date &&
      Number.isInteger(storedSequence.serial) &&
      storedSequence.serial > 0
    ) {
      return storedSequence.serial;
    }
  } catch {
    // Start a new sequence if the saved value is not available or invalid.
  }

  return 1;
};

const createChallanNumber = (serial) =>
  `${getChallanDatePart()}${String(serial).padStart(2, "0")}`;

const ViewPage = () => {
  const reportRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [challanSerial, setChallanSerial] = useState(getCurrentChallanSerial);
  const challanNumber = createChallanNumber(challanSerial);
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
  const [reportError, setReportError] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
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

  const displayValue = (value) => String(value || "").trim() || "N/A";

  const formatReportDate = (value) => {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return "N/A";

    const parsed = new Date(cleanValue);
    if (Number.isNaN(parsed.getTime())) return cleanValue;

    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const joinReportParts = (...parts) => {
    const text = parts
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(" / ");
    return text || "N/A";
  };

  const getReportType = (box) =>
    displayValue(box?.transactionType || box?.action);

  const getReportTo = (box) =>
    joinReportParts(box?.toName, box?.toOffice || box?.to, box?.toLocation);

  const getReportFrom = (box) =>
    joinReportParts(
      box?.fromName,
      box?.fromOffice || box?.from,
      box?.fromLocation,
    );

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
          date: formatReportDate(fetchedBox.date || fetchedBox.createdAt),
          type: getReportType(fetchedBox),
          to: getReportTo(fetchedBox),
          from: getReportFrom(fetchedBox),
          natureOfFault: String(fetchedBox.natureOfFault || "").trim(),
          remarks: getBoxRemarkText(fetchedBox),
        },
      ];
      localStorage.setItem(SELECTED_BOXES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setLookupSerial("");
    setFetchedBox(null);
    setAddError(null);
    setReportError("");
    toast.success("Box added successfully.");
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
    if (selectedBoxes.length === 0) {
      setReportError(
        "Add at least one C-Box in SERIAL NUMBER OF C-BOX RECEIVED before generating the report.",
      );
      return;
    }

    setReportError("");
    if (!reportRef.current) return;

    setIsGeneratingReport(true);

    try {
      const element = reportRef.current;
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;
      const originalMarginLeft = element.style.marginLeft;
      const originalMarginRight = element.style.marginRight;

      element.style.width = "210mm";
      element.style.maxWidth = "210mm";
      element.style.marginLeft = "auto";
      element.style.marginRight = "auto";

      const initialScrollY = window.scrollY;
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        scrollY: 0,
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.marginLeft = originalMarginLeft;
      element.style.marginRight = originalMarginRight;
      window.scrollTo(0, initialScrollY);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const pdfWidth = pageWidth - margin * 2;
      const pdfHeight = pageHeight - margin * 2;

      const imgData = canvas.toDataURL("image/png");
      const pageImageHeight = (canvas.height * pdfWidth) / canvas.width;

      if (pageImageHeight <= pdfHeight) {
        pdf.addImage(imgData, "PNG", margin, margin, pdfWidth, pageImageHeight);
      } else {
        const scale = pdfHeight / pageImageHeight;
        const fitWidth = pdfWidth * scale;
        const fitHeight = pdfHeight;
        const posX = (pageWidth - fitWidth) / 2;
        pdf.addImage(imgData, "PNG", posX, margin, fitWidth, fitHeight);
      }

      pdf.save(`PXE-Report-${challanNumber}.pdf`);

      const nextSerial = challanSerial + 1;
      localStorage.setItem(
        CHALLAN_SEQUENCE_STORAGE_KEY,
        JSON.stringify({ date: getChallanDatePart(), serial: nextSerial }),
      );
      setChallanSerial(nextSerial);

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
    } catch (error) {
      console.error("Failed to generate report PDF", error);
      setReportError(
        "Unable to generate the report right now. Please try again.",
      );
    } finally {
      setIsGeneratingReport(false);
    }
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
              <label className="filter-label">NG-PXE SERVER Number</label>
              <input
                className="form-control"
                placeholder="Enter NG-PXE server number"
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
                      <th>Nature of Fault</th>
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
                        {formatReportDate(
                          fetchedBox.date || fetchedBox.createdAt,
                        )}
                      </td>
                      <td>{getReportType(fetchedBox)}</td>
                      <td>{getReportTo(fetchedBox)}</td>
                      <td>{getReportFrom(fetchedBox)}</td>
                      <td>{fetchedBox.natureOfFault || "N/A"}</td>
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
                      <th>Nature of Fault</th>
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
                        <td>{formatReportDate(item.date)}</td>
                        <td>{displayValue(item.type)}</td>
                        <td>{displayValue(item.to)}</td>
                        <td>{displayValue(item.from)}</td>
                        <td>{item.natureOfFault || "N/A"}</td>
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
                <div className="report-logo-wrap d-flex align-items-center">
                  <img
                    src="/Logo%201.png"
                    alt="Report logo"
                    className="report-logo-cdac"
                  />
                </div>
              </div>
              <div className="report-right text-end">
                <h4 className="delivery-challan">DELIVERY CHALLAN</h4>
                <p className="challan-ref">{challanNumber}</p>
              </div>
            </div>
            {/* ================= ISSUE VOUCHER ================= */}

<div className="voucher-section">

    <h3 className="voucher-title">
        ISSUE VOUCHER FOR NG-PXE SERVER AND ACCESSORIES
    </h3>

    <table className="table table-bordered report-table">

        <thead>
            <tr>
                <th>SL.NO</th>
                <th>ITEM</th>
                <th>DOQ</th>
                <th>QTY</th>
            </tr>
        </thead>

        <tbody>

            <tr>
                <td>01</td>
                <td>NG-PXE SERVER</td>
                <td>EACH</td>
                <td>{cboxQuantity}</td>
            </tr>

            <tr>
                <td>02</td>
                <td>POWER ADAPTER</td>
                <td>EACH</td>
                <td>{totalPowerAdapterQty}</td>
            </tr>

            <tr>
                <td>03</td>
                <td>GPS ANTENNA</td>
                <td>EACH</td>
                <td>{totalGpsAntennaQty}</td>
            </tr>

        </tbody>

    </table>

</div>

{/* ================= SERIAL NUMBER TABLE ================= */}

<div className="serial-section">

    <h3 className="serial-title">
        SERIAL NUMBER OF NG-PXE SERVERS
    </h3>

    <table className="table table-bordered report-table">

        <thead>

            <tr>

                <th style={{width:"8%"}}>SL.NO</th>

                <th style={{width:"30%"}}>
                    NG-PXE SERVER
                </th>

                <th style={{width:"18%"}}>
                    STATUS
                </th>

                <th>
                    NATURE OF FAULT
                </th>

            </tr>

        </thead>

        <tbody>

            {selectedBoxes.map((item,index)=>(

                <tr key={item.id}>

                    <td>{index+1}</td>

                    <td>{item.boxSerialNumber}</td>

                    <td>{item.status}</td>

                    <td>{item.natureOfFault || "N/A"}</td>

                </tr>

            ))}

        </tbody>

    </table>

</div>

            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <h5 className="signature-heading">Issued By</h5>
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
                <div className="report-field">
                  <label>Seal</label>
                  <div className="signature-space"></div>
                </div>
              </div>
              <div className="col-md-6">
                <h5 className="signature-heading">Received By</h5>
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
                <div className="report-field">
                  <label>Seal</label>
                  <div className="signature-space"></div>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div className="d-flex flex-column align-items-end mt-3">
          {reportError && (
            <p className="report-error mb-2" role="alert">
              {reportError}
            </p>
          )}
          <button
            type="button"
            className={`btn btn-primary report-generate-btn ${
              isGeneratingReport ? "is-loading" : ""
            }`}
            onClick={handleGeneratePdf}
            disabled={isGeneratingReport}
          >
            {isGeneratingReport && (
              <span className="report-generate-btn__spinner spinner-border spinner-border-sm me-2" />
            )}
            {isGeneratingReport ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPage;
