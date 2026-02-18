// stats.js - WebRTC Stats Viewer with Graphs

document.addEventListener('DOMContentLoaded', async () => {
  const stats = await loadAllStats();
  renderTable(stats);
  renderCharts(stats);
});

async function loadAllStats() {
  return new Promise((resolve) => {
    if (!chrome || !chrome.storage || !chrome.storage.local) return resolve([]);
    chrome.storage.local.get('tables', (stored) => {
      const stats = (stored && stored.tables && stored.tables.stats) || [];
      resolve(stats);
    });
  });
}

function renderTable(stats) {
  const tbody = document.querySelector('#statsTable tbody');
  tbody.innerHTML = '';
  stats.slice(0, 100).forEach(entry => {
    const tr = document.createElement('tr');
    const ts = new Date(entry.timestamp).toLocaleString();
    const q = entry.quality?.status || '--';
    const rtt = entry.quality?.metrics?.rtt != null ? Math.round(entry.quality.metrics.rtt) : '--';
    const pl = entry.quality?.metrics?.packetLoss != null ? entry.quality.metrics.packetLoss.toFixed(2) : '--';
    const jitter = entry.quality?.metrics?.jitter != null ? Math.round(entry.quality.metrics.jitter) : '--';
    const msg = entry.quality?.message || '';
    tr.innerHTML = `<td>${ts}</td><td>${q}</td><td>${rtt}</td><td>${pl}</td><td>${jitter}</td><td>${msg}</td>`;
    tbody.appendChild(tr);
  });
}

function renderCharts(stats) {
  const times = stats.map(s => new Date(s.timestamp).toLocaleTimeString());
  const rtts = stats.map(s => s.quality?.metrics?.rtt != null ? s.quality.metrics.rtt : null);
  const packetLosses = stats.map(s => s.quality?.metrics?.packetLoss != null ? s.quality.metrics.packetLoss : null);
  const jitters = stats.map(s => s.quality?.metrics?.jitter != null ? s.quality.metrics.jitter : null);

  makeChart('rttChart', 'RTT (ms)', times, rtts, 'rgba(54, 162, 235, 0.6)');
  makeChart('packetLossChart', 'Packet Loss (%)', times, packetLosses, 'rgba(255, 99, 132, 0.6)');
  makeChart('jitterChart', 'Jitter (ms)', times, jitters, 'rgba(255, 206, 86, 0.6)');
}

function makeChart(canvasId, label, labels, data, color) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.slice(0, 100).reverse(),
      datasets: [{
        label: label,
        data: data.slice(0, 100).reverse(),
        fill: false,
        borderColor: color,
        backgroundColor: color,
        tension: 0.2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { x: { display: true }, y: { display: true } }
    }
  });
}
