// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
Chart.register(ChartDataLabels);

let currentChart = null;
let currentDonutChart = null; 

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadChartData);
document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);
document.getElementById('downloadDonutChartButton').addEventListener('click', downloadDonutChartImage); // Event listener baru

// --- FUNGSI UTAMA ---
async function initializeDashboard() {
    await populateMonthFilter();
    await loadChartData();
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const { data, error } = await supabase.rpc('get_distinct_months_part'); 
    
    if (error || !data || data.length === 0) {
        monthFilter.innerHTML = '<option value="">Tidak ada data</option>';
        return;
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

    if (!availableMonths.has(currentMonthKey)) {
        const option = document.createElement('option');
        option.value = currentMonthKey;
        option.textContent = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        option.selected = true;
        monthFilter.prepend(option);
    }
}

// GANTI DENGAN FUNGSI YANG SUDAH DIPERBAIKI INI
async function loadChartData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const totalElement = document.getElementById('pageTotalDisplay');
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    let allData = [];
    let from = 0, to = 999;
    let done = false;
    while (!done) {
        const { data, error } = await supabase
            .from('pemakaian_part_jatuh')
            .select('*')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true })
            .range(from, to);

        if (error) { console.error("Gagal memuat data:", error); break; }
        if (data.length > 0) { allData = allData.concat(data); }
        if (data.length < 1000) { done = true; } 
        else { from += 1000; to += 1000; }
    }

    if (currentChart) currentChart.destroy();
    if (currentDonutChart) currentDonutChart.destroy();

    if (!allData || allData.length === 0) {
        totalElement.textContent = 'Total: 0 Pcs';
    } else {
        const totalUsage = allData.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
        totalElement.textContent = `Total : ${totalUsage.toLocaleString('id-ID')} Pcs`;
    }

    document.getElementById('chartTitle').textContent = `Peringkat Part Gagal Proses - ${monthText}`;
    document.getElementById('donutChartTitle').textContent = `Part Gagal Proses by Shift - ${monthText}`;

    if (allData.length === 0) {
        const barCtx = document.getElementById('rankingChart').getContext('2d');
        const donutCtx = document.getElementById('donutChartByName').getContext('2d');
        barCtx.clearRect(0, 0, barCtx.canvas.width, barCtx.canvas.height); barCtx.fillText("Tidak ada data.", barCtx.canvas.width/2, barCtx.canvas.height/2);
        donutCtx.clearRect(0, 0, donutCtx.canvas.width, donutCtx.canvas.height); donutCtx.fillText("Tidak ada data.", donutCtx.canvas.width/2, donutCtx.canvas.height/2);
        return;
    }
    
    // --- PERBAIKAN DI SINI ---
    const usageByPartName = new Map();
    allData.forEach(item => { // Menggunakan 'allData' bukan 'data'
        usageByPartName.set(item.namaPart, (usageByPartName.get(item.namaPart) || 0) + item.qty);
    });
    const sortedPartData = Array.from(usageByPartName.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
    renderSortedChart(sortedPartData.map(item => item[0]), sortedPartData.map(item => item[1]));

    // --- DAN PERBAIKAN DI SINI ---
    const usageByShift = new Map();
    allData.forEach(item => { // Menggunakan 'allData' bukan 'data'
        if (item.shift) {
             usageByShift.set(item.shift, (usageByShift.get(item.shift) || 0) + item.qty);
        }
    });
    const sortedShiftData = Array.from(usageByShift.entries()).sort((a, b) => b[1] - a[1]);
    renderDonutChart(sortedShiftData.map(item => `Shift ${item[0]}`), sortedShiftData.map(item => item[1]));
}

function renderSortedChart(labels, data) {
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const ctx = document.getElementById('rankingChart').getContext('2d');
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Total Qty - ${monthText}`,
                data: data,
                backgroundColor: 'rgba(153, 102, 255, 0.8)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            layout: { padding: { left: 40, right: 40 } },
            plugins: {
                title: { display: true, text: `Peringkat Part Gagal Proses - ${monthText}`, font: { size: 18 } },
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    offset: 8,
                    color: '#333',
                    font: { weight: '600' },
                    formatter: (value) => value.toLocaleString('id-ID')
                }
            },
            scales: {
                x: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Jumlah (Qty)' } 
                }
            }
        }
    });
}

function renderDonutChart(labels, data) {
    const ctx = document.getElementById('donutChartByName').getContext('2d');
    const total = data.reduce((acc, value) => acc + value, 0);

    currentDonutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Qty',
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                datalabels: {
                    formatter: (value, context) => {
                        if (total === 0) return '0 (0%)';
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${value.toLocaleString('id-ID')}\n(${percentage}%)`;
                    },
                    color: '#fff',
                    textAlign: 'center',
                    font: {
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

function downloadChartImage() {
    const canvas = document.getElementById('rankingChart');
    if (!canvas) { return; }
    
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.download = `Ranking_Part_Jatuh_${monthText.replace(/ /g, "_")}.png`;
    link.href = newCanvas.toDataURL('image/png');
    link.click();
}

// --- FUNGSI BARU UNTUK MENGUNDUH GRAFIK DONAT ---
function downloadDonutChartImage() {
    const canvas = document.getElementById('donutChartByName');
    if (!canvas) { return; }

    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.download = `Part_Jatuh_per_Shift_${monthText.replace(/ /g, "_")}.png`;
    link.href = newCanvas.toDataURL('image/png');
    link.click();
}