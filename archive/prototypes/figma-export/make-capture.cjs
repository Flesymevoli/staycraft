const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, '手机原型_柔白新版_v2.html'), 'utf8');
const route = `<script>window.addEventListener('load',()=>{const p=new URLSearchParams(location.search).get('screen');if(p&&typeof render==='function'){page=p;render();}});</script>`;
const capture = `<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>`;
const out = source.replace('</head>', `${capture}</head>`).replace('</body>', `${route}</body>`);
fs.writeFileSync(path.join(root, 'figma-capture.html'), out);
