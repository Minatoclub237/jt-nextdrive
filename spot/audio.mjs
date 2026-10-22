// Sound design du spot, synthétisé et calé sur le storyboard (120 BPM, un temps = 0,5 s) → spot/out/audio.wav
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000, DUR = 20, N = SR * DUR;
const bus = () => [new Float32Array(N), new Float32Array(N)];
const mus = bus(), sfx = bus(), rev = bus();
let seed = 11;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const TAU = Math.PI * 2;

// pose un son : fn(t, p) → échantillon, p = progression 0→1 ; fondu de 5 ms aux deux bouts
function put(b, t0, dur, fn, g = 1, pan = 0, send = 0) {
  const s0 = Math.round(t0 * SR), n = Math.round(dur * SR), f5 = 0.005 * SR;
  const gl = g * Math.cos(((pan + 1) * Math.PI) / 4), gr = g * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    const v = fn(i / SR, i / n) * Math.min(1, i / f5, (n - i) / f5);
    b[0][k] += v * gl; b[1][k] += v * gr;
    if (send) { rev[0][k] += v * gl * send; rev[1][k] += v * gr * send; }
  }
}
const lp = (fc) => { const a = 1 - Math.exp((-TAU * fc) / SR); let y = 0; return (x) => (y += a * (x - y)); };
const svf = () => { let lo = 0, bp = 0; return (x, fc, q = 0.6) => { const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR); lo += f * bp; const hi = x - lo - q * bp; bp += f * hi; return bp; }; };
const osc = () => { let ph = 0; return (f) => Math.sin((ph += (TAU * f) / SR)); };

// ---------- instruments ----------
const kick = (t0, g = 0.9) => { const o = osc(); put(mus, t0, 0.45, (t) => o(42 + 120 * Math.exp(-t * 30)) * Math.exp(-t * 7.5) + (t < 0.003 ? rnd() * 0.4 : 0), g); };
const hat = (t0, g = 0.12) => { const F = svf(); put(mus, t0, 0.06, (t) => F(rnd(), 9000, 0.4) * Math.exp(-t * 80), g, 0.25); };
const snare = (t0, g = 0.32) => { const F = svf(), o = osc(); put(mus, t0, 0.25, (t) => F(rnd(), 2200, 0.7) * Math.exp(-t * 22) + o(190) * Math.exp(-t * 30) * 0.5, g, -0.1, 0.25); };
const bass = (t0, f, g = 0.42) => { const o = osc(), o2 = osc(); put(mus, t0, 0.24, (t) => (o(f) + 0.3 * o2(f * 2)) * Math.exp(-t * 9), g); };
const pad = (t0, dur, notes, g = 0.05) => notes.forEach((f, j) => [-0.12, 0, 0.12].forEach((d, k) => {
  const o = osc(), o2 = osc(), F = lp(1400);
  put(mus, t0, dur, (t, p) => F(o(f * (1 + d / 100)) + 0.35 * o2(f * 2 * (1 + d / 90))) * Math.min(1, t / 0.6) * Math.min(1, (1 - p) * dur / 0.5), g, (k - 1) * 0.5, 0.35);
}));
const tick = (t0, hi, g = 0.16) => { const o = osc(); put(sfx, t0, 0.03, (t) => o(hi ? 3100 : 2300) * Math.exp(-t * 260) + rnd() * Math.exp(-t * 600) * 0.3, g); };
const ping = (t0, pan, g = 0.3) => { const o = osc(), o2 = osc(); put(sfx, t0, 0.32, (t) => (t < 0.08 ? o(1318.5) : o2(1760)) * Math.exp(-t * 12), g, pan, 0.3); };
const blip = (t0, f, g = 0.22) => { const o = osc(); put(sfx, t0, 0.12, (t) => o(f) * Math.exp(-t * 30), g, 0, 0.2); };
const chime = (t0, f, g = 0.26, pan = 0) => { const a = osc(), b = osc(), c = osc(); put(sfx, t0, 1.6, (t) => (a(f) + 0.4 * b(f * 2.76) * Math.exp(-t * 4) + 0.2 * c(f * 5.4) * Math.exp(-t * 8)) * Math.exp(-t * 2.8), g, pan, 0.5); };
const thud = (t0, g = 0.6) => { const o = osc(), F = lp(500); put(sfx, t0, 0.5, (t) => o(70 + 60 * Math.exp(-t * 25)) * Math.exp(-t * 9) + F(rnd()) * Math.exp(-t * 30) * 0.8, g, 0, 0.2); };
const impact = (t0, g = 0.9) => { const o = osc(), F = lp(900); put(sfx, t0, 2.2, (t) => o(34 + 70 * Math.exp(-t * 8)) * Math.exp(-t * 2.4) + F(rnd()) * Math.exp(-t * 12) * 1.3, g, 0, 0.45); };
const subdrop = (t0, g = 0.7) => { const o = osc(); put(sfx, t0, 1.4, (t, p) => o(85 * Math.pow(28 / 85, p)) * (1 - p), g); };
const whoosh = (t0, dur, f0, f1, g = 0.55, pan = 0) => { const F = svf(); put(sfx, t0, dur, (t, p) => F(rnd(), f0 * Math.pow(f1 / f0, p), 0.45) * Math.sin(Math.PI * Math.pow(p, 0.65)) * 2.2, g, pan, 0.25); };
const swell = (t0, dur, g = 0.4) => { const F = svf(); put(sfx, t0, dur, (t, p) => F(rnd(), 400 + 7000 * p * p, 0.5) * Math.pow(p, 3) * 2.4, g, 0, 0.3); };
const riser = (t0, dur, g = 0.3) => { const F = svf(), o = osc(); put(sfx, t0, dur, (t, p) => (F(rnd(), 300 * Math.pow(30, p), 0.35) * 1.6 + o(180 * Math.pow(4, p)) * 0.3) * p * p, g, 0, 0.3); };
const shutter = (t0, g = 0.5) => { const F = svf(), G = svf(); put(sfx, t0, 0.12, (t) => (t < 0.03 ? F(rnd(), 3200, 0.5) * 2 : 0) + (t > 0.055 && t < 0.085 ? G(rnd(), 2400, 0.5) * 1.6 : 0) + (t < 0.002 ? 0.8 : 0), g, 0.15, 0.15); };
const buzz = (t0, g = 0.22) => { const o = osc(); put(sfx, t0, 0.22, (t, p) => Math.sign(o(220 - 50 * p)) * 0.5 * Math.exp(-t * 6), g); };
const strike = (t0, g = 0.3) => { const F = svf(); put(sfx, t0, 0.2, (t, p) => F(rnd(), 5000 - 3500 * p, 0.6) * (1 - p) * 2, g, -0.2); };
const clunk = (t0, g = 0.85) => { const o = osc(), m1 = osc(), m2 = osc(), F = svf(); put(sfx, t0, 0.9, (t) => o(110) * Math.exp(-t * 10) + F(rnd(), 650, 0.4) * Math.exp(-t * 40) * 1.8 + (m1(840) + m2(1270)) * 0.25 * Math.exp(-t * 6), g, 0, 0.35); };
const flutter = (t0, pan, g = 0.18) => { const F = svf(); put(sfx, t0, 0.35, (t, p) => F(rnd(), 3000, 0.5) * (0.5 + 0.5 * Math.sin(TAU * 34 * t)) * Math.sin(Math.PI * p) * 2, g, pan); };
const engine = (t0, dur, g = 0.3) => { const hs = [1, 2, 3, 4, 6].map(() => osc()), F = lp(700); put(sfx, t0, dur, (t, p) => { const f = 48 + 40 * p; return F(hs.reduce((s, h, k) => s + h(f * [1, 2, 3, 4, 6][k]) / (k + 1), 0)) * Math.sin(Math.PI * Math.min(1, p * 1.3)) * 1.4; }, g, 0, 0.15); };
const click = (t0, g = 0.4) => { const o = osc(); put(sfx, t0, 0.05, (t) => o(1800) * Math.exp(-t * 150) + (t < 0.002 ? 0.6 : 0), g); };

