// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const addDataForm = document.getElementById('addDataForm');
const catSelectEl = document.getElementById('namaCat');
const qtyInput = document.getElementById('qty');
const tanggalInput = document.getElementById('tanggal');
const partNumberInput = document.getElementById('partNumber');

document.addEventListener('DOMContentLoaded', () => {
    tanggalInput.value = new Date().toISOString().split('T')[0];
    populateCatDropdown();
});

async function populateCatDropdown() {
    try {
        const { data, error } = await supabase.from('master_cat').select('nama, part_number').order('nama');
        if (error) throw error;

        catSelectEl.innerHTML = '<option value=""></option>'; // Opsi kosong untuk placeholder
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.nama;
            option.textContent = item.nama;
            option.dataset.partNumber = item.part_number;
            catSelectEl.appendChild(option);
        });

        // Inisialisasi Select2 setelah opsi ditambahkan
        $(document).ready(function() {
            $('#namaCat').select2({
                placeholder: "-- Pilih Nama Cat --",
                allowClear: true
            });
        });

    } catch (error) {
        console.error("Error mengambil data master cat:", error);
    }
}

// Event listener untuk Select2 menggunakan jQuery
$('#namaCat').on('change', function(e) {
    const selectedOption = $(this).find(':selected');
    const partNumber = selectedOption.data('part-number') || '';
    partNumberInput.value = partNumber;
});

addDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newData = {
        tanggal: tanggalInput.value,
        shift: Number(document.getElementById('shift').value),
        namaCat: catSelectEl.value,
        part_number: partNumberInput.value,
        qty: Number(qtyInput.value)
    };

    if (!newData.namaCat) {
        alert("Silakan pilih nama cat.");
        return;
    }
    try {
        const { error } = await supabase.from('pemakaian_cat').insert([newData]);
        if (error) throw error;

        const successModal = document.getElementById('successModal');
        successModal.querySelector('p').textContent = 'Data pemakaian cat telah disimpan.';
        successModal.classList.add('show');

        // Reset form, termasuk Select2
        $('#namaCat').val(null).trigger('change');
        partNumberInput.value = '';
        qtyInput.value = '';

        setTimeout(() => successModal.classList.remove('show'), 2000);

    } catch (error) {
        console.error("Error menambahkan data:", error);
    }
});