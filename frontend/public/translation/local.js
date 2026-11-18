import { BatchTranslator, TranslatorBacking } from './translator.js';

// Each public asset fits the web host's per-file limit. Verify chunks before assembly.
const modelParts = [
  'b7a224d9829f2bf3bc65078056c86a077feea90648a395aed563244dcf344a50',
  '7395546257f268a74244fd72754b71754ca62e1ac12b1b65a577fc743295c8fd',
  '70e81c4a62f45a5824cc8b9040e3f0bedecaae0a1560c194d7f3d51301435635'
];
class LocalBacking extends TranslatorBacking {
  async fetch(url, checksum, options) {
    if (!url.endsWith('/model.zhen.intgemm.alphas.bin')) return super.fetch(url, checksum, options);
    const parts = await Promise.all(modelParts.map((hash, i) => super.fetch(url + '.' + i, hash, options)));
    return new Blob(parts).arrayBuffer();
  }
}
const options = {registryUrl:'/translation/registry.json', workers:1, batchSize:8, pivotLanguage:null};
export function createTranslator() { return new BatchTranslator(options, new LocalBacking(options)); }
