/**
 * Mutate the static HTML boot placeholder into a recoverable stuck UI.
 * Works without React (cold boot before JS hydrates, or after reload budget exhausted).
 *
 * Safe to call multiple times.
 */
export function showStaticBootStuck(message) {
  if (typeof document === 'undefined') return false;

  const root = document.getElementById('root');
  if (!root) return false;

  // Prefer the known placeholder; fall back to root if React never replaced it.
  let host = root.querySelector('#app-boot-placeholder');
  if (!host) {
    // Only take over if React has not mounted a real app tree.
    if (window.__CRYPTOLOGICAL_APP_MOUNTED__) return false;
    if (root.children.length > 2) return false;
    host = root;
  }

  if (host.getAttribute('data-boot-stuck') === '1') return true;
  host.setAttribute('data-boot-stuck', '1');
  host.className = 'app-boot-placeholder';
  host.setAttribute('aria-live', 'assertive');

  const title =
    message ||
    'This page is taking longer than expected to load.';
  const detail =
    'After a laptop boot or sleep, the network or session restore can hang. Reload usually fixes it.';

  host.innerHTML = `
    <p style="margin:0;font-size:1rem;color:#a3a3a3;text-align:center;max-width:22rem">${title}</p>
    <p style="margin:0;font-size:0.9rem;color:#737373;text-align:center;max-width:22rem">${detail}</p>
    <button type="button" id="app-boot-reload-btn" style="
      margin-top:0.25rem;
      padding:0.65rem 1.25rem;
      font-size:0.95rem;
      font-family:inherit;
      font-weight:600;
      color:#040509;
      background-color:#4cceac;
      border:none;
      border-radius:8px;
      cursor:pointer;
    ">Reload</button>
  `;

  const btn = host.querySelector('#app-boot-reload-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('_boot');
        url.searchParams.set('_boot', String(Date.now()));
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    });
  }
  return true;
}
