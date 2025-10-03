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
window.myDailyChart = null;
window.myItemChartLiter = null; // Diubah
window.myItemChartPail = null;  // Diubah

document.addEventListener('DOMContentLoaded', initializeDashboard);
document.querySelectorAll('input[data-filter]').forEach(input => {
    input.addEventListener('keyup', () => {
        currentPage = 1;
        displayLogPage();
    });
});

async function initializeDashboard() {
    const monthFilter = document.getElementById('monthFilter');
    if (!monthFilter) return;

    monthFilter.addEventListener('change', loadDashboardData);
    document.getElementById('downloadCsvButton')?.addEventListener('click', exportToCSV);
    
    // === PERUBAHAN DI SINI: DOWNLOAD BUTTON UNTUK DUA GRAFIK ===
    document.getElementById('downloadItemChartButtonLiter')?.addEventListener('click', () => downloadChartImage('itemUsageChartLiter', 'Grafik_Liter_Cat'));
    document.getElementById('downloadItemChartButtonPail')?.addEventListener('click', () => downloadChartImage('itemUsageChartPail', 'Grafik_Pail_Cat'));
    document.getElementById('downloadDailyChartButton')?.addEventListener('click', () => downloadChartImage('dailyUsageChart', 'Grafik_Harian_Cat'));
    
    // Pagination listeners
    document.getElementById('prevPageButton')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; displayLogPage(); }
    });
    document.getElementById('nextPageButton')?.addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredData().length / rowsPerPage) || 1;
        if (currentPage < totalPages) { currentPage++; displayLogPage(); }
    });
    document.getElementById('togglePaginationButton')?.addEventListener('click', () => {
        showAll = !showAll;
        document.getElementById('togglePaginationButton').textContent = showAll ? "Tampilkan Halaman" : "Tampilkan Semua";
        currentPage = 1;
        displayLogPage();
    });

    await populateMonthFilter();
    await loadDashboardData();
    await populateCatDropdown();
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const { data, error } = await supabase.rpc('get_distinct_months');
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
    const selectedMonth = document.getElementById('monthFilter').value;
    if (!selectedMonth) return;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
    }
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        
    const { data, error } = await supabase.from('pemakaian_cat').select('*').gte('tanggal', startDate).lt('tanggal', endDate).order('tanggal', { ascending: true });
    
    if (error) { console.error("Gagal memuat data:", error); return; }
    
    fullLogData = data || [];
    currentPage = 1;
    displayLogPage();
    
    // === PERUBAHAN DI SINI: PANGGIL SEMUA FUNGSI RENDER CHART ===
    renderItemUsageChartLiter(fullLogData); // Panggil grafik liter
    renderItemUsageChartPail(fullLogData);  // Panggil grafik pail
    renderDailyUsageChart(fullLogData);
}


