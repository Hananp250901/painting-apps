// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel Global
let fullLogData = [];
let currentPage = 1;
const rowsPerPage = 20;
let showAll = false;
let myThinnerChart = null; // Variabel khusus untuk chart thinner

// Daftarkan plugin sekali di awal
Chart.register(ChartDataLabels);

// --- Event Listeners ---
// Didaftarkan setelah halaman selesai dimuat untuk keamanan
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.querySelectorAll('input[data-filter]').forEach(input => {
    input.addEventListener('keyup', () => {
        currentPage = 1;
        displayLogPage();
    });
});


async function initializeDashboard() {
    // Pastikan semua elemen ada sebelum menambahkan listener
    document.getElementById('monthFilter')?.addEventListener('change', () => {
        showAll = false; currentPage = 1; loadDashboardData();
    });
    document.getElementById('downloadChartButton')?.addEventListener('click', downloadChartImage);
    document.getElementById('logSearchInput')?.addEventListener('keyup', handleSearch);
    document.getElementById('downloadCsvButton')?.addEventListener('click', exportToCSV);
    document.getElementById('prevPageButton')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; displayLogPage(); }
    });
    document.getElementById('nextPageButton')?.addEventListener('click', () => {
        if (currentPage < Math.ceil(getFilteredData().length / rowsPerPage)) { currentPage++; displayLogPage(); }
    });
    document.getElementById('togglePaginationButton')?.addEventListener('click', () => {
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
    
    // Inisialisasi data
    await populateMonthFilter();
    await loadDashboardData();
}

function handleSearch() {
    currentPage = 1; 
    displayLogPage();
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    if (!monthFilter) return;

    // Pastikan Anda sudah membuat fungsi RPC 'get_distinct_months_thinner' di Supabase
    const { data, error } = await supabase.rpc('get_distinct_months_thinner');

    if (error || !data || data.length === 0) {
        console.error("Gagal mengambil bulan unik untuk thinner:", error);
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
        const date = new Date(year, month - 1);
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        monthFilter.appendChild(option);
    });

    if (monthFilter.querySelector(`option[value="${currentMonthKey}"]`)) {
        monthFilter.value = currentMonthKey;
    }
}

async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter')?.value;
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    // Mengambil data dari tabel pemakaian_thinner
    const { data, error } = await supabase.from('pemakaian_thinner').select('*').gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal', { ascending: true });
    
    if (error) { console.error("Gagal memuat data thinner:", error); return; }
    
    fullLogData = data || [];
    displayLogPage();
    renderChart(fullLogData); // Mengirim semua data ke fungsi renderChart
}

function getFilteredData() {
    const nameFilter = document.getElementById('logSearchInput').value.toUpperCase();
    const shiftFilter = document.querySelector('input[data-filter="shift"]')?.value.trim();
    const qtyFilter = document.querySelector('input[data-filter="qty"]')?.value.trim();
    const dateFilter = document.querySelector('input[data-filter="tanggal"]')?.value.trim();

    return fullLogData.filter(item => {
        const formattedTanggal = new Date(item.tanggal).toLocaleDateString('id-ID', { 
            day: '2-digit', month: 'short', year: 'numeric' 
        });

        const matchName = !nameFilter || item.namaCat.toUpperCase().includes(nameFilter);
        const matchShift = !shiftFilter || String(item.shift) === shiftFilter;
        const matchQty = !qtyFilter || String(item.qty) === qtyFilter;
        const matchDate = !dateFilter || formattedTanggal.toLowerCase().includes(dateFilter.toLowerCase());

        return matchName && matchShift && matchQty && matchDate;
    });
}

function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    if (!tableBody) return;

    const filtered = getFilteredData();
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    const dataToDisplay = showAll ? filtered : filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    
    let html = '';
    dataToDisplay.forEach(item => {
        const t = new Date(item.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        html += `<tr><td>${t}</td><td>${item.shift}</td><td>${item.namaThinner}</td><td>${item.qty}</td></tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="4">Tidak ada data yang cocok.</td></tr>';
    
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    document.getElementById('pageInfo').textContent = showAll ? `${filtered.length} Item` : `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('prevPageButton').disabled = currentPage === 1;
    document.getElementById('nextPageButton').disabled = currentPage >= totalPages;
}

function renderChart(data) {
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const chartTitleElement = document.getElementById('chartTitle');
    if (chartTitleElement) {
        chartTitleElement.textContent = `Analisis Pemakaian Thinner - ${monthText}`;
    }

    // Menggunakan ID yang benar dari HTML: 'catUsageChart'
    const ctx = document.getElementById('catUsageChart')?.getContext('2d');
    if (!ctx) return; // Keluar jika canvas tidak ditemukan

    if (myThinnerChart) {
        myThinnerChart.destroy();
    }

    if (!data || data.length === 0) {
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
        labels.push(new Date(dateKey + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        dailyData.push(totalQty);
    });

    myThinnerChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Total (Bar)', data: dailyData, backgroundColor: 'rgba(37, 117, 252, 0.7)', order: 1 },
                { label: 'Total (Garis)', data: dailyData, type: 'line', borderColor: '#FFA500', tension: 0.3, order: 0, datalabels: { display: false } }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: false }, // Judul sudah ada di H4
                datalabels: {
                    anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v + ' L' : '',
                    color: '#333', font: { weight: 'bold' }
                }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Liter)' } } }
        }
    });
}

function exportToCSV() {
    const data = getFilteredData();
    let csv = "Tanggal,Shift,Nama Thinner,Qty (Liter)\r\n";
    data.forEach(item => {
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.namaThinner}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.setAttribute("download", `Laporan_Thinner_${monthText.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadChartImage() {
    const canvas = document.getElementById('catUsageChart');
    if (!canvas) return;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.href = newCanvas.toDataURL('image/png');
    link.download = `Grafik_Pemakaian_Thinner_${monthText.replace(/ /g, "_")}.png`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