// ---------- musique (ré mineur) ----------
const D2 = 73.42, F2 = 87.31, Bb1 = 58.27, C2 = 65.41;
const chords = [[D2, [293.7, 349.2, 440]], [Bb1, [233.1, 293.7, 349.2]], [F2, [261.6, 349.2, 440]], [C2, [261.6, 329.6, 392]]];
pad(0, 3.6, [146.8, 220], 0.045); // nappe de tension sous l'accroche
for (let i = 0; i < 7; i++) { const t0 = 3.5 + i * 2; const [root, notes] = chords[i % 4]; pad(t0, i === 6 ? 1.6 : 2.15, notes); for (let b = 0; b < 4; b++) { const tb = t0 + b * 0.5; if (tb >= 6.5 && tb < 17) { bass(tb, root); bass(tb + 0.25, root, 0.26); } } }
for (let t = 3.5; t < 6.5; t += 1) kick(t, 0.75); // demi-temps
for (let t = 6.5; t < 16.99; t += 0.5) { kick(t); hat(t + 0.25); }
for (let t = 7.0; t < 16.99; t += 1) snare(t);
pad(17.0, 3.0, [293.7, 349.2, 440, 587.3], 0.04); // accord final, qui s'éteint

// ---------- effets, à l'image près ----------
subdrop(0, 0.6); impact(0, 0.5);
for (let i = 0; i < 14; i++) tick(i * 0.25, i % 2 === 0); // l'horloge… jusqu'à ce que le temps s'arrête à 3,5 s
[1.0, 1.25, 1.5, 1.75].forEach((t, i) => ping(t, i % 2 ? 0.4 : -0.4));
whoosh(1.86, 0.25, 600, 4000, 0.45);
thud(2.0); for (let t = 2.0; t < 2.42; t += 0.035) tick(t, true, 0.07);
thud(2.5); for (let t = 2.5; t < 2.88; t += 0.04) tick(t, true, 0.07);
thud(3.0, 0.8); buzz(3.02);
strike(3.15);
swell(3.05, 0.45, 0.5); whoosh(3.25, 0.3, 300, 6000, 0.7, -0.3); impact(3.5, 0.85);
whoosh(4.7, 0.25, 2000, 400, 0.35);
riser(4.2, 0.65, 0.3); whoosh(4.8, 0.38, 250, 5000, 0.55); impact(5.0, 0.8);
[2349, 2794, 3520].forEach((f, i) => chime(5.05 + i * 0.03, f, 0.08, (i - 1) * 0.5));
chime(5.9, 2637, 0.14, 0.3);
whoosh(6.28, 0.32, 3000, 500, 0.4); impact(6.5, 0.55);
whoosh(6.58, 0.35, 400, 3000, 0.4, 0.3);
for (let t = 6.9; t < 7.62; t += 0.03 + (t - 6.9) * 0.07) tick(t, true, 0.08);
chime(7.65, 2093, 0.22);
whoosh(8.08, 0.25, 500, 7000, 0.6, -0.6);
whoosh(8.3, 0.4, 3000, 300, 0.4, 0.5);
shutter(8.75); blip(8.76, 2600, 0.1); whoosh(8.78, 0.3, 1500, 4500, 0.25, -0.5);
shutter(9.25); blip(9.26, 2600, 0.1); whoosh(9.28, 0.3, 1500, 4500, 0.25, 0.5);
whoosh(9.86, 0.26, 600, 7000, 0.6, 0.6);
engine(10.0, 1.95, 0.32); whoosh(10.0, 0.6, 200, 1500, 0.4, -0.7);
[0, 1, 2, 3, 4, 5].forEach((i) => blip(10.62 + i * 0.2, [587.3, 698.5, 880, 1046.5, 1174.7, 1396.9][i], 0.2));
whoosh(11.86, 0.26, 600, 7000, 0.6, -0.6);
for (let i = 0; i < 9; i++) flutter(12.08 + i * 0.05, ((i % 3) - 1) * 0.7);
swell(12.45, 0.43, 0.4);
clunk(13.0); thud(13.0, 0.5);
whoosh(13.86, 0.26, 600, 7000, 0.6, 0.6);
impact(14.0, 0.5); for (let t = 14.0; t < 14.48; t += 0.04) tick(t, true, 0.07);
[587.3, 698.5, 880, 1174.7, 1396.9].forEach((f, i) => chime(14.5 + i * 0.125, f * 2, 0.22, (i - 2) * 0.3));
for (let t = 14.9; t < 15.3; t += 0.04) tick(t, false, 0.05);
whoosh(15.36, 0.28, 3000, 500, 0.4);
[15.5, 15.75, 16.0].forEach((t) => { thud(t, 0.45); for (let k = t; k < t + 0.45; k += 0.045) tick(k, true, 0.05); });
swell(16.4, 0.6, 0.55); whoosh(16.66, 0.34, 6000, 200, 0.55);
impact(17.0, 1.0); subdrop(17.0, 0.6);
chime(17.12, 1174.7, 0.16, -0.3); chime(17.16, 1760, 0.1, 0.3);
click(18.2); thud(18.25, 0.35);
chime(18.3, 880, 0.12);

