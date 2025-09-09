// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const addDataForm = document.getElementById('addDataForm');
const catSelectEl = document.getElementById('namaCat');
const qtyInput = document.getElementById('qty');
const tanggalInput = document.getElementById('tanggal');

// Inisialisasi Searchable Dropdown (Choices.js)
const choices = new Choices(catSelectEl, {
    searchEnabled: true,
    itemSelectText: 'Pilih',
    placeholder: true,
    placeholderValue: 'Ketik untuk mencari cat...',
});

document.addEventListener('DOMContentLoaded', () => {
    tanggalInput.value = new Date().toISOString().split('T')[0];
    populateCatDropdown();
});

async function populateCatDropdown() {
    try {
        choices.clearStore();
        choices.setChoices([{ value: '', label: 'Memuat...', placeholder: true, disabled: true }]);

        // Mengambil dari tabel 'master_cat' dengan kolom 'nama'
        const { data, error } = await supabase.from('master_cat').select('nama').order('nama');
        if (error) throw error;
        
        const choicesData = data.map(item => ({
            value: item.nama,
            label: item.nama,
        }));

        choices.setChoices(choicesData, 'value', 'label', true);
        choices.setChoiceByValue('');

    } catch (error) { 
        console.error("Error mengambil data master cat:", error);
    }
}

addDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newData = {
        tanggal: tanggalInput.value,
        shift: Number(document.getElementById('shift').value),
        // Gunakan nama kolom yang benar: namaCat
        namaCat: choices.getValue(true), 
        qty: Number(qtyInput.value)
    };

    if (!newData.namaCat) { alert("Silakan pilih nama cat."); return; }
    try {
        // Simpan ke tabel 'pemakaian_cat'
        const { error } = await supabase.from('pemakaian_cat').insert([newData]);
        if (error) throw error;
        
        const successModal = document.getElementById('successModal');
        successModal.classList.add('show');
        
        // Hanya kosongkan isian ini
        choices.clearInput();
        choices.setChoiceByValue('');
        qtyInput.value = '';
        
        setTimeout(() => successModal.classList.remove('show'), 2000);

    } catch (error) { 
        console.error("Error menambahkan data:", error); 
    }
});