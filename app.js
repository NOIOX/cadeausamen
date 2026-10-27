
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

  status.style.cssText =
    'text-align:center;color:#315c47;margin:16px 0;';
  document.querySelector('.panels').after(status);

  const loginButton = document.createElement('button');
  loginButton.className = 'primary';
  loginButton.textContent = 'Inloggen';
  topbar.appendChild(loginButton);

  let user = null;
  let activeWishlist = null;

  async function refreshUser() {
    const { data, error } = await db.auth.getSession();

    if (error) {
      status.textContent = 'Account laden lukte niet.';
      return;
    }

    user = data.session?.user || null;
    loginButton.textContent = user ? 'Mijn account' : 'Inloggen';
  }

  function showLogin() {
    inner.innerHTML = `
      <button class="close" id="closeAuth" type="button">×</button>
      <h2>Inloggen bij CadeauSamen</h2>
      <form id="loginForm">
        <label for="email">E-mailadres</label>
        <input id="email" type="email" autocomplete="email" required>

        <label for="password">Wachtwoord</label>
        <input id="password" type="password"
          autocomplete="current-password" required>

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
        await showWishlists();
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

    let area = document.getElementById('myWishlists');

    if (!area) {
      area = document.createElement('section');
      area.id = 'myWishlists';
      area.className = 'panel';
      area.style.cssText = 'margin:24px auto;max-width:700px;';
      document.querySelector('.panels').after(area);
    }

    area.innerHTML = `
      <h2>Mijn verlanglijstjes</h2>
      <div id="myLists"></div>
      <p id="giftStatus" role="status"></p>
      <div id="giftArea"></div>`;

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
      await showGifts(lists.find(list => list.id === activeWishlist.id));
    }
  }

  async function showGifts(list) {
    activeWishlist = list;

    const area = document.getElementById('myWishlists');
    if (!area) return;

    const giftArea = area.querySelector('#giftArea');
    const giftStatus = area.querySelector('#giftStatus');

    giftArea.innerHTML = '<h3></h3>';
    giftArea.querySelector('h3').textContent = list.title;

    const addForm = document.createElement('form');
    addForm.innerHTML = `
      <label for="giftTitle">Naam van het cadeau</label>
      <input id="giftTitle" required placeholder="Bijv. een boek">

      <label for="giftDescription">Beschrijving (optioneel)</label>
      <input id="giftDescription" placeholder="Kleur, maat of extra uitleg">

      <label for="giftPrice">Prijs in euro's (optioneel)</label>
      <input id="giftPrice" type="number" min="0" step="0.01"
        placeholder="Bijv. 19.99">

      <label for="giftUrl">Link (optioneel)</label>
      <input id="giftUrl" type="url" placeholder="https://...">

      <button class="primary" type="submit">Cadeau toevoegen</button>`;

    giftArea.appendChild(addForm);

    const giftList = document.createElement('div');
    giftArea.appendChild(giftList);

    async function loadGifts() {
      const { data: gifts, error } = await db
        .from('gifts')
        .select('id, title, description, url, price')
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

        const heading = document.createElement('h4');
        heading.textContent = gift.title;
        item.appendChild(heading);

        if (gift.price !== null && gift.price !== undefined) {
          const price = document.createElement('p');
          price.style.fontWeight = 'bold';
          price.textContent = new Intl.NumberFormat('nl-BE', {
            style: 'currency',
            currency: 'EUR'
          }).format(Number(gift.price));
          item.appendChild(price);
        }

        if (gift.description) {
          const description = document.createElement('p');
          description.textContent = gift.description;
          item.appendChild(description);
        }

        if (gift.url) {
          const link = document.createElement('a');
          link.href = gift.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Bekijk cadeau';
          item.appendChild(link);
        }

        giftList.appendChild(item);
      });
    }

    addForm.onsubmit = async event => {
      event.preventDefault();
      giftStatus.textContent = '';

      const title = addForm.querySelector('#giftTitle').value.trim();
      const description =
        addForm.querySelector('#giftDescription').value.trim();
      const priceText =
        addForm.querySelector('#giftPrice').value.trim();
      const url = addForm.querySelector('#giftUrl').value.trim();

      const price = priceText === '' ? null : Number(priceText);

      if (price !== null && (!Number.isFinite(price) || price < 0)) {
        giftStatus.textContent = 'Vul een geldige prijs van 0 euro of hoger in.';
        return;
      }

      const { error } = await db.from('gifts').insert({
        wishlist_id: list.id,
        title,
        description: description || null,
        url: url || null,
        price
      });

      if (error) {
        giftStatus.textContent = 'Cadeau opslaan lukte niet: ' + error.message;
        return;
      }

      giftStatus.textContent = 'Cadeau toegevoegd!';
      addForm.reset();
      await loadGifts();
    };

    await loadGifts();
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
  if (note) {
    note.textContent =
      'De app kon niet starten. Vernieuw de pagina en probeer opnieuw.';
  }
});
