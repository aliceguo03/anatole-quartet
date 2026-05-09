/* ─── Nav scroll behavior ────────────────────────────────────── */
const nav = document.getElementById('nav');

function updateNav() {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* ─── Scroll-locked hero: progressive text reveal ────────────── */
/*
  The wrapper is 200vh. The sticky inner panel is locked for
  (200vh - 100vh) = 100vh of scroll. Stages trigger at:

    Stage 1 — 0 %    (visible on page open)
    Stage 2 — 15 %   (~15vh scrolled)
    Stage 3 — 30 %   (~30vh scrolled)
*/
const wrapper = document.getElementById('aboutHeroWrap');

const stages = [
  { el: document.getElementById('aboutStage1'), at: 0.00, done: false, doneAt: 0 },
  { el: document.getElementById('aboutStage2'), at: 0.15, done: false, doneAt: 0 },
  { el: document.getElementById('aboutStage3'), at: 0.30, done: false, doneAt: 0 },
];

function heroProgress() {
  const top         = wrapper.getBoundingClientRect().top;
  const totalScroll = wrapper.offsetHeight - window.innerHeight;
  return Math.max(0, Math.min(1, -top / totalScroll));
}

function triggerStage(stage) {
  stage.done   = true;
  stage.doneAt = Date.now();
  stage.el.classList.add('visible');
  setTimeout(updateHero, 460); // chain: check next stage after animation
}

function updateHero() {
  const p = heroProgress();

  // Reset stages when scrolling back — stage 0 always stays visible
  for (let i = stages.length - 1; i >= 1; i--) {
    if (stages[i].done && p < stages[i].at) {
      stages[i].done   = false;
      stages[i].doneAt = 0;
      stages[i].el.classList.remove('visible');
    }
  }

  // Trigger the next pending stage, one at a time with a 450ms gap
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (stage.done) continue;
    if (p < stage.at) break;
    const prev = stages[i - 1];
    if (prev && !prev.done) break;
    const wait = prev ? 450 - (Date.now() - prev.doneAt) : 0;
    if (wait <= 0) {
      triggerStage(stage);
    } else {
      setTimeout(updateHero, wait);
    }
    break;
  }
}

if (wrapper) {
  window.addEventListener('scroll', updateHero, { passive: true });
  updateHero();
}

/* ─── Scroll-triggered reveals ───────────────────────────────── */
const triggeredGroups = new WeakSet();

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    revealObs.unobserve(el);
    const group = el.closest('.footer__inner, .team__header');
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

/* ─── Music carousel ─────────────────────────────────────────── */
const musicViewport   = document.getElementById('musicViewport');
const musicTrack      = document.getElementById('musicTrack');
const musicSlides     = document.querySelectorAll('#musicTrack .carousel__slide');
const musicSliderWrap = document.getElementById('musicSliderWrap');
const musicSliderFill = document.getElementById('musicSliderFill');
const musicPrevBtn    = document.getElementById('musicPrev');
const musicNextBtn    = document.getElementById('musicNext');
const MUSIC_GAP         = 24;
const MOBILE_MUSIC_GAP  = 16;
const MOBILE_MUSIC_PEEK = 20;
let musicCurrent        = 0;

function isMobileMusic() { return window.innerWidth <= 768; }

function getMusicSlides() {
  return Array.from(musicSlides);
}

function getMusicSlideStep() {
  const s = getMusicSlides()[0];
  return s ? s.getBoundingClientRect().width + (isMobileMusic() ? MOBILE_MUSIC_GAP : MUSIC_GAP) : 0;
}

function updateMusicSlider() {
  musicSliderFill.style.transform = `translateX(${musicCurrent * 100}%)`;
}

function updateMusicArrows() {
  if (!musicPrevBtn || !musicNextBtn) return;
  musicPrevBtn.disabled = musicCurrent <= 0;
  musicNextBtn.disabled = musicCurrent >= musicSlides.length - 1;
}

