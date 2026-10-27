
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

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const dialog = document.getElementById('infoDialog');
  const inner = dialog.querySelector('.dialog-inner');
  const createBtn = document.getElementById('createBtn');
  const topbar = document.querySelector('.topbar');
  const status = document.createElement('p');

  status.style.cssText = 'text-align:center;color:#315c47;margin:16px 0;';
  document.querySelector('.panels').after(status);

  const loginButton = document.createElement('button');
  loginButton.className = 'primary';
  loginButton.textContent = 'Inloggen';
  topbar.appendChild(loginButton);

  let user = null;
  let activeWishlist = null;

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
      </form>`;
    dialog.showModal();
    inner.querySelector('#closeAuth').onclick = () => dialog.close();

    inner.querySelector('#loginForm').onsubmit = async event => {
      event.preventDefault();
      const errorBox = inner.querySelector('#error');
      const { error } = await db.auth.signInWithPassword({
        email: inner.querySelector('#email').value.trim(),
        password: inner.querySelector('#password').value
      });
      if (error) {
        errorBox.textContent = error.message;
      } else {
        await refreshUser();
        dialog.close();
        showWishlists();
      }
    };
  }

  async function showWishlists() {
    if (!user) {
      showLogin();
      return;
    }

    const { data: lists, error } = await db
      .from('wishlists')
      .select('id, title, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      status.textContent = 'Lijstjes laden lukte niet: ' + error.message;
      return;
    }

    const area = document.createElement('section');
    area.className = 'panel';
    area.style.margin = '24px auto';
    area.style.maxWidth = '700px';
    area.innerHTML = `
      <h2>Mijn verlanglijstjes</h2>
      <div id="myLists"></div>
      <p id="giftStatus" role="status"></p>
      <div id="giftArea"></div>`;

    document.querySelector('#myLists')?.remove();
    document.querySelector('#giftArea')?.remove();
    document.querySelector('#giftStatus')?.remove();
    document.querySelector('#myLists')?.remove();
    const oldArea = document.getElementById('myWishlists');
    if (oldArea) oldArea.remove();
    area.id = 'myWishlists';
    document.querySelector('.panels').after(area);

    const listContainer = area.querySelector('#myLists');

    if (!lists.length) {
      listContainer.textContent = 'Je hebt nog geen lijstjes.';
    }

    lists.forEach(list => {
      const button = document.createElement('button');
      button.className = 'primary';
      button.style.margin = '6px';
      button.textContent = list.title;
      button.onclick = () => showGifts(list);
      listContainer.appendChild(button);
    });

    if (activeWishlist && lists.some(list => list.id === activeWishlist.id)) {
      showGifts(lists.find(list => list.id === activeWishlist.id));
    }
  }

  async function showGifts(list) {
    activeWishlist = list;
    const area = document.getElementById('myWishlists');
    if (!area) return;
    const giftArea = area.querySelector('#giftArea');
    const giftStatus = area.querySelector('#giftStatus');
    giftArea.innerHTML = '<h3>' + escapeHtml(list.title) + '</h3>';

    const addForm = document.createElement('form');
    addForm.innerHTML = `
      <label for="giftTitle">Naam van het cadeau</label>
      <input id="giftTitle" required placeholder="Bijv. een boek">
      <label for="giftDescription">Beschrijving (optioneel)</label>
      <input id="giftDescription" placeholder="Kleur, maat of extra uitleg">
      <label for="giftUrl">Link (optioneel)</label>
      <input id="giftUrl" type="url" placeholder="https://...">
      <button class="primary" type="submit">Cadeau toevoegen</button>`;
    giftArea.appendChild(addForm);

    const giftList = document.createElement('div');
    giftArea.appendChild(giftList);

    async function loadGifts() {
      const { data: gifts, error } = await db.from('gifts')
        .select('id, title, description, url')
        .eq('wishlist_id', list.id)
        .order('created_at', { ascending: true });

      if (error) {
        giftStatus.textContent = 'Cadeautjes laden lukte niet: ' + error.message;
        return;
      }

      giftList.innerHTML = '';
      gifts.forEach(gift => {
        const item = document.createElement('article');
        item.className = 'panel';
        item.style.margin = '12px 0';
        item.innerHTML = `
          <h4>${escapeHtml(gift.title)}</h4>
          <p>${escapeHtml(gift.description || '')}</p>
          ${gift.url ? `<p><a href="${escapeHtml(gift.url)}" target="_blank" rel="noopener noreferrer">Bekijk cadeau</a></p>` : ''}`;
        giftList.appendChild(item);
      });
    }

    addForm.onsubmit = async event => {
      event.preventDefault();
      giftStatus.textContent = '';
      const title = addForm.querySelector('#giftTitle').value.trim();
      const description = addForm.querySelector('#giftDescription').value.trim();
      const url = addForm.querySelector('#giftUrl').value.trim();

      const { error } = await db.from('gifts').insert({
        wishlist_id: list.id,
        title,
        description: description || null,
        url: url || null
      });

      if (error) {
        giftStatus.textContent = 'Cadeau opslaan lukte niet: ' + error.message;
      } else {
        giftStatus.textContent = 'Cadeau toegevoegd!';
        addForm.reset();
        await loadGifts();
      }
    };

    await loadGifts();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  loginButton.onclick = showWishlists;

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
      status.textContent = 'Opslaan lukte niet: ' + error.message;
      return;
    }

    status.textContent = 'Je verlanglijstje is aangemaakt!';
    await showWishlists();
  };

  document.getElementById('openForm').onsubmit = event => {
    event.preventDefault();
    document.getElementById('openError').textContent =
      'Gedeelde lijstjes zijn nog niet beschikbaar.';
  };

  await refreshUser();
}

startApp().catch(error => {
  console.error(error);
  const note = document.getElementById('setupNote');
  if (note) note.textContent =
    'De app kon niet starten. Vernieuw de pagina en probeer opnieuw.';
});
