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

// Node IoT Locations
const iotNodes = [
  { id: 1, name: "Node 1", lat: -6.9147, lng: 107.6098, status: "active" },
  { id: 2, name: "Node 2", lat: -6.9175, lng: 107.6132, status: "active" },
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
  // Show loading
  showLoading(true);

  // Initialize components
  initSidebar();
  initDateTime();
  initCharts();
  initMap();
  initEventListeners();

  // Load data
  loadRealtimeData();

  // Update datetime every second
  setInterval(updateDateTime, 1000);

  // Auto refresh data every 30 seconds
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

    // Close sidebar when clicking outside
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
  try {
    console.clear();
    console.log("====================================");
    console.log("Mengambil data dari API...");
    console.log("====================================");

    // Mapping nama chart -> sensor di API
    const sensorMap = {
      suhu: "temperature",
      rh: "humidity",
      soil: "soil_humidity",
      pm25: "pm25",
    };

    const sensor = sensorMap[currentChartData];

    // Ambil latest dan history bersamaan
    const [latestResponse, historyResponse] = await Promise.all([
      // fetch("http://localhost:1880/api/latest"),
      // fetch(`http://localhost:1880/api/history?sensor=${sensor}`),
      fetch(`${window.location.protocol}//${window.location.host}:1880/api/latest`),
      fetch(`${window.location.protocol}//${window.location.host}:1880/api/history?sensor=${sensor}`),
    ]);

    const latest = await latestResponse.json();
    const history = await historyResponse.json();

    console.log("=== Latest ===");
    console.table(latest);

    console.log("=== History ===");
    console.table(history);

    // Data history untuk chart
    realtimeData = history.map((item) => ({
      timestamp: item.timestamp,
      suhu: sensor === "temperature" ? item.value : latest.temperature,
      rh: sensor === "humidity" ? item.value : latest.humidity,
      soil: sensor === "soil_humidity" ? item.value : latest.soil_humidity,
      pm25: sensor === "pm25" ? item.value : latest.pm25,
      skor: latest.ikl,
      kategori: latest.ikl_label,
    }));

    console.log("=== Data Dashboard ===");
    console.table(realtimeData);

    updateDashboard(realtimeData);

    showLoading(false);
  } catch (error) {
    console.error("Gagal mengambil data API");
    console.error(error);

    realtimeData = generateDummyData();
    updateDashboard(realtimeData);

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

function generateDummyData() {
  const data = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now - i * 60 * 60 * 1000);
    data.push({
      timestamp: time.toISOString().slice(0, 16).replace("T", " "),
      suhu: (26 + Math.random() * 6).toFixed(1),
      rh: (65 + Math.random() * 20).toFixed(0),
      soil: (55 + Math.random() * 15).toFixed(0),
      pm25: (12 + Math.random() * 15).toFixed(0),
      skor: (70 + Math.random() * 20).toFixed(0),
      kategori: ["Baik", "Sedang", "Baik"][Math.floor(Math.random() * 3)],
    });
  }

  return data;
}

// ===================================
// UPDATE DASHBOARD
// ===================================
function updateDashboard(data) {
  if (data.length === 0) return;

  const latest = data[data.length - 1];

  // Update indicator cards
  updateValue("valSuhu", latest.suhu);
  updateValue("valRh", latest.rh);
  updateValue("valSoil", latest.soil);
  updateValue("valPm25", latest.pm25);

  // Update status
  updateStatus(latest);

  // Update charts
  updateChart(data);

  // Update quality circles
  updateQualityCircles(latest);

  // Update recommendations
  updateRecommendations(latest);

  // Update last update time
  const lastUpdate = document.getElementById("lastUpdate");
  if (lastUpdate) {
    lastUpdate.textContent = `Terakhir diperbarui: ${
      latest.timestamp || "Baru saja"
    }`;
  }
}

function updateValue(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) {
    animateValue(el, parseFloat(el.textContent) || 0, parseFloat(value));
  }
}

