// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Daftarkan plugin Chart.js
Chart.register(ChartDataLabels);

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadChartData);
document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);

// --- FUNGSI UTAMA ---
async function initializeDashboard() {
    await populateMonthFilter();
    await loadChartData();
}
// --- FUNGSI UNTUK MENGISI DROPDOWN FILTER BULAN ---
async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    // Memanggil fungsi RPC khusus untuk thinner
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

// --- FUNGSI UNTUK MEMUAT, MENGOLAH, DAN MERENDER GRAFIK ---
async function loadChartData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    // 1. Ambil data dari tabel pemakaian_thinner
    const { data, error } = await supabase
        .from('pemakaian_thinner')
        .select('namaThinner, qty') // Ambil kolom namaThinner
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

    if (error) {
        console.error("Gagal memuat data:", error);
        return;
    }

    const ctx = document.getElementById('usageChartByName').getContext('2d');
    if (window.myThinnerChartByName) window.myThinnerChartByName.destroy();
    
    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Poppins"; ctx.fillStyle = "#888"; ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk bulan ini.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    // 2. Agregasi Data: Kelompokkan dan jumlahkan qty per namaThinner
    const usageByName = new Map();
    data.forEach(item => {
        usageByName.set(item.namaThinner, (usageByName.get(item.namaThinner) || 0) + item.qty);
    });

    // 3. Urutkan Data: Dari qty tertinggi ke terendah
    const sortedData = Array.from(usageByName.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // 4. Siapkan data untuk grafik
    const labels = sortedData.map(item => item[0]); // Nama Thinner
    const chartData = sortedData.map(item => item[1]); // Total Qty

    // 5. Render Grafik
    renderSortedChart(labels, chartData);
}

// --- FUNGSI UNTUK MERENDER GRAFIK ---
function renderSortedChart(labels, data) {
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const ctx = document.getElementById('usageChartByName').getContext('2d');
    
    if (window.myThinnerChartByName) window.myThinnerChartByName.destroy();
    
    window.myThinnerChartByName = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Total Pemakaian (Liter) - ${monthText}`,
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.8)', // Sedikit lebih pekat
                borderColor: 'rgba(75, 192, 192, 1)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Sumbu Y untuk nama, Sumbu X untuk nilai
            layout: {
                padding: {
                    left: 50, right: 70 // Beri ruang yang cukup untuk label nama yang panjang
                }
            },
            plugins: {
                title: { display: true, text: `Peringkat Pemakaian Thinner - ${monthText}`, font: { size: 18 } },
                legend: { display: false },
                datalabels: {
                    // --- ATUR ULANG POSISI ANGKA ---
                    anchor: 'end',    // Kaitkan di ujung kanan bar
                    align: 'right',   // Sejajarkan di kanan
                    offset: 8,        // Beri jarak 8px dari ujung bar
                    color: '#333',    // Warna teks gelap agar terbaca
                    font: {
                        weight: '600',
                        size: 12
                    },
                    formatter: (value) => value.toLocaleString('id-ID') + ' L'
                }
            },
            scales: {
                x: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Total Kuantitas (Liter)' } 
                },
                y: {
                    // Hapus semua konfigurasi 'ticks' dari sini agar kembali normal
                }
            }
        }
    });
}

function downloadChartImage() {
    const canvas = document.getElementById('usageChartByName');
    if (!canvas) {
        console.error('Elemen canvas dengan ID "usageChartByName" tidak ditemukan!');
        return;
    }

    // Buat canvas virtual dengan latar belakang putih
    const newCanvas = document.createElement('canvas');
    const newCtx = newCanvas.getContext('2d');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;

    newCtx.fillStyle = '#FFFFFF'; // Latar belakang putih
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);

    // Trigger download
    const link = document.createElement('a');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const fileName = `Analisis_Pemakaian_Thinner_${monthText.replace(/ /g, "_")}.png`;

    link.href = newCanvas.toDataURL('image/png');
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}