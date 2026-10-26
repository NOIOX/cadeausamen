# CadeauSamen

Een Nederlandstalige, mobielvriendelijke startpagina voor een familie-cadeaulijst-app.

## Huidige status

Dit is op dit moment alleen de **visuele startversie**. Accounts, online opgeslagen lijsten, delen via link en reserveringen werken nog niet. De knoppen tonen daarom duidelijk dat de functies nog niet actief zijn. Gebruik deze versie niet voor echte cadeaulijstjes.

## Bestanden

- `index.html` — pagina en toegankelijke formulieren
- `style.css` — responsive vormgeving
- `app.js` — demo-interacties; slaat geen persoonlijke gegevens op

## Gratis preview via GitHub Pages

1. Open de repository-instellingen: https://github.com/NOIOX/cadeausamen/settings/pages
2. Bij **Build and deployment**, kies **Deploy from a branch**.
3. Kies branch `main` en map `/ (root)`, en klik **Save**.
4. Wacht tot GitHub Pages de site publiceert. De URL verschijnt op diezelfde instellingenpagina.

## Belangrijke volgende stap: beveiligde backend

Voor een echte versie moet een backend worden aangesloten voor authenticatie, lijsten en reserveringen. De reserveringsstatussen moeten server-side ontoegankelijk zijn voor de eigenaar van het lijstje. Alleen statusregels verbergen met JavaScript is niet veilig. Bewaar nooit wachtwoorden zelf; gebruik een auth-provider.

## Privacy

De demo verzamelt, verstuurt of bewaart geen ingevoerde lijstgegevens. Externe lettertypen kunnen wel door Google Fonts worden geladen.