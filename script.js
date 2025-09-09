// GANTI DENGAN KUNCI API SUPABASE ANDA
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ambil elemen dari HTML
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const errorMessage = document.getElementById('error-message');
const successModal = document.getElementById('successModal');

// Tambahkan event listener ke form
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah form refresh halaman
    loginButton.classList.add('rainbow-active');
    errorMessage.textContent = '';

    const email = emailInput.value;
    const password = passwordInput.value;

    // Proses Login dengan Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        // Jika login gagal
        console.error('Error saat login:', error.message);
        errorMessage.textContent = "Email atau password salah.";
        setTimeout(() => loginButton.classList.remove('rainbow-active'), 500);
    } else {
        // Jika login berhasil
        console.log('Login berhasil:', data);
        
        // Tampilkan modal animasi sukses
        successModal.classList.add('show');

        // Setelah 2 detik, arahkan ke halaman dashboard
        setTimeout(() => {
            window.location.href = "dashboard-cat.html";
        }, 2000);
    }
});