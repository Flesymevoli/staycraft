const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'手机首页预览.html'),'utf8');
// Normalize inherited blue-gray text in the fork, including dialog captions.
// Backgrounds, borders, charts and semantic success/error colors are unchanged.
html=html.replace(/<style>([\s\S]*?)<\/style>/g,(_,css)=>'<style>'+css.replace(/((?<![-\w])color\s*:\s*)#([0-9a-f]{6})(?=[;}\s])/gi,(all,prefix,hex)=>{const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);return b-r>=12&&g>=r&&b>=g?prefix+'#61656d':all;})+'</style>');
// Remove only the old peek-gesture implementation in the fork. Date selection replaces it.
const start=html.indexOf(' let drag=null,amount=0,suppressClick=false;');
const end=html.indexOf(' revealObserver?.disconnect();',start);
if(start<0||end<0)throw Error('Expected home gesture block was not found; original untouched.');
html=html.slice(0,start)+html.slice(end);
html=html.replace('</body>','<style>'+fs.readFileSync(path.join(__dirname,'soft-neutral-v2.css'),'utf8')+'</style></body>');
let conceptScript=fs.readFileSync(path.join(__dirname,'soft-neutral-v2.js'),'utf8');
const pastelDataColors={'#9baa85':'#87ad70','#a58cbb':'#aa82c7','#ce956f':'#d89665','#dce7d4':'#e6f5e3','#e1d4ec':'#f0e5ff','#f1d7c4':'#ffeadc','#af9872':'#c69862','#ab86a3':'#c287b0','#8b7caf':'#a07cbd','#a28db7':'#b293d0','#99ad87':'#9abd7f','#a18ab5':'#a881c2'};
conceptScript=conceptScript.replace(/#[0-9a-f]{6}/g,color=>pastelDataColors[color]||color);
html=html.replace('</body>','<script>'+conceptScript+'</script></body>');
fs.writeFileSync(path.join(root,'手机原型_柔白新版_v2.html'),html);
console.log('Created 手机原型_柔白新版_v2.html; original unchanged.');
