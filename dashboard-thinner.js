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

// Variabel untuk menyimpan instance chart
window.myDailyThinnerChart = null;
window.myItemThinnerChart = null;

document.addEventListener('DOMContentLoaded', initializeDashboard);
document.querySelectorAll('input[data-filter]').forEach(input => {
    input.addEventListener('keyup', () => {
        currentPage = 1;
        displayLogPage();
    });
});

async function initializeDashboard() {
    document.getElementById('monthFilter')?.addEventListener('change', loadDashboardData);
    document.getElementById('downloadCsvButton')?.addEventListener('click', exportToCSV);
    document.getElementById('downloadItemChartButton')?.addEventListener('click', () => downloadChartImage('itemThinnerUsageChart', 'Grafik_Item_Thinner'));
    document.getElementById('downloadDailyChartButton')?.addEventListener('click', () => downloadChartImage('dailyThinnerUsageChart', 'Grafik_Harian_Thinner'));
    document.getElementById('prevPageButton')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; displayLogPage(); } });
    document.getElementById('nextPageButton')?.addEventListener('click', () => { if (currentPage < Math.ceil(getFilteredData().length / rowsPerPage)) { currentPage++; displayLogPage(); } });
    document.getElementById('togglePaginationButton')?.addEventListener('click', () => {
        showAll = !showAll;
        document.getElementById('togglePaginationButton').textContent = showAll ? "Tampilkan Halaman" : "Tampilkan Semua";
        currentPage = 1;
        displayLogPage();
    });

    await populateMonthFilter();
    await loadDashboardData();
    await populateThinnerDropdown();
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const { data, error } = await supabase.rpc('get_distinct_months_thinner');
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
        const date = new Date(year, month - 1);
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        monthFilter.appendChild(option);
    });
    
    if (monthFilter.querySelector(`option[value="${currentMonthKey}"]`)) {
        monthFilter.value = currentMonthKey;
    } else if (sortedMonths.length > 0) {
        monthFilter.value = sortedMonths[0];
    }
}

async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter')?.value;
    if (!selectedMonth) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase.from('pemakaian_thinner').select('*').gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal', { ascending: true });
    
    if (error) { console.error("Gagal memuat data thinner:", error); return; }
    
    fullLogData = data || [];
    currentPage = 1;
    displayLogPage();
    
    renderItemThinnerChart(fullLogData);
    renderDailyThinnerChart(fullLogData); // Panggilan ini yang menyebabkan error
}

function renderItemThinnerChart(data) {
    const canvas = document.getElementById('itemThinnerUsageChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    document.getElementById('itemChartTitle').textContent = `Monitoring Pemakaian Thinner per Pail - ${monthText}`;

    if (window.myItemThinnerChart) window.myItemThinnerChart.destroy();
    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.fillText("Tidak ada data", canvas.width/2, canvas.height/2); return;
    }

    const usageByItem = new Map();
    data.forEach(item => {
        usageByItem.set(item.namaThinner, (usageByItem.get(item.namaThinner) || 0) + item.qty);
    });
    
    const sortedData = Array.from(usageByItem.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sortedData.map(item => item[0]);
    const dividedData = sortedData.map(item => parseFloat((item[1] / 20).toFixed(2)));

    window.myItemThinnerChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Total (Pail)', data: dividedData, backgroundColor: 'rgba(37, 117, 252, 0.8)', yAxisID: 'yLiter', order: 1 },
                { label: 'Total (Pail)', data: dividedData, type: 'line', borderColor: '#FFA500', backgroundColor: '#FFA500', yAxisID: 'yPail', order: 0, datalabels: { display: false } }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                datalabels: { anchor: 'end', align: 'top', color: '#333', font: { weight: 'bold' }, formatter: (v) => v.toLocaleString('id-ID') }
            },
            scales: {
                x: { ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 } },
                yLiter: { type: 'linear', position: 'left', beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Liter / 20)' } },
                yPail: { type: 'linear', position: 'right', beginAtZero: true, title: { display: true, text: 'Jumlah Pail (Qty / 20)' }, grid: { drawOnChartArea: false } }
            }
        }
    });
}

// ==========================================================
// INI ADALAH FUNGSI YANG MENYEBABKAN ERROR
// Pastikan namanya function renderDailyThinnerChart
// ==========================================================
function renderDailyThinnerChart(data) {
    const canvas = document.getElementById('dailyThinnerUsageChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    document.getElementById('dailyChartTitle').textContent = `Analisis Pemakaian Thinner Harian - ${monthText}`;

    if (window.myDailyThinnerChart) window.myDailyThinnerChart.destroy();
    
    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.fillText("Tidak ada data", canvas.width/2, canvas.height/2); return;
    }

    const dailyUsage = new Map();
    data.forEach(item => { dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty); });
    
    const sorted = new Map([...dailyUsage.entries()].sort());
    const labels = Array.from(sorted.keys()).map(d => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
    const dailyData = Array.from(sorted.values());

    window.myDailyThinnerChart = new Chart(ctx, {
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
            plugins: { datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v + ' L' : '', color: '#333', font: { weight: 'bold' } } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Liter)' } } }
        }
    });
}

function getFilteredData() {
    const filters = {};
    document.querySelectorAll('input[data-filter]').forEach(input => {
        filters[input.dataset.filter] = input.value.toUpperCase();
    });

    return fullLogData.filter(item => {
        const formattedTanggal = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        return (
            formattedTanggal.includes(filters.tanggal || '') &&
            String(item.shift).toUpperCase().includes(filters.shift || '') &&
            item.namaThinner.toUpperCase().includes(filters.nama || '') &&
            String(item.qty).toUpperCase().includes(filters.qty || '')
        );
    });
}

