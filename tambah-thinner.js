// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const addDataForm = document.getElementById('addDataForm');
const thinnerSelect = document.getElementById('namaThinner');
const tanggalInput = document.getElementById('tanggal');

document.addEventListener('DOMContentLoaded', () => {
    tanggalInput.value = new Date().toISOString().split('T')[0];
    populateThinnerDropdown();
});

async function populateThinnerDropdown() {
    try {
        const { data, error } = await supabase.from('master_thinner').select('nama').order('nama');
        if (error) throw error;
        thinnerSelect.innerHTML = '<option value="">-- Pilih Nama Thinner --</option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.nama;
            option.textContent = item.nama;
            thinnerSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error mengambil data master thinner:", error);
    }
}

addDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newData = {
        tanggal: tanggalInput.value,
        shift: Number(document.getElementById('shift').value),
        namaThinner: thinnerSelect.value,
        qty: Number(document.getElementById('qty').value)
    };

    if (!newData.namaThinner) {
        alert("Silakan pilih nama thinner.");
        return;
    }

    try {
        const { error } = await supabase.from('pemakaian_thinner').insert([newData]);
        if (error) throw error;
        
        const successModal = document.getElementById('successModal');
        successModal.classList.add('show');
        thinnerSelect.value = "";
        document.getElementById('qty').value = "";
        setTimeout(() => successModal.classList.remove('show'), 2000);

    } catch (error) {
        console.error("Error menambahkan data:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
    }
});