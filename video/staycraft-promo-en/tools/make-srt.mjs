
// Build an .srt from a subtitle table measured in frames (30fps).
import fs from 'node:fs';
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const FPS = 30;
const tablePath = process.argv[2] || ROOT + '/subs/table.json';
const outPath = process.argv[3] || ROOT + '/subs/staycraft-promo-en.srt';
const rows = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
const pad = (n, l = 2) => String(n).padStart(l, '0');
const ts = (f) => {
  const ms = Math.round((f / FPS) * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return pad(h) + ':' + pad(m) + ':' + pad(s) + ',' + pad(r, 3);
};
const body = rows.map((r, i) => (i + 1) + '\n' + ts(r.startFrame) + ' --> ' + ts(r.endFrame) + '\n' + r.text + '\n').join('\n');
fs.mkdirSync(ROOT + '/subs', { recursive: true });
fs.writeFileSync(outPath, body, 'utf8');
console.log('srt written', outPath, rows.length, 'cues');
