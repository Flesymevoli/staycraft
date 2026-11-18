import {createTranslator as createEngine} from './engine.js';

// The browser downloads its first model over the network. Resolve the factory
// after that download so the per-sentence timeout measures inference only.
export async function createTranslator() {
  const engine = createEngine();
  engine.backing.downloadTimeout = 240_000;
  try {
    await engine.backing.getTranslationModel({from:'zh', to:'en'});
    return engine;
  } catch (error) {
    await engine.delete();
    throw error;
  }
}
