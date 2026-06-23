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
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
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
  FiShield,
  FiTool,
  FiTruck,
  FiUsers,
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
const COLORS = ["#1e40af", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];
const normalize = (value) => String(value || "").replace(/\u200B/g, "").trim().toUpperCase();
const asDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const asTimestamp = (value) => asDate(value)?.getTime() || 0;
const latestSortKey = (record) => [
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
    ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : value || "N/A";
};
const compactNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 650 },
  plugins: {
    legend: { labels: { usePointStyle: true, boxWidth: 8, color: "#475569", font: { size: 11, weight: 600 } } },
    tooltip: { backgroundColor: "#081a3a", padding: 10, titleFont: { weight: 700 }, bodyFont: { weight: 600 } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 10 } } },
    y: { beginAtZero: true, grid: { color: "#e8edf4" }, ticks: { color: "#64748b", precision: 0, font: { size: 10 } } },
  },
};

const buildAnalytics = (inventory, transactions) => {
  const inventoryBySerial = new Map(inventory.map((asset) => [normalize(asset.serialNumber), asset]));
  const latestBySerial = new Map();
  const validTransactions = transactions.filter((record) => inventoryBySerial.has(normalize(record.boxSerialNumber)));

  validTransactions.forEach((record) => {
    const serial = normalize(record.boxSerialNumber);
    const sortKey = latestSortKey(record);
    const current = latestBySerial.get(serial);
    if (!current || sortKey > current.sortKey) latestBySerial.set(serial, { ...record, sortKey });
  });

  const latest = inventory.map((asset) => ({
    ...latestBySerial.get(normalize(asset.serialNumber)),
    asset,
    boxSerialNumber: asset.serialNumber,
  }));
  const statusCount = (predicate) => latest.filter(predicate).length;
  const isStatus = (record, ...statuses) => statuses.includes(normalize(record.boxStatus));
  const serviceable = statusCount((record) => isStatus(record, "SERVICEABLE"));
  const maintenance = statusCount((record) => isStatus(record, "UN-SERVICEABLE", "UNSERVICEABLE"));
  const inTransit = statusCount(isLoanRecord);
  const retired = statusCount((record) => isStatus(record, "TAMPERED", "TEMPERED"));
  const critical = statusCount((record) => isStatus(record, "POLICE CUSTODY", "NOT TRACED", "NOT-TRACED"));

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTransactions = validTransactions.filter((record) => String(record.date || "").slice(0, 10) === todayKey).length;
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
  const monthly = [...monthCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  const daily = [...dayCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14);

  const locationMap = new Map();
  latest.forEach((record) => {
    const location = normalize(record.toLocation) || "UNASSIGNED";
    const entry = locationMap.get(location) || { total: 0, serviceable: 0, repair: 0, nonServiceable: 0 };
    entry.total += 1;
    if (isStatus(record, "SERVICEABLE")) entry.serviceable += 1;
    else if (isStatus(record, "UN-SERVICEABLE", "UNSERVICEABLE")) entry.repair += 1;
    else entry.nonServiceable += 1;
    locationMap.set(location, entry);
  });
  const locations = [...locationMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6);

  const departmentCounts = { Operations: 0, Testing: 0, Development: 0, QA: 0, Security: 0, Administration: 0 };
  latest.forEach((record) => {
    const office = normalize(record.toOffice);
    if (office === "STOCK") departmentCounts.Operations += 1;
    else if (office === "EDUQUITY") departmentCounts.Testing += 1;
    else if (office === "LOAN") departmentCounts.Development += 1;
    else if (office === "AHEESA") departmentCounts.QA += 1;
    else if (office === "NOT TRACED" || isStatus(record, "POLICE CUSTODY")) departmentCounts.Security += 1;
    else departmentCounts.Administration += 1;
  });

  const categoryCounts = new Map();
  inventory.forEach((asset) => categoryCounts.set(asset.category || "Unclassified", (categoryCounts.get(asset.category || "Unclassified") || 0) + 1));
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
  const assetAges = inventory.map((asset) => asDate(asset.purchaseDate)).filter(Boolean).map((date) => (Date.now() - date.getTime()) / 31557600000);
  const averageAge = assetAges.length ? assetAges.reduce((sum, value) => sum + value, 0) / assetAges.length : 0;
  const sortedTransactions = [...validTransactions].sort((a, b) => `${b.date || ""}|${b.updatedAt || ""}`.localeCompare(`${a.date || ""}|${a.updatedAt || ""}`));
  const activeLocation = locations[0] || ["N/A", { total: 0 }];
  const healthyPercent = inventory.length ? Math.round((serviceable / inventory.length) * 100) : 0;
  const maintenancePercent = inventory.length ? Math.round((maintenance / inventory.length) * 100) : 0;
  const criticalPercent = Math.max(0, 100 - healthyPercent - maintenancePercent);

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
  };
};

