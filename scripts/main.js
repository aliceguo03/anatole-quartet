/* ─── Nav scroll behavior ───────────────────────────────────── */
const nav = document.getElementById('nav');

function updateNav() {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* ─── Hero entry animation ──────────────────────────────────── */
const heroMedia   = document.getElementById('heroMedia');
const heroTitle   = document.getElementById('heroTitle');
const heroTagline = document.getElementById('heroTagline');
const heroCta     = document.getElementById('heroCta');

function runEntryAnimation() {
  if (!heroMedia) return;
  const isTransition = document.documentElement.classList.contains('aq-skip-intro');
  if (isTransition) {
    heroMedia.classList.add('loaded');
    heroTitle.classList.add('visible');
    setTimeout(() => heroTagline.classList.add('visible'), 400);
    setTimeout(() => heroCta.classList.add('visible'), 800);
    return;
  }
  // Fresh load: hero appears instantly behind the curtain
  heroMedia.style.transition = 'none';
  heroMedia.classList.add('loaded');
  heroTitle.style.transition = 'none';
  heroTitle.classList.add('visible');
  heroMedia.getBoundingClientRect(); // force reflow
  heroTitle.getBoundingClientRect();
  // Wait for web fonts before showing overlay text — prevents FOUT where
  // the wordmark briefly renders in the fallback serif before swapping to
  // Playfair Display, which would look different from the hero title underneath.
  document.fonts.ready.then(() => {
    // Pin overlay inners to the exact viewport position of the hero title
    // after fonts render, so the wordmark sits pixel-perfectly over the title.
    const titleRect = heroTitle.getBoundingClientRect();
    document.querySelectorAll('.intro-overlay__inner').forEach(inner => {
      inner.style.top = titleRect.top + 'px';
    });
    document.querySelectorAll('.intro-overlay__wordmark').forEach(w => {
      w.style.opacity = '1';
    });
    setTimeout(() => {
      const overlay = document.getElementById('introOverlay');
      if (!overlay) return;
      overlay.querySelector('.intro-overlay__half--left').classList.add('open');
      overlay.querySelector('.intro-overlay__half--right').classList.add('open');
      setTimeout(() => {
        overlay.remove();
        heroMedia.style.transition = '';
        heroTitle.style.transition = '';
        setTimeout(() => heroTagline.classList.add('visible'), 200);
        setTimeout(() => heroCta.classList.add('visible'), 600);
      }, 340);
    }, 1200);
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runEntryAnimation);
} else {
  runEntryAnimation();
}

/* ─── Hero: Ken Burns + parallax (desktop only) ─────────────── */
const heroImage   = document.getElementById('heroImage');
const heroSection = document.getElementById('hero');
let rafId = null;
let heroStartTime = null;
let heroVisible   = true;

function animateHero(timestamp) {
  if (!heroImage) return;
  if (!heroStartTime) heroStartTime = timestamp;
  const elapsed    = (timestamp - heroStartTime) / 1000;
  const scale      = 1 + Math.min(elapsed / 20, 1) * 0.08;
  const parallaxY  = window.scrollY * 0.4;
  heroImage.style.transform = `translateY(${parallaxY}px) scale(${scale})`;
  if (heroVisible) rafId = requestAnimationFrame(animateHero);
}

if (heroSection && !window.matchMedia('(hover: none)').matches) {
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (heroVisible && !rafId) rafId = requestAnimationFrame(animateHero);
    if (!heroVisible) { cancelAnimationFrame(rafId); rafId = null; }
  }, { threshold: 0 }).observe(heroSection);

  rafId = requestAnimationFrame(animateHero);
}

/* ─── Mobile hero image: handle .JPG / .jpg capitalisation ──── */
(function () {
  var src = document.getElementById('mobileHeroSource');
  if (!src || window.innerWidth > 768) return;
  var test = new Image();
  test.onerror = function () { src.srcset = 'assets/images/mobilehero.jpg'; };
  test.src = 'assets/images/mobilehero.JPG';
})();