function animateValue(element, start, end) {
  const duration = 1000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = start + (end - start) * easeOutQuart;

    element.textContent = current.toFixed(end % 1 === 0 ? 0 : 1);

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
  const skor = parseFloat(data.skor) || 78;
  const kategori = data.kategori || "Baik";

  // Update gauge
  const gaugeFill = document.getElementById("gaugeFill");
  const gaugeValue = document.getElementById("gaugeValue");

  if (gaugeFill && gaugeValue) {
    // Calculate arc length
    const maxArc = 251; // Approximate arc length
    const percentage = skor / 100;
    const arcLength = maxArc * percentage;

    gaugeFill.style.strokeDasharray = `${arcLength}, 251`;
    animateValue(gaugeValue, 0, skor);
  }

  // Update status badge
  const statusBadge = document.getElementById("statusBadge");
  if (statusBadge) {
    statusBadge.className = "status-badge";
    statusBadge.classList.add(kategori.toLowerCase());
    statusBadge.querySelector(".badge-text").textContent = kategori;
  }

  // Update details
  const valKategori = document.getElementById("valKategori");
  if (valKategori) valKategori.textContent = kategori;
  const valSkor = document.getElementById("valSkor");
  if (valSkor) valSkor.textContent = skor + "/100";
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
    const time = d.timestamp ? d.timestamp.split(" ")[1] : "";
    return time || "";
  });

  let values, label, color;

  switch (currentChartData) {
    case "rh":
      values = data.map((d) => parseFloat(d.rh));
      label = "Kelembaban Udara (%)";
      color = chartColors.rh;
      break;
    case "soil":
      values = data.map((d) => parseFloat(d.soil));
      label = "Kelembaban Tanah (%)";
      color = chartColors.soil;
      break;
    case "pm25":
      values = data.map((d) => parseFloat(d.pm25));
      label = "PM2.5 (µg/m³)";
      color = chartColors.pm25;
      break;
    default:
      values = data.map((d) => parseFloat(d.suhu));
      label = "Suhu (°C)";
      color = chartColors.suhu;
  }

  monitoringChart.data.labels = labels;
  monitoringChart.data.datasets[0].data = values;
  monitoringChart.data.datasets[0].label = label;
  monitoringChart.data.datasets[0].borderColor = color.main;
  monitoringChart.data.datasets[0].backgroundColor = color.light;
  monitoringChart.data.datasets[0].pointHoverBackgroundColor = color.main;

  monitoringChart.update("active");
}

// ===================================
// MAP
// ===================================
function initMap() {
  const mapContainer = document.getElementById("map");
  if (!mapContainer) return;

  // Initialize map
  map = L.map("map", {
    center: [-6.9147, 107.6098],
    zoom: 14,
    zoomControl: true,
  });

  // Add tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // Add markers
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
      max: 100,
      unit: "",
    },
  ];

  metrics.forEach((metric) => {
    const circle = document.getElementById(metric.id);
    const valueEl = document.getElementById(metric.valId);

    if (circle && valueEl) {
      const percentage = (metric.value / metric.max) * 100;
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

  const suhu = parseFloat(data.suhu);
  const rh = parseFloat(data.rh);
  const soil = parseFloat(data.soil);
  const pm25 = parseFloat(data.pm25);

  const recommendations = [
    {
      icon: "success",
      title: "Monitoring Rutin",
      desc: "Lanjutkan pemantauan parameter lingkungan secara berkala",
    },
    {
      icon: soil < 40 ? "warning" : "success",
      title: soil < 40 ? "Diperlukan Penyiraman" : "Kelembaban Tanah Cukup",
      desc:
        soil < 40
          ? "Tingkatkan frekuensi penyiraman tanaman"
          : "Tidak diperlukan penyiraman tambahan",
    },
    {
      icon: pm25 > 35 ? "warning" : "success",
      title: pm25 > 35 ? "Kualitas Udara Menurun" : "Kualitas Udara Aman",
      desc:
        pm25 > 35
          ? "Pertimbangkan pengurangan aktivitas di area ini"
          : "Kualitas udara masih dalam batas aman",
    },
    {
      icon: suhu > 35 ? "warning" : "success",
      title: suhu > 35 ? "Suhu Tinggi" : "Suhu Normal",
      desc:
        suhu > 35
          ? "Aktifkan sistem pendingin tambahan"
          : "Tidak diperlukan tindakan korektif",
    },
  ];

  container.innerHTML = recommendations
    .map(
      (rec) => `
        <div class="recommendation-card">
            <div class="rec-icon ${rec.icon}">
                ${
                  rec.icon === "success"
                    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
                    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
                }
            </div>
            <div class="rec-content">
                <h4>${rec.title}</h4>
                <p>${rec.desc}</p>
            </div>
        </div>
    `,
    )
    .join("");
}

// ===================================
// EVENT LISTENERS
// ===================================
function initEventListeners() {
  // Chart tabs
  const chartTabs = document.querySelectorAll(".chart-tab");
  chartTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      chartTabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      currentChartData = this.dataset.chart;
      if (realtimeData.length > 0) {
        tab.addEventListener("click", async function () {
          chartTabs.forEach((t) => t.classList.remove("active"));
          this.classList.add("active");

          currentChartData = this.dataset.chart;

          console.log("Ganti chart :", currentChartData);

          await loadRealtimeData();
        });
      }
    });
  });

  // Refresh button
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
