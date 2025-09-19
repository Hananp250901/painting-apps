// 🔑 Ganti dengan API Key Supabase kamu
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Chart.register(ChartDataLabels);

// Variabel chart leader
let chartSunarno = null;
let chartWahyuDedi = null;
let chartNurAhmad = null;

const leaderColors = {
  'SUNARNO': { background: 'rgba(255, 99, 132, 0.8)', border: 'rgba(255, 99, 132, 1)' },
  'WAHYU DEDI': { background: 'rgba(54, 162, 235, 0.8)', border: 'rgba(54, 162, 235, 1)' },
  'NUR AHMAD': { background: 'rgba(75, 192, 192, 0.8)', border: 'rgba(75, 192, 192, 1)' },
  'default': { background: 'rgba(153, 102, 255, 0.8)', border: 'rgba(153, 102, 255, 1)' }
};

const darkChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#e0e0e0' } },
    datalabels: {
      color: '#ffffff',
      anchor: 'end',
      align: 'top',
      font: { weight: 'bold' },
      formatter: (value) => value > 0 ? value.toLocaleString('id-ID') : ''
    }
  },
  scales: {
    x: {
      ticks: { color: '#a7a9be' },
      grid: { color: 'rgba(255, 255, 255, 0.1)' }
    },
    y: {
      ticks: { color: '#a7a9be' },
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
      beginAtZero: true
    }
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [catData, thinnerData, aeroxData, partJatuhData] = await Promise.all([
    supabase.from('pemakaian_cat').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
    supabase.from('pemakaian_thinner').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
    supabase.from('pemakaian_aerox').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
    supabase.from('pemakaian_part_jatuh').select('*').gte('tanggal', startDate).lte('tanggal', endDate)
  ]);

  renderCatCharts(catData.data);
  renderThinnerCharts(thinnerData.data);
  renderAeroxChart(aeroxData.data);
  renderPartJatuhChart(partJatuhData.data);

  renderLeaderCharts(partJatuhData.data);

  // Tambahan
  renderPeringkatPartChart(partJatuhData.data);
  renderPartPerLeaderChart(partJatuhData.data);
  renderAnalisisCatChart(catData.data);
});

// === Grafik Cat ===
function renderCatCharts(data) {
  if (!data) return;
  const usageByItem = new Map();
  data.forEach(item => usageByItem.set(item.namaCat, (usageByItem.get(item.namaCat) || 0) + item.qty));
  const sortedData = Array.from(usageByItem.entries()).sort((a, b) => b[1] - a[1]);

  new Chart('catItemChart', {
    type: 'bar',
    data: {
      labels: sortedData.map(x => x[0]),
      datasets: [{ label: 'Total (Pail)', data: sortedData.map(x => (x[1]/20)), backgroundColor: '#e94560' }]
    },
    options: darkChartOptions
  });

  const dailyUsage = new Map();
  data.forEach(item => dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty));
  const sortedDaily = new Map([...dailyUsage.entries()].sort());

  new Chart('catDailyChart', {
    type: 'line',
    data: {
      labels: Array.from(sortedDaily.keys()).map(d => new Date(d).getDate()),
      datasets: [{ label: 'Total (Liter)', data: Array.from(sortedDaily.values()), borderColor: '#e94560', tension: 0.3 }]
    },
    options: darkChartOptions
  });
}

// === Grafik Thinner ===
function renderThinnerCharts(data) {
  if (!data) return;
  const usageByItem = new Map();
  data.forEach(item => usageByItem.set(item.namaThinner, (usageByItem.get(item.namaThinner) || 0) + item.qty));
  const sortedData = Array.from(usageByItem.entries()).sort((a, b) => b[1] - a[1]);

  new Chart('thinnerItemChart', {
    type: 'bar',
    data: {
      labels: sortedData.map(x => x[0]),
      datasets: [{ label: 'Total (Pail)', data: sortedData.map(x => (x[1]/20)), backgroundColor: '#0f3460' }]
    },
    options: darkChartOptions
  });

  const dailyUsage = new Map();
  data.forEach(item => dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty));
  const sortedDaily = new Map([...dailyUsage.entries()].sort());

  new Chart('thinnerDailyChart', {
    type: 'line',
    data: {
      labels: Array.from(sortedDaily.keys()).map(d => new Date(d).getDate()),
      datasets: [{ label: 'Total (Liter)', data: Array.from(sortedDaily.values()), borderColor: '#0f3460', tension: 0.3 }]
    },
    options: darkChartOptions
  });
}

