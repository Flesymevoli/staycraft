const fs = require('fs');
const path = require('path');
const SKY_URL = 'file:///C:/Users/86299/AppData/Local/OpenAI/Codex/runtimes/cua_node/df473e5367fa2b42/bin/node_modules/@oai/sky/dist/project/cua/sky_js/src/index.js';
const OUT = 'C:/个人/学习/ENT207/Homestay AI assistant/figma-export';

async function figmaWindow(sky) {
  const apps = await sky.list_apps();
  const app = apps.find((a) => String(a.id) === 'com.squirrel.Figma.Figma');
  if (!app) throw new Error('Figma app not found');
  if (!app.windows || !app.windows.length) {
    await sky.launch_app({ app: app.id });
    const again = await sky.list_apps();
    const app2 = again.find((a) => String(a.id) === 'com.squirrel.Figma.Figma');
    if (!app2 || !app2.windows.length) throw new Error('Figma has no window');
    return app2.windows[0];
  }
  const titled = app.windows.filter((w) => /figma/i.test(w.title || ''));
  return titled.length === 1 ? titled[0] : app.windows[0];
}

(async () => {
  const { sky } = await import(SKY_URL);
  const action = process.argv[2] || 'list';
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  const window = await figmaWindow(sky);
  if (action === 'list') {
    console.log(JSON.stringify({ window }));
    process.exit(0);
  }
  await sky.activate_window({ window });
  if (action === 'text') {
    const state = await sky.get_window_state({ window, include_screenshot: false, include_text: true });
    const text = state.accessibility ? (state.accessibility.tree || state.accessibility.document_text || JSON.stringify(state.accessibility)) : 'NO_ACCESSIBILITY';
    console.log(text.length > 9000 ? text.slice(0, 9000) + '\n...[TRUNCATED]' : text);
    process.exit(0);
  }
  if (action === 'shot') {
    const state = await sky.get_window_state({ window, include_screenshot: true, include_text: false });
    const shots = (state.screenshots || []).sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0));
    if (!shots.length) { console.log('NO_SHOT'); process.exit(1); }
    const shot = shots[0];
    const b64 = shot.url.split(',')[1];
    const out = arg1 || path.join(OUT, 'cua-latest.png');
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log(JSON.stringify({ saved: out, width: shot.width, height: shot.height }));
    process.exit(0);
  }
  if (action === 'click') {
    await sky.click({ window, x: Number(arg1), y: Number(arg2) });
    console.log('clicked ' + arg1 + ',' + arg2);
    process.exit(0);
  }
  if (action === 'clickidx') {
    await sky.click({ window, element_index: Number(arg1) });
    console.log('clicked idx ' + arg1);
    process.exit(0);
  }
  if (action === 'key') {
    await sky.press_key({ window, key: arg1 });
    console.log('pressed ' + arg1);
    process.exit(0);
  }
  if (action === 'type') {
    await sky.type_text({ window, text: arg1 });
    console.log('typed');
    process.exit(0);
  }
  console.log('unknown action');
  process.exit(2);
})().catch((e) => { console.error('ERR', (e && e.message) || e); process.exit(1); });
