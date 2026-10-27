
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
  status.setAttribute('role', 'status');
  status.style.cssText =
    'text-align:center;color:#315c47;margin:16px;';
  document.querySelector('.panels').after(status);

  const loginButton = document.createElement('button');
  loginButton.className = 'primary';
  loginButton.textContent = 'Inloggen';
  topbar.appendChild(loginButton);

  let user = null;
  let activeWishlist = null;
  let sharedToken = new URLSearchParams(location.search).get('share');

  function setStatus(message) {
    status.textContent = message;
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  async function refreshUser() {
    const { data, error } = await db.auth.getSession();

    if (error) {
      setStatus('Account laden lukte niet.');
      return;
    }

    user = data.session?.user || null;
    loginButton.textContent = user ? 'Mijn account' : 'Inloggen';
  }

  function showLogin() {
    inner.innerHTML = `
      <button class="close" id="closeAuth" type="button">×</button>
      <h2>Welkom bij CadeauSamen</h2>
      <p>Log in of maak een account aan om verder te gaan.</p>

      <form id="loginForm">
        <label for="email">E-mailadres</label>
        <input id="email" type="email" autocomplete="email" required>

        <label for="password">Wachtwoord</label>
        <input id="password" type="password"
          autocomplete="current-password" minlength="6" required>

        <p id="authError" role="alert"></p>
        <button class="primary" type="submit">Inloggen</button>
        <button id="signupButton" type="button">Account aanmaken</button>
      </form>`;

    dialog.showModal();
    inner.querySelector('#closeAuth').onclick = () => dialog.close();

    const form = inner.querySelector('#loginForm');
    const errorBox = inner.querySelector('#authError');

    form.onsubmit = async event => {
      event.preventDefault();
      errorBox.textContent = 'Even geduld...';

      const { error } = await db.auth.signInWithPassword({
        email: form.querySelector('#email').value.trim(),
        password: form.querySelector('#password').value
      });

      if (error) {
        errorBox.textContent = error.message;
        return;
      }

      await afterLogin();
    };

    inner.querySelector('#signupButton').onclick = async () => {
      const email = form.querySelector('#email').value.trim();
      const password = form.querySelector('#password').value;

      if (!email || password.length < 6) {
        errorBox.textContent =
          'Vul je e-mailadres en een wachtwoord van minstens 6 tekens in.';
        return;
      }

      errorBox.textContent = 'Account aanmaken...';

      const { data, error } = await db.auth.signUp({ email, password });

      if (error) {
        errorBox.textContent = error.message;
        return;
      }

      if (!data.session) {
        errorBox.textContent =
          'Controleer je mailbox om je account te bevestigen. Log daarna in.';
        return;
      }

      await afterLogin();
    };
  }

  async function afterLogin() {
    await refreshUser();
    dialog.close();

    if (sharedToken) {
      await showSharedWishlist(sharedToken);
    } else {
      await showWishlists();
    }
  }

  function getWishlistArea() {
    let area = document.getElementById('myWishlists');

    if (!area) {
      area = document.createElement('section');
      area.id = 'myWishlists';
      area.className = 'panel';
      area.style.cssText = 'margin:24px auto;max-width:700px;';
      document.querySelector('.panels').after(area);
    }

    return area;
  }

  async function showWishlists() {
    if (!user) {
      showLogin();
      return;
    }

    sharedToken = null;
    activeWishlist = null;
    history.replaceState({}, '', location.pathname);

    const { data: lists, error } = await db
      .from('wishlists')
      .select('id, title, share_token, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setStatus('Lijstjes laden lukte niet: ' + error.message);
      return;
    }

    const area = getWishlistArea();
    area.innerHTML = `
      <h2>Mijn verlanglijstjes</h2>
      <div id="myLists"></div>
      <p id="giftStatus" role="status"></p>
      <div id="giftArea"></div>`;

    const listContainer = area.querySelector('#myLists');

    if (!lists.length) {
      listContainer.textContent = 'Je hebt nog geen lijstjes.';
    }

    for (const list of lists) {
      const row = document.createElement('div');
      row.style.cssText =
        'display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;';

      const open = document.createElement('button');
      open.className = 'primary';
      open.textContent = list.title;
      open.onclick = () => showGifts(list);

      const share = document.createElement('button');
      share.textContent = 'Deel link';
      share.onclick = async () => {
        const link = new URL(location.pathname, location.origin);
        link.searchParams.set('share', list.share_token);
        const shareUrl = link.href;

        try {
          await navigator.clipboard.writeText(shareUrl);
          setStatus('Deellink gekopieerd! Stuur hem naar je familie.');
        } catch {
          prompt('Kopieer deze deellink:', shareUrl);
        }
      };

      row.append(open, share);
      listContainer.appendChild(row);
    }

    if (activeWishlist && lists.some(x => x.id === activeWishlist.id)) {
      await showGifts(lists.find(x => x.id === activeWishlist.id));
    }

    setStatus('');
  }

  async function showGifts(list) {
    activeWishlist = list;

    const area = getWishlistArea();
    const giftArea = area.querySelector('#giftArea');
    const giftStatus = area.querySelector('#giftStatus');

    giftArea.replaceChildren();

    const heading = document.createElement('h3');
    heading.textContent = list.title;
    giftArea.appendChild(heading);

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
        giftStatus.textContent =
          'Cadeautjes laden lukte niet: ' + error.message;
        return;
      }

      giftList.replaceChildren();

      for (const gift of gifts) {
        const item = document.createElement('article');
        item.className = 'panel';
        item.style.margin = '12px 0';

        const title = document.createElement('h4');
        title.textContent = gift.title;
        item.appendChild(title);

        if (gift.price != null) {
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

        const url = gift.url ? safeUrl(gift.url) : null;
        if (url) {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Bekijk cadeau';
          item.appendChild(link);
        }

        giftList.appendChild(item);
      }
    }

    addForm.onsubmit = async event => {
      event.preventDefault();
      giftStatus.textContent = '';

      const title = addForm.querySelector('#giftTitle').value.trim();
      const description =
        addForm.querySelector('#giftDescription').value.trim();
      const priceText = addForm.querySelector('#giftPrice').value.trim();
      const urlText = addForm.querySelector('#giftUrl').value.trim();
      const url = urlText ? safeUrl(urlText) : null;
      const price = priceText === '' ? null : Number(priceText);

      if (urlText && !url) {
        giftStatus.textContent = 'Vul een geldige http- of https-link in.';
        return;
      }

      if (price !== null && (!Number.isFinite(price) || price < 0)) {
        giftStatus.textContent = 'Vul een geldige prijs in.';
        return;
      }

      const { error } = await db.from('gifts').insert({
        wishlist_id: list.id,
        title,
        description: description || null,
        url,
        price
      });

      if (error) {
        giftStatus.textContent =
          'Cadeau opslaan lukte niet: ' + error.message;
        return;
      }

      giftStatus.textContent = 'Cadeau toegevoegd!';
      addForm.reset();
      await loadGifts();
    };

    await loadGifts();
  }

  async function showSharedWishlist(token) {
    if (!user) {
      showLogin();
      return;
    }

    activeWishlist = null;

    const area = getWishlistArea();
    area.innerHTML = `
      <h2>Gedeeld verlanglijstje</h2>
      <p id="sharedStatus" role="status">Lijstje laden...</p>
      <div id="sharedGifts"></div>
      <button id="backToLists" type="button">Mijn lijstjes</button>`;

    area.querySelector('#backToLists').onclick = showWishlists;

    const sharedStatus = area.querySelector('#sharedStatus');
    const giftList = area.querySelector('#sharedGifts');

    async function loadShared() {
      sharedStatus.textContent = 'Lijstje laden...';
      giftList.replaceChildren();

      const { data, error } = await db.rpc('get_shared_wishlist', {
        p_share_token: token
      });

      if (error) {
        sharedStatus.textContent =
          'Het gedeelde lijstje kon niet geladen worden: ' + error.message;
        return;
      }

      if (!data || !data.length) {
        sharedStatus.textContent =
          'Dit lijstje bevat nog geen cadeautjes, bestaat niet of is niet toegankelijk.';
        return;
      }

      sharedStatus.textContent = data[0].wishlist_title;

      for (const gift of data) {
        const item = document.createElement('article');
        item.className = 'panel';
        item.style.margin = '12px 0';

        const heading = document.createElement('h4');
        heading.textContent = gift.gift_title;
        item.appendChild(heading);

        if (gift.gift_price != null) {
          const price = document.createElement('p');
          price.textContent = new Intl.NumberFormat('nl-BE', {
            style: 'currency',
            currency: 'EUR'
          }).format(Number(gift.gift_price));
          item.appendChild(price);
        }

        if (gift.gift_description) {
          const description = document.createElement('p');
          description.textContent = gift.gift_description;
          item.appendChild(description);
        }

        const url = gift.gift_url ? safeUrl(gift.gift_url) : null;
        if (url) {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Bekijk cadeau';
          item.appendChild(link);
        }

        const button = document.createElement('button');
        button.className = 'primary';

        if (gift.is_reserved) {
          button.textContent = 'Al gereserveerd';
          button.disabled = true;
        } else {
          button.textContent = 'Ik reserveer dit cadeau';
          button.onclick = async () => {
            button.disabled = true;
            button.textContent = 'Reserveren...';

            const { data: success, error: reserveError } = await db.rpc(
              'reserve_gift',
              {
                p_gift_id: gift.gift_id,
                p_share_token: token
              }
            );

            if (reserveError) {
              sharedStatus.textContent =
                'Reserveren lukte niet: ' + reserveError.message;
              button.disabled = false;
              button.textContent = 'Ik reserveer dit cadeau';
              return;
            }

            if (!success) {
              sharedStatus.textContent =
                'Dit cadeau is mogelijk net door iemand anders gereserveerd.';
            } else {
              sharedStatus.textContent = 'Cadeau gereserveerd!';
            }

            await loadShared();
          };
        }

        item.appendChild(button);
        giftList.appendChild(item);
      }
    }

    await loadShared();
  }

  loginButton.onclick = () => {
    if (user) {
      showWishlists();
    } else {
      showLogin();
    }
  };

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
      setStatus('Opslaan lukte niet: ' + error.message);
      return;
    }

    setStatus('Je verlanglijstje is aangemaakt!');
    await showWishlists();
  };

  document.getElementById('openForm').onsubmit = event => {
    event.preventDefault();
    const token = document.getElementById('openInput').value.trim();

    if (!token) {
      document.getElementById('openError').textContent =
        'Vul een deelcode of gedeelde link in.';
      return;
    }

    let shareToken = token;

    try {
      if (token.includes('://')) {
        shareToken = new URL(token).searchParams.get('share') || '';
      }
    } catch {
      shareToken = '';
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareToken)) {
      document.getElementById('openError').textContent =
        'Dat lijkt geen geldige deellink of deelcode.';
      return;
    }

    sharedToken = shareToken;
    const url = new URL(location.href);
    url.searchParams.set('share', shareToken);
    history.replaceState({}, '', url);

    if (user) {
      showSharedWishlist(shareToken);
    } else {
      showLogin();
    }
  };

  await refreshUser();

  if (sharedToken) {
    if (user) {
      await showSharedWishlist(sharedToken);
    } else {
      showLogin();
    }
  }
}

startApp().catch(error => {
  console.error(error);
  const note = document.getElementById('setupNote');
  if (note) {
    note.textContent =
      'De app kon niet starten. Vernieuw de pagina en probeer opnieuw.';
  }
});
