document.addEventListener('DOMContentLoaded', () => {
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

  // Dropdown menu
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const parentDropdown = toggle.parentElement;
      document.querySelectorAll('.sidebar .dropdown').forEach(other => {
        if (other !== parentDropdown) other.classList.remove('active');
      });
      parentDropdown.classList.toggle('active');
    });
  });
});