/* ─── Scroll-triggered reveals ──────────────────────────────── */
const triggeredGroups = new WeakSet();

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    revealObs.unobserve(el);
    const group = el.closest('.about__body, .footer__inner');
    if (group && !triggeredGroups.has(group)) {
      triggeredGroups.add(group);
      Array.from(group.querySelectorAll('.reveal')).forEach((s, i) => {
        setTimeout(() => s.classList.add('visible'), i * 120);
      });
    } else if (!group) {
      el.classList.add('visible');
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ─── Carousel ──────────────────────────────────────────────── */
const carouselViewport  = document.getElementById('carouselViewport');
const track             = document.getElementById('carouselTrack');
const slides            = document.querySelectorAll('.carousel__slide');
const sliderWrap        = document.getElementById('carouselSliderWrap');
const sliderFill        = document.getElementById('carouselSliderFill');
const prevBtn           = document.getElementById('carouselPrev');
const nextBtn           = document.getElementById('carouselNext');
const filterBtns        = document.querySelectorAll('.carousel__filter-btn');
const emptyStateEl      = document.getElementById('carouselEmptyState');
const emptyMsgEl        = document.getElementById('carouselEmptyMsg');
const GAP               = 24;
const MOBILE_GAP        = 16;
const MOBILE_PEEK       = 20; // px of adjacent card visible on mobile
let current             = 0;
let currentFilter       = 'upcoming';
let carouselSeek        = null;

function getToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function updateEventStates() {
  const today = getToday();
  slides.forEach(slide => {
    const eventDate = new Date(slide.dataset.date + 'T00:00:00');
    const isPast = eventDate < today;
    slide.dataset.isPast = isPast ? 'true' : 'false';

    const btn = slide.querySelector('.event-card__btn--primary');
    if (isPast) {
      btn.textContent = 'THIS EVENT HAS ENDED';
      btn.classList.add('event-card__btn--ended');
      btn.href = '#';
    } else {
      btn.textContent = 'Add to Calendar';
      btn.classList.remove('event-card__btn--ended');
    }
  });
}

/* Returns visible slides in current DOM order (reflects sort) */
function getVisibleSlides() {
  return Array.from(track.querySelectorAll('.carousel__slide')).filter(s => s.style.display !== 'none');
}

function updateCarouselVisibility() {
  const allSlides = Array.from(slides);

  const visibleSlides = allSlides.filter(slide => {
    const isPast = slide.dataset.isPast === 'true';
    return currentFilter === 'past' ? isPast : !isPast;
  });

  /* Sort: upcoming = soonest first; past = most recent first */
  visibleSlides.sort((a, b) => {
    const da = new Date(a.dataset.date + 'T00:00:00');
    const db = new Date(b.dataset.date + 'T00:00:00');
    return currentFilter === 'past' ? db - da : da - db;
  });

  if (visibleSlides.length === 0) {
    sliderWrap.style.display = 'none';
    allSlides.forEach(s => { s.style.display = 'none'; });
    emptyMsgEl.textContent = currentFilter === 'past'
      ? 'No past performances yet.'
      : 'No upcoming performances scheduled. Check back soon!';
    emptyStateEl.style.display = 'flex';
    return;
  }

  emptyStateEl.style.display = 'none';
  sliderWrap.style.display = 'block';

  /* Reorder DOM to match sort, then show/hide */
  visibleSlides.forEach(slide => {
    slide.style.display = 'flex';
    track.appendChild(slide);
  });
  allSlides.filter(s => !visibleSlides.includes(s)).forEach(s => { s.style.display = 'none'; });

  current = 0;
  setSlideWidths();
}

function isMobileCarousel() { return window.innerWidth <= 768; }

function setSlideWidths() {
  const vpWidth       = carouselViewport.offsetWidth;
  const visibleSlides = getVisibleSlides();
  const mobile        = isMobileCarousel();
  const slideWidth    = mobile
    ? Math.round(vpWidth * 0.80)
    : (vpWidth - GAP) / 1.6;

  visibleSlides.forEach(s => { s.style.flexBasis = `${slideWidth}px`; });
  goToSlide(current, false);

  const filledWidth = visibleSlides.length > 0 ? 100 / visibleSlides.length : 0;
  sliderFill.style.width = `${filledWidth}%`;
}

function getSlideStep() {
  const visibleSlides = getVisibleSlides();
  if (visibleSlides.length === 0) return 0;
  const gap = isMobileCarousel() ? MOBILE_GAP : GAP;
  return visibleSlides[0].getBoundingClientRect().width + gap;
}

function updateSlider() {
  sliderFill.style.transform = `translateX(${current * 100}%)`;
}

function updateArrows() {
  if (!prevBtn || !nextBtn) return;
  const visibleSlides = getVisibleSlides();
  prevBtn.disabled = current <= 0;
  nextBtn.disabled = current >= visibleSlides.length - 1;
}

function goToSlide(index, animate = true) {
  const visibleSlides = getVisibleSlides();
  current = Math.max(0, Math.min(index, visibleSlides.length - 1));
  const step        = getSlideStep();
  const mobile      = isMobileCarousel();
  const pixelOffset = current * step - (mobile && current > 0 ? MOBILE_GAP + MOBILE_PEEK : 0);
  if (carouselSeek) {
    carouselSeek(-pixelOffset, animate);
  } else {
    if (!animate) track.style.transition = 'none';
    track.style.transform = `translateX(-${pixelOffset}px)`;
    if (!animate) { track.getBoundingClientRect(); track.style.transition = ''; }
  }
  if (!animate) sliderFill.style.transition = 'none';
  updateSlider();
  updateArrows();
  if (!animate) { sliderFill.getBoundingClientRect(); sliderFill.style.transition = ''; }
}

// Filter button handlers
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => {
      b.classList.remove('carousel__filter-btn--active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('carousel__filter-btn--active');
    btn.setAttribute('aria-pressed', 'true');
    const trackEl = document.getElementById('carouselTrack');
    if (trackEl) trackEl.style.visibility = 'hidden';
    currentFilter = btn.dataset.filter;
    updateCarouselVisibility();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (trackEl) trackEl.style.visibility = 'visible';
    }));
  });
});

