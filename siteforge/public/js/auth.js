import { $, api, renderNav } from './common.js';

const isLogin = location.pathname === '/login';
const params = new URLSearchParams(location.search);
const next = (params.get('next') || '/app').startsWith('/') && !(params.get('next') || '').startsWith('//') ? (params.get('next') || '/app') : '/app';

renderNav($('#nav'));
document.title = isLogin ? 'Log in – SiteForge AI' : 'Sign up – SiteForge AI';
if (isLogin) {
  $('#authTitle').textContent = 'Welcome back';
  $('#authSub').textContent = 'Log in to continue building.';
  $('#nameField').hidden = true;
  $('#authBtn').textContent = 'Log in';
  $('#password').autocomplete = 'current-password';
  $('#authSwitch').innerHTML = `New here? <a href="/signup?next=${encodeURIComponent(next)}">Create a free account</a>`;
} else {
  $('#password').autocomplete = 'new-password';
  $('#authSwitch').innerHTML = `Already have an account? <a href="/login?next=${encodeURIComponent(next)}">Log in</a>`;
}

$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#authBtn');
  const label = btn.textContent;
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  $('#authError').hidden = true;
  try {
    await api(isLogin ? '/api/auth/login' : '/api/auth/signup', {
      method: 'POST',
      body: { email: $('#email').value, password: $('#password').value, name: $('#name').value },
    });
    window.location.href = next;
  } catch (err) {
    $('#authError').textContent = err.message;
    $('#authError').hidden = false;
    btn.disabled = false; btn.textContent = label;
  }
});
