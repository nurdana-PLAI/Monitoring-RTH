
/**
 * Dashboard JavaScript
 * Sistem Monitoring Lingkungan RTH
 */

// ===================================
// GLOBAL VARIABLES
// ===================================
let monitoringChart = null;
let map = null;
let currentChartData = "suhu";
let realtimeData = [];
let latestSensorData = null;
let pm25HistoryData = [];

// Node IoT Locations
const iotNodes = [
  { id: 1, name: "Node 1", lat: -7.787022, lng: 110.387976, status: "active" },
  { id: 2, name: "Node 2", lat: -7.787021, lng: 110.388181, status: "active" },
];

// Chart Colors
const chartColors = {
  suhu: { main: "#0891b2", light: "rgba(8, 145, 178, 0.1)" },
  rh: { main: "#10b981", light: "rgba(16, 185, 129, 0.1)" },
  soil: { main: "#8b5cf6", light: "rgba(139, 92, 246, 0.1)" },
  pm25: { main: "#f59e0b", light: "rgba(245, 158, 11, 0.1)" },
};

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

function initializeApp() {
  showLoading(true);

  initSidebar();
  initDateTime();
  initCharts();
  initMap();
  initEventListeners();

  loadRealtimeData();

  setInterval(updateDateTime, 1000);
  setInterval(loadRealtimeData, 30000);
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
// DATE TIME
// ===================================
function initDateTime() {
  updateDateTime();
}

function updateDateTime() {
  const display = document.getElementById("datetimeDisplay");
  if (!display) return;

  const now = new Date();
  const dateEl = display.querySelector(".date");
  const timeEl = display.querySelector(".time");

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("id-ID", options);
  }

  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString("id-ID");
  }
}

// ===================================
// DATA LOADING
// ===================================
async function loadRealtimeData() {
  console.log("====================================");
  console.log("Mengambil data dashboard...");
  console.log("====================================");

  try {
    const sensorMap = {
      suhu: "temperature",
      rh: "humidity",
      soil: "soil_humidity",
      pm25: "pm25",
    };

    const sensor = sensorMap[currentChartData];

    // Ambil latest, history grafik, dan history PM2.5
    const [latestResponse, historyResponse, pm25Response] =
      await Promise.all([
        fetch("http://172.16.10.93:1880/api/latest", {
          cache: "no-store",
        }),

        fetch(
          `http://172.16.10.93:1880/api/history?sensor=${sensor}`,
          { cache: "no-store" }
        ),

        sensor === "pm25"
          ? Promise.resolve(null)
          : fetch(
              "http://172.16.10.93:1880/api/history?sensor=pm25",
              { cache: "no-store" }
            ),
      ]);

    if (!latestResponse.ok || !historyResponse.ok) {
      throw new Error("Gagal mengambil data dashboard");
    }

    if (pm25Response && !pm25Response.ok) {
      throw new Error("Gagal mengambil history PM2.5");
    }

    const latest = await latestResponse.json();
    const history = await historyResponse.json();

    const pm25History =
      sensor === "pm25"
        ? history
        : await pm25Response.json();

    if (!Array.isArray(history) || !Array.isArray(pm25History)) {
      throw new Error("Format history bukan array");
    }

    latestSensorData = latest;

    // Data untuk grafik
    realtimeData = history.map((item) => ({
      timestamp: item.timestamp,
      value: Number(item.value),
    }));

    // Data khusus PM2.5 untuk perhitungan rata-rata
    pm25HistoryData = pm25History.map((item) => ({
      timestamp: item.timestamp,
      value: Number(item.value),
    }));

    console.log("LATEST:", latest);
    console.log("HISTORY GRAFIK:");
    console.table(realtimeData);

    console.log("HISTORY PM2.5:");
    console.table(pm25HistoryData);

    updateDashboard();
    showLoading(false);

  } catch (error) {
    console.error("ERROR DASHBOARD:", error);

    realtimeData = [];
    latestSensorData = null;
    pm25HistoryData = [];

    showEmptyDashboard();
    showLoading(false);
  }
}

