// Select form and notification container
const form = document.getElementById('registerForm');
const notification = document.getElementById('notification');

function showNotification(message, type = 'success') {
  // type: 'success' -> green, 'error' -> orange
  notification.textContent = message;
  notification.style.display = 'block';
  notification.style.backgroundColor = type === 'success' ? '#059669' : '#EA580C';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', () => {
    const input = icon.previousElementSibling; // gets the input before icon
    if (input.type === 'password') {
      input.type = 'text';
      icon.textContent = '🙈'; // change icon
    } else {
      input.type = 'password';
      icon.textContent = '👁️';
    }
  });
});


form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Basic front-end validation
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const terms = document.getElementById('terms').checked;

  if (!username) return showNotification('Please enter your full name.', 'error');
  if (!email) return showNotification('Please enter a valid email.', 'error');
  if (password !== confirmPassword) return showNotification('Passwords do not match.', 'error');
  if (!terms) return showNotification('You must agree to the Terms and Conditions.', 'error');

  const data = { username, email, password };

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      showNotification(result.message || 'Registration failed', 'error');
      return;
    }

    showNotification('Registration successful! Redirecting to login...', 'success');

    // Redirect after short delay
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
  } catch (err) {
    console.error(err);
    showNotification('Something went wrong', 'error');
  }
});
