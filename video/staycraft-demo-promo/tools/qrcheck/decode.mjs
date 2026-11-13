
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const jsQR = require('jsqr').default || require('jsqr');
const { PNG } = require('pngjs');
const file = process.argv[2];
const png = PNG.sync.read(fs.readFileSync(file));
const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: 'dontInvert' });
if (!res) { console.log('NO_QR_FOUND'); process.exit(2); }
console.log('QR payload:', res.data);
console.log('version', res.version, 'size', res.location ? 'ok' : 'unknown');