// ---------- réverbération (Schroeder), duck musical sous les impacts, mixage ----------
function reverb(x) {
  const y = new Float32Array(N), combs = [1557, 1617, 1491, 1422].map((d) => ({ b: new Float32Array(Math.round(d * SR / 44100)), i: 0 }));
  for (let n = 0; n < N; n++) { let s = 0; for (const c of combs) { const o = c.b[c.i]; c.b[c.i] = x[n] + o * 0.84; c.i = (c.i + 1) % c.b.length; s += o; } y[n] = s / 4; }
  for (const d of [225, 556]) { const b = new Float32Array(Math.round(d * SR / 44100)); let i = 0; for (let n = 0; n < N; n++) { const o = b[i]; const v = -y[n] + o; b[i] = y[n] + o * 0.5; i = (i + 1) % b.length; y[n] = v; } }
  return y;
}
const rl = reverb(rev[0]), rr = reverb(rev[1]);
const hits = [0, 3.5, 5.0, 13.0, 17.0];
const out = Buffer.alloc(44 + N * 4);
let peak = 0;
const L = new Float32Array(N), R = new Float32Array(N);
for (let n = 0; n < N; n++) {
  const t = n / SR;
  let d = 1; for (const h of hits) if (t >= h && t < h + 0.6) d = Math.min(d, 0.45 + 0.55 * ((t - h) / 0.6));
  L[n] = Math.tanh((mus[0][n] * d * 0.8 + sfx[0][n] + rl[n] * 0.32) * 0.9);
  R[n] = Math.tanh((mus[1][n] * d * 0.8 + sfx[1][n] + rr[n] * 0.32) * 0.9);
  peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
}
const k = 0.89 / peak;
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) { out.writeInt16LE(Math.round(L[n] * k * 32767), 44 + n * 4); out.writeInt16LE(Math.round(R[n] * k * 32767), 46 + n * 4); }
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'audio.wav'), out);
console.log('audio.wav', DUR, 's, crête', peak.toFixed(2));
