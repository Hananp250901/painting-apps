// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const addDataForm = document.getElementById('addDataForm');
const aeroxSelectEl = document.getElementById('namaAerox');
const tanggalInput = document.getElementById('tanggal');

// Inisialisasi Choices.js untuk membuat dropdown bisa dicari
const choices = new Choices(aeroxSelectEl, {
    searchEnabled: true,
    itemSelectText: 'Pilih',
    placeholder: true,
    placeholderValue: 'Ketik untuk mencari Aerox...',
});

document.addEventListener('DOMContentLoaded', () => {
    tanggalInput.value = new Date().toISOString().split('T')[0];
    populateAeroxDropdown();
});

async function populateAeroxDropdown() {
    try {
        choices.clearStore();
        choices.setChoices([{ value: '', label: 'Memuat...', placeholder: true, disabled: true }]);

        const { data, error } = await supabase.from('master_aerox').select('nama').order('nama');
        if (error) throw error;
        
        const choicesData = data.map(item => ({
            value: item.nama,
            label: item.nama,
        }));
        
        choices.setChoices(choicesData, 'value', 'label', true);
        choices.setChoiceByValue('');

    } catch (error) { 
        console.error("Error mengambil data master aerox:", error);
    }
}

addDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newData = {
        tanggal: tanggalInput.value,
        shift: Text(document.getElementById('shift').value),
        namaAerox: choices.getValue(true), // Ambil nilai dari Choices.js
        consumer: document.getElementById('consumer').value,
    };

    if (!newData.namaAerox || !newData.consumer) {
        alert("Silakan lengkapi semua isian.");
        return;
    }

    try {
        const { error } = await supabase.from('pemakaian_aerox').insert([newData]);
        if (error) throw error;
        
        const successModal = document.getElementById('successModal');
        successModal.classList.add('show');
        
        // Hanya kosongkan isian yang perlu diubah
        choices.clearInput();
        choices.setChoiceByValue('');
        document.getElementById('consumer').value = '';
        
        // Fokuskan kembali ke input nama Aerox
        choices.showDropdown();
        
        setTimeout(() => successModal.classList.remove('show'), 2000);

    } catch (error) { 
        console.error("Error menambahkan data:", error); 
        alert("Terjadi kesalahan saat menyimpan data.");
    }
});