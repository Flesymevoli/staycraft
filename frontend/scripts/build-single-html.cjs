const fs = require("fs");
const path = require("path");

const workspace = path.resolve(__dirname, "../..");
const source = path.join(workspace, "deliverables", "Homestay-AI-Offline");
const output = path.join(workspace, "deliverables", "Homestay-AI-手机直接打开版.html");

const mimeTypes = {
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ttf": "font/ttf",
};

function dataUrl(relativePath) {
  const normalized = relativePath.replace(/^\.\//, "").replaceAll("/", path.sep);
  const filePath = path.join(source, normalized);
  if (!fs.existsSync(filePath)) throw new Error(`Missing asset: ${relativePath}`);
  const mime = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function inlineAssets(text) {
  return text.replace(/(?:\.\/)?assets\/[A-Za-z0-9_.\/-]+/g, (assetPath) => dataUrl(assetPath));
}

function collectAssetMap(directory, prefix = "") {
  const entries = {};
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, item.name);
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) Object.assign(entries, collectAssetMap(fullPath, relative));
    else if (mimeTypes[path.extname(item.name).toLowerCase()]) {
      entries[`/${relative}`] = dataUrl(`assets/${relative}`);
    }
  }
  return entries;
}

const css = inlineAssets(fs.readFileSync(path.join(source, "style.css"), "utf8"));
const assetMap = collectAssetMap(path.join(source, "assets"));
const js = inlineAssets(fs.readFileSync(path.join(source, "app.js"), "utf8"))
  .replace("src.startsWith('/') ? './assets' + src : src", "src.startsWith('/') ? (window.__ASSETS[src] || src) : src")
  .replaceAll("</script", "<\\/script");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f7f8f9">
  <title>Homestay AI · Mobile Prototype</title>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script>window.__ASSETS=${JSON.stringify(assetMap)};</script>
  <script>${js}</script>
</body>
</html>`;

fs.writeFileSync(output, html);
console.log(`${output}\n${fs.statSync(output).size} bytes`);
