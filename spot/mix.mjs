// Mixage du spot : musique Mixkit « Deep Urban » (ramenée à 120 BPM, drop calé à 6,5 s) + bruitages Mixkit réels
//   node spot/mix.mjs → spot/out/audio.wav   (licences : Mixkit Free License, usage commercial autorisé)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const snd = (f) => path.join(dir, 'assets', 'sound', f);
// [fichier, instant où le son doit tomber (s), décalage du point d'attaque dans le fichier (s), durée gardée, volume]
const cues = [
  ...[1.0, 1.25, 1.5, 1.75].map((t) => ['s933.mp3', t, 0.08, 0.45, 0.5]),     // notifications
  ['s1492.mp3', 1.95, 1.08, 1.33, 0.7],                                        // souffle : les messages s'envolent
  ['s2310.mp3', 3.0, 0.33, 0.6, 0.45],                                         // « 0 vente »
  ['s1491.mp3', 3.5, 0.29, 1.1, 0.8], ['s2150.mp3', 3.5, 0.27, 0.59, 1.0],    // coupe vers le plein cadre
  ['s2900.mp3', 6.5, 4.83, 6.4, 0.5],                                          // montée inversée jusqu'au drop
  ['s3005.mp3', 4.75, 0.03, 0.18, 0.6],                                        // sortie du plein cadre
  ['s1486.mp3', 5.4, 0.61, 1.6, 0.4],                                          // ouverture du logo
  ['s1565.mp3', 6.75, 0.19, 0.56, 0.8],                                        // la RS6 arrive
  ['s1491.mp3', 8.12, 0.29, 1.1, 0.6],                                         // la RS6 repart
  ['s1436.mp3', 8.4, 0.14, 1.0, 0.5],                                          // mise au point
  ['s1430.mp3', 8.75, 0.11, 0.62, 2.4], ['s1430.mp3', 9.25, 0.11, 0.62, 2.4], // déclencheurs
  ['s3005.mp3', 9.86, 0.03, 0.18, 0.6],
  ['s1565.mp3', 10.15, 0.19, 0.56, 0.8], ['s718.mp3', 10.45, 0.1, 0.66, 0.7], // le Defender, portière
  ...[10.5, 10.7, 10.9, 11.1, 11.3, 11.5].map((t) => ['s3005.mp3', t + 0.2, 0.03, 0.18, 0.3]),
  ['s1491.mp3', 11.86, 0.29, 1.1, 0.6],
  ['s1492.mp3', 12.4, 1.08, 1.33, 0.5], ['s720.mp3', 12.5, 0.18, 0.96, 1.6],  // la clé tombe
  ['s914.mp3', 13.3, 0.27, 1.04, 0.6],                                         // virement reçu
  ['s3005.mp3', 13.86, 0.03, 0.18, 0.6],
  ['s2150.mp3', 14.0, 0.27, 0.59, 0.5],                                        // 5,0
  ...[14.5, 14.625, 14.75, 14.875, 15.0].map((t) => ['s933.mp3', t, 0.08, 0.4, 0.22]),
  ['s1565.mp3', 15.6, 0.19, 0.56, 0.8], ['s1486.mp3', 15.6, 0.61, 1.2, 0.35], // la SLK
  ['s788.mp3', 17.0, 2.18, 4.0, 0.9], ['s2908.mp3', 17.0, 0.2, 3.0, 0.9],     // impact du CTA
  ['s1536.mp3', 17.45, 0.98, 2.5, 0.6],                                        // démarrage moteur
  ['s3005.mp3', 18.2, 0.03, 0.18, 0.5],                                        // le bouton se remplit
];

const args = ['-v', 'error', '-y', '-i', snd('music.wav')];
const f = ['[0:a]asplit[ma][mb]', '[ma]atrim=0:17,volume=0.8[m1]', '[mb]atrim=17:20,asetpts=PTS-STARTPTS,lowpass=f=520,volume=0.62,afade=t=out:st=1.4:d=1.6[m2]', '[m1][m2]concat=n=2:v=0:a=1[mus]'];
cues.forEach(([file, at, hit, dur, vol], i) => {
  const lead = Math.min(hit, at); // temps entre le début gardé et l'attaque (coupé si le son commencerait avant 0 s)
  const start = hit - lead;
  const delay = Math.round((at - lead) * 1000);
  args.push('-i', snd(file));
  const keep = Math.min(dur, 20 - (at - lead));
  f.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=${start.toFixed(3)}:${(start + keep).toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, keep - 0.12).toFixed(3)}:d=0.12,volume=${vol},adelay=${delay}|${delay}[c${i}]`);
});
f.push(`[mus]${cues.map((_, i) => `[c${i}]`).join('')}amix=inputs=${cues.length + 1}:normalize=0:duration=first,alimiter=limit=0.93:attack=3:release=80[out]`);
args.push('-filter_complex', f.join(';'), '-map', '[out]', '-ar', '48000', '-t', '20', path.join(dir, 'out', 'audio.wav'));
fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
console.log(r.status === 0 ? `audio.wav · ${cues.length} bruitages` : 'échec ffmpeg');
