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
  { el: document.getElementById('aboutStage2'), at: 0.22, done: false, doneAt: 0 },
  { el: document.getElementById('aboutStage3'), at: 0.48, done: false, doneAt: 0 },
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
  setTimeout(updateHero, 610);
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
    const wait = prev ? 600 - (Date.now() - prev.doneAt) : 0;
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
let musicSeek           = null;

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
  const step        = getMusicSlideStep();
  const mobile      = isMobileMusic();
  const pixelOffset = musicCurrent * step - (mobile && musicCurrent > 0 ? MOBILE_MUSIC_GAP + MOBILE_MUSIC_PEEK : 0);
  if (musicSeek) {
    musicSeek(-pixelOffset, animate);
  } else {
    if (!animate) musicTrack.style.transition = 'none';
    musicTrack.style.transform = `translateX(-${pixelOffset}px)`;
    if (!animate) { musicTrack.getBoundingClientRect(); musicTrack.style.transition = ''; }
  }
  if (!animate) musicSliderFill.style.transition = 'none';
  updateMusicSlider();
  updateMusicArrows();
  if (!animate) { musicSliderFill.getBoundingClientRect(); musicSliderFill.style.transition = ''; }
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

function initMusicCarousel() {
  if (!musicViewport) return;

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

  const { seekTo } = initFreeScrollCarousel(musicTrack, musicTrack.closest('.carousel__clip'));
  musicSeek = seekTo;
  setMusicSlideWidths();
  window.addEventListener('resize', setMusicSlideWidths, { passive: true });
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    initMusicCarousel();
    if (musicTrack) musicTrack.style.visibility = 'visible';
  });
} else {
  initMusicCarousel();
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

/* ─── Mobile about hero image ────────────────────────────────── */
(function () {
  var src = document.getElementById('mobileAboutSource');
  if (!src || window.innerWidth > 768) return;
  src.srcset = 'assets/images/mobileabout.jpeg';
})();
