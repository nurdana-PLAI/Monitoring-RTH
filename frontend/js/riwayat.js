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
  const periode =
    document.getElementById("filterPeriode")?.value || "24h";

  await fetchRiwayatData(periode);
}

// ===================================
// FETCH DATA BERDASARKAN PERIODE
// ===================================
async function fetchRiwayatData(periode) {
  const baseUrl = "http://172.16.10.93:1880/api/history";

  const urls = {
    temperature: `${baseUrl}?sensor=temperature&period=${periode}`,
    humidity: `${baseUrl}?sensor=humidity&period=${periode}`,
    soil: `${baseUrl}?sensor=soil_humidity&period=${periode}`,
    pm25: `${baseUrl}?sensor=pm25&period=${periode}`,
  };

  try {
    showLoading(true);

    console.log("=== FETCH RIWAYAT ===");
    console.log("Periode:", periode);
    console.log("URL:", urls);

    const responses = await Promise.all(
      Object.entries(urls).map(async ([sensor, url]) => {
        const response = await fetch(url, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal mengambil ${sensor}: HTTP ${response.status}`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error(`Format data ${sensor} bukan array`);
        }

        console.log(`Data ${sensor}:`, data);

        return data;
      })
    );

    const [temperature, humidity, soil, pm25] = responses;

    riwayatData = mergeSensorData(
      temperature,
      humidity,
      soil,
      pm25
    );

    filteredData = [...riwayatData];
    currentPage = 1;

    console.log("=== HASIL GABUNGAN ===");
    console.table(riwayatData);

    updateHistoricalChart(filteredData);
    updateStatistics(filteredData);
    renderTable();

  } catch (error) {
    console.error("Gagal mengambil data riwayat:", error);

    riwayatData = [];
    filteredData = [];

    updateHistoricalChart([]);
    updateStatistics([]);
    renderTable();

  } finally {
    showLoading(false);
  }
}





// ===================================
// MERGE SENSOR DATA
// ===================================
function mergeSensorData(temp, hum, soil, pm25) {
  const dataMap = new Map();

  function addData(rows, field) {
    rows.forEach((row) => {
      const timestamp = row.timestamp;

      if (!timestamp) return;

      if (!dataMap.has(timestamp)) {
        dataMap.set(timestamp, {
          tanggal: timestamp,
          suhu: null,
          rh: null,
          soil: null,
          pm25: null,
          skor: null,
        });
      }

      const item = dataMap.get(timestamp);
      const value = Number(row.value);

      item[field] = Number.isFinite(value) ? value : null;

      if (row.ikl !== null && row.ikl !== undefined) {
        const ikl = Number(row.ikl);

        if (Number.isFinite(ikl)) {
          item.skor = ikl;
        }
      }
    });
  }

  addData(temp, "suhu");
  addData(hum, "rh");
  addData(soil, "soil");
  addData(pm25, "pm25");

  return Array.from(dataMap.values()).sort(
    (a, b) =>
      new Date(a.tanggal).getTime() -
      new Date(b.tanggal).getTime()
  );
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

function formatDate(timestamp) {
  if (!timestamp) return "-";

  if (!timestamp) return "-";

  const d = new Date(timestamp);

  if (isNaN(d.getTime())) return "-";

  const periode = document.getElementById("filterPeriode")?.value || "24h";

  if (periode === "24h") {
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (periode === "weekly") {
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (periode === "monthly") {
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });
  }

  if (periode === "yearly") {
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return d.toLocaleString("id-ID");
  if (isNaN(d.getTime())) return "-";


 



  return d.toLocaleString("id-ID");
}


// ===================================
// STATISTICS
// ===================================
function updateStatistics(data) {
  function calculateAverage(field) {
    const values = data
      .map((item) => item[field])
      .filter((value) =>
        value !== null &&
        value !== undefined &&
        Number.isFinite(Number(value))
      )
      .map(Number);

    if (values.length === 0) return null;

    return values.reduce((sum, value) => sum + value, 0) /
      values.length;
  }

  const avgSuhu = calculateAverage("suhu");
  const avgRh = calculateAverage("rh");
  const avgSoil = calculateAverage("soil");
  const avgPm25 = calculateAverage("pm25");
  const avgSkor = calculateAverage("skor");

  document.getElementById("statSuhu").textContent =
    avgSuhu !== null ? avgSuhu.toFixed(1) + " °C" : "--";

  document.getElementById("statRh").textContent =
    avgRh !== null ? avgRh.toFixed(1) + " %" : "--";

  document.getElementById("statSoil").textContent =
    avgSoil !== null ? avgSoil.toFixed(1) + " %" : "--";

  document.getElementById("statPm25").textContent =
    avgPm25 !== null ? avgPm25.toFixed(1) + " µg/m³" : "--";

  let kategori = "--";

  if (avgSkor !== null) {
    if (avgSkor >= 70) kategori = "Baik";
    else if (avgSkor >= 50) kategori = "Sedang";
    else kategori = "Buruk";
  }

  document.getElementById("statKategori").textContent = kategori;
}



// ===================================
// TABLE
// ===================================
function renderTable() {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  const start = (currentPage - 1) * rowsPerPage;
  const pageData = filteredData.slice(start, start + rowsPerPage);

  function formatValue(value, decimal = 2) {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return "-";
    }

    return Number(value).toFixed(decimal);
  }

  tbody.innerHTML = pageData
    .map((row) => `
      <tr>
        <td>${formatFullDate(row.tanggal)}</td>
        <td>${formatValue(row.suhu)} °C</td>
        <td>${formatValue(row.rh)} %</td>
        <td>${formatValue(row.soil)} %</td>
        <td>${formatValue(row.pm25)} µg/m³</td>
        <td>
          <span class="skor-badge ${getSkorClass(row.skor)}">
            ${formatValue(row.skor)}
          </span>
        </td>
      </tr>
    `)
    .join("");

  updatePagination();
}


function formatFullDate(timestamp) {
  if (!timestamp) return "-";

  if (!timestamp) return "-";

  const d = new Date(timestamp);

  if (isNaN(d.getTime())) return "-";

  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

  document.getElementById("paginationInfo").textContent =
    `Menampilkan ${start}-${end} dari ${total} data`;
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
            row.rh.includes(query),
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

  document
    .getElementById("btnDownloadRaw")
    ?.addEventListener("click", downloadRawData);
}


// ===================================
// APPLY FILTER
// ===================================
async function applyFilter() {
  const periode =
    document.getElementById("filterPeriode")?.value || "24h";

  const parameter =
    document.getElementById("filterParameter")?.value || "semua";

  console.log("Periode:", periode);
  console.log("Parameter:", parameter);

  await fetchRiwayatData(periode);

  updateChartByParameter(parameter);
}



// ===================================
// UPDATE CHART BY PARAMETER
// ===================================
function updateChartByParameter(parameter) {
  if (!historicalChart) return;

  const datasetMap = {
    suhu: 0,
    rh: 1,
    soil: 2,
    pm25: 3,
  };

  historicalChart.data.datasets.forEach((dataset) => {
    dataset.hidden = true;
  });

  if (parameter === "semua") {
    historicalChart.data.datasets.forEach((dataset) => {
      dataset.hidden = false;
    });
  } else {
    const index = datasetMap[parameter];

    if (index !== undefined) {
      historicalChart.data.datasets[index].hidden = false;
    }
  }

  historicalChart.data.labels = filteredData.map((d) =>
    formatDate(d.tanggal)
  );

  historicalChart.data.datasets[0].data =
    filteredData.map((d) => d.suhu);

  historicalChart.data.datasets[1].data =
    filteredData.map((d) => d.rh);

  historicalChart.data.datasets[2].data =
    filteredData.map((d) => d.soil);

  historicalChart.data.datasets[3].data =
    filteredData.map((d) => d.pm25);

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

async function downloadRawData() {

  const periode =
    document.getElementById("filterPeriode")?.value || "24h";

  const url =
    `http://172.16.10.93:1880/api/history/raw?period=${encodeURIComponent(periode)}`;

  console.log("=================================");
  console.log("DOWNLOAD DATA RAW");
  console.log("Periode:", periode);
  console.log("URL:", url);
  console.log("=================================");

  try {

    showLoading(true);

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    console.log("HTTP Status:", response.status);
    console.log("HTTP OK:", response.ok);

    // Ambil response sebagai text terlebih dahulu
    // supaya kalau server mengirim error kita bisa melihatnya
    const responseText = await response.text();

    console.log("Response Server:");
    console.log(responseText);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${responseText}`
      );
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        "Response server bukan JSON yang valid."
      );
    }

    console.log("Jumlah data raw:", data.length);
    console.table(data);

    if (!Array.isArray(data) || data.length === 0) {

      alert(
        `Tidak ada data raw untuk periode ${periode}.`
      );

      return;
    }

    // ===================================
    // HEADER CSV
    // ===================================
    const headers = [
      "timestamp",
      "source",
      "sensor_id",
      "sensor_type",
      "unit",
      "value",
      "ikl",
      "ikl_label"
    ];

    // ===================================
    // DATA CSV
    // ===================================
    const csvRows = [
      headers.join(","),

      ...data.map(row =>
        headers
          .map(header => {

            const value = row[header];

            if (
              value === null ||
              value === undefined
            ) {
              return "";
            }

            return `"${String(value)
              .replace(/"/g, '""')}"`;
          })
          .join(",")
      )
    ];

    const csvContent =
      "\uFEFF" + csvRows.join("\n");

    // ===================================
    // DOWNLOAD
    // ===================================
    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;"
      }
    );

    const link =
      document.createElement("a");

    const downloadUrl =
      URL.createObjectURL(blob);

    link.href = downloadUrl;

    link.download =
      `data_raw_${periode}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(downloadUrl);

    console.log(
      `Berhasil mengunduh ${data.length} record raw.`
    );

  } catch (error) {

    console.error(
      "Gagal download data raw:",
      error
    );

    alert(
      "Gagal mengambil data raw.\n\n" +
      error.message
    );

  } finally {

    showLoading(false);

  }
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