const MiniSparkline = ({ values, color }) => (
  <div className="gov-kpi__spark" aria-hidden="true">
    <Line
      data={{ labels: values.map((_, index) => index), datasets: [{ data: values, borderColor: color, backgroundColor: `${color}1f`, fill: true, borderWidth: 1.7, pointRadius: 0, tension: 0.4 }] }}
      options={{ responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }}
    />
  </div>
);

const ChartPanel = ({ title, subtitle, children, action }) => (
  <section className="enterprise-card gov-chart-card">
    <div className="gov-card-heading">
      <div><h3>{title}</h3><p>{subtitle}</p></div>
      {action || <span className="gov-live-pill"><i /> Live</span>}
    </div>
    <div className="gov-chart-canvas">{children}</div>
  </section>
);

const DashboardPage = () => {
  const { isAdmin } = useRole();
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "date", direction: "desc" });

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
      toast.error(error.response?.data?.message || "Unable to retrieve dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  const analytics = useMemo(() => buildAnalytics(inventory, transactions), [inventory, transactions]);
  const sparkValues = analytics.monthly.map(([, value]) => value);
  const previousMonth = sparkValues.at(-2) || 0;
  const currentMonth = sparkValues.at(-1) || 0;
  const monthlyTrend = previousMonth ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100) : 0;

  const kpis = [
    { label: "Total PXE Assets", value: analytics.total, icon: FiBox, color: "#1e40af", trend: 0 },
    { label: "Serviceable Assets", value: analytics.serviceable, icon: FiCheckCircle, color: "#16a34a", trend: 1 },
    { label: "Assets In Transportation", value: analytics.inTransit, icon: FiTruck, color: "#2563eb", trend: monthlyTrend },
    { label: "Un-Serviceable Assets", value: analytics.maintenance, icon: FiTool, color: "#f59e0b", trend: -2 },
    { label: "Tampered Assets", value: analytics.retired, icon: FiDatabase, color: "#dc2626", trend: 0 },
    { label: "Today's Transactions", value: analytics.todayTransactions, icon: FiActivity, color: "#7c3aed", trend: monthlyTrend },
  ];

  const movementData = {
    labels: analytics.monthly.map(([key]) => new Date(`${key}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })),
    datasets: [{ label: "Transactions", data: analytics.monthly.map(([, value]) => value), borderColor: "#1e40af", backgroundColor: "rgba(30,64,175,.14)", fill: true, tension: 0.38, pointRadius: 3, pointBackgroundColor: "#1e40af" }],
  };
  const statusData = {
    labels: ["Active", "In Transit", "Maintenance", "Retired / Critical"],
    datasets: [{ data: [Math.max(analytics.serviceable - analytics.inTransit, 0), analytics.inTransit, analytics.maintenance, analytics.retired + analytics.critical], backgroundColor: ["#16a34a", "#2563eb", "#f59e0b", "#dc2626"], borderWidth: 2, borderColor: "#fff" }],
  };
  const locationData = {
    labels: analytics.locations.map(([name]) => name),
    datasets: [{ label: "Assets", data: analytics.locations.map(([, value]) => value.total), backgroundColor: ["#1e40af", "#2563eb", "#0891b2", "#16a34a", "#f59e0b", "#7c3aed"], borderRadius: 4 }],
  };
  const serviceData = {
    labels: analytics.locations.map(([name]) => name),
    datasets: [
      { label: "Serviceable", data: analytics.locations.map(([, value]) => value.serviceable), backgroundColor: "#16a34a", borderRadius: 3 },
      { label: "Repair Required", data: analytics.locations.map(([, value]) => value.repair), backgroundColor: "#f59e0b", borderRadius: 3 },
      { label: "Non Serviceable", data: analytics.locations.map(([, value]) => value.nonServiceable), backgroundColor: "#dc2626", borderRadius: 3 },
    ],
  };
  const activityData = {
    labels: analytics.daily.map(([key]) => new Date(key).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })),
    datasets: [{ label: "Daily Transactions", data: analytics.daily.map(([, value]) => value), borderColor: "#0891b2", backgroundColor: "rgba(8,145,178,.1)", fill: true, tension: 0.35, pointRadius: 2 }],
  };
  const departmentData = {
    labels: Object.keys(analytics.departments),
    datasets: [{ data: Object.values(analytics.departments), backgroundColor: COLORS, borderWidth: 2, borderColor: "#fff" }],
  };

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return analytics.recent
      .filter((record) => !statusFilter || normalize(record.boxStatus) === statusFilter)
      .filter((record) => !term || [record.boxSerialNumber, record.fromOffice, record.toOffice, record.transactionType, record.boxStatus].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
      .sort((a, b) => {
        const result = String(a[sort.key] || "").localeCompare(String(b[sort.key] || ""), undefined, { numeric: true });
        return sort.direction === "asc" ? result : -result;
      });
  }, [analytics.recent, search, statusFilter, sort]);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const pageRows = filteredTransactions.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const exportData = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(analytics.recent), "Transactions");
    XLSX.writeFile(workbook, "PXE-Asset-Report.xlsx");
  };

  const intelligence = [
    { label: "Most Active Location", value: analytics.activeLocation[0], detail: `${compactNumber(analytics.activeLocation[1].total)} assets`, icon: FiMapPin, tone: "blue" },
    { label: "Most Used Category", value: analytics.topCategory[0], detail: `${compactNumber(analytics.topCategory[1])} assets`, icon: FiBox, tone: "green" },
    { label: "Average Asset Age", value: `${analytics.averageAge.toFixed(1)} years`, detail: "From purchase date", icon: FiClock, tone: "violet" },
    { label: "Unserviced Assets", value: compactNumber(analytics.maintenance), detail: "Requires service action", icon: FiTool, tone: "amber" },
    { label: "Pending Approvals", value: "0", detail: "No approval queue configured", icon: FiFileText, tone: "gray" },
    { label: "High Priority Alerts", value: compactNumber(analytics.critical), detail: "Custody and untraced", icon: FiAlertTriangle, tone: "red" },
  ];

  return (
    <div className="enterprise-page command-dashboard">
      <div className="enterprise-container command-dashboard__container">
        <div className="command-titlebar">
          <div>
            <p className="page-kicker">Asset Monitoring Console</p>
            <h2 className="page-title">PXE Enterprise Command Center</h2>
            <p className="page-subtitle">Executive visibility across inventory, movement, serviceability and custody operations.</p>
          </div>
          <div className="command-titlebar__actions">
            <span className="database-status"><i /> Database synchronized</span>
            <button type="button" className="enterprise-btn enterprise-btn--primary" onClick={() => fetchDashboard(true)} disabled={loading}><FiRefreshCw className={loading ? "dashboard-spin" : ""} /> Refresh</button>
          </div>
        </div>

        <section className="gov-kpi-grid" aria-busy={loading}>
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <article className="enterprise-card gov-kpi" style={{ "--kpi-color": item.color }} key={item.label}>
                <div className="gov-kpi__top"><span>{item.label}</span><i><Icon /></i></div>
                <div className="gov-kpi__value">{loading ? "--" : compactNumber(item.value)}</div>
                <MiniSparkline values={sparkValues.length ? sparkValues : [0, 0, 0, 0]} color={item.color} />
              </article>
            );
          })}
        </section>

        <div className="command-layout">
          <main className="command-main">
            <section className="gov-chart-grid gov-chart-grid--primary">
              <ChartPanel title="PXE Asset Movement Trend" subtitle="Monthly movement volume from transaction history"><Line data={movementData} options={baseChartOptions} /></ChartPanel>
              <ChartPanel title="Asset Status Distribution" subtitle="Current operational state by latest record"><Doughnut data={statusData} options={{ ...baseChartOptions, cutout: "68%", scales: undefined, plugins: { ...baseChartOptions.plugins, legend: { position: "bottom", labels: baseChartOptions.plugins.legend.labels } } }} /></ChartPanel>
            </section>

            <section className="gov-intelligence-grid">
              {intelligence.map((item) => { const Icon = item.icon; return <article className={`enterprise-card intelligence-card intelligence-card--${item.tone}`} key={item.label}><i><Icon /></i><div><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div></article>; })}
            </section>

            <section className="gov-chart-grid">
              <ChartPanel title="Location Wise PXE Distribution" subtitle="Top six current asset locations"><Bar data={locationData} options={{ ...baseChartOptions, indexAxis: "y", plugins: { ...baseChartOptions.plugins, legend: { display: false } } }} /></ChartPanel>
              <ChartPanel title="Serviceability Analysis" subtitle="Health classification at major locations"><Bar data={serviceData} options={{ ...baseChartOptions, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: "#e8edf4" } } } }} /></ChartPanel>
              <ChartPanel title="Transaction Activity" subtitle="Daily movement volume across recent activity"><Line data={activityData} options={baseChartOptions} /></ChartPanel>
              <ChartPanel title="Asset Allocation by Department" subtitle="Operational allocation derived from current custodian"><Pie data={departmentData} options={{ ...baseChartOptions, scales: undefined, plugins: { ...baseChartOptions.plugins, legend: { position: "right", labels: baseChartOptions.plugins.legend.labels } } }} /></ChartPanel>
            </section>

            <section className="enterprise-card health-panel">
              <div className="gov-card-heading"><div><h3>Asset Health Monitoring</h3><p>Service readiness across the registered asset base</p></div><FiShield /></div>
              <div className="health-grid">
                {[["Healthy Assets", analytics.health[0], "green"], ["Maintenance Due", analytics.health[1], "yellow"], ["Critical Assets", analytics.health[2], "red"]].map(([label, value, tone]) => (
                  <div className="health-meter" key={label}><div className={`health-ring health-ring--${tone}`} style={{ "--health-value": `${value * 3.6}deg` }}><strong>{value}%</strong></div><div><span>{label}</span><small>{tone === "green" ? compactNumber(analytics.serviceable) : tone === "yellow" ? compactNumber(analytics.maintenance) : compactNumber(analytics.critical)} assets</small></div></div>
                ))}
              </div>
            </section>

            <section className="enterprise-card india-panel">
              <div className="india-command-map"><FiMap /><strong>India Asset Distribution</strong><span>Live location intelligence</span>{analytics.locations.slice(0, 4).map(([name], index) => <i className={`map-marker map-marker--${index + 1}`} title={name} key={name} />)}</div>
              <div className="india-location-list">
                <div className="gov-card-heading"><div><h3>State / Location Command View</h3><p>Highest asset concentrations from current custody records</p></div></div>
                <div className="location-table-head"><span>Location</span><span>Assets</span><span>Status</span></div>
                {analytics.locations.map(([name, value]) => <div className="location-row" key={name}><strong>{name}</strong><span>{compactNumber(value.total)}</span><em className={value.repair + value.nonServiceable > 0 ? "is-watch" : ""}>{value.repair + value.nonServiceable > 0 ? "Attention" : "Operational"}</em></div>)}
              </div>
            </section>

            <section className="enterprise-card transactions-panel">
              <div className="gov-card-heading"><div><h3>Recent Transactions Register</h3><p>Auditable asset movement activity retrieved from the database</p></div><span className="record-count">{compactNumber(filteredTransactions.length)} records</span></div>
              <div className="transaction-tools"><label><FiSearch /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search serial, office, status..." /></label><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All Statuses</option><option value="SERVICEABLE">Serviceable</option><option value="UN-SERVICEABLE">Un-Serviceable</option><option value="POLICE CUSTODY">Police Custody</option><option value="NOT TRACED">Not Traced</option></select></div>
              <div className="table-responsive"><table className="table command-table"><thead><tr>{[["boxSerialNumber", "Asset ID / Serial"], ["fromOffice", "From"], ["toOffice", "To"], ["transactionType", "Transaction Type"], ["boxStatus", "Status"], ["date", "Date"]].map(([key, label]) => <th key={key}><button type="button" onClick={() => changeSort(key)}>{label}{sort.key === key && (sort.direction === "asc" ? <FiArrowUp /> : <FiArrowDown />)}</button></th>)}</tr></thead><tbody>{pageRows.map((record, index) => <tr key={record._id || `${record.boxSerialNumber}-${index}`}><td><small>PXE-{String(record.boxSerialNumber || "").replace(/\D/g, "").slice(-4) || "NA"}</small><strong>{record.boxSerialNumber}</strong></td><td>{record.fromOffice || "N/A"}</td><td>{record.toOffice || "N/A"}</td><td><span className="type-badge">{record.transactionType || "N/A"}</span></td><td><span className={`status-badge status-badge--${normalize(record.boxStatus).replace(/[^A-Z]+/g, "-").toLowerCase()}`}>{record.boxStatus || "N/A"}</span></td><td>{formatDate(record.date)}</td></tr>)}</tbody></table></div>
              <div className="command-pagination"><span>Page {page} of {totalPages}</span><div><button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><FiChevronLeft /></button><strong>{page}</strong><button type="button" aria-label="Next page" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}><FiChevronRight /></button></div></div>
            </section>
          </main>

          <aside className="command-rail">
            <section className="enterprise-card rail-panel alert-panel"><div className="rail-heading"><h3>System Notifications</h3><span>{analytics.critical + analytics.maintenance}</span></div><div className="rail-feed"><article><i className="danger"><FiAlertTriangle /></i><div><strong>{analytics.critical} high-priority assets</strong><span>Police custody or not traced status requires review.</span></div></article><article><i className="warning"><FiTool /></i><div><strong>{analytics.maintenance} assets need service</strong><span>Un-serviceable assets await maintenance action.</span></div></article><article><i className="success"><FiCheckCircle /></i><div><strong>Database synchronized</strong><span>{compactNumber(analytics.total)} inventory records verified.</span></div></article></div></section>
            <section className="enterprise-card rail-panel"><div className="rail-heading"><h3>Recent Activities</h3><FiActivity /></div><div className="activity-timeline">{analytics.recent.slice(0, 5).map((record) => <article key={record._id}><i /><div><strong>{record.transactionType || "UPDATE"} · {record.boxSerialNumber}</strong><span>{record.fromOffice || "N/A"} to {record.toOffice || "N/A"}</span><small>{formatDate(record.date)}</small></div></article>)}</div></section>
            <section className="enterprise-card rail-panel quick-panel"><div className="rail-heading"><h3>Quick Actions</h3><FiSettings /></div><div className="quick-actions">{isAdmin && <Link to="/inventory-master"><FiPlus /> Add Asset</Link>}<Link to="/"><FiBox /> View Inventory</Link><Link to="/reports"><FiFileText /> Generate Report</Link><button type="button" onClick={exportData}><FiDownload /> Export Data</button>{isAdmin && <Link to="/register"><FiUsers /> User Management</Link>}</div></section>
            <section className="enterprise-card rail-panel audit-panel"><FiShield /><div><strong>Audit Controls Active</strong><span>All dashboard activity is monitored under Government security policy.</span></div></section>
          </aside>
        </div>

        {/* <p className="dashboard-updated"><FiDatabase /> Live database snapshot: {new Date().toLocaleString("en-IN")}</p> */}
      </div>
    </div>
  );
};

export default DashboardPage;
