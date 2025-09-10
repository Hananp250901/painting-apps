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
let catNameChoices = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadDashboardData);
document.getElementById('catNameFilter').addEventListener('change', loadDashboardData); // Listener untuk filter nama cat
document.getElementById('downloadCsvButton').addEventListener('click', exportToCSV);
document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);
document.getElementById('prevPageButton').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; displayLogPage(); }
});
document.getElementById('nextPageButton').addEventListener('click', () => {
    const totalPages = Math.ceil(fullLogData.length / rowsPerPage);
    if (currentPage < totalPages) { currentPage++; displayLogPage(); }
});
document.getElementById('togglePaginationButton').addEventListener('click', () => {
    showAll = !showAll;
    const button = document.getElementById('togglePaginationButton');
    if (showAll) {
        button.textContent = "Tampilkan Halaman";
    } else {
        button.textContent = "Tampilkan Semua";
        currentPage = 1;
    }
    displayLogPage();
});


// Fungsi Utama
async function initializeDashboard() {
    await populateMonthFilter();
    await populateCatNameFilter(); // Panggil fungsi untuk mengisi nama cat
    await loadDashboardData();
}

async function populateMonthFilter() {
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

async function populateCatNameFilter() {
    const catNameFilter = document.getElementById('catNameFilter');
    // Ambil data unik namaCat dari tabel master_cat untuk performa lebih baik
    const { data, error } = await supabase
        .from('master_cat') // DIASUMSIKAN Anda punya tabel 'master_cat'
        .select('nama')
        .order('nama', { ascending: true });

    if (error || !data) {
        console.error("Gagal mengambil daftar nama cat:", error);
        catNameFilter.innerHTML = '<option value="">Gagal memuat</option>';
        return;
    }

    catNameFilter.innerHTML = ''; // Kosongkan dulu
    data.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.nama;
        option.textContent = cat.nama;
        catNameFilter.appendChild(option);
    });
     if (catNameChoices) {
        catNameChoices.destroy();
    }
    catNameChoices = new Choices(catNameFilter, {
        searchEnabled: true,
        itemSelectText: 'Tekan untuk memilih',
        removeItemButton: false,
    });
}

async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    const selectedCat = document.getElementById('catNameFilter').value; // Ambil nama cat yang dipilih
    if (!selectedMonth || !selectedCat) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // Modifikasi query untuk memfilter berdasarkan namaCat
    const { data, error } = await supabase
        .from('pemakaian_cat')
        .select('*')
        .eq('namaCat', selectedCat) // Tambahkan filter ini
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true });

    if (error) {
        console.error("Gagal memuat data:", error);
        return;
    }
    fullLogData = data;
    currentPage = 1; // Reset ke halaman pertama setiap kali load data
    displayLogPage();
    renderChart(data);
}

function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    fullLogData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    const dataToDisplay = showAll ? fullLogData : fullLogData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    let html = '';
    dataToDisplay.forEach(item => {
        const t = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        html += `<tr><td>${t}</td><td>${item.shift}</td><td>${item.namaCat}</td><td>${item.qty}</td></tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="4">Tidak ada data yang cocok.</td></tr>';
    
    const totalPages = Math.ceil(fullLogData.length / rowsPerPage) || 1;
    document.getElementById('pageInfo').textContent = showAll ? `${fullLogData.length} Item` : `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('prevPageButton').disabled = currentPage === 1;
    document.getElementById('nextPageButton').disabled = currentPage >= totalPages;
}

function renderChart(data) {
    const ctx = document.getElementById('usageChart').getContext('2d');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const catNameText = document.getElementById('catNameFilter').value;
    const chartTitle = `Analisis Pemakaian ${catNameText} - ${monthText}`;
    
    document.getElementById('chartTitle').textContent = chartTitle;

    if (window.myCatChart) window.myCatChart.destroy();
    
    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Poppins, sans-serif";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk item ini di bulan terpilih.", ctx.canvas.width / 2, ctx.canvas.height / 2);
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

    window.myCatChart = new Chart(ctx, {
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
                title: { display: true, text: `Analisis Pemakaian ${catNameText} - ${monthText}`, font: { size: 18 } }, // Judul utama sudah di atas chart
                datalabels: {
                    anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v + ' L' : '',
                    color: '#333', font: { weight: 'bold' }
                }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Liter)' } } }
        },
        plugins: [ChartDataLabels]
    });
}

function exportToCSV() {
    const data = fullLogData;
    let csv = "Tanggal,Shift,Nama Cat,Qty (Liter)\r\n";
    data.forEach(item => {
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.namaCat}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const catNameText = document.getElementById('catNameFilter').value.replace(/ /g, "_");
    link.setAttribute("download", `Laporan_${catNameText}_${monthText.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadChartImage() {
    const originalCanvas = document.getElementById('usageChart');
    if (!originalCanvas) return;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = originalCanvas.width;
    newCanvas.height = originalCanvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(originalCanvas, 0, 0);

    const link = document.createElement('a');
    link.href = newCanvas.toDataURL('image/png');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const catNameText = document.getElementById('catNameFilter').value.replace(/ /g, "_");
    link.download = `Grafik_${catNameText}_${monthText.replace(/ /g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}