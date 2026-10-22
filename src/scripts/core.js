import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const touch = matchMedia('(hover: none)').matches;
export const mobile = () => innerWidth <= 900;
export const DIM = 'rgba(243, 241, 237, 0.16)';
export const ACCENT = '#c4474d';
export const INK = '#f3f1ed';

document.documentElement.classList.add('js');
document.documentElement.classList.toggle('reduced', reduced);

/* ---------- découpage en mots / lettres ---------- */
function split(el, mode) {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  const nodes = [...el.childNodes];
  el.textContent = '';
  for (const n of nodes) {
    if (n.nodeType !== 3) {
      // <em>, <br> : on découpe aussi l'intérieur des balises de mise en forme
      if (n.nodeType === 1 && n.tagName !== 'BR' && n.childNodes.length) split(n, mode), n.removeAttribute('aria-label');
      el.append(n);
      continue;
    }
    for (const tok of n.textContent.split(/(\s+)/)) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) { el.append(' '); continue; }
      const w = document.createElement('span');
      w.className = 'word';
      w.setAttribute('aria-hidden', 'true');
      if (mode === 'chars') for (const c of tok) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; w.append(s); }
      else w.textContent = tok;
      el.append(w);
    }
  }
}
$$('.js-words').forEach((el) => split(el, 'words'));
$$('.js-chars').forEach((el) => split(el, 'chars'));

/* ---------- Lenis : scroll natif lissé, jamais de hijack ---------- */
export let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;
}
export function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY, behavior: reduced ? 'auto' : 'smooth' });
}
export const anchors = {}; // ancres spéciales (ex. une section dans un hero épinglé)

/* ---------- header, progression, menu ---------- */
const hdr = $('#hdr');
const bar = $('#progressBar');
let inFooter = false;
const setCompact = () => hdr?.classList.toggle('is-compact', scrollY > 30 && !inFooter);
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { if (bar) bar.style.transform = `scaleX(${s.progress.toFixed(4)})`; setCompact(); } });
ScrollTrigger.create({ trigger: '.footer', start: 'top 45%', onToggle: (s) => { inFooter = s.isActive; setCompact(); } });

const menu = $('#menu');
const menuBtn = $('#menuBtn');
const menuLinks = $$('.menu__list a');
let menuOpen = false;
function openMenu() {
  menuOpen = true;
  document.body.classList.add('menu-open');
  menuBtn.setAttribute('aria-expanded', 'true');
  menu.removeAttribute('inert');
  lenis?.stop();
  gsap.timeline()
    .set(menu, { visibility: 'visible' })
    .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0 : 0.9, ease: 'expo.inOut' })
    .fromTo(menuLinks, { yPercent: 110 }, { yPercent: 0, duration: reduced ? 0 : 0.9, stagger: 0.05, ease: 'expo.out' }, reduced ? 0 : 0.45)
    .fromTo('.menu__side', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, reduced ? 0 : 0.8);
  menuLinks[0]?.focus({ preventScroll: true });
}
export function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  document.body.classList.remove('menu-open');
  menuBtn.setAttribute('aria-expanded', 'false');
  menu.setAttribute('inert', '');
  lenis?.start();
  gsap.timeline()
    .to(menuLinks, { yPercent: -110, duration: reduced ? 0 : 0.5, stagger: 0.03, ease: 'power3.in' })
    .to(menu, { clipPath: 'inset(0% 0% 0% 100%)', duration: reduced ? 0 : 0.7, ease: 'expo.inOut' }, reduced ? 0 : 0.25)
    .set(menu, { visibility: 'hidden', clipPath: 'inset(0% 0% 100% 0%)' });
}
menuBtn?.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ---------- ancres de la page courante ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="#"]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname || !url.hash) return;
  e.preventDefault();
  closeMenu();
  if (url.hash === '#top') return scrollToTarget(0);
  if (anchors[url.hash] != null) return scrollToTarget(anchors[url.hash]());
  const el = $(url.hash);
  if (el) scrollToTarget(el);
});

