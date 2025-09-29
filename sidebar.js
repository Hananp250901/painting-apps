document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const dropdownToggles = document.querySelectorAll('.sidebar .dropdown-toggle');
  const logoutButton = document.querySelector('.logout a');

  const profileImage = document.getElementById('profileImage');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const avatarInput = document.getElementById('avatarInput');

  // --- TOGGLE SIDEBAR ---
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  // --- DROPDOWN MENU ---
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const parent = toggle.parentElement;
      document.querySelectorAll('.sidebar .dropdown').forEach(other => {
        if (other !== parent) other.classList.remove('active');
      });
      parent.classList.toggle('active');
    });
  });

  // --- FUNGSI UTAMA UNTUK PROFIL ---
  async function loadSidebarProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let avatarUrl = user.user_metadata?.avatar_url || 'https://fbfvhcwisvlyodwvmpqg.supabase.co/storage/v1/object/public/avatars/default.png';
    let fullName = user.user_metadata?.full_name || user.email.split('@')[0];

    profileName.textContent = fullName;
    profileEmail.textContent = user.email;
    profileImage.src = avatarUrl + `?t=${new Date().getTime()}`;
  }

  // --- EVENT LISTENER UNTUK GANTI FOTO ---
  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => { profileImage.src = event.target.result; };
      reader.readAsDataURL(file);

      alert('Mengunggah foto baru...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert('Gagal mendapatkan data user.');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert(`Gagal mengunggah foto: ${uploadError.message}`);
        await loadSidebarProfile();
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) {
        console.error('Update user error:', updateError);
        alert(`Gagal memperbarui profil: ${updateError.message}`);
      } else {
        alert('Foto profil berhasil diperbarui!');
      }
      
      await loadSidebarProfile();
    });
  }

  // --- LOGOUT MANUAL ---
  if (logoutButton) {
    logoutButton.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    });
  }

  // --- BAGIAN BARU: AUTO LOGOUT KARENA TIDAK AKTIF ---
  let inactivityTimer;

  // Fungsi yang akan dijalankan saat waktu habis
  // sidebar.js

const logoutUserAutomatically = async () => {
  alert("Login ulang pak, soale mbok ana hacker nakal wkwk.");
  await supabase.auth.signOut();

  // --- SOLUSI ---
  // Dapatkan path dasar dari URL saat ini
  const basePath = window.location.pathname.split('/')[1]; 
  // Arahkan ke index.html di dalam path dasar tersebut
  window.location.href = `/${basePath}/index.html`; 
};

  // Fungsi untuk mereset timer
  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    // Set timer baru ke 30 menit (dalam milidetik)
    const timeoutDuration = 30 * 60 * 1000; 
    inactivityTimer = setTimeout(logoutUserAutomatically, timeoutDuration);
  };

  // Daftar event yang dianggap sebagai "aktivitas"
  const activityEvents = ['load', 'mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
  
  // Tambahkan listener untuk setiap event aktivitas
  activityEvents.forEach(event => window.addEventListener(event, resetTimer));
  // --------------------------------------------------------
  
  // Panggil fungsi untuk memuat profil saat halaman dibuka
  loadSidebarProfile();
});