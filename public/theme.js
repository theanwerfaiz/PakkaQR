// Applies the saved colour theme before first paint to avoid a flash.
(function () {
  var pref = 'system';
  try {
    pref = localStorage.getItem('pakkaqr:theme') || 'system';
  } catch {
    // Storage blocked: fall back to the system theme.
  }
  var dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme-pref', pref);
})();
