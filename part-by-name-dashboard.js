// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Chart.register(ChartDataLabels);

let currentChart = null;

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadChartData);
document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);

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

async function loadChartData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('pemakaian_part_jatuh')
        .select('namaPart, qty')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

    if (error) {
        console.error("Gagal memuat data:", error);
        return;
    }
    
    document.getElementById('chartTitle').textContent = `Peringkat Part Jatuh - ${monthText}`;
    const ctx = document.getElementById('rankingChart').getContext('2d');
    if (currentChart) currentChart.destroy();
    
    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const usageByName = new Map();
    data.forEach(item => {
        usageByName.set(item.namaPart, (usageByName.get(item.namaPart) || 0) + item.qty);
    });

    const sortedData = Array.from(usageByName.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);

    const labels = sortedData.map(item => item[0]);
    const chartData = sortedData.map(item => item[1]);

    renderSortedChart(labels, chartData);
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

function downloadChartImage() {
    const canvas = document.getElementById('rankingChart');
    if (!canvas) { return; }
    const newCtx = document.createElement('canvas').getContext('2d');
    newCtx.canvas.width = canvas.width;
    newCtx.canvas.height = canvas.height;
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCtx.canvas.width, newCtx.canvas.height);
    newCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.download = `Ranking_Part_Jatuh_${monthText.replace(/ /g, "_")}.png`;
    link.href = newCtx.canvas.toDataURL('image/png');
    link.click();
}