
const SUPABASE_URL = 'https://yqmnrbbvnddlzrtmxyqc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Pffr593PshxlUl5d5T2b9A_fXg1VD-V';

async function startApp() {
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const dialog = document.getElementById('infoDialog');
  const inner = dialog.querySelector('.dialog-inner');
  const createBtn = document.getElementById('createBtn');
  const topbar = document.querySelector('.topbar');
  const status = document.createElement('p');

  status.style.cssText =
    'text-align:center;color:#315c47;margin:16px 0;';
  document.querySelector('.panels').after(status);

  const loginButton = document.createElement('button');
  loginButton.className = 'primary';
  loginButton.textContent = 'Inloggen';
  topbar.appendChild(loginButton);

  let user = null;

  async function refreshUser() {
    const { data } = await db.auth.getSession();
    user = data.session?.user || null;
    loginButton.textContent = user ? 'Mijn account' : 'Inloggen';
  }

  function showLogin() {
    inner.innerHTML = `
      <button class="close" id="closeAuth">×</button>
      <h2>Inloggen bij CadeauSamen</h2>
      <form id="loginForm">
        <label>E-mailadres</label>
        <input id="email" type="email" required>
        <label>Wachtwoord</label>
        <input id="password" type="password" required>
        <p id="error" role="alert"></p>
        <button class="primary" type="submit">Inloggen</button>
      </form>
    `;
    dialog.showModal();

    inner.querySelector('#closeAuth').onclick = () => dialog.close();

    inner.querySelector('#loginForm').onsubmit = async event => {
      event.preventDefault();
      const email = inner.querySelector('#email').value.trim();
      const password = inner.querySelector('#password').value;
      const errorBox = inner.querySelector('#error');

      const { error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        errorBox.textContent = error.message;
      } else {
        await refreshUser();
        status.textContent = 'Je bent ingelogd!';
        dialog.close();
      }
    };
  }

  loginButton.onclick = showLogin;

  createBtn.onclick = async () => {
    if (!user) {
      showLogin();
      return;
    }

    const title = prompt('Hoe wil je je verlanglijstje noemen?');
    if (!title || !title.trim()) return;

    const { error } = await db.from('wishlists').insert({
      owner_id: user.id,
      title: title.trim()
    });

    if (error) {
      status.textContent =
        'Opslaan lukte niet: ' + error.message;
      return;
    }

    status.textContent =
      'Je verlanglijstje "' + title.trim() + '" is aangemaakt!';
  };

  document.getElementById('openForm').onsubmit = event => {
    event.preventDefault();
    document.getElementById('openError').textContent =
      'Gedeelde lijstjes maken we in een volgende stap.';
  };

  await refreshUser();
}

startApp().catch(error => {
  console.error(error);
  const note = document.getElementById('setupNote');
  if (note) {
    note.textContent =
      'De app kon niet starten. Vernieuw de pagina en probeer opnieuw.';
  }
});
