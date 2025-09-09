// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Chart.register(ChartDataLabels);

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadChartData);
document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);

// --- FUNGSI UTAMA ---
async function initializeDashboard() {
    await populateMonthFilter();
    await loadChartData();
}

// --- FUNGSI UNTUK MENGISI DROPDOWN FILTER BULAN ---
async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const { data, error } = await supabase.rpc('get_distinct_months_aerox'); 
    
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

// --- FUNGSI UNTUK MEMUAT, MENGOLAH, DAN MERENDER GRAFIK ---
async function loadChartData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('pemakaian_aerox')
        .select('namaAerox, qty')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

    if (error) {
        console.error("Gagal memuat data:", error);
        return;
    }
    
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    document.getElementById('chartTitle').textContent = `Pemakaian Aerox - ${monthText}`;
    const ctx = document.getElementById('usageChartByName').getContext('2d');
    if (window.myAeroxChartByName) window.myAeroxChartByName.destroy();
    
    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const usageByName = new Map();
    data.forEach(item => {
        usageByName.set(item.namaAerox, (usageByName.get(item.namaAerox) || 0) + item.qty);
    });

    const sortedData = Array.from(usageByName.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15); // Ambil Top 15

    const labels = sortedData.map(item => item[0]);
    const chartData = sortedData.map(item => item[1]);

    renderSortedChart(labels, chartData);
}

// --- FUNGSI UNTUK MERENDER GRAFIK ---
function renderSortedChart(labels, data) {
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const ctx = document.getElementById('usageChartByName').getContext('2d');
    
    window.myAeroxChartByName = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Total Pemakaian - ${monthText}`,
                data: data,
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            layout: { padding: { left: 50, right: 50 } },
            plugins: {
                title: { 
                    display: true, // Ubah menjadi true
                    text: `Pemakaian Aerox - ${monthText}`, // Teks judul
                    font: { size: 18 },
                    padding: { top: 10, bottom: 20 } // Beri jarak
                },
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
                    title: { display: true, text: 'Jumlah Aerox' } 
                }
            }
        }
    });
}

// --- FUNGSI UNTUK DOWNLOAD GAMBAR ---
function downloadChartImage() {
    // PASTIKAN ID INI SAMA DENGAN DI HTML
    const canvas = document.getElementById('usageChartByName');
    if (!canvas) {
        console.error('Elemen canvas dengan ID "usageChartByName" tidak ditemukan!');
        return;
    }
    const newCtx = document.createElement('canvas').getContext('2d');
    newCtx.canvas.width = canvas.width;
    newCtx.canvas.height = canvas.height;
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCtx.canvas.width, newCtx.canvas.height);
    newCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.download = `Ranking_Aerox_${monthText.replace(/ /g, "_")}.png`;
    link.href = newCtx.canvas.toDataURL('image/png');
    link.click();
}