// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel Global
let fullLogData = [];
let currentPage = 1;
const rowsPerPage = 20;
let showAll = false;
// Daftarkan plugin Chart.js
Chart.register(ChartDataLabels);

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', () => {
    showAll = false; currentPage = 1; loadDashboardData();
});
document.getElementById('logSearchInput').addEventListener('keyup', handleSearch);
document.getElementById('downloadCsvButton').addEventListener('click', exportToCSV);
document.getElementById('prevPageButton').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; displayLogPage(); }
});
document.getElementById('nextPageButton').addEventListener('click', () => {
    if (currentPage < Math.ceil(getFilteredData().length / rowsPerPage)) { currentPage++; displayLogPage(); }
});
document.getElementById('togglePaginationButton').addEventListener('click', () => {
    showAll = !showAll;
    const button = document.getElementById('togglePaginationButton');
    const controls = document.querySelector('.pagination-controls');
    if (showAll) {
        button.textContent = "Tampilkan Halaman";
        controls.classList.add('hidden');
    } else {
        button.textContent = "Tampilkan Semua";
        controls.classList.remove('hidden');
        currentPage = 1;
    }
    displayLogPage();
});
document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);

// Fungsi Utama
async function initializeDashboard() {
    await populateMonthFilter();
    await loadDashboardData();
}
function handleSearch() {
    currentPage = 1; displayLogPage();
}
async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    
    // Panggil fungsi 'rpc' untuk bypass cache potensial
    const { data, error } = await supabase.rpc('get_distinct_months');

    if (error || !data || data.length === 0) {
        console.error("Gagal mengambil bulan unik:", error);
        monthFilter.innerHTML = '<option value="">Tidak ada data</option>';
        return;
    }

    const availableMonths = new Set();
    data.forEach(item => {
        // Data dari rpc sudah dalam format yang kita inginkan
        const monthKey = `${item.tahun}-${item.bulan}`;
        availableMonths.add(monthKey);
    });

    monthFilter.innerHTML = '';
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    
    const sortedMonths = Array.from(availableMonths).sort((a, b) => new Date(b.split('-')[0], b.split('-')[1]-1) - new Date(a.split('-')[0], a.split('-')[1]-1));
    
    sortedMonths.forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, month - 1);
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        if (monthKey === currentMonthKey) {
            option.selected = true;
        }
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
async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    if (!selectedMonth) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const { data, error } = await supabase.from('pemakaian_cat').select('*').gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal', { ascending: true });
    if (error) { console.error("Gagal memuat data:", error); return; }
    fullLogData = data;
    displayLogPage();
    const ctx = document.getElementById('usageChart').getContext('2d');
    if (window.myCatChart) window.myCatChart.destroy();
    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Poppins"; ctx.fillStyle = "#888"; ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    const dailyUsage = new Map();
    data.forEach(item => {
        dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty);
    });
    const labels = [], dailyData = [];
    const sorted = new Map([...dailyUsage.entries()].sort());
    sorted.forEach((totalQty, dateKey) => {
        labels.push(new Date(dateKey).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        dailyData.push(totalQty);
    });
    renderChart(labels, dailyData);
}
function getFilteredData() {
    const filter = document.getElementById('logSearchInput').value.toUpperCase();
    return !filter ? fullLogData : fullLogData.filter(item => item.namaCat.toUpperCase().includes(filter));
}
function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    const filtered = getFilteredData();
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    let dataToDisplay = showAll ? filtered : filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    let html = '';
    dataToDisplay.forEach(item => {
        const t = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        html += `<tr><td>${t}</td><td>${item.shift}</td><td>${item.namaCat}</td><td>${item.qty}</td></tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="4">Tidak ada data yang cocok.</td></tr>';
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    document.getElementById('pageInfo').textContent = showAll ? `${filtered.length} Item` : `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('prevPageButton').disabled = currentPage === 1;
    document.getElementById('nextPageButton').disabled = currentPage >= totalPages;
}
function renderChart(labels, data) {
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    document.getElementById('chartTitle').textContent = `Analisis Pemakaian Cat - ${monthText}`;
    const ctx = document.getElementById('usageChart').getContext('2d');
    window.myCatChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Total (Bar)', data, backgroundColor: 'rgba(37, 117, 252, 0.7)', order: 1 },
                { label: 'Total (Garis)', data, type: 'line', borderColor: '#FFA500', tension: 0.3, order: 0, datalabels: { display: false } }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: `Analisis Pemakaian Cat - ${monthText}`, font: { size: 18 } },
                datalabels: {
                    anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v + ' L' : '',
                    color: '#333', font: { weight: 'bold' }
                    
                },
                customCanvasBackgroundColor: {
                    color: 'white', // Pastikan warna putih
                },
                
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Liter)' } } }
        },
        plugins: [ChartDataLabels]
    });
}
function exportToCSV() {
    const data = getFilteredData();
    let csv = "Tanggal,Shift,Nama Cat,Qty (Liter)\r\n";
    data.forEach(item => {
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.namaCat}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.setAttribute("download", `Laporan_Cat_${monthText.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// GANTI FUNGSI LAMA DENGAN YANG BARU INI
function downloadChartImage() {
    const originalCanvas = document.getElementById('usageChart');
    if (!originalCanvas) return;

    // 1. Buat canvas virtual baru di memori
    const newCanvas = document.createElement('canvas');
    const newCtx = newCanvas.getContext('2d');

    // 2. Atur ukuran canvas baru sama dengan canvas asli
    newCanvas.width = originalCanvas.width;
    newCanvas.height = originalCanvas.height;

    // 3. Lukis latar belakang putih di canvas baru
    newCtx.fillStyle = '#FFFFFF'; // Kode hex untuk putih
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    // 4. Salin gambar grafik dari canvas asli ke atas latar belakang putih
    newCtx.drawImage(originalCanvas, 0, 0);

    // 5. Buat link download dari canvas baru yang sudah memiliki background
    const link = document.createElement('a');
    link.href = newCanvas.toDataURL('image/png'); // Ambil gambar dari canvas BARU

    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const fileName = `Grafik_Pemakaian_Cat_${monthText.replace(/ /g, "_")}.png`;
    link.download = fileName;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


