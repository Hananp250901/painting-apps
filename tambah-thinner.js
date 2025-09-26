// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const addDataForm = document.getElementById('addDataForm');
const thinnerSelect = document.getElementById('namaThinner');
const tanggalInput = document.getElementById('tanggal');
const partNumberInput = document.getElementById('partNumber');

document.addEventListener('DOMContentLoaded', () => {
    tanggalInput.value = new Date().toISOString().split('T')[0];
    populateThinnerDropdown();
});

async function populateThinnerDropdown() {
    try {
        // Mengambil kolom 'nama' dan 'part_number' dari Supabase
        const { data, error } = await supabase
            .from('master_thinner')
            .select('nama, part_number')
            .order('nama');
        if (error) throw error;

        thinnerSelect.innerHTML = '<option value="">-- Pilih Nama Thinner --</option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.nama;
            option.textContent = item.nama;
            // Menyimpan part_number di data attribute
            option.dataset.partNumber = item.part_number;
            thinnerSelect.appendChild(option);
        });

        // Aktifkan Select2 setelah option sudah ada
        $(document).ready(function () {
            $('#namaThinner').select2({
                placeholder: "-- Pilih Nama Thinner --",
                allowClear: true,
                width: 'resolve'
            });
        });

    } catch (error) {
        console.error("Error mengambil data master thinner:", error);
    }
}

// Listener untuk mengisi part number secara otomatis
$('#namaThinner').on('change', function() {
    // Dapatkan part number dari 'data-part-number' pada option yang dipilih
    const selectedPartNumber = $(this).find(':selected').data('part-number');
    partNumberInput.value = selectedPartNumber || ''; // Isi input atau kosongkan jika tidak ada
});

// Listener untuk submit form
addDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newData = {
        tanggal: tanggalInput.value,
        shift: Number(document.getElementById('shift').value),
        namaThinner: thinnerSelect.value,
        part_number: partNumberInput.value,
        qty: Number(document.getElementById('qty').value)
    };

    if (!newData.namaThinner) {
        alert("Silakan pilih nama thinner.");
        return;
    }
    if (!newData.part_number) {
        alert("Part number tidak ditemukan untuk thinner yang dipilih. Coba muat ulang halaman.");
        return;
    }

    try {
        const { error } = await supabase.from('pemakaian_thinner').insert([newData]);
        if (error) throw error;
        
        const successModal = document.getElementById('successModal');
        successModal.classList.add('show');

        // Reset form
        $('#namaThinner').val(null).trigger('change');
        partNumberInput.value = "";
        document.getElementById('qty').value = "";
        
        setTimeout(() => successModal.classList.remove('show'), 2000);

    } catch (error) {
        console.error("Error menambahkan data:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
    }
});