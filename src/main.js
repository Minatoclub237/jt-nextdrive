import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;
const mobile = () => innerWidth <= 900;

const DIM = 'rgba(243, 241, 237, 0.16)';
const RED = '#d22630';
const INK = '#f3f1ed';

document.documentElement.classList.toggle('reduced', reduced);

/* ---------- découpage en mots / lettres ---------- */
function split(el, mode) {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  const nodes = [...el.childNodes];
  el.textContent = '';
  for (const n of nodes) {
    if (n.nodeType !== 3) { el.append(n); continue; }
    for (const tok of n.textContent.split(/(\s+)/)) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) { el.append(' '); continue; }
      const w = document.createElement('span');
      w.className = 'word';
      w.setAttribute('aria-hidden', 'true');
      if (mode === 'chars') {
        for (const c of tok) {
          const s = document.createElement('span');
          s.className = 'ch';
          s.textContent = c;
          w.append(s);
        }
      } else w.textContent = tok;
      el.append(w);
    }
  }
}
$$('.js-words').forEach((el) => split(el, 'words'));
$$('.js-chars').forEach((el) => split(el, 'chars'));

/* ---------- Lenis (scroll natif lissé, jamais de hijack) ---------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;
}

/* ---------- header, progression, menu ---------- */
const hdr = $('#hdr');
const bar = $('#progressBar');
let inFooter = false;
const setCompact = () => hdr.classList.toggle('is-compact', scrollY > 30 && !inFooter);
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (s) => { bar.style.transform = `scaleX(${s.progress.toFixed(4)})`; setCompact(); },
});
ScrollTrigger.create({ trigger: '.footer', start: 'top 45%', onToggle: (s) => { inFooter = s.isActive; setCompact(); } });

const menu = $('#menu');
const menuBtn = $('#menuBtn');
const menuLinks = $$('.menu__list a');
let menuOpen = false;
function openMenu() {
  menuOpen = true;
  document.body.classList.add('menu-open');
  menuBtn.setAttribute('aria-expanded', 'true');
  menu.setAttribute('aria-hidden', 'false');
  lenis?.stop();
  gsap.timeline()
    .set(menu, { visibility: 'visible' })
    .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' })
    .fromTo(menuLinks, { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out' }, 0.45)
    .fromTo('.menu__foot', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0.8);
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  document.body.classList.remove('menu-open');
  menuBtn.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');
  lenis?.start();
  gsap.timeline()
    .to(menuLinks, { yPercent: -110, duration: 0.5, stagger: 0.03, ease: 'power3.in' })
    .to(menu, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.7, ease: 'expo.inOut' }, 0.25)
    .set(menu, { visibility: 'hidden', clipPath: 'inset(0% 0% 100% 0%)' });
}
menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ---------- ancres ---------- */
let heroST = null;
function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY, behavior: reduced ? 'auto' : 'smooth' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  e.preventDefault();
  closeMenu();
  if (id === '#top') return scrollToTarget(0);
  if (id === '#methode' && heroST) return scrollToTarget(heroST.end);
  const el = $(id);
  if (el) scrollToTarget(el);
});
$('#cue').addEventListener('click', () => scrollToTarget(innerHeight * 0.9));