// ===================================
// AVERAGE PM2.5 AND ISPU 24 HOURS
// ===================================

function calculateAveragePM25(data) {
  const now = Date.now();
  const last24Hours = now - 24 * 60 * 60 * 1000;

  // Filter data 24 jam terakhir
  const filteredData = data.filter((item) => {
    const timestamp = new Date(item.timestamp).getTime();
    const value = Number(item.value);

    return (
      Number.isFinite(timestamp) &&
      timestamp >= last24Hours &&
      timestamp <= now &&
      item.value !== null &&
      item.value !== undefined &&
      item.value !== "" &&
      Number.isFinite(value) &&
      value >= 0
    );
  });

  // Kelompokkan data berdasarkan jam
  const hourlyGroups = {};

  filteredData.forEach((item) => {
    const timestamp = new Date(item.timestamp).getTime();
    const hour = Math.floor(timestamp / (60 * 60 * 1000));
    const value = Number(item.value);

    if (!hourlyGroups[hour]) {
      hourlyGroups[hour] = [];
    }

    hourlyGroups[hour].push(value);
  });

  // Hitung rata-rata setiap jam
  const hourlyAverages = Object.values(hourlyGroups).map((values) => {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });

  if (hourlyAverages.length === 0) {
    return {
      average: null,
      count: 0,
      totalRecords: 0,
    };
  }

  // Rata-rata dari seluruh jam yang tersedia
  const average =
    hourlyAverages.reduce((sum, value) => sum + value, 0) /
    hourlyAverages.length;

  return {
    average,
    count: hourlyAverages.length,
    totalRecords: filteredData.length,
  };
}

// ===================================
// CONVERT PM2.5 TO ISPU
// ===================================

function calculateISPU_PM25(pm25) {
  if (!Number.isFinite(pm25) || pm25 < 0) {
    return null;
  }

  // Konsentrasi maksimum dalam tabel breakpoint
  const concentration = Math.min(pm25, 500);

  const breakpoints = [
    { cLow: 0, cHigh: 15.5, iLow: 0, iHigh: 50 },
    { cLow: 15.5, cHigh: 55.4, iLow: 50, iHigh: 100 },
    { cLow: 55.4, cHigh: 150.4, iLow: 100, iHigh: 200 },
    { cLow: 150.4, cHigh: 250.4, iLow: 200, iHigh: 300 },
    { cLow: 250.4, cHigh: 500, iLow: 300, iHigh: 500 },
  ];

  const range = breakpoints.find(
    (item) =>
      concentration >= item.cLow &&
      concentration <= item.cHigh
  );

  if (!range) return null;

  const ispu =
    ((range.iHigh - range.iLow) /
      (range.cHigh - range.cLow)) *
      (concentration - range.cLow) +
    range.iLow;

  return Math.round(ispu);
}

// ===================================
// ISPU CATEGORY
// ===================================

function getISPUCategory(ispu) {
  if (!Number.isFinite(ispu)) {
    return {
      label: "Data tidak tersedia",
      className: "",
    };
  }

  if (ispu <= 50) {
    return {
      label: "Baik",
      className: "baik",
    };
  }

  if (ispu <= 100) {
    return {
      label: "Sedang",
      className: "sedang",
    };
  }

  if (ispu <= 200) {
    return {
      label: "Tidak Sehat",
      className: "tidak-sehat",
    };
  }

  if (ispu <= 300) {
    return {
      label: "Sangat Tidak Sehat",
      className: "sangat-tidak-sehat",
    };
  }

  return {
    label: "Berbahaya",
    className: "berbahaya",
  };
}

// ===================================
// UPDATE AVERAGE PM2.5 AND ISPU
// ===================================

