// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', loadMasterCatData);
document.getElementById('addMasterCatForm').addEventListener('submit', handleAddMasterCat);
document.getElementById('masterCatTableBody').addEventListener('click', handleActionClick);

// --- FUNGSI UNTUK MEMUAT DATA MASTER CAT ---
async function loadMasterCatData() {
    const tableBody = document.getElementById('masterCatTableBody');
    tableBody.innerHTML = '<tr><td colspan="2">Memuat data...</td></tr>';

    try {
        const { data, error } = await supabase
            .from('master_cat')
            .select('*')
            .order('nama', { ascending: true });

        if (error) throw error;

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="2">Belum ada data master cat.</td></tr>';
            return;
        }

        let tableHtml = '';
        data.forEach(cat => {
            tableHtml += `
                <tr>
                    <td>${cat.nama}</td>
                    <td>
                        <button class="delete-button" data-id="${cat.id}" data-name="${cat.nama}">Hapus</button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = tableHtml;

    } catch (error) {
        console.error("Gagal memuat data master cat:", error.message);
        tableBody.innerHTML = '<tr><td colspan="2">Terjadi kesalahan saat memuat data.</td></tr>';
    }
}

// --- FUNGSI UNTUK MENAMBAH MASTER CAT BARU ---
async function handleAddMasterCat(e) {
    e.preventDefault();
    const newCatNameInput = document.getElementById('newCatName');
    const newName = newCatNameInput.value.trim();

    if (!newName) {
        alert("Nama cat tidak boleh kosong.");
        return;
    }

    try {
        const { error } = await supabase
            .from('master_cat')
            .insert([{ nama: newName }]);

        if (error) throw error;

        alert(`Cat "${newName}" berhasil ditambahkan!`);
        newCatNameInput.value = ''; // Kosongkan input
        loadMasterCatData(); // Muat ulang data tabel

    } catch (error) {
        console.error("Gagal menambah cat baru:", error.message);
        alert("Terjadi kesalahan. Pastikan nama cat belum ada.");
    }
}

// --- FUNGSI UNTUK MENANGANI AKSI (HAPUS) ---
async function handleActionClick(e) {
    if (e.target.classList.contains('delete-button')) {
        const catId = e.target.dataset.id;
        const catName = e.target.dataset.name;

        if (confirm(`Apakah Anda yakin ingin menghapus "${catName}"?`)) {
            try {
                const { error } = await supabase
                    .from('master_cat')
                    .delete()
                    .eq('id', catId);

                if (error) throw error;

                alert(`Cat "${catName}" berhasil dihapus.`);
                loadMasterCatData(); // Muat ulang data tabel

            } catch (error) {
                console.error("Gagal menghapus cat:", error.message);
                alert("Terjadi kesalahan saat menghapus.");
            }
        }
    }
}