if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(current - 1));
if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(current + 1));

if (carouselViewport) {
  /* Slider: click or drag to seek */
  let sliderActive = false;

  function seekFromEvent(e) {
    const rect = sliderWrap.querySelector('.carousel__slider-track').getBoundingClientRect();
    const t    = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const visibleSlides = getVisibleSlides();
    goToSlide(Math.round(t * (visibleSlides.length - 1)));
  }

  sliderWrap.addEventListener('mousedown', e => { sliderActive = true; seekFromEvent(e); e.preventDefault(); });
  window.addEventListener('mousemove', e => { if (sliderActive) seekFromEvent(e); });
  window.addEventListener('mouseup', () => { sliderActive = false; });

  /* Touch on slider */
  sliderWrap.addEventListener('touchstart', e => seekFromEvent(e.touches[0]), { passive: true });
  sliderWrap.addEventListener('touchmove',  e => seekFromEvent(e.touches[0]), { passive: true });

  carouselViewport.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goToSlide(current - 1);
    if (e.key === 'ArrowRight') goToSlide(current + 1);
  });

  /* Trackpad horizontal swipe — fires without any click/grab */
  let wheelAccum = 0;
  let wheelTimer = null;
  let wheelCooldown = false;
  carouselViewport.addEventListener('wheel', e => {
    // Ignore predominantly-vertical scroll so the page can still scroll normally
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.5) return;
    e.preventDefault();
    if (wheelCooldown) return;
    wheelAccum += e.deltaX;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelAccum = 0; }, 300);
    if (Math.abs(wheelAccum) > 100) {
      goToSlide(wheelAccum > 0 ? current + 1 : current - 1);
      wheelAccum = 0;
      wheelCooldown = true;
      setTimeout(() => { wheelCooldown = false; }, 700);
    }
  }, { passive: false });
}

