const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', loadMasterData);
document.getElementById('addMasterForm').addEventListener('submit', handleAddMaster);
document.getElementById('masterTableBody').addEventListener('click', handleActionClick);

async function loadMasterData() {
    const tableBody = document.getElementById('masterTableBody');
    tableBody.innerHTML = '<tr><td colspan="2">Memuat data...</td></tr>';
    try {
        const { data, error } = await supabase.from('master_thinner').select('*').order('nama');
        if (error) throw error;
        let html = '';
        data.forEach(item => {
            html += `<tr><td>${item.nama}</td><td><button class="delete-button" data-id="${item.id}" data-name="${item.nama}">Hapus</button></td></tr>`;
        });
        tableBody.innerHTML = html || '<tr><td colspan="2">Belum ada data.</td></tr>';
    } catch (error) {
        console.error("Gagal memuat data:", error.message);
    }
}

async function handleAddMaster(e) {
    e.preventDefault();
    const newNameInput = document.getElementById('newName');
    const newName = newNameInput.value.trim();
    if (!newName) return;
    try {
        const { error } = await supabase.from('master_thinner').insert([{ nama: newName }]);
        if (error) throw error;
        newNameInput.value = '';
        loadMasterData();
    } catch (error) {
        console.error("Gagal menambah data:", error.message);
        alert("Gagal menambah data. Pastikan nama belum ada.");
    }
}

async function handleActionClick(e) {
    if (e.target.classList.contains('delete-button')) {
        const id = e.target.dataset.id;
        const name = e.target.dataset.name;
        if (confirm(`Yakin ingin menghapus "${name}"?`)) {
            try {
                const { error } = await supabase.from('master_thinner').delete().eq('id', id);
                if (error) throw error;
                loadMasterData();
            } catch (error) {
                console.error("Gagal menghapus:", error.message);
            }
        }
    }
}