const path=require('node:path');
const {spawn}=require('node:child_process');
const {mkdir,mkdtemp,readFile,writeFile,cp,symlink,readdir,rename,stat,lstat,unlink}=require('node:fs/promises');
const {systemEnvironment,publicConfiguration}=require('./runtime.cjs');

const root=path.resolve(__dirname,'..');
const publicNames=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','DEMO_LOGIN_EMAIL'];
async function buildConfiguration(){
 const configArg=process.argv.indexOf('--config');
 if(configArg>=0){
  if(!process.argv[configArg+1])throw Error('Specify a public configuration JSON file after --config.');
  return publicConfiguration(JSON.parse(await readFile(path.resolve(process.argv[configArg+1]),'utf8')));
 }
 // Extract only named public values. Never load dotenv, expand variables, or copy an env file.
 const config={};
 for(const file of ['.env','.env.local']){
  let source;try{source=await readFile(path.join(root,file),'utf8')}catch(error){if(error.code==='ENOENT')continue;throw error}
  for(const line of source.split(/\r?\n/)){
   const match=line.match(/^\s*(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|DEMO_LOGIN_EMAIL)\s*=\s*(.*?)\s*$/);
   if(match){let value=match[2];if(/^(["']).*\1$/.test(value))value=value.slice(1,-1);config[match[1]]=value;}
  }
 }
 for(const name of publicNames)if(process.env[name])config[name]=process.env[name];
 return publicConfiguration(config);
}
function run(file,args,options){
 return new Promise((resolve,reject)=>{
  const child=spawn(file,args,{...options,stdio:'inherit',windowsHide:true});
  const stop=()=>child.kill();process.once('SIGINT',stop);process.once('SIGTERM',stop);
  child.once('error',reject);child.once('exit',code=>{process.off('SIGINT',stop);process.off('SIGTERM',stop);code===0?resolve():reject(Error('Desktop runtime build failed.'));});
 });
}
async function copyCollector(resources){
 const collector=path.join(resources,'collector');
 await mkdir(path.join(collector,'scripts'),{recursive:true});
 for(const name of ['collect-public-prices.mjs','collect-ctrip-list-prices.mjs','login-price-monitor.mjs','price-monitor-store.mjs','price-monitor-dates.mjs'])
  await cp(path.join(root,'scripts',name),path.join(collector,'scripts',name));
 await mkdir(path.join(collector,'src','lib'),{recursive:true});
 await cp(path.join(root,'src','lib','competitor-observations.ts'),path.join(collector,'src','lib','competitor-observations.ts'));
 await writeFile(path.join(collector,'package.json'),JSON.stringify({private:true,type:'module'}));
 for(const name of ['playwright','playwright-core'])
  await cp(path.join(root,'node_modules',name),path.join(collector,'node_modules',name),{recursive:true,dereference:true});
 const {registry:{registry}}=require('playwright-core/lib/coreBundle');
 for(const name of ['chromium','chromium-headless-shell','ffmpeg',...(process.platform==='win32'?['winldd']:[])]){
  const executable=registry.findExecutable(name);
  if(!executable?.directory)throw Error('Playwright Chromium resources are unavailable.');
  try{await stat(executable.executablePath());}catch{throw Error('Install the project Playwright Chromium browser before preparing desktop resources.');}
  await cp(executable.directory,path.join(resources,'playwright-browsers',path.basename(executable.directory)),{recursive:true,dereference:true});
 }
}
async function auditResources(folder){
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const file=path.join(folder,entry.name);
  if(entry.isSymbolicLink())throw Error('Desktop resources contain a non-portable symbolic link.');
  if(/^\.env(?:\.|$)|^\.dev\.vars|\.(?:pem|p12|pfx)$/i.test(entry.name))throw Error('Desktop resources contain a private configuration file.');
  if(entry.isDirectory())await auditResources(file);
 }
}
async function build(){
 const publicConfig=await buildConfiguration();
 const base=path.join(root,'.desktop-runtime');await mkdir(base,{recursive:true});
 const workspace=await mkdtemp(path.join(base,'build-'));
 const source=path.join(workspace,'source');await mkdir(source);
 for(const name of ['src','public','package.json','package-lock.json','next.config.ts','tsconfig.json','postcss.config.mjs'])
  await cp(path.join(root,name),path.join(source,name),{recursive:true,dereference:true});
 // Reuse installed dependencies only while building. NFT copies actual files into resources.
 await symlink(path.join(root,'node_modules'),path.join(source,'node_modules'),'junction');
 await run(process.execPath,[require.resolve('next/dist/bin/next'),'build','--webpack'],{cwd:source,env:{...systemEnvironment(),...publicConfig,
  NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',STAYCRAFT_DESKTOP_RUNTIME_BUILD:'1',STAYCRAFT_DESKTOP_TRACE_ROOT:root,HOMESTAY_LOCAL_DATA:'0'}});
 const resources=path.join(workspace,'resources');
 // Next reproduces the source node_modules junction on Windows. Its real traced
 // dependencies also exist at standalone/node_modules, so discard this build-only
 // junction instead of accidentally copying the entire development environment.
 const sourceModules=path.join(source,'.next','standalone',path.relative(root,source),'node_modules');
 const relativeModules=path.relative(workspace,sourceModules);
 if(!relativeModules||relativeModules==='..'||relativeModules.startsWith('..'+path.sep)||path.isAbsolute(relativeModules))throw Error('Unexpected generated dependency path.');
 try{if((await lstat(sourceModules)).isSymbolicLink())await unlink(sourceModules);}catch(error){if(error.code!=='ENOENT')throw error}
 await cp(path.join(source,'.next','standalone'),path.join(resources,'web'),{recursive:true,dereference:true});
 const webAppPath=path.join('web',path.relative(root,source));
 const web=path.join(resources,webAppPath);
 await cp(path.join(source,'.next','static'),path.join(web,'.next','static'),{recursive:true,dereference:true});
 await cp(path.join(source,'public'),path.join(web,'public'),{recursive:true,dereference:true});
 await copyCollector(resources);
 await auditResources(resources);
 await writeFile(path.join(resources,'runtime.json'),JSON.stringify({version:1,webAppPath,publicConfig},null,2));
 const temporary=path.join(base,'current.'+path.basename(workspace)+'.json');
 await writeFile(temporary,JSON.stringify({resources:path.relative(base,resources)},null,2));
 await rename(temporary,path.join(base,'current.json'));
 console.log('Desktop runtime resources prepared. Run npm run desktop:standalone to verify them. No installer was built.');
}
if(require.main===module)build().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={buildConfiguration,auditResources};
