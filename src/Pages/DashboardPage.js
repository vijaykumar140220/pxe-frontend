import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiBox,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDatabase,
  FiDownload,
  FiFileText,
  FiMap,
  FiMapPin,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiHardDrive,
  FiLayers,
  FiShield,
  FiSlash,
  FiTool,
  FiTruck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useRole } from "../Context/RoleContext";
import "./DashboardPage.css";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

const INVENTORY_API_URL = "http://127.0.0.1:5000/inventory-master";
const TRANSACTION_API_URL = "http://127.0.0.1:5000/transaction-history";
const COLORS = [
  "#1e40af",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];
const normalize = (value) =>
  String(value || "")
    .replace(/\u200B/g, "")
    .trim()
    .toUpperCase();
const asDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const asTimestamp = (value) => asDate(value)?.getTime() || 0;
const latestSortKey = (record) =>
  [
    asTimestamp(record.date),
    asTimestamp(record.updatedAt),
    asTimestamp(record.createdAt),
  ].join("|");
const hasText = (value, text) => normalize(value).includes(text);
const isLoanRecord = (record) =>
  hasText(record.transactionType, "ON LOAN") ||
  hasText(record.toOffice, "LOAN") ||
  hasText(record.toLocation, "LOAN");
const formatDate = (value) => {
  const date = asDate(value);
  return date
    ? date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : value || "N/A";
};
const compactNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const MAP_HOTSPOTS = {
  MUMBAI: { top: "55%", left: "29%" },
  PUNE: { top: "58%", left: "27%" },
  NEWDELHI: { top: "22%", left: "44%" },
  DELHI: { top: "22%", left: "44%" },
  NOIDA: { top: "24%", left: "46%" },
  BENGALURU: { top: "73%", left: "41%" },
  CHENNAI: { top: "79%", left: "52%" },
  HYDERABAD: { top: "67%", left: "47%" },
  KOLKATA: { top: "48%", left: "67%" },
  AHMEDABAD: { top: "39%", left: "31%" },
  JAIPUR: { top: "32%", left: "38%" },
  LUCKNOW: { top: "29%", left: "52%" },
  BHOPAL: { top: "47%", left: "42%" },
  THIRUVANANTHAPURAM: { top: "90%", left: "42%" },
  KOZHIKODE: { top: "82%", left: "37%" },
  KANNUR: { top: "79%", left: "35%" },
  COIMBATORE: { top: "80%", left: "43%" },
  MADURAI: { top: "86%", left: "47%" },
  VADODARA: { top: "42%", left: "34%" },
  SURAT: { top: "48%", left: "31%" },
  NAGPUR: { top: "53%", left: "47%" },
};

const locationTotalLabelPlugin = {
  id: "locationTotalLabelPlugin",
  afterDatasetsDraw(chart) {
    const {
      ctx,
      data,
      scales: { x, y },
    } = chart;

    ctx.save();
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    data.labels.forEach((label, index) => {
      const datasetTotal = data.datasets.reduce(
        (sum, dataset) => sum + Number(dataset.data?.[index] || 0),
        0,
      );
      const meta = chart.getDatasetMeta(data.datasets.length - 1);
      const bar = meta?.data?.[index];
      if (!bar) return;

      const xPos = Math.min(x.right - 6, bar.x + 22);
      const yPos = y.getPixelForValue(index);
      ctx.fillStyle = "#0f172a";
      ctx.fillText(compactNumber(datasetTotal), xPos, yPos);
    });

    ctx.restore();
  },
};

const locationSegmentLabelPlugin = {
  id: "locationSegmentLabelPlugin",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;

    ctx.save();
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      const textStyle = datasetIndex === 0 ? "#ffffff" : "#ffffff";

      meta.data.forEach((bar, index) => {
        const value = Number(dataset.data?.[index] || 0);
        if (!value || !bar) return;

        const width = Math.abs(bar.x - bar.base);
        const label = compactNumber(value);
        const labelWidth = ctx.measureText(label).width;
        const insideBar = width >= labelWidth + 12;
        const xPos = insideBar
          ? (bar.x + bar.base) / 2
          : Math.max(bar.x, bar.base) + 10;
        const yPos = bar.y;

        ctx.fillStyle = insideBar ? textStyle : "#0f172a";
        ctx.textAlign = insideBar ? "center" : "left";
        ctx.fillText(label, xPos, yPos);
      });
    });

    ctx.restore();
  },
};

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 650 },
  plugins: {
    legend: {
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        color: "#475569",
        font: { size: 11, weight: 600 },
      },
    },
    tooltip: {
      backgroundColor: "#081a3a",
      padding: 10,
      titleFont: { weight: 700 },
      bodyFont: { weight: 600 },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#64748b", font: { size: 10 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: "#e8edf4" },
      ticks: { color: "#64748b", precision: 0, font: { size: 10 } },
    },
  },
};

