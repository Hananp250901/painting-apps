// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const addDataForm = document.getElementById('addDataForm');
const partSelectEl = document.getElementById('namaPart');
const partNumberInput = document.getElementById('partNumber');
const qtyInput = document.getElementById('qty');
const tanggalInput = document.getElementById('tanggal');
let masterPartData = []; 

const choices = new Choices(partSelectEl, {
    searchEnabled: true,
    itemSelectText: 'Pilih',
    placeholder: true,
    placeholderValue: 'Ketik untuk mencari part...',
});

document.addEventListener('DOMContentLoaded', () => {
    tanggalInput.value = new Date().toISOString().split('T')[0];
    populatePartDropdown();
});

partSelectEl.addEventListener('change', () => {
    const selectedPartName = choices.getValue(true);
    const selectedPart = masterPartData.find(part => part.namaPart === selectedPartName);
    if (selectedPart) {
        partNumberInput.value = selectedPart.part_number || 'N/A';
    } else {
        partNumberInput.value = '';
    }
});

async function populatePartDropdown() {
    try {
        choices.clearStore();
        choices.setChoices([{ value: '', label: 'Memuat...', placeholder: true, disabled: true }]);
        const { data, error } = await supabase.from('master_part_jatuh').select('namaPart, part_number').order('namaPart');
        if (error) throw error;
        masterPartData = data; 
        const choicesData = data.map(item => ({
            value: item.namaPart,
            label: item.namaPart,
        }));
        choices.setChoices(choicesData, 'value', 'label', true);
        choices.setChoiceByValue('');
    } catch (error) { 
        console.error("Error mengambil data master part:", error);
    }
}

addDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newData = {
        tanggal: tanggalInput.value,
        shift: document.getElementById('shift').value,
        part_number: partNumberInput.value,
        namaPart: choices.getValue(true),
        qty: Number(qtyInput.value)
    };

    if (!newData.namaPart) { alert("Silakan pilih nama part."); return; }
    try {
        const { error } = await supabase.from('pemakaian_part_jatuh').insert([newData]);
        if (error) throw error;
        
        const successModal = document.getElementById('successModal');
        successModal.classList.add('show');
        
        // HAPUS addDataForm.reset() DAN GANTI DENGAN INI:
        // Hanya kosongkan isian yang perlu diubah
        choices.clearInput();
        choices.setChoiceByValue('');
        partNumberInput.value = '';
        qtyInput.value = '';
        
        // Fokuskan kembali ke input nama part agar siap untuk input berikutnya
        choices.showDropdown();

        setTimeout(() => successModal.classList.remove('show'), 2000);

    } catch (error) { 
        console.error("Error menambahkan data:", error); 
        alert("Terjadi kesalahan saat menyimpan data.");
    }
});