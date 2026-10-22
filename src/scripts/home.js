import { gsap, ScrollTrigger, $, $$, reduced, mobile, charsTween, anchors, scrollToTarget } from './core.js';

const pad = (n) => String(n).padStart(3, '0');

/* ---------- séquence d'images du hero, dessinée sur canvas ---------- */
function createSequence(canvas) {
  const A = +canvas.dataset.a;
  const B = +canvas.dataset.b;
  const urls = [...Array(A)].map((_, i) => `/hero/a-${pad(i + 1)}.webp`).concat([...Array(B)].map((_, i) => `/hero/b-${pad(i + 1)}.webp`));
  const imgs = new Array(urls.length);
  const ctx = canvas.getContext('2d');
  let want = 0;
  let drawn = -1;

  const ready = (i) => imgs[i] && imgs[i].complete && imgs[i].naturalWidth > 0;
  function nearest(i) {
    for (let d = 0; d < urls.length; d++) {
      if (ready(i - d)) return i - d;
      if (ready(i + d)) return i + d;
    }
    return -1;
  }
  function draw() {
    const j = nearest(want);
    if (j < 0 || j === drawn) return;
    drawn = j;
    const im = imgs[j];
    const cw = canvas.width;
    const ch = canvas.height;
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s;
    const h = im.naturalHeight * s;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  function load(i) {
    if (imgs[i] || i < 0 || i >= urls.length) return;
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { if (Math.abs(i - want) < Math.abs(drawn - want) || drawn < 0) { drawn = -1; draw(); } };
    im.src = urls[i];
    imgs[i] = im;
  }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    drawn = -1;
    draw();
  }
  // chargement progressif : la 1re image, une sur huit, puis le reste
  load(0);
  const order = [];
  for (let step = 8; step >= 1; step = step === 1 ? 0 : Math.floor(step / 2)) for (let i = 0; i < urls.length; i += step) order.push(i);
  let k = 0;
  const pump = () => { for (let n = 0; n < 6 && k < order.length; n++) load(order[k++]); if (k < order.length) setTimeout(pump, 60); };
  addEventListener('load', pump, { once: true });
  if (document.readyState === 'complete') pump();
  addEventListener('resize', resize);
  resize();
  return { A, B, set(f) { want = Math.max(0, Math.min(urls.length - 1, Math.round(f))); load(want); draw(); } };
}

/* ---------- traînée d'images (souris + scroll) ---------- */
function createTrail(container) {
  const srcs = JSON.parse(container.dataset.src || '[]');
  const pool = srcs.map((src) => {
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.className = 'trail__img';
    img.src = src;
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
    const img = pool[n++ % pool.length];
    gsap.killTweensOf(img);
    gsap.set(img, { x: x - (img.offsetWidth || 170) / 2, y: y - (img.offsetHeight || 128) / 2, zIndex: n, autoAlpha: 1, scale: 0.55 });
    gsap.timeline().to(img, { scale: 1, duration: 0.5, ease: 'power3.out' }).to(img, { autoAlpha: 0, scale: 0.3, duration: 0.75, ease: 'power2.in' }, 0.6);
  }
  function feed(x, y) {
    if (!active) return;
    if (!last || Math.hypot(x - last.x, y - last.y) > gap()) { last = { x, y }; spawn(x, y); }
  }
  container.parentElement.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    lastPointer = performance.now();
    const r = container.getBoundingClientRect();
    feed(e.clientX - r.left, e.clientY - r.top);
  });
  return {
    set(v) { if (active !== v) { active = v; last = null; } },
    auto(t) {
      if (!active || performance.now() - lastPointer < 600) return;
      const a = t * Math.PI * 2;
      feed(container.clientWidth * (0.5 + 0.3 * Math.sin(a * 1.15 + 0.4)), container.clientHeight * (0.5 + 0.2 * Math.sin(a * 2.3)));
    },
  };
}