/* ─── Free-scroll momentum carousel ────────────────────────────── */
function initFreeScrollCarousel(trackEl, clipEl) {
  let startX = 0, startY = 0, lastX = 0, lastT = 0;
  let velocity = 0, offset = 0;
  let isDragging = false, axisLocked = null, isTouch = false, rafId = null;

  const minOffset = () => -(trackEl.scrollWidth - clipEl.offsetWidth);
  const maxOffset = 0;

  function setOffset(x, animate = false) {
    offset = x;
    trackEl.style.transition = animate
      ? 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none';
    trackEl.style.transform = `translateX(${offset}px)`;
  }

  function applyRubberBand(x) {
    const min = minOffset();
    if (x > maxOffset) return maxOffset + (x - maxOffset) * 0.18;
    if (x < min)       return min       + (x - min)       * 0.18;
    return x;
  }

  function clamp(x) { return Math.max(minOffset(), Math.min(maxOffset, x)); }

  function momentum() {
    if (Math.abs(velocity) < 0.01) {
      const min = minOffset();
      if (offset > maxOffset) setOffset(maxOffset, true);
      else if (offset < min)  setOffset(min, true);
      return;
    }
    velocity *= 0.94;
    const next = offset + velocity * 16;
    const min  = minOffset();
    if (next > maxOffset || next < min) {
      setOffset(clamp(next));
      velocity = 0;
      setTimeout(() => setOffset(clamp(offset), true), 0);
      return;
    }
    setOffset(next);
    rafId = requestAnimationFrame(momentum);
  }

  function dragStart(clientX, clientY, touch = false) {
    cancelAnimationFrame(rafId);
    startX = clientX; startY = clientY; lastX = clientX;
    lastT = Date.now(); velocity = 0; isDragging = true;
    isTouch = touch; axisLocked = touch ? null : 'x';
    trackEl.style.transition = 'none';
    if (!touch) trackEl.style.cursor = 'grabbing';
  }

  function dragMove(clientX, clientY) {
    if (!isDragging) return;
    if (axisLocked === null) {
      const dx = Math.abs(clientX - startX), dy = Math.abs(clientY - startY);
      if (dx > 8 || dy > 8) axisLocked = dx >= dy ? 'x' : 'y';
    }
    if (axisLocked === 'y') return;
    const now = Date.now(), dt = now - lastT;
    if (dt > 0) velocity = (clientX - lastX) / dt * 16;
    lastX = clientX; lastT = now;
    const next = offset + (clientX - startX);
    startX = clientX;
    setOffset(applyRubberBand(next));
  }

  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    if (!isTouch) { trackEl.style.cursor = 'grab'; document.body.style.userSelect = ''; }
    if (axisLocked !== 'x') return;
    rafId = requestAnimationFrame(momentum);
  }

  trackEl.addEventListener('touchstart', e => {
    dragStart(e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: true });
  trackEl.addEventListener('touchmove', e => {
    if (axisLocked === 'x') e.preventDefault();
    dragMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  trackEl.addEventListener('touchend', dragEnd);

  trackEl.addEventListener('mousedown', e => {
    e.preventDefault();
    document.body.style.userSelect = 'none';
    dragStart(e.clientX, e.clientY, false);
  });
  document.addEventListener('mousemove', e => { if (isDragging && !isTouch) dragMove(e.clientX, e.clientY); });
  document.addEventListener('mouseup',   () => { if (isDragging && !isTouch) dragEnd(); });

  trackEl.style.cursor = 'grab';
  return { seekTo: (x, animate = false) => setOffset(x, animate) };
}

/* Init + resize */
function initCarousel() {
  if (!carouselViewport) return;
  updateEventStates();
  const { seekTo } = initFreeScrollCarousel(track, track.closest('.carousel__clip'));
  carouselSeek = seekTo;
  updateCarouselVisibility();
  let lastResizeWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastResizeWidth) {
      lastResizeWidth = window.innerWidth;
      updateCarouselVisibility();
    }
  }, { passive: true });
  setInterval(() => { updateEventStates(); updateCarouselVisibility(); }, 1000 * 60 * 60);
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    initCarousel();
    const track = document.getElementById('carouselTrack');
    if (track) track.style.visibility = 'visible';
  });
} else {
  initCarousel();
}

/* ─── Smooth scroll for # links ─────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

