// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel Global
let fullLogData = [];
let currentPage = 1;
const rowsPerPage = 20;
let showAll = false;
let thinnerNameChoices = null;
Chart.register(ChartDataLabels);

document.addEventListener('DOMContentLoaded', initializeDashboard);

async function initializeDashboard() {
    const monthFilter = document.getElementById('monthFilter');
    if (!monthFilter) return;

    // Event listeners
    monthFilter.addEventListener('change', loadDashboardData);
    document.getElementById('thinnerNameFilter')?.addEventListener('change', loadDashboardData);
    document.getElementById('filterTanggal')?.addEventListener('input', displayLogPage);
    document.getElementById('filterShift')?.addEventListener('input', displayLogPage);
    document.getElementById('filterNama')?.addEventListener('input', displayLogPage);
    document.getElementById('filterQty')?.addEventListener('input', displayLogPage);
    document.getElementById('downloadCsvButton')?.addEventListener('click', exportToCSV);
    document.getElementById('downloadChartButton')?.addEventListener('click', downloadChartImage);
    document.getElementById('prevPageButton')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; displayLogPage(); } });
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
    await populateThinnerNameFilter();
    await loadDashboardData();
}

async function populateThinnerNameFilter() {
    const thinnerNameFilter = document.getElementById('thinnerNameFilter');
    if (!thinnerNameFilter) return;

    // Mengambil dari tabel master_thinner
    const { data, error } = await supabase.from('master_thinner').select('nama').order('nama', { ascending: true });
    
    if (error || !data) {
        thinnerNameFilter.innerHTML = '<option value="">Gagal memuat</option>'; return;
    }
    thinnerNameFilter.innerHTML = '<option value="">Pilih Thinner...</option>';
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.nama;
        option.textContent = item.nama;
        thinnerNameFilter.appendChild(option);
    });
    if (thinnerNameChoices) thinnerNameChoices.destroy();
    thinnerNameChoices = new Choices(thinnerNameFilter, { searchEnabled: true, itemSelectText: 'Pilih', removeItemButton: false });
}

async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter')?.value;
    const selectedThinner = document.getElementById('thinnerNameFilter')?.value;

    if (!selectedMonth || !selectedThinner) {
        fullLogData = []; displayLogPage(); renderChart([]); return;
    }

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    // Mengambil dari tabel pemakaian_thinner
    const { data, error } = await supabase.from('pemakaian_thinner').select('*').eq('namaThinner', selectedThinner).gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal', { ascending: true });
    
    if (error) { console.error("Gagal memuat data:", error); return; }

    fullLogData = data || [];
    currentPage = 1;
    displayLogPage();
    renderChart(fullLogData);
}

function getFilteredData() {
    let filteredData = [...fullLogData];
    const filterTanggal = document.getElementById('filterTanggal')?.value;
    const filterShift = document.getElementById('filterShift')?.value;
    const filterNama = document.getElementById('filterNama')?.value.toUpperCase();
    const filterQty = document.getElementById('filterQty')?.value;

    return filteredData.filter(item => {
        const tanggalMatch = !filterTanggal || item.tanggal === filterTanggal;
        const shiftMatch = !filterShift || String(item.shift).includes(filterShift);
        const namaMatch = !filterNama || item.namaThinner.toUpperCase().includes(filterNama);
        const qtyMatch = !filterQty || String(item.qty).includes(filterQty);
        return tanggalMatch && shiftMatch && namaMatch && qtyMatch;
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
        const tgl = new Date(item.tanggal + 'T00:00:00');
        const tglFormatted = tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        html += `<tr><td>${tglFormatted}</td><td>${item.shift}</td><td>${item.namaThinner}</td><td>${item.qty}</td></tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="4">Tidak ada data yang cocok dengan filter.</td></tr>';
    
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

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    if(!monthFilter) return;
    const { data, error } = await supabase.rpc('get_distinct_months_thinner'); // Gunakan RPC spesifik jika ada, atau yg umum
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

function renderChart(data) {
    const usageChart = document.getElementById('usageChart');
    const totalElement = document.getElementById('chartTotal'); // Ambil elemen total
    if (!usageChart) return;

    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const thinnerNameText = document.getElementById('thinnerNameFilter').value;
    const chartTitleText = `Analisis Pemakaian ${thinnerNameText} - ${monthText}`;
    
    const chartTitleElement = document.getElementById('chartTitle');
    if (chartTitleElement) {
        chartTitleElement.textContent = chartTitleText;
    }
    
    const ctx = usageChart.getContext('2d');
    if (window.myThinnerChart) window.myThinnerChart.destroy();
    
    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Poppins, sans-serif";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk item ini di bulan terpilih.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        totalElement.textContent = ''; // Kosongkan total
        return;
    }

    // --- BLOK TAMBAHAN UNTUK MENGHITUNG DAN MENAMPILKAN TOTAL ---
    const totalUsage = data.reduce((sum, item) => sum + item.qty, 0);
    const totalPails = (totalUsage / 20).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalElement.textContent = `Total Pemakaian: ${totalUsage.toLocaleString('id-ID')} Liter (${totalPails} Pail)`;
    // --- AKHIR BLOK TAMBAHAN ---

    const dailyUsage = new Map();
    data.forEach(item => { dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty); });
    const labels = [], dailyData = [];
    const sorted = new Map([...dailyUsage.entries()].sort());
    sorted.forEach((totalQty, dateKey) => {
        const tgl = new Date(dateKey + 'T00:00:00');
        labels.push(tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        dailyData.push(totalQty);
    });

    window.myThinnerChart = new Chart(ctx, {
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
                title: { display: true, text: chartTitleText, font: { size: 18 }, padding: { top: 10, bottom: 20 } },
                datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v + ' L' : '', color: '#333', font: { weight: 'bold' } }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Liter)' } } }
        },
        plugins: [ChartDataLabels]
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
    const thinnerNameText = document.getElementById('thinnerNameFilter').value.replace(/ /g, "_");
    link.setAttribute("download", `Laporan_${thinnerNameText}_${monthText.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadChartImage() {
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
    const thinnerNameText = document.getElementById('thinnerNameFilter').value.replace(/ /g, "_");
    link.download = `Grafik_${thinnerNameText}_${monthText.replace(/ /g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}