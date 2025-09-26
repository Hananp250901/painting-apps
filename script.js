// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const successModal = document.getElementById('successModal');

// --- Cek Sesi Pengguna ---
// Jika pengguna sudah login, langsung arahkan ke dashboard
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        window.location.href = 'dashboard-cat.html';
    }
});

// --- Event Listener untuk Form Login ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah form refresh halaman
    
    // Hapus pesan error sebelumnya
    errorMessage.textContent = '';

    const email = emailInput.value;
    const password = passwordInput.value;

    // Proses login dengan Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        // Jika login gagal, tampilkan pesan error
        errorMessage.textContent = 'Login gagal: ' + error.message;
    } else {
        // Jika login berhasil
        console.log('Login berhasil:', data);
        
        // Tampilkan modal sukses
        successModal.classList.add('show');

        // Arahkan ke halaman dashboard setelah 2 detik
        setTimeout(() => {
            window.location.href = 'dashboard-cat.html';
        }, 2000);
    }
});