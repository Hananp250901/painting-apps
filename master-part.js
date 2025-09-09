// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


document.addEventListener('DOMContentLoaded', loadMasterData);
document.getElementById('addMasterForm').addEventListener('submit', handleAddMaster);
document.getElementById('masterTableBody').addEventListener('click', handleActionClick);

async function loadMasterData() {
    const tableBody = document.getElementById('masterTableBody');
    tableBody.innerHTML = '<tr><td colspan="3">Memuat data...</td></tr>';
    try {
        const { data, error } = await supabase.from('master_part_jatuh').select('*').order('namaPart');
        if (error) throw error;
        let html = '';
        data.forEach(item => {
            html += `<tr>
                        <td>${item.part_number}</td>
                        <td>${item.namaPart}</td>
                        <td><button class="delete-button" data-id="${item.id}" data-name="${item.namaPart}">Hapus</button></td>
                    </tr>`;
        });
        tableBody.innerHTML = html || '<tr><td colspan="3">Belum ada data.</td></tr>';
    } catch (error) { console.error("Gagal memuat data:", error.message); }
}

async function handleAddMaster(e) {
    e.preventDefault();
    const partNumberInput = document.getElementById('partNumber');
    const namaPartInput = document.getElementById('namaPart');
    
    const newPartNumber = partNumberInput.value.trim();
    const newNamaPart = namaPartInput.value.trim();

    if (!newPartNumber || !newNamaPart) {
        alert("Part Number dan Nama Part tidak boleh kosong.");
        return;
    }

    try {
        const { error } = await supabase.from('master_part_jatuh').insert([{ 
            part_number: newPartNumber, 
            namaPart: newNamaPart 
        }]);
        if (error) throw error;
        
        partNumberInput.value = '';
        namaPartInput.value = '';
        loadMasterData();
    } catch (error) { 
        console.error("Gagal menambah data:", error.message);
        alert("Gagal menambah data. Pastikan Part Number belum ada.");
    }
}

async function handleActionClick(e) {
    if (e.target.classList.contains('delete-button')) {
        const id = e.target.dataset.id;
        const name = e.target.dataset.name;
        if (confirm(`Yakin ingin menghapus "${name}"?`)) {
            try {
                const { error } = await supabase.from('master_part_jatuh').delete().eq('id', id);
                if (error) throw error;
                loadMasterData();
            } catch (error) { console.error("Gagal menghapus:", error.message); }
        }
    }
}