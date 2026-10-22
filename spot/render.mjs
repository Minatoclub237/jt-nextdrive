// Rendu du spot image par image : node spot/render.mjs <v|h> [video|stills] [t1,t2,…]
//   v = 9:16 (1080×1920), h = 16:9 (1920×1080) → spot/out/next-drive-spot-9x16.mp4 / -16x9.mp4
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const puppeteer = createRequire('C:/Users/DELL i7 Gaming/Desktop/claude skills/Coseleec/package.json')('puppeteer-core');
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..');
const [fmt = 'v', mode = 'video', list = ''] = process.argv.slice(2);
const [W, H] = fmt === 'v' ? [1080, 1920] : [1920, 1080];
const FPS = 60, N = FPS * 20;
const out = path.join(dir, 'out');
fs.mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  userDataDir: path.join(out, `_profile_${fmt}`),
  args: ['--hide-scrollbars', '--allow-file-access-from-files', '--force-color-profile=srgb'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await page.goto(pathToFileURL(path.join(dir, 'spot.html')).href, { waitUntil: 'load' });
const logo = fs.readFileSync(path.join(root, 'public', 'brand', 'full.svg'), 'utf8');
await page.evaluate(async (logo) => {
  await Promise.all(['640 40px IT', '600 40px IT', '400 40px IT', 'italic 400 40px PF'].map((f) => document.fonts.load(f)));
  window.build(logo);
}, logo);

if (mode === 'stills') {
  for (const t of list.split(',').map(Number)) {
    await page.evaluate((t) => window.render(t), t);
    await page.screenshot({ path: path.join(out, `still-${fmt}-${t.toFixed(2)}.png`) });
  }
} else {
  const file = path.join(out, `next-drive-spot-${fmt === 'v' ? '9x16' : '16x9'}.mp4`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(out, 'audio.wav'), '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-t', '20', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < N; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95, optimizeForSpeed: true });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(fmt, `${i}/${N}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('ok', file);
}
await browser.close();
