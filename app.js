
const SUPABASE_URL = 'https://yqmnrbbvnddlzrtmxyqc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Pffr593PshxlUl5d5T2b9A_fXg1VD-V';

async function startCadeauSamen() {
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Supabase kon niet worden geladen.'));
      document.head.appendChild(script);
    });
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const dialog = document.getElementById('infoDialog');
  const inner = dialog.querySelector('.dialog-inner');
  const createBtn = document.getElementById('createBtn');
  const topbar = document.querySelector('.topbar');

  let isSignUp = false;
  let currentUser = null;

  const loginButton = document.createElement('button');
  loginButton.className = 'primary';
  loginButton.textContent = 'Inloggen';
  loginButton.style.marginLeft = '12px';
  topbar.appendChild(loginButton);

  const status = document.createElement('p');
  status.style.cssText = 'text-align:center;color:#315c47;font-size:13px;margin:16px 0;';
  document.querySelector('.panels').after(status);

  function showLogin() {
    inner.innerHTML = `
      <button class="close" id="closeAuth" aria-label="Sluiten">×</button>
      <div class="dialog-mark">✳</div>
      <h2 id="authHeading">${isSignUp ? 'Account maken' : 'Inloggen bij CadeauSamen'}</h2>
      <p>${isSignUp ? 'Maak een gratis account met je e-mailadres.' : 'Log in om verder te gaan.'}</p>
      <form id="authForm" style="text-align:left">
        <label for="authEmail">E-mailadres</label>
        <input id="authEmail" type="email" autocomplete="email" required
          style="display:block;width:100%;padding:12px;margin:6px 0 14px;border:1px solid #d9d8cd;border-radius:10px">
        <label for="authPassword">Wachtwoord (minstens 6 tekens)</label>
        <input id="authPassword" type="password" minlength="6" required
          autocomplete="${isSignUp ? 'new-password' : 'current-password'}"
          style="display:block;width:100%;padding:12px;margin:6px 0 14px;border:1px solid #d9d8cd;border-radius:10px">
        <p id="authError" role="alert" style="color:#9b3b2e;font-size:12px"></p>
        <button class="primary" id="authSubmit" type="submit" style="width:100%">
          ${isSignUp ? 'Account maken' : 'Inloggen'}
        </button>
      </form>
      <button id="toggleAuth" class="text-button" type="button">
        ${isSignUp ? 'Al een account? Inloggen' : 'Nog geen account? Account maken'}
      </button>
      ${currentUser ? '<button id="signOut" class="text-button" type="button">Uitloggen</button>' : ''}
    `;

    dialog.showModal();

    inner.querySelector('#closeAuth').onclick = () => dialog.close();
    inner.querySelector('#toggleAuth').onclick = () => {
      isSignUp = !isSignUp;
      showLogin();
    };

    if (currentUser) {
      inner.querySelector('#signOut').onclick = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          status.textContent = error.message;
          return;
        }
        dialog.close();
      };
    }

    inner.querySelector('#authForm').onsubmit = async event => {
      event.preventDefault();
      const email = inner.querySelector('#authEmail').value.trim();
      const password = inner.querySelector('#authPassword').value;
      const errorBox = inner.querySelector('#authError');
      const submit = inner.querySelector('#authSubmit');

      submit.disabled = true;
      submit.textContent = 'Even wachten…';
      errorBox.textContent = '';

      try {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;

          if (data.session) {
            status.textContent = 'Je account is aangemaakt en je bent ingelogd!';
            dialog.close();
          } else {
            errorBox.textContent = 'Controleer je e-mail om je account te bevestigen.';
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          status.textContent = 'Je bent ingelogd bij CadeauSamen!';
          dialog.close();
        }
      } catch (error) {
        errorBox.textContent = error.message || 'Er ging iets mis. Probeer opnieuw.';
      } finally {
        submit.disabled = false;
        submit.textContent = isSignUp ? 'Account maken' : 'Inloggen';
      }
    };
  }

  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;

  function updateLoginButton(user) {
    currentUser = user || null;
    loginButton.textContent = currentUser ? 'Mijn account' : 'Inloggen';
    if (currentUser) {
      status.textContent = 'Je bent ingelogd. Verlanglijstjes sluiten we in de volgende stap aan.';
    }
  }

  updateLoginButton(currentUser);
  supabase.auth.onAuthStateChange((_event, session) => {
    updateLoginButton(session?.user || null);
  });

  loginButton.onclick = showLogin;
  createBtn.onclick = () => {
    if (!currentUser) {
      isSignUp = false;
      showLogin();
    } else {
      status.textContent = 'Je bent ingelogd! Het maken van verlanglijstjes volgt in de volgende stap.';
    }
  };

  document.getElementById('openForm').onsubmit = event => {
    event.preventDefault();
    document.getElementById('openError').textContent =
      'Gedeelde lijstjes sluiten we in een volgende stap aan.';
  };
}

startCadeauSamen().catch(error => {
  console.error(error);
  const note = document.getElementById('setupNote');
  if (note) note.textContent = 'De verbinding kon niet worden gestart. Controleer de code en probeer opnieuw.';
});
