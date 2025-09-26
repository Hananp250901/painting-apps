document.addEventListener('DOMContentLoaded', () => {
    // --- KODE ASLI ANDA UNTUK TOGGLE & DROPDOWN (TIDAK DIUBAH) ---
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const dropdownToggles = document.querySelectorAll('.sidebar .dropdown-toggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');   // mobile
            } else {
                sidebar.classList.toggle('collapsed'); // desktop
            }
        });
    }

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const parentDropdown = toggle.parentElement;
            document.querySelectorAll('.sidebar .dropdown').forEach(other => {
                if (other !== parentDropdown) other.classList.remove('active');
            });
            parentDropdown.classList.toggle('active');
        });
    });

    // --- TAMBAHAN FUNGSI LOGOUT YANG BENAR ---
    const logoutButton = document.querySelector('.logout a');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault(); // Mencegah link pindah halaman sebelum proses selesai
            
            if (typeof supabase === 'undefined') {
                console.error('Supabase client is not loaded. Make sure supabase script is loaded before sidebar.js');
                return;
            }

            // Menghapus sesi login dari Supabase
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('Logout Error:', error.message);
                alert('Gagal untuk logout.');
            } else {
                // Mengarahkan ke halaman login HANYA setelah logout berhasil
                window.location.href = 'index.html';
            }
        });
    }
});