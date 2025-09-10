// dashboard-cat.js (FINAL & AMAN)

// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel Global
let fullLogData = [];
let currentPage = 1;
const rowsPerPage = 20;
let showAll = false;
Chart.register(ChartDataLabels);

document.addEventListener('DOMContentLoaded', initializeDashboard);
document.querySelectorAll('input[data-filter]').forEach(input => {
    input.addEventListener('keyup', () => {
        currentPage = 1;
        displayLogPage();
    });
});

async function initializeDashboard() {
    // Fungsi ini hanya akan berjalan di halaman yang memiliki elemen-elemen ini.
    // Jika tidak ada, fungsi akan berhenti tanpa error.
    const monthFilter = document.getElementById('monthFilter');
    if (!monthFilter) return; 

    // Daftarkan semua event listener di sini dengan aman
    monthFilter.addEventListener('change', () => {
        showAll = false; 
        currentPage = 1; 
        loadDashboardData();
    });

    document.getElementById('logSearchInput')?.addEventListener('keyup', handleSearch);
    document.getElementById('downloadCsvButton')?.addEventListener('click', exportToCSV);
    document.getElementById('downloadChartButton')?.addEventListener('click', downloadChartImage);
    document.getElementById('prevPageButton')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; displayLogPage(); }
    });
    document.getElementById('nextPageButton')?.addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredData().length / rowsPerPage) || 1;
        if (currentPage < totalPages) { currentPage++; displayLogPage(); }
    });
    document.getElementById('togglePaginationButton')?.addEventListener('click', () => {
        showAll = !showAll;
        const button = document.getElementById('togglePaginationButton');
        const paginationControls = document.querySelector('.pagination-controls');
        if (showAll) {
            button.textContent = "Tampilkan Halaman";
            paginationControls.classList.add('hidden');
        } else {
            button.textContent = "Tampilkan Semua";
            paginationControls.classList.remove('hidden');
            currentPage = 1;
        }
        displayLogPage();
    });

    await populateMonthFilter();
    await loadDashboardData();
}

function handleSearch() {
    currentPage = 1; 
    displayLogPage();
}

async function populateMonthFilter() {
    // ... (Fungsi ini tidak perlu diubah dari versi sebelumnya)
    const monthFilter = document.getElementById('monthFilter');
    const { data, error } = await supabase.rpc('get_distinct_months');
    if (error || !data || data.length === 0) {
        console.error("Gagal mengambil bulan unik:", error);
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
    const monthFilter = document.getElementById('monthFilter');
    if (!monthFilter) return;

    const selectedMonth = monthFilter.value;
    if (!selectedMonth) return;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase.from('pemakaian_cat').select('*').gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal', { ascending: true });
    
    if (error) { console.error("Gagal memuat data:", error); return; }
    
    fullLogData = data || [];
    displayLogPage();
    renderChart(fullLogData); 
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
    // ... (Fungsi ini tidak perlu diubah dari versi sebelumnya)
    const tableBody = document.getElementById('logTableBody');
    if (!tableBody) return;
    const filtered = getFilteredData();
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    let dataToDisplay = showAll ? filtered : filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    let html = '';
    dataToDisplay.forEach(item => {
        const tgl = new Date(item.tanggal + 'T00:00:00');
        const tglFormatted = tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        html += `<tr><td>${tglFormatted}</td><td>${item.shift}</td><td>${item.namaCat}</td><td>${item.qty}</td></tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="4">Tidak ada data yang cocok.</td></tr>';
    const pageInfo = document.getElementById('pageInfo');
    const prevPageButton = document.getElementById('prevPageButton');
    const nextPageButton = document.getElementById('nextPageButton');
    if (pageInfo && prevPageButton && nextPageButton) {
        const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
        pageInfo.textContent = showAll ? `${filtered.length} Item` : `Halaman ${currentPage} dari ${totalPages}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage >= totalPages;
    }
}

function renderChart(data) {
    // ... (Fungsi ini tidak perlu diubah dari versi sebelumnya)
    const usageChart = document.getElementById('usageChart');
    if (!usageChart) return;
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const chartTitle = `Analisis Pemakaian Cat - ${monthText}`;
    document.getElementById('chartTitle').textContent = chartTitle;
    const ctx = usageChart.getContext('2d');
    if (window.myCatChart) window.myCatChart.destroy();
    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Poppins, sans-serif"; ctx.fillStyle = "#888"; ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    const dailyUsage = new Map();
    data.forEach(item => { dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty); });
    const labels = [], dailyData = [];
    const sorted = new Map([...dailyUsage.entries()].sort());
    sorted.forEach((totalQty, dateKey) => {
        const tgl = new Date(dateKey + 'T00:00:00');
        labels.push(tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        dailyData.push(totalQty);
    });
    window.myCatChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [ { label: 'Total (Bar)', data: dailyData, backgroundColor: 'rgba(37, 117, 252, 0.7)', order: 1 }, { label: 'Total (Garis)', data: dailyData, type: 'line', borderColor: '#FFA500', tension: 0.3, order: 0, datalabels: { display: false } } ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v + ' L' : '', color: '#333', font: { weight: 'bold' } }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Liter)' } } }
        },
        plugins: [ChartDataLabels]
    });
}

function exportToCSV() {
    // ... (Fungsi ini tidak perlu diubah dari versi sebelumnya)
    const data = getFilteredData();
    let csv = "Tanggal,Shift,Nama Cat,Qty (Liter)\r\n";
    data.forEach(item => { csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.namaCat}",${item.qty}\r\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.setAttribute("download", `Laporan_Cat_${monthText.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadChartImage() {
    // ... (Fungsi ini tidak perlu diubah dari versi sebelumnya)
    const originalCanvas = document.getElementById('usageChart');
    if (!originalCanvas) return;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = originalCanvas.width; newCanvas.height = originalCanvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(originalCanvas, 0, 0);
    const link = document.createElement('a');
    link.href = newCanvas.toDataURL('image/png');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.download = `Grafik_Pemakaian_Cat_${monthText.replace(/ /g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
