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
let partNameChoices = null; // UBAH: dari catNameChoices

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadDashboardData);
document.getElementById('partNameFilter').addEventListener('change', loadDashboardData); // UBAH: ID filter
document.getElementById('downloadCsvButton').addEventListener('click', exportToCSV);
document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);
document.getElementById('prevPageButton').addEventListener('click', () => { if (currentPage > 1) { currentPage--; displayLogPage(); } });
document.getElementById('nextPageButton').addEventListener('click', () => { const totalPages = Math.ceil(fullLogData.length / rowsPerPage); if (currentPage < totalPages) { currentPage++; displayLogPage(); } });
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
    await populatePartNameFilter(); // UBAH: dari populateCatNameFilter
    await loadDashboardData();
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    // UBAH: Mengambil data bulan langsung dari tabel pemakaian_aerox
    const { data, error } = await supabase.from('pemakaian_aerox').select('tanggal');
    if (error || !data || data.length === 0) {
        console.error("Gagal mengambil bulan unik dari Aerox:", error);
        monthFilter.innerHTML = '<option value="">Tidak ada data</option>';
        return;
    }
    const availableMonths = new Set(data.map(item => item.tanggal.substring(0, 7))); // YYYY-MM
    monthFilter.innerHTML = '';
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sortedMonths = Array.from(availableMonths).sort((a, b) => new Date(b) - new Date(a));
    
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

async function populatePartNameFilter() {
    const partNameFilter = document.getElementById('partNameFilter'); // UBAH: ID filter
    // UBAH: Mengambil data dari tabel master_aerox
    const { data, error } = await supabase
        .from('master_aerox')
        .select('nama')
        .order('nama', { ascending: true });

    if (error || !data) {
        console.error("Gagal mengambil daftar nama part aerox:", error);
        partNameFilter.innerHTML = '<option value="">Gagal memuat</option>';
        return;
    }

    partNameFilter.innerHTML = ''; // Kosongkan dulu
    data.forEach(part => {
        const option = document.createElement('option');
        option.value = part.nama;
        option.textContent = part.nama;
        partNameFilter.appendChild(option);
    });
     if (partNameChoices) {
        partNameChoices.destroy();
    }
    partNameChoices = new Choices(partNameFilter, {
        searchEnabled: true,
        itemSelectText: 'Tekan untuk memilih',
        removeItemButton: false,
    });
}

async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    const selectedPart = document.getElementById('partNameFilter').value; // UBAH: ID filter
    if (!selectedMonth || !selectedPart) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // UBAH: Mengambil data dari tabel pemakaian_aerox dan filter berdasarkan namaPart
    const { data, error } = await supabase
        .from('pemakaian_aerox')
        .select('*')
        .eq('namaAerox', selectedPart) // PENTING: Menggunakan 'namaPart'
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

function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    fullLogData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    const dataToDisplay = showAll ? fullLogData : fullLogData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    let html = '';
    dataToDisplay.forEach(item => {
        const t = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        // UBAH: Menggunakan item.namaPart
        html += `<tr><td>${t}</td><td>${item.shift}</td><td>${item.consumer}</td><td>${item.namaAerox}</td><td>${item.qty}</td></tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="4">Tidak ada data yang cocok.</td></tr>';
    
    const totalPages = Math.ceil(fullLogData.length / rowsPerPage) || 1;
    document.getElementById('pageInfo').textContent = showAll ? `${fullLogData.length} Item` : `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('prevPageButton').disabled = currentPage === 1;
    document.getElementById('nextPageButton').disabled = currentPage >= totalPages;
}

function renderChart(data) {
    const ctx = document.getElementById('usageChart').getContext('2d');
    const totalElement = document.getElementById('chartTotal'); // Ambil elemen total
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const partNameText = document.getElementById('partNameFilter').value; 
    const chartTitle = `Analisis Pemakaian ${partNameText} - ${monthText}`;
    
    document.getElementById('chartTitle').textContent = chartTitle;

    if (window.myAeroxChart) window.myAeroxChart.destroy();
    
    if (data.length === 0) {
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
    totalElement.textContent = `Total Pemakaian: ${totalUsage.toLocaleString('id-ID')} Pcs`;
    // --- AKHIR BLOK TAMBAHAN ---

    const dailyUsage = new Map();
    data.forEach(item => { dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty); });
    const labels = [], dailyData = [];
    const sorted = new Map([...dailyUsage.entries()].sort());
    sorted.forEach((totalQty, dateKey) => {
        labels.push(new Date(dateKey).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        dailyData.push(totalQty);
    });

    window.myAeroxChart = new Chart(ctx, { 
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Total (Bar)', data: dailyData, backgroundColor: 'rgba(255, 99, 132, 0.7)', order: 1 },
                { label: 'Total (Garis)', data: dailyData, type: 'line', borderColor: '#FFA500', tension: 0.3, order: 0, datalabels: { display: false } }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            backgroundColor: '#FFFFFF',
            plugins: {
                title: { display: true, text: `Analisis Pemakaian ${partNameText} - ${monthText}`, font: { size: 18 } },
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

function exportToCSV() {
    const data = fullLogData;
    let csv = "Tanggal,Shift,Consumer,Nama Aerox,Qty (Pcs)\r\n"; // UBAH: Header
    data.forEach(item => {
        // UBAH: Menggunakan item.namaPart
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.consumer}"${item.namaAerox}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const partNameText = document.getElementById('partNameFilter').value.replace(/ /g, "_"); // UBAH: ID filter
    link.setAttribute("download", `Laporan_Aerox_${partNameText}_${monthText.replace(/ /g, "_")}.csv`); // UBAH: Nama file
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadChartImage() {
    const canvas = document.getElementById('usageChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Simpan kondisi canvas saat ini
    ctx.save();

    // Atur agar gambar baru diletakkan di BELAKANG konten yang sudah ada
    ctx.globalCompositeOperation = 'destination-over';

    // Set warna isian menjadi putih solid
    ctx.fillStyle = '#FFFFFF';

    // Gambar sebuah persegi panjang putih seukuran canvas
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ambil URL gambar yang sekarang sudah memiliki background putih
    const imageURL = canvas.toDataURL('image/png');

    // Kembalikan kondisi canvas seperti semula agar tidak mempengaruhi tampilan di web
    ctx.restore();

    // Lanjutkan proses download
    const link = document.createElement('a');
    link.href = imageURL;
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const partNameText = document.getElementById('partNameFilter').value.replace(/ /g, "_");
    link.download = `Grafik_Aerox_${partNameText}_${monthText.replace(/ /g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}