/* ---------- traînée d'images (souris + scroll) ---------- */
function createTrail(container, srcs) {
  const pool = srcs.map((src) => {
    const img = new Image();
    img.src = src;
    img.alt = '';
    img.decoding = 'async';
    img.className = 'trail__img';
    container.append(img);
    gsap.set(img, { autoAlpha: 0 });
    return img;
  });
  let n = 0;
  let last = null;
  let active = false;
  let lastPointer = 0;
  const gap = () => Math.max(70, innerWidth * 0.055);

  function spawn(x, y) {
    const img = pool[n % pool.length];
    n++;
    gsap.killTweensOf(img);
    const w = img.offsetWidth || 160;
    const h = img.offsetHeight || 120;
    gsap.set(img, { x: x - w / 2, y: y - h / 2, zIndex: n, autoAlpha: 1, scale: 0.55 });
    gsap.timeline()
      .to(img, { scale: 1, duration: 0.5, ease: 'power3.out' })
      .to(img, { autoAlpha: 0, scale: 0.3, duration: 0.75, ease: 'power2.in' }, 0.6);
  }
  function feed(x, y) {
    if (!active) return;
    if (!last || Math.hypot(x - last.x, y - last.y) > gap()) {
      last = { x, y };
      spawn(x, y);
    }
  }
  container.parentElement.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    lastPointer = performance.now();
    const r = container.getBoundingClientRect();
    feed(e.clientX - r.left, e.clientY - r.top);
  });
  return {
    set(v) { if (active !== v) { active = v; last = null; } },
    // sans souris (tactile, ou scroll seul) : la traînée suit une courbe pilotée par le scroll
    auto(t) {
      if (!active || performance.now() - lastPointer < 600) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const a = t * Math.PI * 2;
      feed(w * (0.5 + 0.3 * Math.sin(a * 1.15 + 0.4)), h * (0.5 + 0.2 * Math.sin(a * 2.3)));
    },
  };
}

/* ---------- révélation lettre à lettre (gris → rouge → blanc) ---------- */
function charsTween(chars, opts = {}) {
  return gsap.to(chars, {
    keyframes: { color: [DIM, RED, INK], easeEach: 'none' },
    ease: 'none',
    duration: opts.duration ?? 0.5,
    stagger: opts.stagger ?? 0.08,
    ...opts.vars,
  });
}