if (!reduced) {
  /* ====== 1. HERO épinglé ====== */
  const seq = createSequence($('#heroCanvas'));
  const trail = createTrail($('#trail'));
  const video = $('#approachVideo');
  let videoOn = false;
  const titleWords = $$('.hero__title .word');
  const stWords = $$('.hero__statement .word');
  const toCenter = (el, k) => { const r = el.getBoundingClientRect(); return (innerWidth / 2 - (r.left + r.width / 2)) * k; };
  const frame = { f: 0 };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hero', start: 'top top', end: () => '+=' + innerHeight * 3.8,
      pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 10,
      onUpdate: (s) => {
        const on = s.progress > 0.58 && s.progress < 0.8;
        trail.set(on);
        if (on) trail.auto((s.progress - 0.58) / 0.22);
        const want = s.progress > 0.74;
        if (want !== videoOn) {
          videoOn = want;
          if (want) { if (!video.src) video.src = video.dataset.src; video.play().catch(() => {}); } else video.pause();
        }
      },
    },
  });
  anchors['#methode'] = () => tl.scrollTrigger.end;

  tl.to('#cue', { autoAlpha: 0, duration: 0.03 }, 0)
    .to('.hero__foot', { autoAlpha: 0, y: 30, filter: 'blur(6px)', duration: 0.07 }, 0)
    .to(titleWords, { x: (i, el) => toCenter(el, 0.22), y: -22, filter: 'blur(14px)', autoAlpha: 0, duration: 0.1, stagger: { each: 0.016, from: 'end' }, ease: 'power1.in' }, 0.02)
    // la caméra plonge sur le capot…
    .to(frame, { f: seq.A - 1, duration: 0.3, onUpdate: () => seq.set(frame.f) }, 0)
    // … traverse le pare-brise : un voile très court masque la coupe…
    .to('#heroVeil', { opacity: 0.92, duration: 0.04 }, 0.275)
    .set(frame, { f: seq.A }, 0.315)
    .to(frame, { f: seq.A + seq.B - 1, duration: 0.15, onUpdate: () => seq.set(frame.f) }, 0.315)
    .to('#heroVeil', { opacity: 0.12, duration: 0.05 }, 0.315)
    // … et l'aiguille monte dans l'habitacle, puis tout s'assombrit
    .to('#heroVeil', { opacity: 0.88, duration: 0.08 }, 0.43)
    .fromTo(stWords, { autoAlpha: 0, filter: 'blur(16px)', x: 34, y: 4 }, { autoAlpha: 1, filter: 'blur(0px)', x: 0, y: 0, duration: 0.09, stagger: 0.016, ease: 'power2.out' }, 0.47)
    .to('#heroVeil', { opacity: 1, duration: 0.06 }, 0.55)
    // le cadre de la méthode s'ouvre depuis le centre
    .to(stWords, { filter: 'blur(10px)', autoAlpha: 0, duration: 0.06, stagger: { each: 0.004, from: 'random' } }, 0.8)
    .fromTo('.approach', { clipPath: 'inset(41% 37% 41% 37%)', autoAlpha: 0 }, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1, duration: 0.18, ease: 'power2.inOut' }, 0.8)
    .set('.approach', { autoAlpha: 1 }, 0.8)
    .fromTo('.approach__media', { scale: 1.45 }, { scale: 1, duration: 0.2, ease: 'power2.out' }, 0.8)
    .fromTo('.approach__arc path', { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.12, ease: 'power2.out' }, 0.88)
    .add(charsTween($$('.approach__title .ch'), { duration: 0.05, stagger: 0.003 }), 0.86)
    .fromTo('.steps li', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.02, ease: 'power2.out' }, 0.9)
    .fromTo('.approach__bottom', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.94)
    .to({}, { duration: 0.001 }, 1);

  $('#cue').addEventListener('click', () => scrollToTarget(innerHeight * 0.9));

  /* ====== 3. PILIERS ====== */
  const cardVids = $$('.pillars__card video');
  const bgImgs = $$('.pillars__bg img');
  $$('.pillar').forEach((item, i) => {
    if (!i) return;
    gsap.timeline({ scrollTrigger: { trigger: item, start: 'top 82%', end: 'top 30%', scrub: 0.6 } })
      .fromTo(cardVids[i], { clipPath: 'inset(46% 42% 46% 42%)', scale: 1.3 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, ease: 'power2.inOut' }, 0)
      .fromTo(bgImgs[i], { opacity: 0 }, { opacity: 1, ease: 'none' }, 0.15);
  });
  gsap.fromTo('.pillars__card', { yPercent: -38, scale: 0.9 }, { yPercent: -50, scale: 1, ease: 'none', scrollTrigger: { trigger: '.pillars', start: 'top bottom', end: 'top top', scrub: 0.6 } });
  gsap.fromTo('.pillars__bg', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.pillars', start: 'top top', end: 'bottom bottom', scrub: true } });
  gsap.matchMedia().add('(max-width: 900px)', () => {
    $$('.pillar').forEach((item) => gsap.to(item.children, { autoAlpha: 0, y: -24, ease: 'none', stagger: 0.04, scrollTrigger: { trigger: item.querySelector('.pillar__count'), start: 'top 62%', end: 'top 44%', scrub: 0.4 } }));
  });

  /* ====== 4. SHOWROOM : parallaxe de la photo ====== */
  gsap.fromTo('.manifesto__img', { y: () => innerHeight * 0.28 }, { y: () => -innerHeight * 0.18, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  gsap.fromTo('.manifesto__img img', { yPercent: 0 }, { yPercent: -23, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ====== 5. SERVICES : chaque image monte et recouvre la précédente ====== */
  const svcImgs = $$('.svc-img');
  $$('.svc').forEach((s, i) => {
    if (!i) return;
    gsap.timeline({ scrollTrigger: { trigger: s, start: () => (mobile() ? 'top 92%' : 'top bottom'), end: () => (mobile() ? 'top 55%' : 'top 38%'), scrub: 0.5, invalidateOnRefresh: true } })
      .fromTo(svcImgs[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
      .fromTo(svcImgs[i].firstElementChild, { yPercent: 12, scale: 1.12 }, { yPercent: 0, scale: 1, ease: 'none' }, 0)
      .to(svcImgs[i - 1].firstElementChild, { yPercent: -8, ease: 'none' }, 0);
  });

  /* ====== 6. ZÉRO FRAIS ====== */
  const road = { trigger: '.standard__road', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true };
  gsap.fromTo('.standard__side--l', { y: () => -innerHeight * 0.35 }, { y: () => innerHeight * 0.55, ease: 'none', scrollTrigger: { ...road } });
  gsap.fromTo('.standard__side--r', { y: () => -innerHeight * 0.15 }, { y: () => innerHeight * 0.75, ease: 'none', scrollTrigger: { ...road } });
  gsap.fromTo('.standard__car', { y: () => innerHeight * 0.1 }, { y: () => -innerHeight * 0.12, ease: 'none', scrollTrigger: { ...road } });

  /* ====== 7. STOCK → VENDRE (recouvrement) ====== */
  const a = $('.cover--a');
  gsap.fromTo(a.querySelector('.cover__media img'), { scale: 1.22 }, { scale: 1.04, ease: 'none', scrollTrigger: { trigger: a, start: 'top bottom', end: 'top top', scrub: true } });
  gsap.fromTo(a.querySelector('.cover__content'), { y: () => innerHeight * 0.2 }, { y: 0, ease: 'none', scrollTrigger: { trigger: a, start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true } });
  gsap.timeline({ scrollTrigger: { trigger: '.cover--b', start: 'top bottom', end: 'top top', scrub: true } })
    .to(a.querySelector('.cover__content'), { y: () => -innerHeight * 0.42, ease: 'none' }, 0)
    .to(a.querySelector('.cover__media'), { filter: 'brightness(0.45)', ease: 'none' }, 0);
  gsap.fromTo('.cover--b .cover__media img', { scale: 1.25, yPercent: -6 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.cover--b', start: 'top bottom', end: 'top top', scrub: true } });

  /* ====== 8. AVIS : la bande défile à l'horizontale ====== */
  const track = $('#reviewsTrack');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.reviews', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true } });
}
