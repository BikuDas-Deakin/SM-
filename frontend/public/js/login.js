// Grab form and error elements
const form = document.getElementById('loginForm');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const generalError = document.getElementById('generalError');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

// Toggle password visibility
togglePassword.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
  togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
});

// Helper to show/hide errors
function showError(elem) {
  elem.style.display = 'block';
}

function hideErrors() {
  emailError.style.display = 'none';
  passwordError.style.display = 'none';
  generalError.style.display = 'none';
}

// Form submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideErrors();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('remember').checked;

  let valid = true;
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    showError(emailError);
    valid = false;
  }
  if (!password) {
    showError(passwordError);
    valid = false;
  }
  if (!valid) return;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      generalError.textContent = data.message || 'Login failed';
      showError(generalError);
      return;
    }

    // Store JWT
    localStorage.setItem('token', data.token);

    // Redirect to dashboard
    window.location.href = '/dashboard.html';
  } catch (err) {
    console.error(err);
    generalError.textContent = 'Something went wrong.';
    showError(generalError);
  }
});
