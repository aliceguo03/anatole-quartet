/* ─── Page transitions ───────────────────────────────────────── */
(function () {
  // Remove enter class once the animation completes
  var html = document.documentElement;
  if (html.classList.contains('aq-enter-right') || html.classList.contains('aq-enter-left')) {
    document.body.addEventListener('animationend', function () {
      html.classList.remove('aq-enter-right', 'aq-enter-left');
    }, { once: true });
  }

  // Intercept nav clicks: fade out then navigate
  var navigating = false;
  document.querySelectorAll('.nav a[href]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (navigating) return;
      var href = link.getAttribute('href');
      if (!href || href.indexOf('#') !== -1 || href.indexOf('://') !== -1) return;

      var toPage   = href.split('/').pop() || 'index.html';
      var fromPage = (window.location.pathname.split('/').pop()) || 'index.html';
      if (toPage === fromPage) return;

      // Going to home = slide left (back), everything else = slide right (forward)
      var dir = (toPage === 'index.html') ? 'left' : 'right';
      e.preventDefault();
      navigating = true;
      sessionStorage.setItem('aq_trans', dir);

      document.body.style.transition = 'opacity 180ms ease';
      document.body.style.opacity    = '0';
      setTimeout(function () { window.location.href = href; }, 185);
    });
  });
})();

/* ─── Mobile nav overlay toggle ─────────────────────────────── */
(function () {
  var hamburger = document.getElementById('navHamburger');
  var overlay   = document.getElementById('navOverlay');
  if (!hamburger || !overlay) return;

  function openOverlay() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
  }
  function closeOverlay() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', function () {
    if (overlay.classList.contains('open')) closeOverlay();
    else openOverlay();
  });
  overlay.querySelectorAll('.nav-overlay__link').forEach(function (link) {
    link.addEventListener('click', closeOverlay);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeOverlay();
  });
})();