function updateAveragePM25() {
  const result = calculateAveragePM25(pm25HistoryData);

  const averageElement = document.getElementById("valAverage");
  const ispuElement = document.getElementById("valISPU");
  const categoryElement = document.getElementById("averageCategory");
  const countElement = document.getElementById("averageCount");

  if (result.average === null) {
    if (averageElement) averageElement.textContent = "-";
    if (ispuElement) ispuElement.textContent = "-";

    if (categoryElement) {
      categoryElement.textContent = "Data tidak tersedia";
      categoryElement.className = "";
    }

    if (countElement) {
      countElement.textContent = "Belum ada data PM2.5";
    }

    return;
  }

  const ispu = calculateISPU_PM25(result.average);
  const category = getISPUCategory(ispu);

  if (averageElement) {
    averageElement.textContent = result.average.toFixed(1);
  }

  if (ispuElement) {
    ispuElement.textContent = ispu;
  }

  if (categoryElement) {
    categoryElement.textContent = category.label;
    categoryElement.className = `badge ${category.className}`;
  }

  if (countElement) {
    countElement.textContent =
      `${result.count} jam terukur dari 24 jam terakhir ` +
      `(${result.totalRecords} data sensor)`;
  }

  console.log("RATA-RATA PM2.5:", result);
  console.log("NILAI ISPU:", ispu);
  console.log("KATEGORI ISPU:", category.label);
}

// ===================================
// EMPTY DASHBOARD
// ===================================
function showEmptyDashboard() {
  const sensorElements = [
    "valSuhu",
    "valRh",
    "valSoil",
    "valPm25",
    "valKategori",
    "valSkor",
    "circleValSuhu",
    "circleValRh",
    "circleValSoil",
    "circleValPm25",
    "valAverage",
    "valISPU",
    "averageCategory",
    "averageCount",
    
  ];

  sensorElements.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "-";
    }
  });

  const statusBadge = document.getElementById("statusBadge");

  if (statusBadge) {
    statusBadge.className = "status-badge";

    const badgeText = statusBadge.querySelector(".badge-text");

    if (badgeText) {
      badgeText.textContent = "-";
    }
  }

  const gaugeFill = document.getElementById("gaugeFill");
  const gaugeValue = document.getElementById("gaugeValue");

  if (gaugeFill) {
    gaugeFill.style.strokeDasharray = "0, 251";
  }

  if (gaugeValue) {
    gaugeValue.textContent = "-";
  }

  const circles = [
    "circleSuhu",
    "circleRh",
    "circleSoil",
    "circlePm25",
  ];

  circles.forEach((id) => {
    const circle = document.getElementById(id);

    if (circle) {
      circle.setAttribute("stroke-dasharray", "0, 100");
    }
  });

  if (monitoringChart) {
    monitoringChart.data.labels = [];
    monitoringChart.data.datasets[0].data = [];
    monitoringChart.update();
  }

  const recommendationGrid = document.getElementById("recommendationGrid");

  if (recommendationGrid) {
    recommendationGrid.innerHTML = `
      <div class="recommendation-card">
        <div class="rec-content">
          <h4>Data Tidak Tersedia</h4>
          <p>Data monitoring belum dapat diambil dari server.</p>
        </div>
      </div>
    `;
  }

  const lastUpdate = document.getElementById("lastUpdate");

  if (lastUpdate) {
    lastUpdate.textContent = "Terakhir diperbarui: -";
  }
}

// ===================================
// CSV PARSER
// ===================================
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

// ===================================
// UPDATE DASHBOARD
// ===================================
function updateDashboard() {
  if (!latestSensorData) return;

  const latest = {
    timestamp: latestSensorData.timestamp,
    suhu: Number(latestSensorData.temperature),
    rh: Number(latestSensorData.humidity),
    soil: Number(latestSensorData.soil_humidity),
    pm25: Number(latestSensorData.pm25),
    skor: Number(latestSensorData.ikl),
    kategori: latestSensorData.ikl_label,
  };

  console.log("DATA UNTUK KARTU:");
  console.log(latest);

  // Kartu sensor
  updateValue("valSuhu", latest.suhu);
  updateValue("valRh", latest.rh);
  updateValue("valSoil", latest.soil);
  updateValue("valPm25", latest.pm25);

  // IKL terbaru
  updateStatus(latest);

  // Rata-rata PM2.5 dan ISPU
  updateAveragePM25();

  // Grafik history sensor
  updateChart(realtimeData);

  // Lingkaran
  updateQualityCircles(latest);

  // Rekomendasi
  updateRecommendations(latest);

  // Waktu update
  const lastUpdate = document.getElementById("lastUpdate");

  if (lastUpdate) {
    const date = new Date(latest.timestamp);

    lastUpdate.textContent = `Terakhir diperbarui: ${date.toLocaleString("id-ID")}`;
  }
}

