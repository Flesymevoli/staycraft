const fs=require('fs'); const path=require('path'); const ts=require('typescript');
const {webpack}=require('next/dist/compiled/webpack/webpack');
const root=path.resolve(__dirname,'..'); const stage=path.join(root,'.offline-build');
const output=path.resolve(root,'../deliverables/Homestay-AI-Offline');
fs.mkdirSync(stage,{recursive:true});fs.mkdirSync(output,{recursive:true});
const transpile=(text)=>ts.transpileModule(text,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText;
for(const file of fs.readdirSync(path.join(root,'src/components')).filter(f=>/\.tsx?$/.test(f))){
 let text=fs.readFileSync(path.join(root,'src/components',file),'utf8').replace(/import\s+["'][^"']+\.css["'];?/g,'').replace(/import Link from "next\/link";/g,'import {Link} from "./offline-adapters";').replace(/import Image from "next\/image";/g,'import {Image} from "./offline-adapters";');
 fs.writeFileSync(path.join(stage,file.replace(/\.tsx?$/,'.js')),transpile(text));
}
fs.writeFileSync(path.join(stage,'offline-adapters.js'),transpile(`
import React from 'react';
export function Link({href,...props}){return <a {...props} href={href.startsWith('/native-')?'#'+href.slice(1):href}/>}
export function Image({src,fill,priority,sizes,style,...props}){return <img {...props} src={src.startsWith('/')?'./assets'+src:src} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...style}:style}/>}
`));
fs.writeFileSync(path.join(stage,'entry.js'),transpile(`
import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
import {HomeClient} from './home-client';import {WorkClient} from './work-client';import {AnalysisClient} from './analysis-client';import {ExploreClient} from './explore-client';import {MineClient} from './mine-client';
function App(){const [route,setRoute]=useState(location.hash.slice(1)||'native-home');useEffect(()=>{const update=()=>{setRoute(location.hash.slice(1)||'native-home');window.scrollTo(0,0)};addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update)},[]);const [name,query]=route.split('?');const task=new URLSearchParams(query).get('task');const Component={'native-home':HomeClient,'native-work':WorkClient,'native-analysis':AnalysisClient,'native-explore':ExploreClient,'native-mine':MineClient}[name]||HomeClient;return <Component key={route} initialTask={['reply','promotion','analysis'].includes(task)?task:null}/>}
createRoot(document.getElementById('root')).render(<App/>);
`));
let css=fs.readFileSync(path.join(root,'node_modules/tailwindcss/preflight.css'),'utf8')+'\nhtml,body{min-height:100%;}body{margin:0;}\n.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0;}\n';
for(const name of ['home','work','analysis','explore','mine'])css+=fs.readFileSync(path.join(root,'src/components/native-'+name+'.css'),'utf8')+'\n';
fs.writeFileSync(path.join(output,'style.css'),css.replaceAll('url("/fonts/','url("./assets/fonts/'));
for(const folder of ['fonts','images','figma-icons'])fs.cpSync(path.join(root,'public',folder),path.join(output,'assets',folder),{recursive:true});
fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Homestay AI · Offline Prototype</title><link rel="stylesheet" href="./style.css"></head><body><div id="root"></div><script src="./app.js"></script></body></html>');
fs.writeFileSync(path.join(output,'使用说明.txt'),'Homestay AI 离线交互原型\r\n\r\n请先完整解压，再用 Chrome 或 Edge 双击打开 index.html。\r\n无需启动服务、安装 Node.js 或连接互联网。\r\n底部导航可切换首页、工作、分析、探索和我的五个页面。\r\n保留中英文切换、示例日期、卡片展开、草稿审核与资料编辑等交互。\r\n请勿单独移动 index.html；app.js、style.css 和 assets 文件夹需保留在一起。\r\n本包为当前网页原型的离线版本，全部为演示数据；AI 回复、上传与分析为演示流程，不连接真实平台。\r\n演示修改在当前浏览器会话内保存。\r\n');
webpack({mode:'production',entry:path.join(stage,'entry.js'),output:{path:output,filename:'app.js'},resolve:{modules:[path.join(root,'node_modules'),'node_modules'],extensions:['.js']},optimization:{splitChunks:false,minimize:false},performance:{hints:false}},(err,stats)=>{if(err||stats.hasErrors()){console.error(err||stats.toString({all:false,errors:true}));process.exitCode=1}else console.log('Offline prototype built: '+output)});