// === Grafik Aerox ===
function renderAeroxChart(data) {
  if (!data) return;
  const dailyUsage = new Map();
  data.forEach(item => dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty));
  const sortedDaily = new Map([...dailyUsage.entries()].sort());

  new Chart('aeroxDailyChart', {
    type: 'bar',
    data: {
      labels: Array.from(sortedDaily.keys()).map(d => new Date(d).getDate()),
      datasets: [{ label: 'Total (Pcs)', data: Array.from(sortedDaily.values()), backgroundColor: '#53a8b6' }]
    },
    options: darkChartOptions
  });
}

// === Grafik Part Jatuh ===
function renderPartJatuhChart(data) {
  if (!data) return;
  const dailyUsage = new Map();
  data.forEach(item => dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty));
  const sortedDaily = new Map([...dailyUsage.entries()].sort());

  new Chart('partJatuhDailyChart', {
    type: 'bar',
    data: {
      labels: Array.from(sortedDaily.keys()).map(d => new Date(d).getDate()),
      datasets: [{ label: 'Total (Qty)', data: Array.from(sortedDaily.values()), backgroundColor: '#5c5470' }]
    },
    options: darkChartOptions
  });
}

// === Grafik Per Leader ===
function renderLeaderCharts(data) {
  if (!data) return;
  renderLeaderChart(data, 'SUNARNO', 'chartSunarno');
  renderLeaderChart(data, 'WAHYU DEDI', 'chartWahyuDedi');
  renderLeaderChart(data, 'NUR AHMAD', 'chartNurAhmad');
}

function renderLeaderChart(sourceData, leaderName, canvasId) {
  const leaderData = sourceData.filter(item => item.shift === leaderName);
  const usageByPart = new Map();
  leaderData.forEach(item => usageByPart.set(item.namaPart, (usageByPart.get(item.namaPart) || 0) + item.qty));

  const sorted = Array.from(usageByPart.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ctx = document.getElementById(canvasId).getContext('2d');
  const color = leaderColors[leaderName] || leaderColors['default'];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(x => x[0]),
      datasets: [{ label: 'Total Qty', data: sorted.map(x => x[1]), backgroundColor: color.background, borderColor: color.border }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'right', color: '#fff', formatter: v => v } } }
  });
}

// === Tambahan ===
function renderPeringkatPartChart(data) {
  if (!data) return;
  const usageByPart = new Map();
  data.forEach(item => usageByPart.set(item.namaPart, (usageByPart.get(item.namaPart) || 0) + item.qty));
  const sorted = Array.from(usageByPart.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);

  new Chart('chartPeringkatPart', {
    type: 'bar',
    data: {
      labels: sorted.map(x => x[0]),
      datasets: [{ label: 'Total Qty', data: sorted.map(x => x[1]), backgroundColor: '#9d4edd' }]
    },
    options: darkChartOptions
  });
}

function renderPartPerLeaderChart(data) {
  if (!data) return;
  const usageByLeader = new Map();
  // Pastikan data 'shift' berisi nama leadernya
  data.forEach(item => usageByLeader.set(item.shift, (usageByLeader.get(item.shift) || 0) + item.qty));

  new Chart('chartPartPerLeader', {
    type: 'doughnut',
    data: {
      labels: Array.from(usageByLeader.keys()),
      datasets: [{ 
          data: Array.from(usageByLeader.values()), 
          backgroundColor: ['#ff6384','#36a2eb','#ffcd56', '#4bc0c0', '#9966ff'] 
      }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right', // Pindahkan legenda ke kanan agar donat lebih center
                labels: { color: '#e0e0e0' }
            },
            datalabels: { // Tambahkan label data di dalam donat
                color: '#fff',
                font: { weight: 'bold' },
                formatter: (value, context) => {
                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                    const percentage = (value / total * 100).toFixed(1) + '%';
                    return percentage;
                }
            }
        }
    }
  });
}
function renderAnalisisCatChart(data) {
  if (!data) return;
  const dailyUsage = new Map();
  data.forEach(item => dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty));
  const sortedDaily = new Map([...dailyUsage.entries()].sort());

  new Chart('chartAnalisisCat', {
    data: {
      labels: Array.from(sortedDaily.keys()).map(d => new Date(d).getDate()),
      datasets: [
        { 
          type: 'line', 
          label: 'Total (Garis)', 
          data: Array.from(sortedDaily.values()), 
          borderColor: '#ffa600', 
          fill: false, 
          tension: 0.3,
          // === TAMBAHAN: Nonaktifkan label untuk garis ===
          datalabels: {
              display: false
          }
        },
        { 
          type: 'bar', 
          label: 'Total (Bar)', 
          data: Array.from(sortedDaily.values()), 
          backgroundColor: '#3a86ff' 
          // Label untuk bar akan otomatis tampil dari pengaturan default
        }
      ]
    },
    options: darkChartOptions
  });
}
