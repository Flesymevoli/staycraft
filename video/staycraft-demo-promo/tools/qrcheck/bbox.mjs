
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const file = process.argv[2];
const png = PNG.sync.read(fs.readFileSync(file));
const { width: W, height: H, data } = png;
// find near-white card pixels (all channels > 250) forming the big card
let minX = W, minY = H, maxX = -1, maxY = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (data[i] > 250 && data[i+1] > 250 && data[i+2] > 250) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}
console.log(JSON.stringify({ file, W, H, white: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } }));
