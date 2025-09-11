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
let partNameChoices = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadDashboardData);
document.getElementById('partNameFilter').addEventListener('change', loadDashboardData);
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
    button.textContent = showAll ? "Tampilkan Halaman" : "Tampilkan Semua";
    if (!showAll) { currentPage = 1; }
    displayLogPage();
});

// Fungsi Utama
async function initializeDashboard() {
    await populateMonthFilter();
    await populatePartNameFilter();
    await loadDashboardData();
}

// Ambil daftar bulan unik dari VIEW part_jatuh_bulan
async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const { data, error } = await supabase
        .from('part_jatuh_bulan')
        .select('bulan')
        .order('bulan', { ascending: false });

    if (error || !data || data.length === 0) {
        console.error("Gagal mengambil bulan unik dari Part Jatuh:", error);
        monthFilter.innerHTML = '<option value="">Tidak ada data</option>';
        return;
    }

    monthFilter.innerHTML = '';
    data.forEach(item => {
        const [year, month] = item.bulan.split('-');
        const date = new Date(year, month - 1);
        const option = document.createElement('option');
        option.value = item.bulan;
        option.textContent = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        monthFilter.appendChild(option);
    });

    // auto pilih bulan sekarang kalau ada
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (monthFilter.querySelector(`option[value="${currentMonthKey}"]`)) {
        monthFilter.value = currentMonthKey;
    }
}

// Ambil daftar nama part dari master_part_jatuh
async function populatePartNameFilter() {
    const partNameFilter = document.getElementById('partNameFilter');
    const { data, error } = await supabase
        .from('master_part_jatuh')
        .select('namaPart')
        .order('namaPart', { ascending: true });

    if (error || !data) {
        console.error("Gagal mengambil daftar nama part:", error);
        partNameFilter.innerHTML = '<option value="">Gagal memuat</option>';
        return;
    }

    // isi option dropdown
    partNameFilter.innerHTML = '';
    data.forEach(part => {
        const option = document.createElement('option');
        option.value = part.namaPart;
        option.textContent = part.namaPart;
        partNameFilter.appendChild(option);
    });

    // Hapus Choices lama kalau ada (supaya tidak double inisialisasi)
    if (partNameChoices) {
        partNameChoices.destroy();
    }

    // Aktifkan fitur search pakai Choices.js
    partNameChoices = new Choices(partNameFilter, {
        searchEnabled: true,
        itemSelectText: 'Tekan untuk memilih',
        removeItemButton: false,
        searchResultLimit: 10
    });
}

// Ambil data per bulan & part
async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    const selectedPart = document.getElementById('partNameFilter').value;
    if (!selectedMonth || !selectedPart) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

    // FIX: ambil hari terakhir bulan yg dipilih
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
        .from('pemakaian_part_jatuh')
        .select('*')
        .eq('namaPart', selectedPart)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true });

    if (error) {
        console.error("Gagal memuat data:", error);
        return;
    }
    fullLogData = data;
    currentPage = 1;
    displayLogPage();
    renderChart(data);
}

// Tabel log input
function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    fullLogData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    const dataToDisplay = showAll ? fullLogData : fullLogData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    let html = '';
    dataToDisplay.forEach(item => {
        const t = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        html += `<tr><td>${t}</td><td>${item.shift}</td><td>${item.namaPart}</td><td>${item.part_number || 'N/A'}</td><td>${item.qty}</td></tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="5">Tidak ada data yang cocok.</td></tr>';
    
    const totalPages = Math.ceil(fullLogData.length / rowsPerPage) || 1;
    document.getElementById('pageInfo').textContent = showAll ? `${fullLogData.length} Item` : `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('prevPageButton').disabled = currentPage === 1;
    document.getElementById('nextPageButton').disabled = currentPage >= totalPages;
}

// Chart
function renderChart(data) {
    const ctx = document.getElementById('usageChart').getContext('2d');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const partNameText = document.getElementById('partNameFilter').value;
    const chartTitle = `Part Gagal Proses ${partNameText} - ${monthText}`;
    
    document.getElementById('chartTitle').textContent = chartTitle;

    if (window.myPartChart) window.myPartChart.destroy();
    
    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Poppins, sans-serif";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk item ini di bulan terpilih.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const dailyUsage = new Map();
    data.forEach(item => { dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty); });
    const labels = [], dailyData = [];
    const sorted = new Map([...dailyUsage.entries()].sort());
    sorted.forEach((totalQty, dateKey) => {
        labels.push(new Date(dateKey).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        dailyData.push(totalQty);
    });

    window.myPartChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Total (Bar)', data: dailyData, backgroundColor: 'rgba(153, 102, 255, 0.7)', order: 1 },
                { label: 'Total (Garis)', data: dailyData, type: 'line', borderColor: '#FFA500', tension: 0.3, order: 0, datalabels: { display: false } }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: `Part Gagal Proses ${partNameText} - ${monthText}`, font: { size: 18 } },
                datalabels: {
                    anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v + ' Pcs' : '',
                    color: '#333', font: { weight: 'bold' }
                }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Pcs)' } } }
        },
        plugins: [ChartDataLabels]
    });
}

// Export CSV
function exportToCSV() {
    const data = fullLogData;
    let csv = "Tanggal,Shift,Nama Part,Part Number,Qty\r\n";
    data.forEach(item => {
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.namaPart}","${item.part_number || ''}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const partNameText = document.getElementById('partNameFilter').value.replace(/ /g, "_");
    link.setAttribute("download", `Laporan_Part_Jatuh_${partNameText}_${monthText.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download Chart Image
function downloadChartImage() {
    const canvas = document.getElementById('usageChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const imageURL = canvas.toDataURL('image/png');
    ctx.restore();

    const link = document.createElement('a');
    link.href = imageURL;
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const partNameText = document.getElementById('partNameFilter').value.replace(/ /g, "_");
    link.download = `Grafik_Part_Jatuh_${partNameText}_${monthText.replace(/ /g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
