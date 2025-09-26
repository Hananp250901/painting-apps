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
            let inactivityTimer; // Variabel untuk menyimpan timer
            const timeoutDuration = 30 * 60 * 1000;
            const logoutUser = async () => {
        console.log("Sesi berakhir karena tidak ada aktivitas. Melakukan logout...");
        alert("Anda telah di-logout secara otomatis karena tidak ada aktivitas.");

        if (typeof supabase === 'undefined') {
            console.error('Supabase client is not defined.');
            window.location.href = 'index.html'; // Fallback redirect
            return;
        }

        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Auto-Logout Error:', error.message);
        }
        
        // Arahkan ke halaman login
        window.location.href = 'index.html';
        };
            const resetTimer = () => {
                clearTimeout(inactivityTimer); // Hapus timer yang lama
                inactivityTimer = setTimeout(logoutUser, timeoutDuration); // Buat timer baru
                // console.log("Timer di-reset."); // uncomment untuk debugging
            };
            window.addEventListener('load', resetTimer); // Saat halaman dimuat pertama kali
            window.addEventListener('mousemove', resetTimer); // Saat mouse bergerak
            window.addEventListener('mousedown', resetTimer); // Saat mouse diklik
            window.addEventListener('keypress', resetTimer);  // Saat tombol keyboard ditekan
            window.addEventListener('scroll', resetTimer);    // Saat halaman di-scroll
            window.addEventListener('touchstart', resetTimer);// Untuk perangkat mobile
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