function goToMusicSlide(index, animate = true) {
  const slides = getMusicSlides();
  musicCurrent = Math.max(0, Math.min(index, slides.length - 1));
  const step   = getMusicSlideStep();
  const mobile = isMobileMusic();
  const offset = musicCurrent * step - (mobile && musicCurrent > 0 ? MOBILE_MUSIC_GAP + MOBILE_MUSIC_PEEK : 0);
  if (!animate) musicTrack.style.transition = 'none';
  musicTrack.style.transform = `translateX(-${offset}px)`;
  if (!animate) {
    musicTrack.getBoundingClientRect();
    musicTrack.style.transition = '';
  }
  if (!animate) musicSliderFill.style.transition = 'none';
  updateMusicSlider();
  updateMusicArrows();
  if (!animate) {
    musicSliderFill.getBoundingClientRect();
    musicSliderFill.style.transition = '';
  }
}

function setMusicSlideWidths() {
  const vpWidth    = musicViewport.offsetWidth;
  const mobile     = isMobileMusic();
  const slideWidth = mobile
    ? Math.round(vpWidth * 0.80)
    : (vpWidth - MUSIC_GAP) / 1.6;
  getMusicSlides().forEach(s => { s.style.flexBasis = `${slideWidth}px`; });
  goToMusicSlide(musicCurrent, false);
}

if (musicPrevBtn) musicPrevBtn.addEventListener('click', () => goToMusicSlide(musicCurrent - 1));
if (musicNextBtn) musicNextBtn.addEventListener('click', () => goToMusicSlide(musicCurrent + 1));

if (musicViewport) {
  /* Slider: click or drag to seek */
  let musicSliderActive = false;

  function seekMusicFromEvent(e) {
    const rect = musicSliderWrap.querySelector('.carousel__slider-track').getBoundingClientRect();
    const t    = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const slides = getMusicSlides();
    goToMusicSlide(Math.round(t * (slides.length - 1)));
  }

  musicSliderWrap.addEventListener('mousedown', e => { musicSliderActive = true; seekMusicFromEvent(e); e.preventDefault(); });
  window.addEventListener('mousemove', e => { if (musicSliderActive) seekMusicFromEvent(e); });
  window.addEventListener('mouseup', () => { musicSliderActive = false; });

  musicSliderWrap.addEventListener('touchstart', e => seekMusicFromEvent(e.touches[0]), { passive: true });
  musicSliderWrap.addEventListener('touchmove',  e => seekMusicFromEvent(e.touches[0]), { passive: true });

  /* Carousel swipe / drag */
  let musicDragging = false, musicDragStartX = 0, musicDragStartY = 0, musicDragDeltaX = 0, musicDragStartOffset = 0, musicDragDir = null;

  function onMusicDragStart(x, y, needsDir) {
    musicDragging = true; musicDragStartX = x; musicDragStartY = y; musicDragDeltaX = 0;
    musicDragDir = needsDir ? null : 'h';
    const mobile = isMobileMusic();
    musicDragStartOffset = musicCurrent * getMusicSlideStep() - (mobile && musicCurrent > 0 ? MOBILE_MUSIC_GAP + MOBILE_MUSIC_PEEK : 0);
    musicTrack.style.transition = 'none';
  }
  function onMusicDragMove(x, y, e) {
    if (!musicDragging) return;
    if (musicDragDir === null) {
      const ax = Math.abs(x - musicDragStartX), ay = Math.abs(y - musicDragStartY);
      if (ax < 4 && ay < 4) return;
      musicDragDir = ax >= ay ? 'h' : 'v';
    }
    if (musicDragDir === 'v') { musicDragging = false; musicTrack.style.transition = ''; return; }
    if (e && e.cancelable) e.preventDefault();
    musicDragDeltaX = x - musicDragStartX;
    musicTrack.style.transform = `translateX(-${musicDragStartOffset - musicDragDeltaX}px)`;
  }
  function onMusicDragEnd() {
    if (!musicDragging) return;
    musicDragging = false;
    musicTrack.style.transition = '';
    const slides = getMusicSlides();
    const step = getMusicSlideStep();
    const maxOffset = Math.max(0, (slides.length - 1) * step);
    const finalOffset = Math.max(0, Math.min(musicDragStartOffset - musicDragDeltaX, maxOffset));
    musicTrack.style.transform = `translateX(-${finalOffset}px)`;
    musicCurrent = Math.max(0, Math.min(Math.round(finalOffset / step), slides.length - 1));
    updateMusicSlider();
    updateMusicArrows();
  }

  musicViewport.addEventListener('touchstart', e => { onMusicDragStart(e.touches[0].clientX, e.touches[0].clientY, true); }, { passive: true });
  musicViewport.addEventListener('touchmove',  e => { onMusicDragMove(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
  musicViewport.addEventListener('touchend',   () => { onMusicDragEnd(); });
  musicViewport.addEventListener('touchcancel', () => { musicDragging = false; });
  musicViewport.addEventListener('mousedown',  e => { onMusicDragStart(e.clientX, 0, false); e.preventDefault(); });
  window.addEventListener('mousemove', e => { if (musicDragging) onMusicDragMove(e.clientX, 0, null); });
  window.addEventListener('mouseup',   onMusicDragEnd);

  musicViewport.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goToMusicSlide(musicCurrent - 1);
    if (e.key === 'ArrowRight') goToMusicSlide(musicCurrent + 1);
  });

  /* Trackpad horizontal swipe */
  let musicWheelAccum    = 0;
  let musicWheelTimer    = null;
  let musicWheelCooldown = false;
  musicViewport.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.5) return;
    e.preventDefault();
    if (musicWheelCooldown) return;
    musicWheelAccum += e.deltaX;
    clearTimeout(musicWheelTimer);
    musicWheelTimer = setTimeout(() => { musicWheelAccum = 0; }, 300);
    if (Math.abs(musicWheelAccum) > 100) {
      goToMusicSlide(musicWheelAccum > 0 ? musicCurrent + 1 : musicCurrent - 1);
      musicWheelAccum = 0;
      musicWheelCooldown = true;
      setTimeout(() => { musicWheelCooldown = false; }, 700);
    }
  }, { passive: false });

  setMusicSlideWidths();
  window.addEventListener('resize', setMusicSlideWidths, { passive: true });
}