function updateValue(elementId, value) {
  const el = document.getElementById(elementId);

  if (el) {
    animateValue(
      el,
      parseFloat(el.textContent) || 0,
      parseFloat(value)
    );
  }
}

function animateValue(element, start, end) {
  if (!Number.isFinite(end)) {
    element.textContent = "-";
    return;
  }

  const duration = 1000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = start + (end - start) * easeOutQuart;

    element.textContent = current.toFixed(
      end % 1 === 0 ? 0 : 1
    );

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ===================================
// STATUS UPDATE
// ===================================
function updateStatus(data) {
  const skor = parseFloat(data.skor);
  const kategoriRaw = String(data.kategori ?? "").trim();

  const gaugeFill = document.getElementById("gaugeFill");
  const gaugeValue = document.getElementById("gaugeValue");
  const statusBadge = document.getElementById("statusBadge");
  const valKategori = document.getElementById("valKategori");
  const valSkor = document.getElementById("valSkor");

  const kategoriMap = {
    "SangatBuruk": {
      label: "Sangat Buruk",
      className: "sangat-buruk",
    },
    "Sangat Buruk": {
      label: "Sangat Buruk",
      className: "sangat-buruk",
    },
    "Buruk": {
      label: "Buruk",
      className: "buruk",
    },
    "KurangBaik": {
      label: "Buruk",
      className: "buruk",
    },
    "Kurang Baik": {
      label: "Buruk",
      className: "buruk",
    },
    "Cukup": {
      label: "Cukup",
      className: "cukup",
    },
    "Baik": {
      label: "Baik",
      className: "baik",
    },
    "SangatBaik": {
      label: "Sangat Baik",
      className: "sangat-baik",
    },
    "Sangat Baik": {
      label: "Sangat Baik",
      className: "sangat-baik",
    },
  };

  const status = kategoriMap[kategoriRaw];

  if (!Number.isFinite(skor)) {
    if (gaugeFill) {
      gaugeFill.style.strokeDasharray = "0, 251";
    }

    if (gaugeValue) {
      gaugeValue.textContent = "-";
    }

    if (statusBadge) {
      statusBadge.className = "status-badge";

      const badgeText = statusBadge.querySelector(".badge-text");

      if (badgeText) badgeText.textContent = "-";
    }

    if (valKategori) valKategori.textContent = "-";
    if (valSkor) valSkor.textContent = "-";

    return;
  }

  if (gaugeFill) {
    const maxArc = 251;
    const percentage = Math.max(0, Math.min(skor, 100)) / 100;
    const arcLength = maxArc * percentage;

    gaugeFill.style.strokeDasharray = `${arcLength}, 251`;
  }

  if (gaugeValue) {
    animateValue(gaugeValue, 0, skor);
  }

  if (statusBadge) {
    statusBadge.className = "status-badge";

    const badgeText = statusBadge.querySelector(".badge-text");

    if (status && badgeText) {
      statusBadge.classList.add(status.className);
      badgeText.textContent = status.label;
    } else if (badgeText) {
      badgeText.textContent = kategoriRaw || "-";
    }
  }

  if (valKategori) {
    valKategori.textContent = status
      ? status.label
      : kategoriRaw || "-";
  }

  if (valSkor) {
    valSkor.textContent = `${skor}/100`;
  }
}

// ===================================
// CHARTS
// ===================================
function initCharts() {
  const ctx = document.getElementById("monitoringChart");
  if (!ctx) return;

  monitoringChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Suhu (°C)",
          data: [],
          borderColor: chartColors.suhu.main,
          backgroundColor: chartColors.suhu.light,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: chartColors.suhu.main,
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
          titleFont: {
            family: "'Space Grotesk', sans-serif",
            size: 14,
            weight: "600",
          },
          bodyFont: {
            family: "'DM Sans', sans-serif",
            size: 13,
          },
          displayColors: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#64748b",
            font: {
              family: "'DM Sans', sans-serif",
              size: 11,
            },
            maxTicksLimit: 8,
          },
        },
        y: {
          grid: {
            color: "rgba(226, 232, 240, 0.5)",
            drawBorder: false,
          },
          ticks: {
            color: "#64748b",
            font: {
              family: "'DM Sans', sans-serif",
              size: 11,
            },
          },
        },
      },
    },
  });
}