// ==========================================================
// FUNGSI BARU UNTUK GRAFIK PER ITEM (VERSI LITER)
// ==========================================================
function renderItemUsageChartLiter(data) {
    const canvas = document.getElementById('itemUsageChartLiter');
    const totalElement = document.getElementById('itemChartTotalLiter'); 
    if (!canvas || !totalElement) return;

    const ctx = canvas.getContext('2d');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    document.getElementById('itemChartTitleLiter').textContent = `Monitoring Pemakaian Cat per Liter - ${monthText}`;

    if (window.myItemChartLiter) {
        window.myItemChartLiter.destroy();
    }

    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.textAlign = 'center';
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        totalElement.textContent = ''; 
        return;
    }

    const usageByItem = new Map();
    data.forEach(item => {
        usageByItem.set(item.namaCat, (usageByItem.get(item.namaCat) || 0) + item.qty);
    });
    
    const sortedData = Array.from(usageByItem.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sortedData.map(item => item[0]);
    const literData = sortedData.map(item => item[1]);

    const totalUsage = literData.reduce((sum, value) => sum + value, 0);
    totalElement.textContent = `Total Pemakaian: ${totalUsage.toLocaleString('id-ID')} Liter`;
    
    window.myItemChartLiter = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total (Liter)',
                data: literData,
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    display: (context) => context.dataset.data[context.dataIndex] > 0,
                    anchor: 'end',
                    align: 'top',
                    color: '#333',
                    font: { weight: 'bold' },
                    formatter: (value) => value.toLocaleString('id-ID'),
                }
            },
            scales: {
                x: {
                    ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Total Kuantitas (Liter)' }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// ==========================================================
// FUNGSI BARU UNTUK GRAFIK PER ITEM (VERSI PAIL)
// ==========================================================
function renderItemUsageChartPail(data) {
    const canvas = document.getElementById('itemUsageChartPail');
    const totalElement = document.getElementById('itemChartTotalPail'); 
    if (!canvas || !totalElement) return;

    const ctx = canvas.getContext('2d');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    document.getElementById('itemChartTitlePail').textContent = `Monitoring Pemakaian Cat per Pail - ${monthText}`;

    if (window.myItemChartPail) {
        window.myItemChartPail.destroy();
    }

    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.textAlign = 'center';
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        totalElement.textContent = ''; 
        return;
    }

    const usageByItem = new Map();
    data.forEach(item => {
        usageByItem.set(item.namaCat, (usageByItem.get(item.namaCat) || 0) + item.qty);
    });
    
    const sortedData = Array.from(usageByItem.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sortedData.map(item => item[0]);
    const originalLiterData = sortedData.map(item => item[1]);

    const totalUsageLiter = originalLiterData.reduce((sum, value) => sum + value, 0);
    const totalPails = (totalUsageLiter / 20).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalElement.textContent = `Total Pemakaian: ${totalUsageLiter.toLocaleString('id-ID')} Liter (${totalPails} Pail)`;
    
    const pailData = originalLiterData.map(total => parseFloat((total / 20).toFixed(2)));

    window.myItemChartPail = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total (Pail)',
                    data: pailData,
                    backgroundColor: 'rgba(37, 117, 252, 0.8)',
                    order: 1
                },
                {
                    label: 'Tren (Pail)',
                    data: pailData,
                    type: 'line',
                    borderColor: '#FFA500',
                    backgroundColor: '#FFA500',
                    tension: 0.1,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    display: (context) => context.dataset.order === 1 && context.dataset.data[context.dataIndex] > 0,
                    anchor: 'end',
                    align: 'top',
                    color: '#333',
                    font: { weight: 'bold' },
                    formatter: (value) => value.toLocaleString('id-ID'),
                }
            },
            scales: {
                x: {
                    ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Jumlah Pail (Kuantitas / 20)' }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


function renderDailyUsageChart(data) {
    const canvas = document.getElementById('dailyUsageChart');
    const totalElement = document.getElementById('dailyChartTotal');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    document.getElementById('dailyChartTitle').textContent = `Analisis Pemakaian Cat Harian per Shift - ${monthText}`;

    if (window.myDailyChart) {
        window.myDailyChart.destroy();
    }
    
    const totalUsage = data.reduce((sum, item) => sum + item.qty, 0);
    const totalPails = (totalUsage / 20).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalElement.textContent = `Total Pemakaian Bulan Ini: ${totalUsage.toLocaleString('id-ID')} Liter (${totalPails} Pail)`;

    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.textAlign = 'center';
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const usageByDate = new Map();
    data.forEach(item => {
        if (!usageByDate.has(item.tanggal)) {
            usageByDate.set(item.tanggal, { '1': 0, '2': 0, '3': 0 });
        }
        const dailyRecord = usageByDate.get(item.tanggal);
        dailyRecord[item.shift] = (dailyRecord[item.shift] || 0) + item.qty;
    });

    const sortedDates = Array.from(usageByDate.keys()).sort();
    
    const labels = sortedDates.map(dateKey => {
        const tgl = new Date(dateKey + 'T00:00:00');
        return tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });

    const shift1Data = sortedDates.map(date => usageByDate.get(date)['1'] || 0);
    const shift2Data = sortedDates.map(date => usageByDate.get(date)['2'] || 0);
    const shift3Data = sortedDates.map(date => usageByDate.get(date)['3'] || 0);

    const totalData = sortedDates.map(date => 
        (usageByDate.get(date)['1'] || 0) +
        (usageByDate.get(date)['2'] || 0) +
        (usageByDate.get(date)['3'] || 0)
    );

    window.myDailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Shift 1',
                    data: shift1Data,
                    backgroundColor: '#d9534f',
                },
                {
                    label: 'Shift 2',
                    data: shift2Data,
                    backgroundColor: '#337ab7',
                },
                {
                    label: 'Shift 3',
                    data: shift3Data,
                    backgroundColor: '#5cb85c',
                },
                {
                    type: 'line',
                    label: 'Total Harian',
                    data: totalData,
                    borderColor: '#f0ad4e',
                    backgroundColor: 'rgba(240, 173, 78, 0.2)',
                    tension: 0.1,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#f0ad4e',
                    order: -1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    display: true,
                    formatter: (value) => value > 0 ? value.toLocaleString('id-ID') : null,
                    anchor: (context) => context.dataset.type === 'line' ? 'end' : 'center',
                    align: (context) => context.dataset.type === 'line' ? 'top' : 'center',
                    color: (context) => context.dataset.type === 'line' ? '#333' : '#ffffff',
                    offset: (context) => context.dataset.type === 'line' ? -10 : 0, 
                    font: {
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Kuantitas (Liter)'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}
function getFilteredData() {
    const filters = {};
    document.querySelectorAll('input[data-filter]').forEach(input => {
        filters[input.dataset.filter] = input.value.toUpperCase();
    });

    return fullLogData.filter(item => {
        const formattedTanggal = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        const partNumber = (item.part_number || '').toUpperCase(); 

        return (
            formattedTanggal.includes(filters.tanggal || '') &&
            String(item.shift).toUpperCase().includes(filters.shift || '') &&
            item.namaCat.toUpperCase().includes(filters.nama || '') &&
            partNumber.includes(filters.part_number || '') && 
            String(item.qty).toUpperCase().includes(filters.qty || '')
        );
    });
}

function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    if (!tableBody) return;
    const filtered = getFilteredData();
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    
    let dataToDisplay = showAll ? filtered : filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    tableBody.innerHTML = dataToDisplay.map(item => {
        const tgl = new Date(item.tanggal + 'T00:00:00');
        const tglFormatted = tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        return `<tr>
                    <td>${tglFormatted}</td>
                    <td>${item.shift}</td>
                    <td>${item.part_number || '-'}</td>
                    <td>${item.namaCat}</td>
                    <td>${item.qty}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="editLog(${item.id})">Edit</button>
                        <button class="action-btn delete-btn" onclick="deleteLog(${item.id}, '${item.namaCat.replace(/'/g, "\\'")}')">Delete</button>
                    </td>
                </tr>`;
    }).join('') || '<tr><td colspan="6">Tidak ada data yang cocok.</td></tr>';
    
    updatePaginationControls(filtered.length);
}

function updatePaginationControls(totalFiltered) {
    const pageInfo = document.getElementById('pageInfo');
    const prevPageButton = document.getElementById('prevPageButton');
    const nextPageButton = document.getElementById('nextPageButton');
    if (!pageInfo || !prevPageButton || !nextPageButton) return;

    if (showAll) {
        pageInfo.textContent = `${totalFiltered} Item Ditampilkan`;
        prevPageButton.style.display = 'none';
        nextPageButton.style.display = 'none';
    } else {
        const totalPages = Math.ceil(totalFiltered / rowsPerPage) || 1;
        pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage >= totalPages;
        prevPageButton.style.display = 'inline-block';
        nextPageButton.style.display = 'inline-block';
    }
}

function exportToCSV() {
    const data = getFilteredData();
    let csv = "Tanggal,Shift,Part Number,Nama Cat,Qty (Liter)\r\n";
    
    data.forEach(item => {
        const partNumber = item.part_number || '-';
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${partNumber}","${item.namaCat}",${item.qty}\r\n`;
    });

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.setAttribute("download", `Laporan_Cat_${monthText.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function downloadChartImage(canvasId, baseFileName) {
    const originalCanvas = document.getElementById(canvasId);
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
    link.download = `${baseFileName}_${monthText.replace(/ /g, "_")}.png`;
    link.click();
}


async function populateCatDropdown() {
    const catSelect = document.getElementById('editNamaCat');
    if (!catSelect) return;
    catSelect.innerHTML = '<option value="">Memuat...</option>';

    const { data, error } = await supabase
        .from('master_cat')
        .select('nama, part_number')
        .order('nama', { ascending: true });

    if (error) {
        console.error('Gagal mengambil daftar master cat:', error);
        catSelect.innerHTML = '<option value="">Gagal memuat data</option>';
        return;
    }
    
    catSelect.innerHTML = '<option value="">-- Pilih Nama Cat --</option>';
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.nama;
        option.textContent = item.nama;
        option.dataset.partNumber = item.part_number;
        catSelect.appendChild(option);
    });
}


const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const cancelButton = document.getElementById('cancelButton');
const closeButton = document.querySelector('.close-button');

function closeEditModal() {
    modal.classList.add('hidden');
}

cancelButton.addEventListener('click', closeEditModal);
closeButton.addEventListener('click', closeEditModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeEditModal();
    }
});

async function editLog(id) {
    const { data, error } = await supabase
        .from('pemakaian_cat')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Gagal mengambil data untuk diedit:', error);
        alert('Gagal mengambil data.');
        return;
    }

    if (data) {
        document.getElementById('editId').value = data.id;
        document.getElementById('editTanggal').value = data.tanggal;
        document.getElementById('editShift').value = data.shift;
        document.getElementById('editNamaCat').value = data.namaCat;
        document.getElementById('editPartNumber').value = data.part_number || '';
        document.getElementById('editQty').value = data.qty;
        modal.classList.remove('hidden');
    }
}


editForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const idToUpdate = document.getElementById('editId').value;
    const updatedData = {
        tanggal: document.getElementById('editTanggal').value,
        shift: document.getElementById('editShift').value,
        namaCat: document.getElementById('editNamaCat').value,
        qty: document.getElementById('editQty').value,
    };

    const { error } = await supabase
        .from('pemakaian_cat')
        .update(updatedData)
        .eq('id', idToUpdate);

    if (error) {
        console.error('Gagal memperbarui data:', error);
        alert(`Gagal memperbarui data: ${error.message}`);
    } else {
        alert('Data berhasil diperbarui!');
        closeEditModal();
        loadDashboardData(); 
    }
});

async function deleteLog(id, namaCat) {
    const confirmation = confirm(`Anda yakin ingin menghapus data pemakaian: \n"${namaCat}"?`);

    if (confirmation) {
        const { error } = await supabase
            .from('pemakaian_cat')
            .delete()
            .match({ id: id });

        if (error) {
            console.error('Gagal menghapus data:', error);
            alert(`Gagal menghapus data: ${error.message}`);
        } else {
            alert('Data berhasil dihapus!');
            loadDashboardData();
        }
    }
}
document.getElementById('editNamaCat').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const partNumber = selectedOption.dataset.partNumber || '';
    document.getElementById('editPartNumber').value = partNumber;
});