/* ─── Team accordion ─────────────────────────────────────────── */
const teamAccordion = document.getElementById('teamAccordion');
if (teamAccordion) {
  const members = Array.from(teamAccordion.querySelectorAll('.team__member'));

  function equalizeDrawerHeights() {
    let maxH = 0;
    members.forEach(m => {
      const inner = m.querySelector('.team__body-inner');
      if (inner && inner.scrollHeight > maxH) maxH = inner.scrollHeight;
    });
    if (maxH > 0) {
      const cap = Math.round(window.innerHeight * 0.85);
      teamAccordion.style.setProperty('--team-drawer-height', Math.min(maxH, cap) + 'px');
    }
  }

  members.forEach(member => {
    const trigger = member.querySelector('.team__trigger');
    trigger.addEventListener('click', () => {
      const isOpen = member.classList.contains('team__member--open');
      members.forEach(m => {
        m.classList.remove('team__member--open');
        m.querySelector('.team__trigger').setAttribute('aria-expanded', 'false');
        m.querySelector('.team__expand-text').textContent = 'EXPAND';
      });
      if (!isOpen) {
        member.classList.add('team__member--open');
        trigger.setAttribute('aria-expanded', 'true');
        trigger.querySelector('.team__expand-text').textContent = 'COLLAPSE';
      }
    });
  });

  window.addEventListener('load', equalizeDrawerHeights);
  let teamResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(teamResizeTimer);
    teamResizeTimer = setTimeout(equalizeDrawerHeights, 150);
  }, { passive: true });
}

/* ─── Smooth scroll for # links ──────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ─── Open team drawer from URL hash ─────────────────────────── */
(function () {
  var hash = window.location.hash.slice(1);
  if (!hash) return;
  window.addEventListener('load', function () {
    var trigger = document.getElementById(hash);
    if (!trigger || !trigger.classList.contains('team__trigger')) return;
    setTimeout(function () {
      trigger.click();
      trigger.closest('.team__member').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  });
})();

/* ─── Mobile about hero image: handle .JPG / .jpg capitalisation ── */
(function () {
  var src = document.getElementById('mobileAboutSource');
  if (!src || window.innerWidth > 768) return;
  var test = new Image();
  test.onerror = function () { src.srcset = 'assets/images/mobileabout.jpg'; };
  test.src = 'assets/images/mobileabout.JPG';
})();