/* ---------- vidéos : lecture uniquement à l'écran ---------- */
const vio = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const v = e.target;
    if (e.isIntersecting) {
      if (v.dataset.src && !v.src) { v.src = v.dataset.src; }
      if (!reduced) v.play().catch(() => {});
    } else v.pause();
  }
}, { rootMargin: '25% 0px' });
$$('video[data-autoplay]').forEach((v) => { v.muted = true; v.playsInline = true; vio.observe(v); });

/* ---------- lettre à lettre : gris → bordeaux → blanc ---------- */
export function charsTween(chars, opts = {}) {
  return gsap.to(chars, { keyframes: { color: [DIM, ACCENT, INK], easeEach: 'none' }, ease: 'none', duration: opts.duration ?? 0.5, stagger: opts.stagger ?? 0.08, ...opts.vars });
}

export function initReveals(scope = document) {
  if (reduced) return;
  $$('.js-chars', scope).forEach((el) => {
    if (el.closest('.hero') || el.dataset.manual != null) return;
    const long = el.classList.contains('js-chars--long');
    charsTween(el.querySelectorAll('.ch'), {
      duration: long ? 0.3 : 0.5,
      stagger: long ? 0.022 : 0.07,
      vars: { scrollTrigger: { trigger: el, start: long ? 'top 82%' : 'top 94%', end: long ? 'bottom 42%' : 'top 50%', scrub: 0.5 } },
    });
  });
  // apparitions génériques, réversibles au scroll
  $$('.js-reveal', scope).forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, y: 46 }, { autoAlpha: 1, y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 72%', scrub: 0.5 } });
  });
  $$('.js-parallax', scope).forEach((el) => {
    const k = +(el.dataset.speed || 12);
    gsap.fromTo(el, { yPercent: -k }, { yPercent: k, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---------- footer : les voitures sortent du noir, projecteur qui suit la souris ---------- */
(() => {
  const media = $('#footerMedia');
  if (!media) return;
  if (!reduced) {
    gsap.fromTo(media, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top 75%', end: 'top 5%', scrub: 0.6 } });
    gsap.fromTo('.footer__content > :not(h2)', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top 55%', end: 'top 10%', scrub: 0.6 } });
  }
  const target = { x: 0.5, y: 0.7 };
  const cur = { x: 0.5, y: 0.7 };
  let visible = false;
  let moved = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(media);
  media.parentElement.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = media.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width;
    target.y = Math.max(0.45, (e.clientY - r.top) / r.height);
    moved = performance.now();
  });
  gsap.ticker.add((time) => {
    if (!visible) return;
    if (touch || reduced || performance.now() - moved > 2600) { target.x = 0.5 + Math.sin(time * 0.45) * 0.32; target.y = 0.68; }
    cur.x += (target.x - cur.x) * 0.08;
    cur.y += (target.y - cur.y) * 0.08;
    media.style.setProperty('--mx', (cur.x * 100).toFixed(2) + '%');
    media.style.setProperty('--my', (cur.y * 100).toFixed(2) + '%');
  });
})();

/* ---------- formulaires : envoi par e-mail (pas de serveur), consentement obligatoire ---------- */
$$('form[data-mailto]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const lines = [];
    for (const [k, v] of data) if (k !== 'consent' && String(v).trim()) lines.push(`${form.querySelector(`[name="${k}"]`)?.dataset.label || k} : ${v}`);
    const subject = encodeURIComponent(form.dataset.subject || 'Demande depuis le site');
    const body = encodeURIComponent(lines.join('\n') + '\n\n— Envoyé depuis next-drive.fr');
    location.href = `mailto:${form.dataset.mailto}?subject=${subject}&body=${body}`;
    if (form.dataset.redirect) setTimeout(() => { location.href = form.dataset.redirect; }, 900);
  });
});

/* ---------- recalculs ---------- */
document.fonts?.ready.then(() => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh());