if (!reduced) {
  /* ====== 1. HERO épinglé : zoom → habitacle → manifeste → traînée → ouverture du cadre ====== */
  const trail = createTrail($('#trail'), Array.from({ length: 12 }, (_, i) => `/img/trail-${String(i + 1).padStart(2, '0')}.webp`));
  const titleWords = $$('.hero__title .word');
  const stWords = $$('.hero__statement .word');
  const apTitle = $$('.approach__title .ch');
  const toCenter = (el, k) => {
    const r = el.getBoundingClientRect();
    return (innerWidth / 2 - (r.left + r.width / 2)) * k;
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: () => '+=' + innerHeight * 3.6,
      pin: true,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      refreshPriority: 10,
      onUpdate: (s) => {
        const on = s.progress > 0.57 && s.progress < 0.8;
        trail.set(on);
        if (on) trail.auto((s.progress - 0.57) / 0.23);
      },
    },
  });
  heroST = tl.scrollTrigger;

  tl.to('#cue', { autoAlpha: 0, duration: 0.03 }, 0)
    .to('.hero__sub', { autoAlpha: 0, y: 24, filter: 'blur(6px)', duration: 0.07 }, 0)
    // la caméra plonge vers la voiture du centre, les deux autres s'écartent
    .to('.hero__cars', { scale: 2.6, duration: 0.26, ease: 'power1.in' }, 0)
    .to('.hero__car--l', { xPercent: -28, duration: 0.26, ease: 'power1.in' }, 0)
    .to('.hero__car--r', { xPercent: 28, duration: 0.26, ease: 'power1.in' }, 0)
    // le titre se resserre et se dissout, mot après mot depuis la fin
    .to(titleWords, {
      x: (i, el) => toCenter(el, 0.22),
      y: -22,
      filter: 'blur(14px)',
      autoAlpha: 0,
      duration: 0.1,
      stagger: { each: 0.018, from: 'end' },
      ease: 'power1.in',
    }, 0.02)
    // on traverse le pare-brise : l'habitacle prend le relais
    .to('.hero__cars', { scale: 5.2, autoAlpha: 0, duration: 0.14, ease: 'power2.in' }, 0.26)
    .fromTo('.hero__interior', { autoAlpha: 0, scale: 1.5 }, { autoAlpha: 1, scale: 1.14, duration: 0.16, ease: 'power1.out' }, 0.25)
    .to('.hero__interior', { scale: 1.02, duration: 0.2 }, 0.41)
    .to('.hero__veil', { opacity: 0.86, duration: 0.12 }, 0.4)
    // le manifeste apparaît mot à mot, dans le flou
    .fromTo(stWords,
      { autoAlpha: 0, filter: 'blur(16px)', x: 34, y: 4 },
      { autoAlpha: 1, filter: 'blur(0px)', x: 0, y: 0, duration: 0.09, stagger: 0.014, ease: 'power2.out' },
      0.45)
    .to('.hero__veil', { opacity: 1, duration: 0.08 }, 0.54)
    // le cadre de la méthode s'ouvre depuis le centre
    .to(stWords, { filter: 'blur(10px)', autoAlpha: 0, duration: 0.06, stagger: { each: 0.004, from: 'random' } }, 0.8)
    .fromTo('.approach',
      { clipPath: 'inset(41% 37% 41% 37%)', autoAlpha: 0 },
      { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1, duration: 0.18, ease: 'power2.inOut' },
      0.8)
    .set('.approach', { autoAlpha: 1 }, 0.8)
    .fromTo('.approach__img', { scale: 1.45 }, { scale: 1, duration: 0.2, ease: 'power2.out' }, 0.8)
    .fromTo('.approach__arc path', { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.12, ease: 'power2.out' }, 0.88)
    .add(charsTween(apTitle, { duration: 0.05, stagger: 0.004 }), 0.86)
    .fromTo('.approach__bottom > *', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.08, stagger: 0.03, ease: 'power2.out' }, 0.9)
    .to({}, { duration: 0.001 }, 1);

  /* ====== 3. PILIERS : la carte reste, les images s'ouvrent depuis le centre ====== */
  const cardImgs = $$('.pillars__card img');
  const bgImgs = $$('.pillars__bg img');
  $$('.pillar').forEach((item, i) => {
    if (i === 0) return;
    gsap.timeline({ scrollTrigger: { trigger: item, start: 'top 82%', end: 'top 30%', scrub: 0.6 } })
      .fromTo(cardImgs[i], { clipPath: 'inset(46% 42% 46% 42%)', scale: 1.3 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, ease: 'power2.inOut' }, 0)
      .fromTo(bgImgs[i], { opacity: 0 }, { opacity: 1, ease: 'none' }, 0.15);
  });
  gsap.fromTo('.pillars__card', { yPercent: -38, scale: 0.9 }, {
    yPercent: -50, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.pillars', start: 'top bottom', end: 'top top', scrub: 0.6 },
  });
  // mobile : la carte est en haut, le texte s'efface avant de passer dessous
  gsap.matchMedia().add('(max-width: 900px)', () => {
    $$('.pillar').forEach((item) => {
      gsap.to(item.children, {
        autoAlpha: 0, y: -24, ease: 'none', stagger: 0.04,
        scrollTrigger: { trigger: item.querySelector('.pillar__count'), start: 'top 62%', end: 'top 44%', scrub: 0.4 },
      });
    });
  });
  gsap.fromTo('.pillars__bg', { yPercent: -6 }, {
    yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.pillars', start: 'top top', end: 'bottom bottom', scrub: true },
  });

  /* ====== 4. MANIFESTE : parallaxe de la jante ====== */
  gsap.fromTo('.manifesto__img', { y: () => innerHeight * 0.28 }, {
    y: () => -innerHeight * 0.18, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
  gsap.fromTo('.manifesto__img img', { yPercent: 0 }, {
    yPercent: -23, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* ====== 5. PRESTATIONS : chaque image monte et recouvre la précédente ====== */
  const svcImgs = $$('.svc-img');
  $$('.svc').forEach((s, i) => {
    if (i === 0) return;
    gsap.timeline({
      scrollTrigger: { trigger: s, start: () => (mobile() ? 'top 92%' : 'top bottom'), end: () => (mobile() ? 'top 55%' : 'top 38%'), scrub: 0.5, invalidateOnRefresh: true },
    })
      .fromTo(svcImgs[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
      .fromTo(svcImgs[i].firstElementChild, { yPercent: 12, scale: 1.12 }, { yPercent: 0, scale: 1, ease: 'none' }, 0)
      .to(svcImgs[i - 1].firstElementChild, { yPercent: -8, ease: 'none' }, 0);
  });

  /* ====== 6. LE STANDARD : la voiture traverse, les voisines vont moins vite ====== */
  const road = { trigger: '.standard__road', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true };
  gsap.fromTo('.standard__side--l', { y: () => -innerHeight * 0.35 }, { y: () => innerHeight * 0.55, ease: 'none', scrollTrigger: road });
  gsap.fromTo('.standard__side--r', { y: () => -innerHeight * 0.15 }, { y: () => innerHeight * 0.75, ease: 'none', scrollTrigger: { ...road } });
  gsap.fromTo('.standard__car', { y: () => innerHeight * 0.1 }, { y: () => -innerHeight * 0.12, ease: 'none', scrollTrigger: { ...road } });

  /* ====== 7. RÉALISATIONS → STOCK (recouvrement) ====== */
  const builds = $('.cover--builds');
  gsap.fromTo(builds.querySelector('.cover__media img'), { scale: 1.22 }, {
    scale: 1.04, ease: 'none', scrollTrigger: { trigger: builds, start: 'top bottom', end: 'top top', scrub: true },
  });
  gsap.timeline({ scrollTrigger: { trigger: '.cover--stock', start: 'top bottom', end: 'top top', scrub: true } })
    .to(builds.querySelector('.cover__content'), { y: () => -innerHeight * 0.42, ease: 'none' }, 0)
    .to(builds.querySelector('.cover__media'), { filter: 'brightness(0.45)', ease: 'none' }, 0);
  gsap.fromTo('.cover--stock .cover__media img', { scale: 1.25, yPercent: -6 }, {
    scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.cover--stock', start: 'top bottom', end: 'top top', scrub: true },
  });
  gsap.fromTo('.cover--builds .cover__content', { y: () => innerHeight * 0.2 }, {
    y: 0, ease: 'none', scrollTrigger: { trigger: builds, start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true },
  });

  /* ====== 8. FOOTER : les voitures sortent du noir ====== */
  gsap.fromTo('.footer__media', { autoAlpha: 0, scale: 1.08 }, {
    autoAlpha: 1, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top 75%', end: 'top 5%', scrub: 0.6 },
  });
  gsap.fromTo('.footer__content > :not(h2), .footer__top', { autoAlpha: 0, y: 30 }, {
    autoAlpha: 1, y: 0, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top 55%', end: 'top 10%', scrub: 0.6 },
  });

  /* ====== titres : lettre à lettre, gris → rouge → blanc ====== */
  $$('.js-chars').forEach((el) => {
    if (el.closest('.hero')) return;
    const long = el.classList.contains('js-chars--long');
    charsTween(el.querySelectorAll('.ch'), {
      duration: long ? 0.3 : 0.5,
      stagger: long ? 0.022 : 0.07,
      vars: {
        scrollTrigger: {
          trigger: el,
          start: long ? 'top 82%' : 'top 94%',
          end: long ? 'bottom 42%' : 'top 50%',
          scrub: 0.5,
        },
      },
    });
  });
}

/* ---------- footer : projecteur qui suit la souris ---------- */
(() => {
  const media = $('#footerMedia');
  const target = { x: 0.5, y: 0.72 };
  const cur = { x: 0.5, y: 0.72 };
  let visible = false;
  let moved = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(media);
  media.parentElement.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = media.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width;
    target.y = Math.max(0.5, (e.clientY - r.top) / r.height);
    moved = performance.now();
  });
  gsap.ticker.add((time) => {
    if (!visible) return;
    if (touch || reduced || performance.now() - moved > 2600) {
      // sans souris, le projecteur balaie lentement les trois voitures
      target.x = 0.5 + Math.sin(time * 0.45) * 0.3;
      target.y = 0.72;
    }
    cur.x += (target.x - cur.x) * 0.08;
    cur.y += (target.y - cur.y) * 0.08;
    media.style.setProperty('--mx', (cur.x * 100).toFixed(2) + '%');
    media.style.setProperty('--my', (cur.y * 100).toFixed(2) + '%');
  });
})();

/* ---------- recalculs ---------- */
document.fonts?.ready.then(() => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh());
