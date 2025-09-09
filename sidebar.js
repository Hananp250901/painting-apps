document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const dropdownToggles = document.querySelectorAll('.sidebar .dropdown-toggle');

    // Logika untuk tombol menu hamburger (Responsive)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Logika untuk menu dropdown
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const parentDropdown = toggle.parentElement;
            
            // Tutup semua dropdown lain
            document.querySelectorAll('.sidebar .dropdown').forEach(otherDropdown => {
                if (otherDropdown !== parentDropdown) {
                    otherDropdown.classList.remove('active');
                }
            });
            
            // Buka atau tutup dropdown yang diklik
            parentDropdown.classList.toggle('active');
        });
    });
});