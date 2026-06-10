/**
 * Riwayat JavaScript
 * Sistem Monitoring Lingkungan RTH
 */

// ===================================
// GLOBAL VARIABLES
// ===================================
let historicalChart = null;
let riwayatData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

function initializeApp() {
  showLoading(true);

  initSidebar();
  initHistoricalChart();
  initEventListeners();

  loadRiwayatData();
}

// ===================================
// SIDEBAR
// ===================================
function initSidebar() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("active");
    });

    document.addEventListener("click", function (e) {
      if (window.innerWidth <= 992) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
          sidebar.classList.remove("active");
        }
      }
    });
  }
}

// ===================================
// DATA LOADING
// ===================================
async function loadRiwayatData() {
  try {
    const response = await fetch("data/riwayat.csv");
    const csvText = await response.text();
    riwayatData = parseCSV(csvText);
    filteredData = [...riwayatData];

    updateHistoricalChart(filteredData);
    updateStatistics(filteredData);
    renderTable();

    showLoading(false);
  } catch (error) {
    console.error("Error loading data:", error);
    riwayatData = generateDummyRiwayat();
    filteredData = [...riwayatData];

    updateHistoricalChart(filteredData);
    updateStatistics(filteredData);
    renderTable();

    showLoading(false);
  }
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }

  return data;
}

function generateDummyRiwayat() {
  const data = [];
  const startDate = new Date("2026-05-01");

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    data.push({
      tanggal: date.toISOString().slice(0, 10),
      suhu: (25 + Math.random() * 8).toFixed(1),
      rh: (60 + Math.random() * 25).toFixed(0),
      soil: (50 + Math.random() * 20).toFixed(0),
      pm25: (10 + Math.random() * 25).toFixed(0),
      skor: (65 + Math.random() * 30).toFixed(0),
    });
  }

  return data;
}

// ===================================
// HISTORICAL CHART
// ===================================
function initHistoricalChart() {
  const ctx = document.getElementById("historicalChart");
  if (!ctx) return;

  historicalChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Suhu (°C)",
          data: [],
          borderColor: "#0891b2",
          backgroundColor: "rgba(8, 145, 178, 0.1)",
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: "RH (%)",
          data: [],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: "Tanah (%)",
          data: [],
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: "PM2.5 (µg/m³)",
          data: [],
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleColor: "#ffffff",
          bodyColor: "#e2e8f0",
          padding: 12,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#64748b",
            maxTicksLimit: 10,
          },
        },
        y: {
          grid: {
            color: "rgba(226, 232, 240, 0.5)",
          },
          ticks: {
            color: "#64748b",
          },
        },
      },
    },
  });
}

function updateHistoricalChart(data) {
  if (!historicalChart) return;

  const labels = data.map((d) => formatDate(d.tanggal));

  historicalChart.data.labels = labels;
  historicalChart.data.datasets[0].data = data.map((d) => parseFloat(d.suhu));
  historicalChart.data.datasets[1].data = data.map((d) => parseFloat(d.rh));
  historicalChart.data.datasets[2].data = data.map((d) => parseFloat(d.soil));
  historicalChart.data.datasets[3].data = data.map((d) => parseFloat(d.pm25));

  historicalChart.update("active");
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

// ===================================
// STATISTICS
// ===================================
function updateStatistics(data) {
  if (data.length === 0) return;

  const avgSuhu =
    data.reduce((sum, d) => sum + parseFloat(d.suhu), 0) / data.length;
  const avgRh =
    data.reduce((sum, d) => sum + parseFloat(d.rh), 0) / data.length;
  const avgSoil =
    data.reduce((sum, d) => sum + parseFloat(d.soil), 0) / data.length;
  const avgPm25 =
    data.reduce((sum, d) => sum + parseFloat(d.pm25), 0) / data.length;
  const avgSkor =
    data.reduce((sum, d) => sum + parseFloat(d.skor), 0) / data.length;

  document.getElementById("statSuhu").textContent = avgSuhu.toFixed(1) + " °C";
  document.getElementById("statRh").textContent = avgRh.toFixed(0) + " %";
  document.getElementById("statSoil").textContent = avgSoil.toFixed(0) + " %";
  document.getElementById("statPm25").textContent =
    avgPm25.toFixed(0) + " µg/m³";

  // Determine dominant category
  let kategori = "Baik";
  if (avgSkor >= 70) kategori = "Baik";
  else if (avgSkor >= 50) kategori = "Sedang";
  else kategori = "Buruk";

  document.getElementById("statKategori").textContent = kategori;
}

// ===================================
// TABLE
// ===================================
function renderTable() {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);

  tbody.innerHTML = pageData
    .map(
      (row) => `
        <tr>
            <td>${formatFullDate(row.tanggal)}</td>
            <td>${row.suhu} °C</td>
            <td>${row.rh} %</td>
            <td>${row.soil} %</td>
            <td>${row.pm25} µg/m³</td>
            <td>
                <span class="skor-badge ${getSkorClass(row.skor)}">${
        row.skor
      }</span>
            </td>
        </tr>
    `
    )
    .join("");

  updatePagination();
}

function formatFullDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getSkorClass(skore) {
  const skor = parseFloat(skore);
  if (skor >= 70) return "good";
  if (skor >= 50) return "medium";
  return "poor";
}

function updatePagination() {
  const total = filteredData.length;
  const totalPages = Math.ceil(total / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, total);

  document.getElementById(
    "paginationInfo"
  ).textContent = `Menampilkan ${start}-${end} dari ${total} data`;
  document.getElementById("pageIndicator").textContent = `Hal ${currentPage}`;

  document.getElementById("btnPrev").disabled = currentPage === 1;
  document.getElementById("btnNext").disabled = currentPage >= totalPages;
}

// ===================================
// EVENT LISTENERS
// ===================================
function initEventListeners() {
  // Filter buttons
  document
    .getElementById("btnTerapkan")
    ?.addEventListener("click", applyFilter);

  // Pagination
  document.getElementById("btnPrev")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  document.getElementById("btnNext")?.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });

  // Search
  document
    .getElementById("tableSearch")
    ?.addEventListener("input", function () {
      const query = this.value.toLowerCase();
      if (query) {
        filteredData = riwayatData.filter(
          (row) =>
            row.tanggal.includes(query) ||
            row.suhu.includes(query) ||
            row.rh.includes(query)
        );
      } else {
        filteredData = [...riwayatData];
      }
      currentPage = 1;
      renderTable();
    });

  // Download CSV
  document
    .getElementById("btnDownloadCsv")
    ?.addEventListener("click", downloadCSV);

  // Download Excel (actually downloads CSV with Excel-compatible format)
  document
    .getElementById("btnDownloadExcel")
    ?.addEventListener("click", downloadExcel);
}

function applyFilter() {
  const periode = document.getElementById("filterPeriode").value;
  const parameter = document.getElementById("filterParameter").value;

  // Filter by period (simplified)
  const now = new Date();
  let filterDate = new Date();

  switch (periode) {
    case "mingguan":
      filterDate.setDate(now.getDate() - 7);
      break;
    case "bulanan":
      filterDate.setMonth(now.getMonth() - 1);
      break;
    case "tahunan":
      filterDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  // Apply filter
  filteredData = riwayatData.filter((row) => {
    const rowDate = new Date(row.tanggal);
    return rowDate >= filterDate;
  });

  // Update chart based on parameter
  if (parameter !== "semua") {
    updateChartByParameter(parameter);
  } else {
    updateHistoricalChart(filteredData);
  }

  currentPage = 1;
  renderTable();
  updateStatistics(filteredData);
}

function updateChartByParameter(parameter) {
  if (!historicalChart) return;

  // Hide all datasets first
  historicalChart.data.datasets.forEach((dataset) => {
    dataset.hidden = true;
  });

  // Show only selected parameter
  const datasetMap = {
    suhu: 0,
    rh: 1,
    soil: 2,
    pm25: 3,
    skor: 0, // Use first dataset for score
  };

  if (datasetMap[parameter] !== undefined) {
    historicalChart.data.datasets[datasetMap[parameter]].hidden = false;
  } else {
    // Show all
    historicalChart.data.datasets.forEach((dataset) => {
      dataset.hidden = false;
    });
  }

  historicalChart.data.labels = filteredData.map((d) => formatDate(d.tanggal));
  historicalChart.update("active");
}

// ===================================
// DOWNLOAD FUNCTIONS
// ===================================
function downloadCSV() {
  const headers = ["tanggal", "suhu", "rh", "soil", "pm25", "skor"];
  const csvContent = [
    headers.join(","),
    ...filteredData.map((row) => headers.map((h) => row[h]).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `data_lingkungan_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
}

function downloadExcel() {
  // Create a more Excel-compatible CSV with BOM
  const headers = ["tanggal", "suhu", "rh", "soil", "pm25", "skor"];
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel
  const csvContent =
    BOM +
    [
      headers.join(","),
      ...filteredData.map((row) => headers.map((h) => row[h]).join(",")),
    ].join("\n");

  const blob = new Blob([csvContent], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `data_lingkungan_${new Date()
    .toISOString()
    .slice(0, 10)}.xls`;
  link.click();
}

// ===================================
// LOADING STATE
// ===================================
function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    if (show) {
      overlay.classList.add("active");
    } else {
      overlay.classList.remove("active");
    }
  }
}