const buildAnalytics = (inventory, transactions) => {
  const inventoryBySerial = new Map(
    inventory.map((asset) => [normalize(asset.serialNumber), asset]),
  );
  const latestBySerial = new Map();
  const validTransactions = transactions.filter((record) =>
    inventoryBySerial.has(normalize(record.boxSerialNumber)),
  );

  validTransactions.forEach((record) => {
    const serial = normalize(record.boxSerialNumber);
    const sortKey = latestSortKey(record);
    const current = latestBySerial.get(serial);
    if (!current || sortKey > current.sortKey)
      latestBySerial.set(serial, { ...record, sortKey });
  });

  const latest = inventory.map((asset) => ({
    ...latestBySerial.get(normalize(asset.serialNumber)),
    asset,
    boxSerialNumber: asset.serialNumber,
  }));
  const statusCount = (predicate) => latest.filter(predicate).length;
  const isStatus = (record, ...statuses) =>
    statuses.includes(normalize(record.boxStatus));
  const serviceable = statusCount((record) => isStatus(record, "SERVICEABLE"));
  const maintenance = statusCount((record) =>
    isStatus(record, "UN-SERVICEABLE", "UNSERVICEABLE"),
  );
  const inTransit = statusCount(isLoanRecord);
  const retired = statusCount((record) =>
    isStatus(record, "TAMPERED", "TEMPERED"),
  );
  const critical = statusCount((record) =>
    isStatus(record, "POLICE CUSTODY", "NOT TRACED", "NOT-TRACED"),
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTransactions = validTransactions.filter(
    (record) => String(record.date || "").slice(0, 10) === todayKey,
  ).length;
  const monthCounts = new Map();
  const dayCounts = new Map();
  validTransactions.forEach((record) => {
    const date = asDate(record.date);
    if (!date) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
  });
  const monthly = [...monthCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8);
  const daily = [...dayCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14);

  const locationMap = new Map();
  latest.forEach((record) => {
    const location = normalize(record.toLocation) || "UNASSIGNED";
    const entry = locationMap.get(location) || {
      total: 0,
      serviceable: 0,
      repair: 0,
      nonServiceable: 0,
    };
    entry.total += 1;
    if (isStatus(record, "SERVICEABLE")) entry.serviceable += 1;
    else if (
      isStatus(record, "UN-SERVICEABLE", "UNSERVICEABLE", "UN-SERVICABLE")
    )
      entry.repair += 1;
    else entry.nonServiceable += 1;
    locationMap.set(location, entry);
  });
  const locations = [...locationMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6);

  const departmentCounts = {
    Operations: 0,
    Testing: 0,
    Development: 0,
    QA: 0,
    Security: 0,
    Administration: 0,
  };
  latest.forEach((record) => {
    const office = normalize(record.toOffice);
    if (office === "STOCK") departmentCounts.Operations += 1;
    else if (office === "EDUQUITY") departmentCounts.Testing += 1;
    else if (office === "LOAN") departmentCounts.Development += 1;
    else if (office === "AHEESA") departmentCounts.QA += 1;
    else if (office === "NOT TRACED" || isStatus(record, "POLICE CUSTODY"))
      departmentCounts.Security += 1;
    else departmentCounts.Administration += 1;
  });

  const isLocation = (record, key) => {
    if (!record) return false;
    const office = normalize(record.toOffice || "");
    const location = normalize(record.toLocation || "");
    return (
      office === key ||
      location === key ||
      office.includes(key) ||
      location.includes(key)
    );
  };
  const isExactLocation = (record, key) => {
    if (!record) return false;
    const office = normalize(record.toOffice || "");
    const location = normalize(record.toLocation || "");
    return office === key || location === key;
  };
  const cDACStockSer = latest.filter(
    (record) => isExactLocation(record, "STOCK") && isStatus(record, "SERVICEABLE"),
  ).length;
  const cDACStockUnSer = latest.filter(
    (record) =>
      isExactLocation(record, "STOCK") &&
      isStatus(record, "UN-SERVICEABLE", "UNSERVICEABLE", "UN-SERVICABLE"),
  ).length;
  const cDACOnLoan = latest.filter((record) => {
    const office = normalize(record.toOffice || "");
    const transType = normalize(record.transactionType || "");
    return (
      office === "LOAN" || office.includes("LOAN") || transType.includes("LOAN")
    );
  }).length;
  const eduquitySer = latest.filter(
    (record) =>
      isLocation(record, "EDUQUITY") && isStatus(record, "SERVICEABLE"),
  ).length;
  const eduquityUnSer = latest.filter(
    (record) =>
      isLocation(record, "EDUQUITY") &&
      isStatus(record, "UN-SERVICEABLE", "UNSERVICEABLE", "UN-SERVICABLE"),
  ).length;
  const eduquityTampered = latest.filter(
    (record) =>
      isLocation(record, "EDUQUITY") &&
      isStatus(record, "TAMPERED", "TEMPERED"),
  ).length;
  const eduquityPoliceCustody = latest.filter(
    (record) =>
      isLocation(record, "EDUQUITY") && isStatus(record, "POLICE CUSTODY"),
  ).length;
  const aheesaUnSer = latest.filter(
    (record) =>
      isLocation(record, "AHEESA") &&
      isStatus(record, "UN-SERVICEABLE", "UNSERVICEABLE", "UN-SERVICABLE"),
  ).length;
  const notTraced = statusCount((record) =>
    isStatus(record, "NOT TRACED", "NOT-TRACED"),
  );
  const cDAC = cDACStockSer + cDACStockUnSer + cDACOnLoan;
  const eduquity =
    eduquitySer + eduquityUnSer + eduquityTampered + eduquityPoliceCustody;
  const aheesa = aheesaUnSer;

  const categoryCounts = new Map();
  inventory.forEach((asset) =>
    categoryCounts.set(
      asset.category || "Unclassified",
      (categoryCounts.get(asset.category || "Unclassified") || 0) + 1,
    ),
  );
  const topCategory = [...categoryCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0] || ["N/A", 0];
  const assetAges = inventory
    .map((asset) => asDate(asset.purchaseDate))
    .filter(Boolean)
    .map((date) => (Date.now() - date.getTime()) / 31557600000);
  const averageAge = assetAges.length
    ? assetAges.reduce((sum, value) => sum + value, 0) / assetAges.length
    : 0;
  const sortedTransactions = [...validTransactions].sort((a, b) =>
    `${b.date || ""}|${b.updatedAt || ""}`.localeCompare(
      `${a.date || ""}|${a.updatedAt || ""}`,
    ),
  );
  const activeLocation = locations[0] || ["N/A", { total: 0 }];
  const healthyPercent = inventory.length
    ? Math.round((serviceable / inventory.length) * 100)
    : 0;
  const maintenancePercent = inventory.length
    ? Math.round((maintenance / inventory.length) * 100)
    : 0;
  const criticalPercent = Math.max(
    0,
    100 - healthyPercent - maintenancePercent,
  );

  return {
    total: inventory.length,
    serviceable,
    maintenance,
    inTransit,
    retired,
    critical,
    todayTransactions,
    monthly,
    daily,
    locations,
    departments: departmentCounts,
    topCategory,
    averageAge,
    recent: sortedTransactions,
    activeLocation,
    health: [healthyPercent, maintenancePercent, criticalPercent],
    latest,
    cDACStockSer,
    cDACStockUnSer,
    cDACOnLoan,
    cDAC,
    eduquity,
    eduquitySer,
    eduquityUnSer,
    eduquityTampered,
    eduquityPoliceCustody,
    aheesa,
    notTraced,
  };
};

const getBreakdownSerials = (analytics, groupKey, statusKey = "all") => {
  const isServiceable = (record) =>
    normalize(record.boxStatus) === "SERVICEABLE";
  const isUnserviceable = (record) =>
    ["UN-SERVICEABLE", "UNSERVICEABLE", "UN-SERVICABLE"].includes(
      normalize(record.boxStatus),
    );
  const isLoan = (record) => {
    const office = normalize(record.toOffice || "");
    const transType = normalize(record.transactionType || "");
    return office === "LOAN" || office.includes("LOAN") || transType.includes("LOAN");
  };
  const isLocation = (record, key) => {
    const office = normalize(record.toOffice || "");
    const location = normalize(record.toLocation || "");
    return office === key || location === key || office.includes(key) || location.includes(key);
  };
  const getStatusMeta = (record) => {
    const status = normalize(record.boxStatus);
    const loan = isLoan(record);
    if (status === "SERVICEABLE")
      return { key: "serviceable", label: "Serviceable", tone: "success" };
    if (["UN-SERVICEABLE", "UNSERVICEABLE", "UN-SERVICABLE"].includes(status))
      return { key: "unserviceable", label: "Un-Serviceable", tone: "danger" };
    if (status === "POLICE CUSTODY")
      return { key: "policeCustody", label: "Police Custody", tone: "neutral" };
    if (status === "TAMPERED" || status === "TEMPERED")
      return { key: "tampered", label: "Tampered", tone: "neutral" };
    if (loan || status === "LOAN" || status === "ON LOAN")
      return { key: "onLoan", label: "Testing", tone: "blue" };
    return { key: "asset", label: "Asset", tone: "neutral" };
  };

  const matches = (record) => {
    const wantsServiceable = statusKey === "serviceable";
    const wantsUnserviceable = statusKey === "unserviceable";
    const wantsTampered = statusKey === "tampered";
    const wantsPoliceCustody = statusKey === "policeCustody";
    const wantsOnLoan = statusKey === "onLoan";
    if (groupKey === "cDAC") {
      if (wantsOnLoan) return isLoan(record);
      if (wantsServiceable)
        return (
          normalize(record.toOffice || "") === "STOCK" && isServiceable(record)
        );
      if (wantsUnserviceable)
        return (
          normalize(record.toOffice || "") === "STOCK" &&
          isUnserviceable(record)
        );
      if (statusKey !== "all") return false;
      return (
        (normalize(record.toOffice || "") === "STOCK" &&
          (isServiceable(record) || isUnserviceable(record))) ||
        isLoan(record)
      );
    }
    if (groupKey === "eduquity") {
      if (wantsServiceable) return isLocation(record, "EDUQUITY") && isServiceable(record);
      if (wantsUnserviceable)
        return isLocation(record, "EDUQUITY") && isUnserviceable(record);
      if (wantsTampered)
        return (
          isLocation(record, "EDUQUITY") &&
          ["TAMPERED", "TEMPERED"].includes(normalize(record.boxStatus))
        );
      if (wantsPoliceCustody)
        return (
          isLocation(record, "EDUQUITY") &&
          normalize(record.boxStatus) === "POLICE CUSTODY"
        );
      if (statusKey !== "all") return false;
      return isLocation(record, "EDUQUITY");
    }
    if (groupKey === "aheesa") {
      return isLocation(record, "AHEESA");
    }
    if (groupKey === "notTraced") {
      return ["NOT TRACED", "NOT-TRACED"].includes(normalize(record.boxStatus));
    }
    return false;
  };

  return analytics.latest
    .filter(matches)
    .map((record) => {
      const statusMeta = getStatusMeta(record);
      return {
        serial: record.boxSerialNumber || record.serialNumber,
        ...statusMeta,
      };
    })
    .filter((item) => item.serial);
};

const getBreakdownStatusOptions = (groupKey) => {
  if (groupKey === "cDAC") {
    return [
      { key: "all", label: "All" },
      { key: "serviceable", label: "Serviceable" },
      { key: "unserviceable", label: "Un-Serviceable" },
      { key: "onLoan", label: "Testing" },
    ];
  }

  if (groupKey === "eduquity") {
    return [
      { key: "all", label: "All" },
      { key: "serviceable", label: "Serviceable" },
      { key: "unserviceable", label: "Un-Serviceable" },
      { key: "tampered", label: "Tampered" },
      { key: "policeCustody", label: "Police Custody" },
    ];
  }

  return [{ key: "all", label: "All" }];
};

const getOperationalSerials = (analytics, statusKey) => {
  const isServiceable = (record) =>
    normalize(record.boxStatus) === "SERVICEABLE";
  const isUnserviceable = (record) =>
    ["UN-SERVICEABLE", "UNSERVICEABLE", "UN-SERVICABLE"].includes(
      normalize(record.boxStatus),
    );
  const isLoan = (record) => {
    const office = normalize(record.toOffice || "");
    const transType = normalize(record.transactionType || "");
    return office === "LOAN" || office.includes("LOAN") || transType.includes("LOAN");
  };
  const isStatusMatch = (record) => {
    if (statusKey === "serviceable") return isServiceable(record);
    if (statusKey === "unserviceable") return isUnserviceable(record);
    if (statusKey === "onLoan") return isLoan(record);
    if (statusKey === "retired")
      return ["TAMPERED", "TEMPERED"].includes(normalize(record.boxStatus));
    if (statusKey === "critical")
      return ["POLICE CUSTODY", "NOT TRACED", "NOT-TRACED"].includes(
        normalize(record.boxStatus),
      );
    return false;
  };

  return analytics.latest
    .filter((record) => isStatusMatch(record))
    .map((record) => ({
      serial: record.boxSerialNumber || record.serialNumber || "N/A",
      label:
        statusKey === "serviceable"
          ? "SERVICEABLE"
          : statusKey === "unserviceable"
            ? "UN-SERVICEABLE"
            : statusKey === "onLoan"
              ? "SERVICEABLE"
              : statusKey === "retired"
                ? "TAMPERED"
                : "NOT TRACED",
      tone:
        statusKey === "serviceable"
          ? "success"
          : statusKey === "unserviceable"
            ? "danger"
            : statusKey === "onLoan"
              ? "success"
              : "neutral",
    }))
    .filter((item) => item.serial && item.serial !== "N/A");
};

const getTotalAssetBreakdown = (inventory) => {
  const isBlackBox = (asset) =>
    [asset.category, asset.itemName, asset.model, asset.type]
      .filter(Boolean)
      .some((value) => normalize(value).includes("BLACK"));
  const isBlueBox = (asset) =>
    [asset.category, asset.itemName, asset.model, asset.type]
      .filter(Boolean)
      .some((value) => normalize(value).includes("BLUE"));

  return [
    {
      key: "blackBox",
      label: "Black Box",
      value: inventory.filter(isBlackBox).length,
    },
    {
      key: "blueBox",
      label: "Blue Box",
      value: inventory.filter(isBlueBox).length,
    },
  ];
};

const getTotalAssetSerials = (inventory) => {
  const classify = (asset) => {
    const fields = [asset.category, asset.itemName, asset.model, asset.type]
      .filter(Boolean)
      .map((value) => normalize(value));
    if (fields.some((value) => value.includes("BLACK"))) {
      return { label: "BLACK BOX", tone: "dark" };
    }
    if (fields.some((value) => value.includes("BLUE"))) {
      return { label: "BLUE BOX", tone: "blue" };
    }
    return { label: "ASSET", tone: "neutral" };
  };

  return inventory
    .map((asset) => ({
      serial: asset.serialNumber || asset.boxSerialNumber || "N/A",
      ...classify(asset),
    }))
    .filter((item) => item.serial && item.serial !== "N/A");
};

const getTotalAssetStatusOptions = () => [
  { key: "all", label: "All" },
  { key: "blackBox", label: "Black Box" },
  { key: "blueBox", label: "Blue Box" },
];

const ChartPanel = ({ title, subtitle, children, action, footer }) => (
  <section className="enterprise-card gov-chart-card">
    <div className="gov-card-heading">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {action || (
        <span className="gov-live-pill">
          <i /> Live
        </span>
      )}
    </div>
    {footer && <div className="gov-chart-footer">{footer}</div>}
    <div className="gov-chart-canvas">{children}</div>
  </section>
);

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "end-ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "start-ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }

  return [
    1,
    "start-ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-ellipsis",
    totalPages,
  ];
};

