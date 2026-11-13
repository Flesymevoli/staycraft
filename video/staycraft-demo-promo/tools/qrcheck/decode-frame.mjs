
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const jsQR = require('jsqr').default || require('jsqr');
const { PNG } = require('pngjs');
for (const file of process.argv.slice(2)) {
  const png = PNG.sync.read(fs.readFileSync(file));
  let res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: 'attemptBoth' });
  if (!res) {
    // try center-right crop where the QR card lives
    const x0 = 1080, y0 = 220, w = 760, h = 760;
    const out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = ((y + y0) * png.width + (x + x0)) * 4, di = (y * w + x) * 4;
      out[di] = png.data[si]; out[di+1] = png.data[si+1]; out[di+2] = png.data[si+2]; out[di+3] = png.data[si+3];
    }
    res = jsQR(out, w, h, { inversionAttempts: 'attemptBoth' });
  }
  console.log(file, '=>', res ? res.data : 'NO_QR');
}
