// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Chart.register(ChartDataLabels);

let fullLogData = [];
let currentPage = 1;
const rowsPerPage = 20;
let showAll = false;
let currentChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    
    document.getElementById('monthFilter').addEventListener('change', () => {
        currentPage = 1; loadDashboardData();
    });
    document.getElementById('logSearchInput').addEventListener('keyup', handleSearch);
    document.getElementById('downloadCsvButton').addEventListener('click', exportToCSV);
    document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);
    document.getElementById('prevPageButton').addEventListener('click', () => { if (currentPage > 1) { currentPage--; displayLogPage(); }});
    document.getElementById('nextPageButton').addEventListener('click', () => { if (currentPage < Math.ceil(getFilteredData().length / rowsPerPage)) { currentPage++; displayLogPage(); }});
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
});

async function initializeDashboard() {
    await populateMonthFilter();
    await loadDashboardData();
}

function handleSearch() {
    currentPage = 1;
    displayLogPage();
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    let monthsSet = new Set();

    try {
        const res = await supabase.rpc('get_distinct_months_part');
        if (!res.error && res.data && res.data.length) {
            res.data.forEach(item => {
                const year = Number(item.tahun ?? item.year);
                const month = Number(item.bulan ?? item.month);
                if (!isNaN(year) && !isNaN(month)) monthsSet.add(`${year}-${month}`);
            });
        }
    } catch (err) {
        console.error('RPC exception', err);
    }

    if (monthsSet.size === 0) {
        const { data: sampleDates, error } = await supabase
            .from('pemakaian_part_jatuh')
            .select('tanggal')
            .order('tanggal', { ascending: true })
            .limit(100000);
        if (!error && sampleDates && sampleDates.length) {
            sampleDates.forEach(r => {
                const d = new Date(r.tanggal);
                if (!isNaN(d)) monthsSet.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
            });
        }
    }

    const availableMonths = Array.from(monthsSet);
    availableMonths.sort((a, b) => new Date(b.split('-')[0], b.split('-')[1] - 1) - new Date(a.split('-')[0], a.split('-')[1] - 1));

    monthFilter.innerHTML = '';
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

    availableMonths.forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const d = new Date(year, month - 1);
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        if (monthKey === currentMonthKey) option.selected = true;
        monthFilter.appendChild(option);
    });

    if (!availableMonths.includes(currentMonthKey)) {
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

    let endDateObj = new Date(year, month, 1);
    endDateObj.setDate(endDateObj.getDate() - 1);
    const endDate = endDateObj.toISOString().split('T')[0];

    // ambil data per 1000 rows (looping sampai habis)
    let allData = [];
    let from = 0, to = 999;
    let done = false;

    while (!done) {
        const { data, error } = await supabase
            .from('pemakaian_part_jatuh')
            .select('*')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true })
            .range(from, to);

        if (error) {
            console.error("Gagal load data:", error);
            break;
        }

        if (data.length === 0) {
            done = true;
        } else {
            allData = allData.concat(data);
            if (data.length < 1000) {
                done = true;
            } else {
                from += 1000;
                to += 1000;
            }
        }
    }

    console.log("Total rows loaded:", allData.length);

    fullLogData = allData;

    const totalPages = Math.ceil(fullLogData.length / rowsPerPage) || 1;
    currentPage = totalPages;
    displayLogPage();

    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    document.getElementById('chartTitle').textContent = `Analisis Part Jatuh - ${monthText}`;

    const ctx = document.getElementById('usageChart').getContext('2d');
    if (currentChart) currentChart.destroy();
    if (allData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Poppins"; ctx.fillStyle = "#888"; ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const dailyUsage = new Map();
    allData.forEach(item => {
        const q = Number(item.qty) || 0;
        dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + q);
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
    const searchFilter = document.getElementById('logSearchInput').value.toUpperCase();
    if (!searchFilter) return fullLogData;
    return fullLogData.filter(item => 
        (item.namaPart || '').toString().toUpperCase().includes(searchFilter) ||
        (item.part_number && item.part_number.toString().toUpperCase().includes(searchFilter))
    );
}

function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    const filtered = getFilteredData();
    filtered.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const dataToDisplay = showAll ? filtered : filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    let html = '';
    dataToDisplay.forEach(item => {
        const t = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        html += `<tr><td>${t}</td><td>${item.shift}</td><td>${item.part_number || 'N/A'}</td><td>${item.namaPart}</td><td>${item.qty}</td></tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="5">Tidak ada data yang cocok.</td></tr>';
    document.getElementById('pageInfo').textContent = showAll ? `${filtered.length} Item` : `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('prevPageButton').disabled = currentPage === 1;
    document.getElementById('nextPageButton').disabled = currentPage >= totalPages;
}

function renderChart(labels, data) {
    const ctx = document.getElementById('usageChart').getContext('2d');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Total (Bar)', data, backgroundColor: 'rgba(153, 102, 255, 0.7)', order: 1 },
                { label: 'Total (Garis)', data, type: 'line', borderColor: '#FF9F40', tension: 0.3, order: 0, datalabels: { display: false } }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: `Part Gagal Proses - ${monthText}`, font: { size: 18 } },
                datalabels: {
                    anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : '',
                    color: '#333', font: { weight: 'bold' }
                }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Jumlah (Qty)' } } }
        },
        plugins: [ChartDataLabels]
    });
}

function exportToCSV() {
    const data = getFilteredData();
    let csv = "Tanggal,Shift,Part Number,Nama Part,Qty\r\n";
    data.forEach(item => {
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.part_number || ''}","${item.namaPart}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    link.setAttribute("download", `Laporan_Part_Jatuh_${monthText.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadChartImage() {
    const canvas = document.getElementById('usageChart');
    if (!canvas) return;
    const newCtx = document.createElement('canvas').getContext('2d');
    newCtx.canvas.width = canvas.width;
    newCtx.canvas.height = canvas.height;
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCtx.canvas.width, newCtx.canvas.height);
    newCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const fileName = `Analisis_Part_Jatuh_${monthText.replace(/ /g, "_")}.png`;
    link.href = newCtx.canvas.toDataURL('image/png');
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