function updateChart(data) {
  if (!monitoringChart) return;

  const labels = data.map((d) => {
    if (!d.timestamp) return "";

    const date = new Date(d.timestamp);

    if (isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  const values = data.map((d) => Number(d.value));

  let label;
  let color;

  switch (currentChartData) {
    case "rh":
      label = "Kelembapan Udara (%)";
      color = chartColors.rh;
      break;

    case "soil":
      label = "Kelembapan Tanah (%)";
      color = chartColors.soil;
      break;

    case "pm25":
      label = "PM2.5 (µg/m³)";
      color = chartColors.pm25;
      break;

    default:
      label = "Suhu (°C)";
      color = chartColors.suhu;
  }

  monitoringChart.data.labels = labels;
  monitoringChart.data.datasets[0].data = values;
  monitoringChart.data.datasets[0].label = label;
  monitoringChart.data.datasets[0].borderColor = color.main;
  monitoringChart.data.datasets[0].backgroundColor = color.light;
  monitoringChart.data.datasets[0].pointHoverBackgroundColor = color.main;

  monitoringChart.update();
}

// ===================================
// MAP
// ===================================
function initMap() {
  const mapContainer = document.getElementById("map");
  if (!mapContainer) return;

  map = L.map("map", {
    center: [-7.7870215, 110.3880785],
    zoom: 17,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  iotNodes.forEach((node) => {
    const marker = L.circleMarker([node.lat, node.lng], {
      radius: 12,
      fillColor: node.status === "active" ? "#10b981" : "#94a3b8",
      color: "#ffffff",
      weight: 3,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: 'DM Sans', sans-serif; padding: 8px;">
        <strong style="font-size: 14px;">${node.name}</strong><br>
        <span style="color: ${
          node.status === "active" ? "#10b981" : "#94a3b8"
        }; font-size: 12px;">
          Status: ${
            node.status === "active" ? "Aktif" : "Tidak Aktif"
          }
        </span>
      </div>
    `);
  });
}

// ===================================
// QUALITY CIRCLES
// ===================================
function updateQualityCircles(data) {
  const metrics = [
    {
      id: "circleSuhu",
      valId: "circleValSuhu",
      value: parseFloat(data.suhu),
      max: 45,
      unit: "°C",
    },
    {
      id: "circleRh",
      valId: "circleValRh",
      value: parseFloat(data.rh),
      max: 100,
      unit: "%",
    },
    {
      id: "circleSoil",
      valId: "circleValSoil",
      value: parseFloat(data.soil),
      max: 100,
      unit: "%",
    },
    {
      id: "circlePm25",
      valId: "circleValPm25",
      value: parseFloat(data.pm25),
      max: 150,
      unit: " µg/m³",
    },
  ];

  metrics.forEach((metric) => {
    const circle = document.getElementById(metric.id);
    const valueEl = document.getElementById(metric.valId);

    if (circle && valueEl) {
      if (!Number.isFinite(metric.value)) {
        circle.setAttribute("stroke-dasharray", "0, 100");
        valueEl.textContent = "-";
        return;
      }

      const percentage = Math.max(
        0,
        Math.min((metric.value / metric.max) * 100, 100)
      );

      circle.setAttribute("stroke-dasharray", `${percentage}, 100`);
      valueEl.textContent = metric.value.toFixed(0) + metric.unit;
    }
  });
}

// ===================================
// RECOMMENDATIONS
// ===================================
function updateRecommendations(data) {
  const container = document.getElementById("recommendationGrid");
  if (!container) return;

  const kategoriRaw = String(data.kategori ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  const rekomendasiKategori = {
    sangatburuk: {
      title: "Kondisi Lingkungan Sangat Buruk",
      desc: "Periksa kondisi lingkungan dan validitas pembacaan sensor. Identifikasi parameter yang bermasalah, evaluasi kondisi tanah dan vegetasi, serta periksa kemungkinan sumber pencemaran udara untuk menentukan tindakan perbaikan yang sesuai.",
      icon: "warning",
    },

    buruk: {
      title: "Kondisi Lingkungan Buruk",
      desc: "Identifikasi parameter lingkungan yang kurang optimal. Periksa kesehatan tanaman dan kelembapan tanah, lakukan penyiraman sesuai kebutuhan tanaman, serta evaluasi kemungkinan sumber pencemaran udara.",
      icon: "warning",
    },

    kurangbaik: {
      title: "Kondisi Lingkungan Buruk",
      desc: "Identifikasi parameter lingkungan yang kurang optimal. Periksa kesehatan tanaman dan kelembapan tanah, lakukan penyiraman sesuai kebutuhan tanaman, serta evaluasi kemungkinan sumber pencemaran udara.",
      icon: "warning",
    },

    cukup: {
      title: "Kondisi Lingkungan Cukup",
      desc: "Lanjutkan pemeliharaan rutin. Perhatikan parameter yang belum optimal, sesuaikan penyiraman dengan kebutuhan tanaman, dan pantau perubahan kualitas udara.",
      icon: "success",
    },

    baik: {
      title: "Kondisi Lingkungan Baik",
      desc: "Pertahankan kondisi lingkungan melalui pemeliharaan vegetasi, pemantauan kelembapan tanah, dan pemeriksaan parameter lingkungan secara berkala.",
      icon: "success",
    },

    sangatbaik: {
      title: "Kondisi Lingkungan Sangat Baik",
      desc: "Pertahankan kondisi lingkungan melalui perawatan vegetasi dan pemantauan sensor secara berkala.",
      icon: "success",
    },
  };

  const rekomendasi = rekomendasiKategori[kategoriRaw];

  if (!rekomendasi) {
    container.innerHTML = `
      <div class="recommendation-card">
        <div class="rec-content">
          <h4>Rekomendasi Belum Tersedia</h4>
          <p>
            Kategori output fuzzy belum tersedia atau tidak dikenali.
            Periksa data hasil pemrosesan fuzzy dari server.
          </p>
        </div>
      </div>
    `;
    return;
  }

  const recommendations = [rekomendasi];

  container.innerHTML = recommendations
    .map((rec) => `
      <div class="recommendation-card">
        <div class="rec-icon ${rec.icon}">
          ${
            rec.icon === "success"
              ? `<svg viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>`
              : `<svg viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17.01"/>
                </svg>`
          }
        </div>
        <div class="rec-content">
          <h4>${rec.title}</h4>
          <p>${rec.desc}</p>
        </div>
      </div>
    `)
    .join("");
}

// ===================================
// EVENT LISTENERS
// ===================================
function initEventListeners() {
  const chartTabs = document.querySelectorAll(".chart-tab");

  chartTabs.forEach((tab) => {
    tab.addEventListener("click", async function () {
      chartTabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      currentChartData = this.dataset.chart;

      console.log("Ganti chart:", currentChartData);

      await loadRealtimeData();
    });
  });

  const btnRefresh = document.getElementById("btnRefresh");

  if (btnRefresh) {
    btnRefresh.addEventListener("click", function () {
      this.classList.add("loading");

      loadRealtimeData().finally(() => {
        setTimeout(() => {
          this.classList.remove("loading");
        }, 1000);
      });
    });
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
