// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
Chart.register(ChartDataLabels);

let chartSunarno = null;
let chartWahyuDedi = null;
let chartNurAhmad = null;

// --- BARU: Objek untuk menyimpan warna spesifik per leader ---
const leaderColors = {
    'SUNARNO': {
        background: 'rgba(255, 99, 132, 0.8)', // Merah
        border: 'rgba(255, 99, 132, 1)'
    },
    'WAHYU DEDI': {
        background: 'rgba(54, 162, 235, 0.8)', // Biru
        border: 'rgba(54, 162, 235, 1)'
    },
    'NUR AHMAD': {
        background: 'rgba(75, 192, 192, 0.8)', // Hijau
        border: 'rgba(75, 192, 192, 1)'
    },
    'default': {
        background: 'rgba(153, 102, 255, 0.8)', // Ungu (default)
        border: 'rgba(153, 102, 255, 1)'
    }
};


// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadAllChartData);

document.getElementById('downloadSunarno').addEventListener('click', () => downloadLeaderChart('chartSunarno', 'SUNARNO'));
document.getElementById('downloadWahyuDedi').addEventListener('click', () => downloadLeaderChart('chartWahyuDedi', 'WAHYU_DEDI'));
document.getElementById('downloadNurAhmad').addEventListener('click', () => downloadLeaderChart('chartNurAhmad', 'NUR_AHMAD'));

// --- FUNGSI UTAMA ---
async function initializeDashboard() {
    await populateMonthFilter();
    await loadAllChartData();
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const { data, error } = await supabase.rpc('get_distinct_months_part'); 
    
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

async function loadAllChartData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    // --- PERBAIKAN: Menambahkan loop untuk mengambil semua data ---
    let allData = [];
    let from = 0, to = 999;
    let done = false;
    while (!done) {
        const { data, error } = await supabase
            .from('pemakaian_part_jatuh')
            .select('*') // Mengambil semua kolom
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true })
            .range(from, to);

        if (error) { console.error("Gagal memuat data:", error); break; }
        if (data.length > 0) { allData = allData.concat(data); }
        if (data.length < 1000) { done = true; } 
        else { from += 1000; to += 1000; }
    }
    // --- AKHIR PERBAIKAN ---
    
    if (chartSunarno) chartSunarno.destroy();
    if (chartWahyuDedi) chartWahyuDedi.destroy();
    if (chartNurAhmad) chartNurAhmad.destroy();

    // Menambahkan ID elemen total saat memanggil fungsi
    processAndRenderLeaderData(allData, 'SUNARNO', 'chartSunarno', 'titleSunarno', 'totalSunarno', monthText);
    processAndRenderLeaderData(allData, 'WAHYU DEDI', 'chartWahyuDedi', 'titleWahyuDedi', 'totalWahyuDedi', monthText);
    processAndRenderLeaderData(allData, 'NUR AHMAD', 'chartNurAhmad', 'titleNurAhmad', 'totalNurAhmad', monthText);
}

function processAndRenderLeaderData(sourceData, leaderName, canvasId, titleId, totalId, monthText) {
    document.getElementById(titleId).textContent = `Peringkat Top 10 Gagal Proses - ${leaderName} - ${monthText}`;
    const totalElement = document.getElementById(totalId); // Ambil elemen total
    
    const leaderData = sourceData.filter(item => item.shift === leaderName);
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // --- BLOK TAMBAHAN UNTUK MENGHITUNG DAN MENAMPILKAN TOTAL ---
    if (!leaderData || leaderData.length === 0) {
        totalElement.textContent = `Total: 0 Pcs`;
    } else {
        const totalForLeader = leaderData.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
        totalElement.textContent = `Total Gagal Proses: ${totalForLeader.toLocaleString('id-ID')} Pcs`;
    }
    // --- AKHIR BLOK TAMBAHAN ---

    if (leaderData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.textAlign = 'center';
        ctx.fillText(`Tidak ada data untuk ${leaderName} bulan ini.`, ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const usageByPart = new Map();
    leaderData.forEach(item => {
        usageByPart.set(item.namaPart, (usageByPart.get(item.namaPart) || 0) + item.qty);
    });

    const sortedPartData = Array.from(usageByPart.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sortedPartData.map(item => item[0]);
    const chartData = sortedPartData.map(item => item[1]);

    renderLeaderChart(canvasId, labels, chartData, leaderName, monthText);
}
function renderLeaderChart(canvasId, labels, data, leaderName, monthText) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // --- PERUBAHAN: Mengambil warna dari objek leaderColors ---
    const chartColor = leaderColors[leaderName] || leaderColors['default'];

    const newChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Total Qty`,
                data: data,
                backgroundColor: chartColor.background, // Menggunakan warna yang sudah ditentukan
                borderColor: chartColor.border,       // Menggunakan warna yang sudah ditentukan
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            layout: { padding: { left: 40, right: 40 } },
            plugins: {
                title: { display: false },
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    offset: 8,
                    color: '#333',
                    font: { weight: '600' },
                    formatter: (value) => value.toLocaleString('id-ID')
                }
            },
            scales: {
                x: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Jumlah (Qty)' } 
                }
            }
        }
    });

    if (canvasId === 'chartSunarno') chartSunarno = newChart;
    if (canvasId === 'chartWahyuDedi') chartWahyuDedi = newChart;
    if (canvasId === 'chartNurAhmad') chartNurAhmad = newChart;
}

function downloadLeaderChart(canvasId, leaderName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { return; }
    
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    link.download = `Ranking_Part_Gagal_${leaderName}_${monthText.replace(/ /g, "_")}.png`;
    link.href = newCanvas.toDataURL('image/png');
    link.click();
}