const DashboardPage = () => {
  const { isAdmin } = useRole();
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "date", direction: "desc" });
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [selectedBreakdownStatus, setSelectedBreakdownStatus] =
    useState("all");
  const [selectedOperational, setSelectedOperational] = useState(null);
  const [selectedIntelligence, setSelectedIntelligence] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const fetchDashboard = useCallback(async (notify = false) => {
    try {
      setLoading(true);
      const [inventoryResponse, transactionResponse] = await Promise.all([
        axios.get(INVENTORY_API_URL),
        axios.get(TRANSACTION_API_URL),
      ]);
      setInventory(inventoryResponse.data);
      setTransactions(transactionResponse.data);
      if (notify) toast.success("Command center synchronized with database");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to retrieve dashboard data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);
  const analytics = useMemo(
    () => buildAnalytics(inventory, transactions),
    [inventory, transactions],
  );
  const sparkValues = analytics.monthly.map(([, value]) => value);
  const previousMonth = sparkValues.at(-2) || 0;
  const currentMonth = sparkValues.at(-1) || 0;
  const monthlyTrend = previousMonth
    ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100)
    : 0;

  const kpis = [
    {
      label: "Total PXE Assets",
      value: analytics.total,
      icon: FiBox,
      color: "#1e40af",
      trend: 0,
      key: "totalAssets",
      details: getTotalAssetBreakdown(inventory).map((item) => [
        item.label,
        item.value,
      ]),
    },
  ];

  const operationalKpis = [
    {
      label: "Serviceable Assets",
      value: analytics.serviceable,
      icon: FiCheckCircle,
      color: "#16a34a",
      trend: 1,
    },
    {
      label: "Assets In Transportation",
      value: analytics.inTransit,
      icon: FiTruck,
      color: "#2563eb",
      trend: monthlyTrend,
    },
    {
      label: "Un-Serviceable Assets",
      value: analytics.maintenance,
      icon: FiTool,
      color: "#f59e0b",
      trend: -2,
    },
    {
      label: "Tampered Assets",
      value: analytics.retired,
      icon: FiDatabase,
      color: "#dc2626",
      trend: 0,
    },
    {
      label: "Today's Transactions",
      value: analytics.todayTransactions,
      icon: FiActivity,
      color: "#7c3aed",
      trend: monthlyTrend,
    },
  ];

  const breakdownItems = [
    {
      key: "cDAC",
      label: "C-DAC",
      icon: FiHardDrive,
      value: analytics.cDAC,
      color: "#1e40af",
      bg: "#dbeafe",
      details: [
        ["Serviceable", analytics.cDACStockSer],
        ["Un-Serviceable", analytics.cDACStockUnSer],
        ["Testing", analytics.cDACOnLoan],
      ],
    },
    {
      key: "eduquity",
      label: "EDUQUITY",
      icon: FiLayers,
      value: analytics.eduquity,
      color: "#16a34a",
      bg: "#dcfce7",
      details: [
        ["Serviceable", analytics.eduquitySer],
        ["Un-Serviceable", analytics.eduquityUnSer],
        ["Tampered", analytics.eduquityTampered],
        ["Police Custody", analytics.eduquityPoliceCustody],
      ],
    },
    {
      key: "aheesa",
      label: "AHEESA",
      icon: FiShield,
      value: analytics.aheesa,
      color: "#7c3aed",
      bg: "#ede9fe",
      details: [["Un-Serviceable", analytics.aheesa]],
    },
    {
      key: "notTraced",
      label: "Not Traced",
      icon: FiSlash,
      value: analytics.notTraced,
      color: "#8b5cf6",
      bg: "#f3e8ff",
      details: [["Not Traced", analytics.notTraced]],
    },
  ];

  const movementData = {
    labels: analytics.monthly.map(([key]) =>
      new Date(`${key}-01`).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
    ),
    datasets: [
      {
        label: "Transactions",
        data: analytics.monthly.map(([, value]) => value),
        borderColor: "#1e40af",
        backgroundColor: "rgba(30,64,175,.14)",
        fill: true,
        tension: 0.38,
        pointRadius: 3,
        pointBackgroundColor: "#1e40af",
      },
    ],
  };
  const statusData = {
    labels: ["Active", "In Transit", "Maintenance", "Retired / Critical"],
    datasets: [
      {
        data: [
          Math.max(analytics.serviceable - analytics.inTransit, 0),
          analytics.inTransit,
          analytics.maintenance,
          analytics.retired + analytics.critical,
        ],
        backgroundColor: ["#16a34a", "#2563eb", "#f59e0b", "#dc2626"],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };
  const classifyBoxType = (record) => {
    const fields = [
      record?.category,
      record?.itemName,
      record?.model,
      record?.type,
      record?.assetType,
    ]
      .filter(Boolean)
      .map((value) => normalize(value));
    if (fields.some((value) => value.includes("BLACK"))) return "BLACK";
    if (fields.some((value) => value.includes("BLUE"))) return "BLUE";
    return "OTHER";
  };
  const locationSummary = new Map();
  analytics.latest.forEach((record) => {
    const location = normalize(record?.toLocation || record?.toOffice) || "UNASSIGNED";
    const entry = locationSummary.get(location) || {
      black: 0,
      blue: 0,
    };
    const boxType = classifyBoxType(record.asset || record);
    if (boxType === "BLACK") entry.black += 1;
    else if (boxType === "BLUE") entry.blue += 1;
    locationSummary.set(location, entry);
  });
  const locationLabels = [...locationSummary.entries()]
    .sort((a, b) => b[1].black + b[1].blue - (a[1].black + a[1].blue))
    .slice(0, 6)
    .map(([name]) => name);
  const getLocationBoxCounts = (name) => {
    const summary = locationSummary.get(normalize(name)) || { black: 0, blue: 0 };
    return summary;
  };
  const locationData = {
    labels: locationLabels,
    datasets: [
      {
        label: "Black Box",
        data: locationLabels.map((location) => locationSummary.get(location)?.black || 0),
        backgroundColor: "#111827",
        borderRadius: 4,
      },
      {
        label: "Blue Box",
        data: locationLabels.map((location) => locationSummary.get(location)?.blue || 0),
        backgroundColor: "#1d4ed8",
        borderRadius: 4,
      },
    ],
  };
  const blackBoxTotal = inventory.filter((asset) => {
    const fields = [asset.category, asset.itemName, asset.model, asset.type]
      .filter(Boolean)
      .map((value) => normalize(value));
    return fields.some((value) => value.includes("BLACK"));
  }).length;
  const blueBoxTotal = inventory.filter((asset) => {
    const fields = [asset.category, asset.itemName, asset.model, asset.type]
      .filter(Boolean)
      .map((value) => normalize(value));
    return fields.some((value) => value.includes("BLUE"));
  }).length;
  const serviceData = {
    labels: analytics.locations.map(([name]) => name),
    datasets: [
      {
        label: "Serviceable",
        data: analytics.locations.map(([, value]) => value.serviceable),
        backgroundColor: "#16a34a",
        borderRadius: 3,
      },
      {
        label: "Repair Required",
        data: analytics.locations.map(([, value]) => value.repair),
        backgroundColor: "#f59e0b",
        borderRadius: 3,
      },
      {
        label: "Non Serviceable",
        data: analytics.locations.map(([, value]) => value.nonServiceable),
        backgroundColor: "#dc2626",
        borderRadius: 3,
      },
    ],
  };
  const activityData = {
    labels: analytics.daily.map(([key]) =>
      new Date(key).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
    ),
    datasets: [
      {
        label: "Daily Transactions",
        data: analytics.daily.map(([, value]) => value),
        borderColor: "#0891b2",
        backgroundColor: "rgba(8,145,178,.1)",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };
  const departmentData = {
    labels: Object.keys(analytics.departments),
    datasets: [
      {
        data: Object.values(analytics.departments),
        backgroundColor: COLORS,
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return analytics.recent
      .filter(
        (record) =>
          !statusFilter || normalize(record.boxStatus) === statusFilter,
      )
      .filter(
        (record) =>
          !term ||
          [
            record.boxSerialNumber,
            record.fromOffice,
            record.toOffice,
            record.transactionType,
            record.boxStatus,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term)),
      )
      .sort((a, b) => {
        const result = String(a[sort.key] || "").localeCompare(
          String(b[sort.key] || ""),
          undefined,
          { numeric: true },
        );
        return sort.direction === "asc" ? result : -result;
      });
  }, [analytics.recent, search, statusFilter, sort]);
  const selectedBreakdownData = useMemo(() => {
    if (!selectedBreakdown) return null;
    if (selectedBreakdown === "totalAssets") {
      const statusOption = getTotalAssetStatusOptions().find(
        (option) => option.key === selectedBreakdownStatus,
      );
      const allSerials = getTotalAssetSerials(inventory);
      const filteredSerials =
        selectedBreakdownStatus === "blackBox"
          ? allSerials.filter((item) => item.label === "BLACK BOX")
          : selectedBreakdownStatus === "blueBox"
            ? allSerials.filter((item) => item.label === "BLUE BOX")
            : allSerials;

      return {
        key: "totalAssets",
        label: "Total PXE Assets",
        value: analytics.total,
        serials: filteredSerials,
        statusOptions: getTotalAssetStatusOptions(),
        selectedStatusLabel: statusOption?.label || "All",
      };
    }
    const item = breakdownItems.find((entry) => entry.key === selectedBreakdown);
    if (!item) return null;
    const statusOption = getBreakdownStatusOptions(selectedBreakdown).find(
      (option) => option.key === selectedBreakdownStatus,
    );
    return {
      ...item,
      serials: getBreakdownSerials(
        analytics,
        selectedBreakdown,
        selectedBreakdownStatus,
      ),
      statusOptions: getBreakdownStatusOptions(selectedBreakdown),
      selectedStatusLabel: statusOption?.label || "All",
    };
  }, [analytics, breakdownItems, inventory, selectedBreakdown, selectedBreakdownStatus]);
  const selectedOperationalData = useMemo(() => {
    if (!selectedOperational) return null;
    const map = {
      serviceable: {
        label: "Serviceable Assets",
        value: analytics.serviceable,
        serials: getOperationalSerials(analytics, "serviceable"),
      },
      unserviceable: {
        label: "Un-Serviceable Assets",
        value: analytics.maintenance,
        serials: getOperationalSerials(analytics, "unserviceable"),
      },
      onLoan: {
        label: "Assets In Transportation",
        value: analytics.inTransit,
        serials: getOperationalSerials(analytics, "onLoan"),
      },
      retired: {
        label: "Tampered Assets",
        value: analytics.retired,
        serials: getOperationalSerials(analytics, "retired"),
      },
      critical: {
        label: "Critical Assets",
        value: analytics.critical,
        serials: getOperationalSerials(analytics, "critical"),
      },
    };
    return map[selectedOperational] || null;
  }, [analytics, selectedOperational]);
  const selectedIntelligenceData = useMemo(() => {
    if (!selectedIntelligence) return null;
    const isLocation = (record, locationName) => {
      const office = normalize(record.toOffice || "");
      const location = normalize(record.toLocation || "");
      const target = normalize(locationName || "");
      return (
        office === target ||
        location === target ||
        office.includes(target) ||
        location.includes(target)
      );
    };
    const getCategoryLabel = (record) => {
      const source = record.asset || record;
      const fields = [
        source.category,
        source.itemName,
        source.model,
        source.type,
        source.assetType,
        record.category,
        record.itemName,
        record.model,
        record.type,
        record.assetType,
      ]
        .filter(Boolean)
        .map((value) => normalize(value));
      if (fields.some((value) => value.includes("BLACK"))) return "BLACK BOX";
      if (fields.some((value) => value.includes("BLUE"))) return "BLUE BOX";
      return null;
    };
    const isBlackCategory = (record) => {
      const source = record.asset || record;
      const fields = [
        source.category,
        source.itemName,
        source.model,
        source.type,
        source.assetType,
        record.category,
        record.itemName,
        record.model,
        record.type,
        record.assetType,
      ]
        .filter(Boolean)
        .map((value) => normalize(value));
      return fields.some((value) => value.includes("BLACK"));
    };
    const isUnserviceable = (record) =>
      ["UN-SERVICEABLE", "UNSERVICEABLE", "UN-SERVICABLE"].includes(
        normalize(record.boxStatus),
      );
    const isCritical = (record) =>
      ["POLICE CUSTODY", "NOT TRACED", "NOT-TRACED"].includes(
        normalize(record.boxStatus),
      );
    const isPendingApproval = () => false;
    const buildSerials = (records, predicate, label, tone) =>
      records
        .filter((record) => predicate(record) && (record.serialNumber || record.boxSerialNumber))
        .map((record) => ({
          serial: record.serialNumber || record.boxSerialNumber,
          label,
          tone,
        }));

    let serials = [];
    if (selectedIntelligence.key === "mostActiveLocation") {
      serials = buildSerials(
        analytics.latest,
        (record) => isLocation(record, analytics.activeLocation[0]),
        "SERVICEABLE",
        "success",
      );
    } else if (selectedIntelligence.key === "mostUsedCategory") {
      serials = buildSerials(
        inventory,
        (record) => isBlackCategory(record),
        "BLACK BOX",
        "dark",
      );
    } else if (selectedIntelligence.key === "averageAssetAge") {
      serials = buildSerials(inventory, () => true, "SERVICEABLE", "success");
    } else if (selectedIntelligence.key === "unservicedAssets") {
      serials = buildSerials(analytics.latest, isUnserviceable, "UN-SERVICEABLE", "danger");
    } else if (selectedIntelligence.key === "pendingApprovals") {
      serials = buildSerials(analytics.latest, isPendingApproval, "PENDING", "neutral");
    } else if (selectedIntelligence.key === "highPriorityAlerts") {
      serials = buildSerials(analytics.latest, isCritical, "CRITICAL", "danger");
    }

    return {
      label:
        selectedIntelligence.key === "mostUsedCategory"
          ? "BLACK"
          : selectedIntelligence.label,
      title: selectedIntelligence.label,
      value:
        selectedIntelligence.key === "mostActiveLocation"
          ? analytics.activeLocation[1].total
          : selectedIntelligence.key === "mostUsedCategory"
            ? analytics.topCategory[1]
            : selectedIntelligence.key === "averageAssetAge"
              ? analytics.averageAge
              : selectedIntelligence.key === "unservicedAssets"
                ? analytics.maintenance
                : selectedIntelligence.key === "pendingApprovals"
                  ? 0
                  : analytics.critical,
      serials,
      emptyMessage:
        selectedIntelligence.key === "mostUsedCategory"
          ? "No black box serial numbers found."
          : "No box serial numbers found.",
    };
  }, [
    analytics.latest,
    analytics.activeLocation,
    analytics.topCategory,
    inventory,
    selectedIntelligence,
  ]);
  const selectedLocationData = useMemo(() => {
    if (!selectedLocation) return null;

    const target = normalize(selectedLocation);
    const serials = analytics.latest
      .filter((record) => {
        const office = normalize(record.toOffice || "");
        const location = normalize(record.toLocation || "");
        return (
          office === target ||
          location === target ||
          office.includes(target) ||
          location.includes(target)
        );
      })
      .map((record) => ({
        serial: record.serialNumber || record.boxSerialNumber,
        label: record.boxStatus || "ASSET",
        tone: "blue",
      }))
      .filter((item) => item.serial);

    return {
      label: selectedLocation,
      title: selectedLocation,
      value: serials.length,
      serials,
      emptyMessage: "No serial numbers found for this location.",
    };
  }, [analytics.latest, selectedLocation]);
  const activeModalData =
    selectedBreakdownData ||
    selectedOperationalData ||
    selectedIntelligenceData ||
    selectedLocationData;
  const pageSize = 8;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize),
  );
  const pageRows = filteredTransactions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const paginationItems = getPaginationItems(page, totalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const changeSort = (key) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const exportData = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(analytics.recent),
      "Transactions",
    );
    XLSX.writeFile(workbook, "PXE-Asset-Report.xlsx");
  };

  const intelligence = [
    {
      key: "mostActiveLocation",
      label: "Most Active Location",
      value: analytics.activeLocation[0],
      detail: `${compactNumber(analytics.activeLocation[1].total)} assets`,
      icon: FiMapPin,
      tone: "blue",
    },
    {
      key: "mostUsedCategory",
      label: "Most Used Category",
      value: analytics.topCategory[0],
      detail: `${compactNumber(analytics.topCategory[1])} assets`,
      icon: FiBox,
      tone: "green",
    },
    {
      key: "averageAssetAge",
      label: "Average Asset Age",
      value: `${analytics.averageAge.toFixed(1)} years`,
      detail: "From purchase date",
      icon: FiClock,
      tone: "violet",
    },
    {
      key: "unservicedAssets",
      label: "Unserviced Assets",
      value: compactNumber(analytics.maintenance),
      detail: "Requires service action",
      icon: FiTool,
      tone: "amber",
    },
    {
      key: "pendingApprovals",
      label: "Pending Approvals",
      value: "0",
      detail: "No approval queue configured",
      icon: FiFileText,
      tone: "gray",
    },
    {
      key: "highPriorityAlerts",
      label: "High Priority Alerts",
      value: compactNumber(analytics.critical),
      detail: "Custody and untraced",
      icon: FiAlertTriangle,
      tone: "red",
    },
  ];

  return (
    <div className="enterprise-page command-dashboard">
      <div className="enterprise-container command-dashboard__container">
        <div className="command-titlebar">
          <div>
            <p className="page-kicker">Asset Monitoring Console</p>
            <h2 className="page-title">PXE Enterprise Command Center</h2>
            <p className="page-subtitle">
              Executive visibility across inventory, movement, serviceability
              and custody operations.
            </p>
          </div>
          <div className="command-titlebar__actions">
            <button
              type="button"
              className="enterprise-btn enterprise-btn--primary"
              onClick={() => fetchDashboard(true)}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "dashboard-spin" : ""} />{" "}
              Refresh
            </button>
          </div>
        </div>

        <section className="gov-kpi-grid gov-kpi-grid--top" aria-busy={loading}>
          {[...kpis, ...breakdownItems].map((item) => {
            const Icon = item.icon;
            return (
              <article
                className="enterprise-card gov-kpi"
                style={{ "--kpi-color": item.color }}
                key={item.label}
                role={item.key ? "button" : undefined}
                tabIndex={item.key ? 0 : undefined}
                onClick={
                  item.key
                    ? () => {
                        setSelectedBreakdown(item.key);
                        setSelectedBreakdownStatus("all");
                      }
                    : undefined
                }
                onKeyDown={
                  item.key
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedBreakdown(item.key);
                          setSelectedBreakdownStatus("all");
                        }
                      }
                    : undefined
                }
              >
                <div className="gov-kpi__top">
                  <span>{item.label}</span>
                  <i>{Icon ? <Icon /> : <span>{item.logo}</span>}</i>
                </div>
                <div className="gov-kpi__value">
                  {loading ? "--" : compactNumber(item.value)}
                </div>
                {item.details && (
                  <div className="breakdown-item__details">
                    {item.details.map(([detailLabel, detailValue]) => (
                      <div key={detailLabel}>
                        <span>{detailLabel}</span>
                        <strong>
                          {loading ? "--" : compactNumber(detailValue)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <section
          className="gov-kpi-grid gov-kpi-grid--secondary"
          aria-busy={loading}
        >
          {operationalKpis.map((item) => {
            const Icon = item.icon;
            return (
            <article
              className="enterprise-card gov-kpi"
              style={{ "--kpi-color": item.color }}
              key={item.label}
              role={item.key ? "button" : undefined}
              tabIndex={item.key ? 0 : undefined}
              onClick={
                item.key
                  ? () => setSelectedOperational(item.key)
                  : undefined
              }
              onKeyDown={
                item.key
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedOperational(item.key);
                      }
                    }
                  : undefined
              }
            >
              <div className="gov-kpi__top">
                <span>{item.label}</span>
                <i>
                  <Icon />
                </i>
              </div>
              <div className="gov-kpi__value">
                {loading ? "--" : compactNumber(item.value)}
              </div>
            </article>
            );
          })}
        </section>

        <div className="command-layout">
          <main className="command-main">
            <section className="gov-chart-grid gov-chart-grid--primary">
              <ChartPanel
                title="PXE Asset Movement Trend"
                subtitle="Monthly movement volume from transaction history"
              >
                <Line data={movementData} options={baseChartOptions} />
              </ChartPanel>
              <ChartPanel
                title="Asset Status Distribution"
                subtitle="Current operational state by latest record"
              >
                <Doughnut
                  data={statusData}
                  options={{
                    ...baseChartOptions,
                    cutout: "68%",
                    scales: undefined,
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: {
                        position: "bottom",
                        labels: baseChartOptions.plugins.legend.labels,
                      },
                    },
                  }}
                />
              </ChartPanel>
            </section>

            <section className="gov-intelligence-grid">
              {intelligence.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    className={`enterprise-card intelligence-card intelligence-card--${item.tone}`}
                    key={item.label}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedIntelligence(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedIntelligence(item);
                      }
                    }}
                  >
                    <i>
                      <Icon />
                    </i>
                    <div>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.detail}</small>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="gov-chart-grid">
              <ChartPanel
                title="Location Wise PXE Distribution"
                subtitle="Top six current asset locations"
              >
                <Bar
                  data={locationData}
                  plugins={[locationSegmentLabelPlugin, locationTotalLabelPlugin]}
                  options={{
                    ...baseChartOptions,
                    indexAxis: "y",
                    scales: {
                      x: { stacked: true, grid: { color: "#e8edf4" } },
                      y: { stacked: true, grid: { display: false } },
                    },
                    layout: {
                      padding: {
                        right: 28,
                      },
                    },
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: {
                        display: true,
                        position: "bottom",
                      },
                    },
                  }}
                />
              </ChartPanel>
              <ChartPanel
                title="Serviceability Analysis"
                subtitle="Health classification at major locations"
                footer={
                  <div className="serviceability-summary">
                    <div>
                      <span>Total Count</span>
                      <strong>{compactNumber(analytics.total)}</strong>
                    </div>
                    <div>
                      <span>Black Box Count</span>
                      <strong>{compactNumber(blackBoxTotal)}</strong>
                    </div>
                    <div>
                      <span>Blue Box Count</span>
                      <strong>{compactNumber(blueBoxTotal)}</strong>
                    </div>
                  </div>
                }
              >
                <Bar
                  data={serviceData}
                  options={{
                    ...baseChartOptions,
                    scales: {
                      x: { stacked: true, grid: { display: false } },
                      y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: "#e8edf4" },
                      },
                    },
                  }}
                />
              </ChartPanel>
              <ChartPanel
                title="Transaction Activity"
                subtitle="Daily movement volume across recent activity"
              >
                <Line data={activityData} options={baseChartOptions} />
              </ChartPanel>
              <ChartPanel
                title="Google India Map"
                subtitle="Enterprise location view across India"
              >
                <div className="google-map-panel" aria-label="Google map of India">
                  <iframe
                    title="Google Map of India"
                    src="https://www.google.com/maps?q=India&z=4&hl=en&output=embed&iwloc=0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    tabIndex={-1}
                  />
                  <div className="google-map-hotspots" aria-hidden="false">
                    {Object.entries(MAP_HOTSPOTS).map(([name, hotspot]) => {
                      const displayName =
                        name === "NEWDELHI" ? "NEW DELHI" : name;
                      const isActive = analytics.locations.some(
                        ([locationName]) =>
                          normalize(locationName) === normalize(displayName),
                      );

                      return (
                        <button
                          key={name}
                          type="button"
                          className={`google-map-hotspot ${isActive ? "is-active" : "is-muted"}`}
                          style={hotspot}
                          title={displayName}
                          aria-label={`Show serial numbers for ${displayName}`}
                          onClick={() => setSelectedLocation(displayName)}
                        />
                      );
                    })}
                  </div>
                </div>
              </ChartPanel>
            </section>

            <section className="enterprise-card india-panel">
              <div className="india-command-map">
                <FiMap />
                <strong>India Asset Distribution</strong>
                <span>Live location intelligence</span>
                {analytics.locations.slice(0, 4).map(([name], index) => (
                  <i
                    className={`map-marker map-marker--${index + 1}`}
                    title={name}
                    key={name}
                  />
                ))}
              </div>
              <div className="india-location-list">
                <div className="gov-card-heading">
                  <div>
                    <h3>State / Location Command View</h3>
                    <p>
                      Highest asset concentrations from current custody records
                    </p>
                  </div>
                </div>
                <div className="location-table-head">
                  <span>Location</span>
                  <span>Assets</span>
                  <span>Black Box</span>
                  <span>Blue Box</span>
                  <span>Status</span>
                </div>
                {analytics.locations.map(([name, value]) => (
                  <button
                    type="button"
                    className="location-row"
                    key={name}
                    onClick={() => setSelectedLocation(name)}
                  >
                    <strong>{name}</strong>
                    <span>{compactNumber(value.total)}</span>
                    <span>{compactNumber(getLocationBoxCounts(name).black)}</span>
                    <span>{compactNumber(getLocationBoxCounts(name).blue)}</span>
                    <em
                      className={
                        value.repair + value.nonServiceable > 0
                          ? "is-watch"
                          : ""
                      }
                    >
                      {value.repair + value.nonServiceable > 0
                        ? "Attention"
                        : "Operational"}
                    </em>
                  </button>
                ))}
              </div>
            </section>

            <section className="enterprise-card transactions-panel">
              <div className="gov-card-heading">
                <div>
                  <h3>Recent Transactions Register</h3>
                  <p>
                    Auditable asset movement activity retrieved from the
                    database
                  </p>
                </div>
                <span className="record-count">
                  {compactNumber(filteredTransactions.length)} records
                </span>
              </div>
              <div className="transaction-tools">
                <label>
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search serial, office, status..."
                  />
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="SERVICEABLE">Serviceable</option>
                  <option value="UN-SERVICEABLE">Un-Serviceable</option>
                  <option value="POLICE CUSTODY">Police Custody</option>
                  <option value="NOT TRACED">Not Traced</option>
                </select>
              </div>
              <div className="table-responsive">
                <table className="table command-table">
                  <thead>
                    <tr>
                      {[
                        ["boxSerialNumber", "Asset ID / Serial"],
                        ["fromOffice", "From"],
                        ["toOffice", "To"],
                        ["transactionType", "Transaction Type"],
                        ["boxStatus", "Status"],
                        ["date", "Date"],
                      ].map(([key, label]) => (
                        <th key={key}>
                          <button type="button" onClick={() => changeSort(key)}>
                            {label}
                            {sort.key === key &&
                              (sort.direction === "asc" ? (
                                <FiArrowUp />
                              ) : (
                                <FiArrowDown />
                              ))}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((record, index) => (
                      <tr
                        key={record._id || `${record.boxSerialNumber}-${index}`}
                      >
                        <td>
                          <small>
                            PXE-
                            {String(record.boxSerialNumber || "")
                              .replace(/\D/g, "")
                              .slice(-4) || "NA"}
                          </small>
                          <strong>{record.boxSerialNumber}</strong>
                        </td>
                        <td>{record.fromOffice || "N/A"}</td>
                        <td>{record.toOffice || "N/A"}</td>
                        <td>
                          <span className="type-badge">
                            {record.transactionType || "N/A"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge status-badge--${normalize(
                              record.boxStatus,
                            )
                              .replace(/[^A-Z]+/g, "-")
                              .toLowerCase()}`}
                          >
                            {record.boxStatus || "N/A"}
                          </span>
                        </td>
                        <td>{formatDate(record.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="command-pagination">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="command-pagination__pages">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={page === 1}
                    onClick={() => setPage((value) => Math.max(value - 1, 1))}
                  >
                    <FiChevronLeft />
                  </button>
                  {paginationItems.map((item) =>
                    typeof item === "number" ? (
                      <button
                        type="button"
                        key={item}
                        className={item === page ? "is-active" : ""}
                        aria-current={item === page ? "page" : undefined}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ) : (
                      <span className="command-pagination__ellipsis" key={item}>
                        ...
                      </span>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={page === totalPages}
                    onClick={() =>
                      setPage((value) => Math.min(value + 1, totalPages))
                    }
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            </section>
          </main>

          <aside className="command-rail">
            {/* <section className="enterprise-card rail-panel alert-panel">
              <div className="rail-heading">
                <h3>System Notifications</h3>
                <span>{analytics.critical + analytics.maintenance}</span>
              </div>
              <div className="rail-feed">
                <article>
                  <i className="danger">
                    <FiAlertTriangle />
                  </i>
                  <div>
                    <strong>{analytics.critical} high-priority assets</strong>
                    <span>
                      Police custody or not traced status requires review.
                    </span>
                  </div>
                </article>
                <article>
                  <i className="warning">
                    <FiTool />
                  </i>
                  <div>
                    <strong>{analytics.maintenance} assets need service</strong>
                    <span>Un-serviceable assets await maintenance action.</span>
                  </div>
                </article>
                <article>
                  <i className="success">
                    <FiCheckCircle />
                  </i>
                  <div>
                    <strong>Inventory verified</strong>
                    <span>{compactNumber(analytics.total)} records verified.</span>
                  </div>
                </article>
              </div>
            </section> */}
            {/* <section className="enterprise-card rail-panel">
              <div className="rail-heading">
                <h3>Recent Activities</h3>
                <FiActivity />
              </div>
              <div className="activity-timeline">
                {analytics.recent.slice(0, 5).map((record) => (
                  <article key={record._id}>
                    <i />
                    <div>
                      <strong>
                        {record.transactionType || "UPDATE"} ·{" "}
                        {record.boxSerialNumber}
                      </strong>
                      <span>
                        {record.fromOffice || "N/A"} to{" "}
                        {record.toOffice || "N/A"}
                      </span>
                      <small>{formatDate(record.date)}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section> */}
            {/* <section className="enterprise-card rail-panel quick-panel">
              <div className="rail-heading">
                <h3>Quick Actions</h3>
                <FiSettings />
              </div>
              <div className="quick-actions">
                {isAdmin && (
                  <Link to="/inventory-master">
                    <FiPlus /> Add Asset
                  </Link>
                )}
                <Link to="/">
                  <FiBox /> View Inventory
                </Link>
                <Link to="/reports">
                  <FiFileText /> Generate Report
                </Link>
                <button type="button" onClick={exportData}>
                  <FiDownload /> Export Data
                </button>
                {isAdmin && (
                  <Link to="/register">
                    <FiUsers /> User Management
                  </Link>
                )}
              </div>
            </section> */}
          </aside>
        </div>

        {activeModalData && (
          <div
            className="dashboard-modal-backdrop"
          role="presentation"
          onClick={() => {
            setSelectedBreakdown(null);
            setSelectedBreakdownStatus("all");
            setSelectedOperational(null);
            setSelectedIntelligence(null);
            setSelectedLocation(null);
          }}
        >
            <div
              className="dashboard-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`${activeModalData.label} serial numbers`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="dashboard-modal__header">
                <div>
                  <h3>{activeModalData.title || activeModalData.label}</h3>
                  <p>
                    {selectedBreakdownData
                      ? selectedBreakdownData.summaryItems
                        ? `${compactNumber(selectedBreakdownData.value)} assets`
                        : `${compactNumber(selectedBreakdownData.value)} box serial numbers`
                      : activeModalData.title === "Most Used Category"
                        ? `${compactNumber(activeModalData.value)} assets`
                        : `${compactNumber(activeModalData.value)} box serial numbers`}
                  </p>
                </div>
                <div className="dashboard-modal__header-summary">
                  <strong>
                    {selectedBreakdownData
                      ? selectedBreakdownData.summaryItems
                        ? selectedBreakdownData.label
                        : `${selectedBreakdownData.label} ${selectedBreakdownData.selectedStatusLabel}`.toUpperCase()
                      : activeModalData.title === "Most Used Category"
                        ? "BLACK"
                        : `${activeModalData.label} BOX SERIAL NUMBERS`}
                  </strong>
                  <span>
                    {compactNumber(
                      selectedBreakdownData
                        ? selectedBreakdownData.summaryItems
                          ? selectedBreakdownData.value
                          : selectedBreakdownData.serials.length
                        : activeModalData.value,
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  className="dashboard-modal__close"
                  onClick={() => {
                    setSelectedBreakdown(null);
                    setSelectedBreakdownStatus("all");
                    setSelectedOperational(null);
                    setSelectedIntelligence(null);
                    setSelectedLocation(null);
                  }}
                  aria-label="Close popup"
                >
                  <FiX />
                </button>
              </div>
              {selectedBreakdownData &&
                !selectedBreakdownData.summaryItems &&
                selectedBreakdownData.statusOptions.length > 1 && (
                  <div className="dashboard-modal__filters" role="tablist">
                    {selectedBreakdownData.statusOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={`dashboard-modal__filter ${
                          selectedBreakdownStatus === option.key
                            ? "is-active"
                            : ""
                        }`}
                        onClick={() => setSelectedBreakdownStatus(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              <div className="dashboard-modal__body">
                {selectedBreakdownData ? (
                  selectedBreakdownData.summaryItems ? (
                    <ul className="dashboard-modal__list">
                      {selectedBreakdownData.summaryItems.map((item) => (
                        <li key={item.key} className="dashboard-modal__item">
                          <span className="dashboard-modal__serial">{item.label}</span>
                          <span className="dashboard-modal__summary-value">
                            {compactNumber(item.value)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : selectedBreakdownData.serials.length === 0 ? (
                    <p className="dashboard-modal__empty">No serial numbers found.</p>
                  ) : (
                    <ul className="dashboard-modal__list">
                      {selectedBreakdownData.serials.map((item) => (
                        <li key={item.serial} className="dashboard-modal__item">
                          <span className="dashboard-modal__serial">{item.serial}</span>
                          <span className={`dashboard-modal__status dashboard-modal__status--${item.tone}`}>
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : activeModalData.serials.length === 0 ? (
                  <p className="dashboard-modal__empty">
                    {activeModalData.emptyMessage || "No box serial numbers found."}
                  </p>
                ) : (
                  <ul className="dashboard-modal__list">
                    {activeModalData.serials.map((item) => (
                      <li key={item.serial} className="dashboard-modal__item">
                        <span className="dashboard-modal__serial">{item.serial}</span>
                        <span className={`dashboard-modal__status dashboard-modal__status--${item.tone}`}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* <p className="dashboard-updated"><FiDatabase /> Live database snapshot: {new Date().toLocaleString("en-IN")}</p> */}
      </div>
    </div>
  );
};

export default DashboardPage;
