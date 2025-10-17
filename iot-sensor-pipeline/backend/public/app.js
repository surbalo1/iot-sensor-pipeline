// Client-side: seed chart from API, then receive real-time updates via socket.io
const ctx = document.getElementById('chart').getContext('2d');
const MAX_POINTS = 120; // máximo número de puntos mostrados

let labels = [];
let dataPoints = [];
let rawRows = []; // guardamos las filas completas para export

let paused = false;

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: labels,
    datasets: [{
      label: 'Temperature (°C)',
      data: dataPoints,
      borderColor: 'rgba(255,99,71,1)',
      backgroundColor: 'rgba(255,99,71,0.15)',
      tension: 0.25,
      pointRadius: 3,
      fill: true,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        title: { display: true, text: 'Time' },
        ticks: {
          maxRotation: 45,
          minRotation: 30,
          autoSkip: true,
          maxTicksLimit: 10
        }
      },
      y: {
        display: true,
        title: { display: true, text: '°C' }
      }
    },
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            // show full locale datetime for the point
            return new Date(rawRows[idx].timestamp).toLocaleString();
          },
          label: (item) => `Temperature: ${Number(item.raw).toFixed(2)} °C`
        }
      }
    }
  }
});

function addPoint(ts, temp, id) {
  labels.push(new Date(ts).toLocaleTimeString());
  dataPoints.push(Number(temp));
  rawRows.push({ id, timestamp: ts, temperature: Number(temp) });

  // mantener máximo de puntos
  while (labels.length > MAX_POINTS) {
    labels.shift();
    dataPoints.shift();
    rawRows.shift();
  }

  chart.update('none'); // actualización suave

  // actualizar última lectura
  const lastEl = document.getElementById('last');
  lastEl.textContent = `Latest: ${Number(temp).toFixed(2)} °C — ${new Date(ts).toLocaleString()}`;
}

async function fetchInitial(limit = 60) {
  try {
    const res = await fetch(`/api/readings?limit=${limit}`);
    if (!res.ok) throw new Error('Network response not ok');
    const rows = await res.json();
    // rows vienen DESC, queremos oldest->newest
    const ordered = rows.slice().reverse();
    for (const r of ordered) {
      addPoint(r.timestamp, r.temperature, r.id);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

function exportCSV() {
  if (!rawRows.length) {
    alert('No data to export');
    return;
  }
  const header = ['id','timestamp','temperature'];
  const csv = [
    header.join(','),
    ...rawRows.map(r => `${r.id},"${r.timestamp}",${r.temperature}`)
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `readings_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

(async () => {
  // seed chart
  await fetchInitial(60);

  // connect socket.io
  const socket = io();

  socket.on('connect', () => {
    console.log('Connected to socket server');
  });

  socket.on('reading', (r) => {
    if (paused) return;
    // r: { id, temperature, timestamp }
    addPoint(r.timestamp, r.temperature, r.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  // pause/resume button
  const pauseBtn = document.getElementById('pauseBtn');
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume updates' : 'Pause updates';
  });

  // export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);
})();