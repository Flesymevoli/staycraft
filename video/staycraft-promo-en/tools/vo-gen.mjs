
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const PYLIBS = ROOT + '/tools/pylibs';
const MANIFEST = process.argv[2] || ROOT + '/audio/vo/script.json';
const OUT = ROOT + '/public/audio/vo';
const VOICE = process.env.VO_VOICE || 'en-US-ChristopherNeural';
const BASE_RATE = Number(process.env.VO_RATE || '-2');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const results = [];
const trimFile = (inFile, outFile) => {
  // strip TTS leading/trailing silence, then add a 0.12s lead-in so the onset sits cleanly
  const af = 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB:detection=peak,areverse,adelay=120|120';
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', inFile, '-af', af, '-ar', '48000', '-ac', '2', outFile], { encoding: 'utf8' });
  return r.status === 0;
};
const probe = (f) => { const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f], { encoding: 'utf8' }); return parseFloat(String(p.stdout).trim()); };
const synth = (id, text, rate) => {
  const txt = path.join(ROOT, 'audio/vo/.txt-' + id + '.txt');
  const raw = path.join(ROOT, 'audio/vo/.raw-' + id + '.mp3');
  const fin = path.join(OUT, id + '.mp3');
  fs.writeFileSync(txt, text, 'utf8');
  const r = spawnSync('py', ['-3.13', '-m', 'edge_tts', '--voice', VOICE, '--rate=' + rate + '%', '--file', txt, '--write-media', raw], { env: { ...process.env, PYTHONPATH: PYLIBS }, encoding: 'utf8' });
  fs.unlinkSync(txt);
  if (r.status !== 0) return { ok: false, err: (r.stderr || r.stdout || '').slice(0, 160) };
  if (!trimFile(raw, fin)) return { ok: false, err: 'trim failed' };
  fs.unlinkSync(raw);
  return { ok: true, dur: probe(fin), rate, text };
};
for (const seg of manifest.segments) {
  const windowSec = seg.windowFrames / 30;
  const need = windowSec - 0.08;
  let used = synth(seg.id, seg.text, seg.rate ?? BASE_RATE);
  if (!used.ok) { results.push({ id: seg.id, ok: false, err: used.err }); continue; }
  if (used.dur > need) { const f = synth(seg.id, seg.text, (seg.rate ?? BASE_RATE) + 4); if (f.ok && f.dur <= need) used = f; }
  if (used.dur > need && seg.fallback) { const f = synth(seg.id, seg.fallback, seg.rate ?? BASE_RATE); if (f.ok && f.dur <= need) used = { ...f, text: seg.fallback }; }
  if (used.dur > need && seg.fallback) { const f = synth(seg.id, seg.fallback, (seg.rate ?? BASE_RATE) + 5); if (f.ok) used = { ...f, text: seg.fallback }; }
  results.push({ id: seg.id, ok: true, startFrame: seg.startFrame, windowFrames: seg.windowFrames, dur: +used.dur.toFixed(3), windowSec: +windowSec.toFixed(3), fits: used.dur <= windowSec, rate: used.rate, text: used.text, fallbackUsed: seg.fallback && used.text === seg.fallback, out: 'audio/vo/' + seg.id + '.mp3' });
  console.log(seg.id, used.dur.toFixed(2) + 's / ' + windowSec.toFixed(2) + 's', used.dur <= windowSec ? 'OK' : 'OVER', used.text === seg.text ? '' : '[fallback]');
}
fs.writeFileSync(ROOT + '/audio/vo/manifest-vo.json', JSON.stringify({ voice: VOICE, generatedAt: new Date().toISOString(), results }, null, 1));
const ok = results.filter(r => r.ok && r.fits).length;
console.log('fits', ok + '/' + results.length, 'words used', results.filter(r=>r.ok).reduce((n,r)=>n + r.text.split(/\s+/).length,0));
