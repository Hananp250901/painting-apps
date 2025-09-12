// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Chart.register(ChartDataLabels);
let fullLogData = [];
let currentPage = 1;
const rowsPerPage = 20;
let showAll = false;



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
    const { data, error } = await supabase.from('pemakaian_aerox').select('*').gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal', { ascending: true });
    if (error) { console.error("Gagal memuat data:", error); return; }
    
    fullLogData = data;
    displayLogPage();
    
    const ctx = document.getElementById('usageChart').getContext('2d');
    if (window.myChart) window.myChart.destroy();
    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Poppins"; ctx.fillStyle = "#888"; ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const dailyUsage = new Map();
    data.forEach(item => {
        dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + (item.qty || 1));
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
    const nameFilter = document.querySelector('input[data-filter="nama"]')?.value.trim();
    const shiftFilter = document.querySelector('input[data-filter="shift"]')?.value.trim();
    const consumerFilter = document.querySelector('input[data-filter="consumer"]')?.value.trim();
    const qtyFilter = document.querySelector('input[data-filter="qty"]')?.value.trim();
    const dateFilter = document.querySelector('input[data-filter="tanggal"]')?.value.trim();

    return fullLogData.filter(item => {
        const formattedTanggal = new Date(item.tanggal).toLocaleDateString('id-ID', { 
            day: '2-digit', month: 'short', year: 'numeric' 
        });

        const matchName = !nameFilter || item.namaAerox.toUpperCase().includes(nameFilter);
        const matchShift = !shiftFilter || String(item.shift) === shiftFilter;
        const matchConsumer = !consumerFilter || item.consumer.toUpperCase().includes(consumerFilter);
        const matchQty = !qtyFilter || String(item.qty) === qtyFilter;
        const matchDate = !dateFilter || formattedTanggal.toLowerCase().includes(dateFilter.toLowerCase());

        return matchName && matchShift && matchConsumer && matchQty && matchDate;
    });
}

function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    const filtered = getFilteredData();
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = 1;
    const dataToDisplay = showAll ? filtered : filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    let html = '';
    dataToDisplay.forEach(item => {
        const t = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        html += `<tr><td>${t}</td><td>${item.shift}</td><td>${item.consumer}</td><td>${item.namaAerox}</td><td>${item.qty}</td></tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="4">Tidak ada data yang cocok.</td></tr>';
    document.getElementById('pageInfo').textContent = showAll ? `${filtered.length} Item` : `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('prevPageButton').disabled = currentPage === 1;
    document.getElementById('nextPageButton').disabled = currentPage >= totalPages;
}

function renderChart(labels, data) {
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const ctx = document.getElementById('usageChart').getContext('2d');
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Total Pemakaian (Bar)', data, backgroundColor: 'rgba(255, 99, 132, 0.7)', order: 1 },
                { label: 'Total Pemakaian (Garis)', data, type: 'line', borderColor: '#FFC107', tension: 0.3, order: 0, datalabels: { display: false } }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: `Analisis Pemakaian Aerox - ${monthText}`, font: { size: 18 } },
                datalabels: {
                    anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : '',
                    color: '#333', font: { weight: 'bold' }
                }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Jumlah Pemakaian' } } }
        },
        plugins: [ChartDataLabels]
    });
}

function exportToCSV() {
    const data = getFilteredData();
    let csv = "Tanggal,Shift,Nama Aerox,Consumer,qty\r\n";
    data.forEach(item => {
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.namaAerox}","${item.consumer}","${item.qty}"\r\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.setAttribute("download", `Laporan_Aerox_${monthText.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function downloadChartImage() {
    const canvas = document.getElementById('usageChart'); // PASTIKAN ID INI SAMA DENGAN DI HTML
    if (!canvas) {
        console.error('Elemen canvas dengan ID "aeroxUsageChart" tidak ditemukan!');
        return;
    }

    // Buat canvas virtual dengan latar belakang putih
    const newCanvas = document.createElement('canvas');
    const newCtx = newCanvas.getContext('2d');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;

    newCtx.fillStyle = '#FFFFFF'; // Latar belakang putih
    newCtx.fillRect(0, 0, newCanvas.width, newCtx.canvas.height);
    newCtx.drawImage(canvas, 0, 0);

    // Trigger download
    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const fileName = `Analisis_Aerox_${monthText.replace(/ /g, "_")}.png`;

    link.href = newCanvas.toDataURL('image/png');
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}