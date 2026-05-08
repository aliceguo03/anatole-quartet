/* ─── Gallery images — edit this array to add / remove photos ── */
/* Order is manually curated so photos from the same shoot are never adjacent. */
const GALLERY_IMAGES = [
  'AnatoleQuartet.JPG',   // group formal
  'IMG_8560.jpg',          // outdoor
  'IMG_8308.jpg',          // B&W wall
  'IMG_8685.jpg',          // outdoor late
  'IMG_4934.JPG',          // candid table
  'IMG_8437.jpg',          // B&W
  'IMG_8615.jpg',          // outdoor
  'IMG_8348.jpg',          // B&W wall
  'IMG_8549.jpg',          // outdoor
  'IMG_8321-2.jpg',        // B&W wall
  'IMG_8582.jpg',          // outdoor
  'IMG_4937.JPG',          // candid table (7 slots after IMG_4934)
  'IMG_8418.jpg',          // B&W
  'IMG_8550.jpg',          // outdoor (5 slots after IMG_8549)
  'IMG_8363-2.jpg',        // B&W wall
  'IMG_8554.jpg',          // outdoor
  'IMG_8431.jpg',          // B&W
  'IMG_8516.JPEG',         // outdoor
];

/* ─── Build grid ─────────────────────────────────────────────── */
const grid = document.getElementById('galleryGrid');

GALLERY_IMAGES.forEach((filename, i) => {
  const item = document.createElement('div');
  item.className = 'gallery__item';
  // Stagger within groups of 3 (one visual row), max 240ms
  item.style.transitionDelay = `${(i % 3) * 80}ms`;

  const img = document.createElement('img');
  img.src = `assets/gallery/${filename}`;
  img.alt = `Anatole Quartet — photo ${i + 1}`;
  img.className = 'gallery__item-img';
  img.loading = 'lazy';

  const overlay = document.createElement('div');
  overlay.className = 'gallery__item-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  item.appendChild(img);
  item.appendChild(overlay);
  grid.appendChild(item);
});

/* ─── Scroll-down indicator fade ────────────────────────────── */
const scrollIndicator = document.getElementById('scrollIndicator');
const galleryHero     = document.getElementById('galleryHero');

window.addEventListener('scroll', () => {
  const heroHeight = galleryHero.offsetHeight;
  const progress   = Math.min(window.scrollY / (heroHeight * 0.35), 1);
  scrollIndicator.style.opacity = 1 - progress;
}, { passive: true });

/* ─── Scroll reveals ─────────────────────────────────────────── */
const galleryRevealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    galleryRevealObs.unobserve(entry.target);
    entry.target.classList.add('visible');
  });
}, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

document.querySelectorAll('.gallery__item').forEach(item => {
  galleryRevealObs.observe(item);
});
