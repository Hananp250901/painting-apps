// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Chart.register(ChartDataLabels);

let myAeroxChartByName = null;
let myAeroxDonutChart = null; // Variabel untuk chart donat

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadChartData);
document.getElementById('downloadChartButton').addEventListener('click', () => downloadChartImage('usageChartByName', 'Ranking_Aerox'));
document.getElementById('downloadDonutChartButton').addEventListener('click', () => downloadChartImage('donutChartByConsumer', 'Aerox_by_Consumer'));

// --- FUNGSI UTAMA ---
async function initializeDashboard() {
    await populateMonthFilter();
    await loadChartData();
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const { data, error } = await supabase.rpc('get_distinct_months_aerox'); 
    
    if (error || !data || data.length === 0) {
        monthFilter.innerHTML = '<option value="">Tidak ada data</option>'; return;
    }
    const availableMonths = new Set(data.map(item => `${item.tahun}-${item.bulan}`));
    monthFilter.innerHTML = '';
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const sortedMonths = Array.from(availableMonths).sort((a, b) => new Date(b.split('-')[0], b.split('-')[1]-1) - new Date(a.split('-')[0], a.split('-')[1]-1));
    
    sortedMonths.forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const d = new Date(year, month - 1);
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        if (monthKey === currentMonthKey) option.selected = true;
        monthFilter.appendChild(option);
    });
}

async function loadChartData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    if (!selectedMonth) return;
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    // Ambil juga kolom 'consumer'
    const { data, error } = await supabase
        .from('pemakaian_aerox')
        .select('namaAerox, qty, consumer')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

    if (error) { console.error("Gagal memuat data:", error); return; }

    // Hancurkan chart lama
    if (myAeroxChartByName) myAeroxChartByName.destroy();
    if (myAeroxDonutChart) myAeroxDonutChart.destroy();
    
    document.getElementById('chartTitle').textContent = `Peringkat Pemakaian Aerox - ${monthText}`;
    document.getElementById('donutChartTitle').textContent = `Pemakaian Aerox berdasarkan Consumer - ${monthText}`;

    // Proses data untuk Bar Chart (Ranking Aerox)
    const usageByName = new Map();
    data.forEach(item => {
        usageByName.set(item.namaAerox, (usageByName.get(item.namaAerox) || 0) + item.qty);
    });
    const sortedData = Array.from(usageByName.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
    renderSortedChart(
        sortedData.map(item => item[0]), 
        sortedData.map(item => item[1])
    );

    // Proses data untuk Donut Chart (by Consumer)
    const usageByConsumer = new Map();
    data.forEach(item => {
        if(item.consumer) {
            usageByConsumer.set(item.consumer, (usageByConsumer.get(item.consumer) || 0) + item.qty);
        }
    });
    const sortedConsumerData = Array.from(usageByConsumer.entries()).sort((a, b) => b[1] - a[1]);
    renderDonutChart(
        sortedConsumerData.map(item => item[0]), 
        sortedConsumerData.map(item => item[1])
    );
}

function renderSortedChart(labels, data) {
    const ctx = document.getElementById('usageChartByName').getContext('2d');
    myAeroxChartByName = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Total Pemakaian`,
                data: data,
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: 'y',
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end', align: 'right', offset: 8, color: '#333', font: { weight: '600' },
                    formatter: (value) => value.toLocaleString('id-ID')
                }
            },
            scales: { x: { beginAtZero: true, title: { display: true, text: 'Jumlah Pemakaian' } } }
        }
    });
}

// FUNGSI BARU UNTUK MERENDER GRAFIK DONAT
function renderDonutChart(labels, data) {
    const ctx = document.getElementById('donutChartByConsumer').getContext('2d');
    const total = data.reduce((acc, value) => acc + value, 0);

    myAeroxDonutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Qty',
                data: data,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                datalabels: {
                    formatter: (value) => {
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${value.toLocaleString('id-ID')}\n(${percentage}%)`;
                    },
                    color: '#fff', textAlign: 'center', font: { weight: 'bold' }
                }
            }
        }
    });
}

function downloadChartImage(canvasId, baseFileName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width; newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.href = newCanvas.toDataURL('image/png');
    link.download = `${baseFileName}_${monthText.replace(/ /g, "_")}.png`;
    link.click();
}