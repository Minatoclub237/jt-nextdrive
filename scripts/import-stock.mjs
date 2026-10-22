// Importe le stock (export JSON du site Auto-Gestion) dans le site :
//   node scripts/import-stock.mjs [chemin/vers/stock-vehicules.json] [photos par véhicule]
// → src/data/stock.json + public/stock/<ref>/NN.webp (1280 px) et NN-s.webp (640 px)
// Les photos déjà présentes ne sont pas retéléchargées : relancer après chaque mise à jour du stock.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || path.join(root, '_client', 'stock-vehicules.json');
const perCar = +(process.argv[3] || 14);
const outData = path.join(root, 'src', 'data', 'stock.json');
const outImg = path.join(root, 'public', 'stock');
const tmp = path.join(root, 'node_modules', '.cache', 'stock-dl');
fs.mkdirSync(path.dirname(outData), { recursive: true });
fs.mkdirSync(tmp, { recursive: true });

const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
const list = Array.isArray(raw) ? raw : raw.vehicles || Object.values(raw);
const num = (s) => +String(s ?? '').replace(/[^\d]/g, '') || 0;
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const title = (s) => String(s || '').toLowerCase().replace(/(^|[\s-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(Bmw|Vw|Gti|Gt|Rs\d?|Amg|Tdi|Tsi|Hdi|Dci|Crdi|Suv|Slk|Cv|Ch|Bva|Bvm|Dsg|Eat\d?|Rwd|Awd|4x4)\b/g, (m) => m.toUpperCase());
// noms de modèles : les sigles (GLA, SLK, II, RSQ3, X1, 308) restent en capitales
const model = (s) => String(s || '').split(/\s+/).map((w) => (w.length <= 3 || /\d/.test(w) ? w.toUpperCase() : title(w))).join(' ');
const clean = (t) => String(t || '').replace(/\*{2,}/g, '').replace(/\r/g, '').trim();
// texte de l'annonce : on coupe le paragraphe commercial collé (« Bienvenue chez NEXT DRIVE… ») et on remet en casse normale les lignes tout en capitales
const noPitch = (t) => clean(t).split(/Bienvenue chez/i)[0].trim();
const sentence = (t) => {
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 8 || (t.match(/[A-ZÀ-Þ]/g) || []).length / letters.length < 0.6) return t;
  const s = t.toLowerCase().replace(/(^|[.!?]\s+|\+\s*|-\s+)([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
  return s.replace(/\b(gps|abs|esp|bmw|vw|gti|amg|rs\d?|tdi|tsi|hdi|led|usb|ct|cv|ch|km)\b/gi, (m) => m.toUpperCase());
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dl(url, file) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130' }, signal: AbortSignal.timeout(30000) });
      if (r.ok) { fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); return true; }
    } catch {}
    await sleep(1500 * (i + 1));
  }
  return false;
}
function webp(inFile, outFile, w, q) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', inFile, '-vf', `scale='min(${w},iw)':-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', String(q), outFile]);
}

const out = [];
const queue = [];
for (const v of list) {
  const ref = String(v.ref || v.id);
  const marque = title(v.marque);
  const modele = model(v.modele);
  const slug = slugify(`${v.marque} ${v.modele} ${v.version || ''} ${v.annee || ''} ${ref}`).slice(0, 90);
  const photos = (v.photos || []).slice(0, perCar);
  const dir = path.join(outImg, ref);
  fs.mkdirSync(dir, { recursive: true });
  photos.forEach((u, i) => queue.push({ u, dir, n: String(i + 1).padStart(2, '0') }));
  // description : on retire le bloc commercial répété (horaires, adresse) qui se contredit d'une annonce à l'autre
  const desc = clean(v.descFull).split('\n').map((l) => sentence(noPitch(l.trim()))).filter((l) => l && !/horaire|lundi|mardi|samedi|dimanche|chemin de la girondi|04 ?80|07 ?60|bienvenue chez/i.test(l));
  out.push({
    ref, slug, marque, modele, version: clean(v.version), annee: num(v.annee), km: num(v.km), prix: num(v.prix),
    energie: clean(v.energie), boite: /auto/i.test(v.boite) ? 'Automatique' : 'Manuelle', puissance: clean(v.puissance), cv: clean(v.cv),
    couleur: title(v.couleur), mec: clean(v.mec), bref: sentence(noPitch(v.bref)), equipements: (v.equipements || []).map(clean).filter(Boolean),
    description: desc, photos: photos.length, source: v.url,
  });
}

let done = 0;
let failed = 0;
async function worker() {
  while (queue.length) {
    const { u, dir, n } = queue.shift();
    const big = path.join(dir, `${n}.webp`);
    const small = path.join(dir, `${n}-s.webp`);
    if (!fs.existsSync(big) || !fs.existsSync(small)) {
      const t = path.join(tmp, `${path.basename(dir)}-${n}${path.extname(new URL(u).pathname) || '.jpg'}`);
      if (await dl(u, t)) {
        try { webp(t, big, 1200, 66); webp(t, small, 640, 70); } catch { failed++; }
        fs.rmSync(t, { force: true });
      } else failed++;
      await sleep(120);
    }
    if (++done % 50 === 0) console.log(`photos ${done}`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
out.sort((a, b) => b.prix - a.prix);
fs.writeFileSync(outData, JSON.stringify(out, null, 1));
console.log(`véhicules ${out.length} · photos ${done} · échecs ${failed} → ${path.relative(root, outData)}`);