function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    if (!tableBody) return;
    const filtered = getFilteredData();
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    const dataToDisplay = showAll ? filtered : filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    
    // === PERUBAHAN: Tambahkan tombol Edit dan Delete ===
    tableBody.innerHTML = dataToDisplay.map(item => {
        const tgl = new Date(item.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        return `<tr>
                    <td>${tgl}</td>
                    <td>${item.shift}</td>
                    <td>${item.namaThinner}</td>
                    <td>${item.qty}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="editLog(${item.id})">Edit</button>
                        <button class="action-btn delete-btn" onclick="deleteLog(${item.id}, '${item.namaThinner.replace(/'/g, "\\'")}')">Delete</button>
                    </td>
                </tr>`;
    }).join('') || '<tr><td colspan="5">Tidak ada data yang cocok.</td></tr>'; // Colspan jadi 5
    
    updatePaginationControls(filtered.length);
}

function updatePaginationControls(totalFiltered) {
    const pageInfo = document.getElementById('pageInfo');
    const prev = document.getElementById('prevPageButton');
    const next = document.getElementById('nextPageButton');
    if (!pageInfo || !prev || !next) return;

    if (showAll) {
        pageInfo.textContent = `${totalFiltered} Item Ditampilkan`;
        prev.style.display = 'none'; next.style.display = 'none';
    } else {
        const totalPages = Math.ceil(totalFiltered / rowsPerPage) || 1;
        pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
        prev.disabled = currentPage === 1;
        next.disabled = currentPage >= totalPages;
        prev.style.display = 'inline-block'; next.style.display = 'inline-block';
    }
}

function exportToCSV() {
    const data = getFilteredData();
    let csv = "Tanggal,Shift,Nama Thinner,Qty (Liter)\r\n";
    data.forEach(item => {
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.namaThinner}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    const month = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.download = `Laporan_Thinner_${month.replace(/ /g, "_")}.csv`;
    link.click();
}

function downloadChartImage(canvasId, baseFileName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width; newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.href = newCanvas.toDataURL('image/png');
    const month = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.download = `${baseFileName}_${month.replace(/ /g, "_")}.png`;
    link.click();
}

// ==========================================================
// === TAMBAHAN: SEMUA FUNGSI BARU UNTUK FITUR EDIT/DELETE ===
// ==========================================================

const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const cancelButton = document.getElementById('cancelButton');
const closeButton = document.querySelector('.close-button');

// Fungsi untuk menutup modal
function closeEditModal() {
    modal.classList.add('hidden');
}

// Event listener untuk menutup modal
cancelButton.addEventListener('click', closeEditModal);
closeButton.addEventListener('click', closeEditModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeEditModal();
    }
});

// Fungsi untuk mengisi dropdown dari master_thinner
async function populateThinnerDropdown() {
    const thinnerSelect = document.getElementById('editNamaThinner');
    if (!thinnerSelect) return;
    thinnerSelect.innerHTML = '<option value="">Memuat...</option>';
    
    const { data, error } = await supabase
        .from('master_thinner') // Ambil dari tabel master_thinner
        .select('nama')
        .order('nama', { ascending: true });

    if (error) {
        console.error('Gagal mengambil daftar master thinner:', error);
        thinnerSelect.innerHTML = '<option value="">Gagal memuat</option>';
        return;
    }
    
    thinnerSelect.innerHTML = '<option value="">-- Pilih Nama Thinner --</option>';
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.nama;
        option.textContent = item.nama;
        thinnerSelect.appendChild(option);
    });
}

// Fungsi untuk menampilkan data di pop-up edit
async function editLog(id) {
    const { data, error } = await supabase.from('pemakaian_thinner').select('*').eq('id', id).single();
    if (error) {
        alert('Gagal mengambil data untuk diedit.');
        return;
    }
    if (data) {
        document.getElementById('editId').value = data.id;
        document.getElementById('editTanggal').value = data.tanggal;
        document.getElementById('editShift').value = data.shift;
        document.getElementById('editNamaThinner').value = data.namaThinner;
        document.getElementById('editQty').value = data.qty;
        modal.classList.remove('hidden');
    }
}

// Event listener untuk menyimpan perubahan dari form edit
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idToUpdate = document.getElementById('editId').value;
    const updatedData = {
        tanggal: document.getElementById('editTanggal').value,
        shift: document.getElementById('editShift').value,
        namaThinner: document.getElementById('editNamaThinner').value,
        qty: document.getElementById('editQty').value,
    };

    const { error } = await supabase.from('pemakaian_thinner').update(updatedData).eq('id', idToUpdate);
    if (error) {
        alert(`Gagal memperbarui data: ${error.message}`);
    } else {
        alert('Data berhasil diperbarui!');
        closeEditModal();
        loadDashboardData();
    }
});

// Fungsi untuk menghapus data
async function deleteLog(id, namaThinner) {
    if (confirm(`Anda yakin ingin menghapus data: \n"${namaThinner}"?`)) {
        const { error } = await supabase.from('pemakaian_thinner').delete().match({ id: id });
        if (error) {
            alert(`Gagal menghapus data: ${error.message}`);
        } else {
            alert('Data berhasil dihapus!');
            loadDashboardData();
        }
    }
}