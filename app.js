const dialog = document.getElementById('infoDialog');
const title = document.getElementById('dialogTitle');
const text = document.getElementById('dialogText');
function showInfo(heading, message) {
  title.textContent = heading;
  text.textContent = message;
  dialog.showModal();
}
document.getElementById('createBtn').addEventListener('click', () => {
  showInfo('Lijstjes maken komt eraan', 'De volgende stap is het koppelen van een beveiligde database voor accounts, verlanglijstjes en reserveringen. Er worden in deze demo geen gegevens opgeslagen.');
});
document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
document.getElementById('dialogOk').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.getElementById('openForm').addEventListener('submit', event => {
  event.preventDefault();
  const value = document.getElementById('shareLink').value.trim();
  const error = document.getElementById('openError');
  error.textContent = '';
  if (!value) return;
  try {
    const url = new URL(value.includes('://') ? value : 'https://' + value);
    if (url.hostname === 'github.com' || url.hostname.endsWith('.github.io')) {
      error.textContent = 'Dit lijkt op een projectlink, niet op een gedeeld cadeaulijstje.';
    } else {
      error.textContent = 'Gedeelde lijsten zijn nog niet actief. De link is niet geopend en er zijn geen gegevens opgeslagen.';
    }
  } catch {
    error.textContent = 'Controleer de link of code. Gedeelde lijsten zijn nog niet actief.';
  }
});