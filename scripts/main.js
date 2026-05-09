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
  const step   = getSlideStep();
  const mobile = isMobileCarousel();
  // On mobile, shift back by (gap + peek) so the previous card peeks in on the left
  const offset = current * step - (mobile && current > 0 ? MOBILE_GAP + MOBILE_PEEK : 0);
  if (!animate) track.style.transition = 'none';
  track.style.transform = `translateX(-${offset}px)`;
  if (!animate) {
    track.getBoundingClientRect();
    track.style.transition = '';
  }
  if (!animate) sliderFill.style.transition = 'none';
  updateSlider();
  updateArrows();
  if (!animate) {
    sliderFill.getBoundingClientRect();
    sliderFill.style.transition = '';
  }
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
    currentFilter = btn.dataset.filter;
    updateCarouselVisibility();
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

  /* Carousel swipe / drag */
  let isDragging = false, dragStartX = 0, dragDeltaX = 0;

  function onDragStart(x) {
    isDragging = true; dragStartX = x; dragDeltaX = 0;
    track.style.transition = 'none';
  }
  function onDragMove(x) {
    if (!isDragging) return;
    dragDeltaX = x - dragStartX;
    track.style.transform = `translateX(-${current * getSlideStep() - dragDeltaX}px)`;
  }
  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    track.style.transition = '';
    if (Math.abs(dragDeltaX) > (isMobileCarousel() ? 30 : 80)) {
      goToSlide(dragDeltaX < 0 ? current + 1 : current - 1);
    } else {
      goToSlide(current);
    }
  }

  carouselViewport.addEventListener('touchstart', e => { onDragStart(e.touches[0].clientX); }, { passive: true });
  carouselViewport.addEventListener('touchmove',  e => { onDragMove(e.touches[0].clientX); },  { passive: true });
  carouselViewport.addEventListener('touchend',   () => { onDragEnd(); });
  carouselViewport.addEventListener('mousedown',  e => { onDragStart(e.clientX); e.preventDefault(); });
  window.addEventListener('mousemove', e => { if (isDragging) onDragMove(e.clientX); });
  window.addEventListener('mouseup',   onDragEnd);

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

/* Init + resize */
if (carouselViewport) {
  updateEventStates();
  updateCarouselVisibility();
  window.addEventListener('resize', () => {
    updateCarouselVisibility();
  }, { passive: true });

  // Check hourly if events have moved to past and re-filter
  setInterval(() => { updateEventStates(); updateCarouselVisibility(); }, 1000 * 60 * 60);
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

