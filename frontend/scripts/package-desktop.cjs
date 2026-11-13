const path=require('node:path'),fs=require('node:fs/promises');
const {developmentResources}=require('../desktop/runtime.cjs');
const {auditResources}=require('../desktop/build-runtime.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\..*/,'').replace('T','-');
 const destination=path.join(root,'..','deliverables','desktop',`StayCraft-Desktop-${stamp}`);
 await fs.mkdir(destination,{recursive:false}).catch(async error=>{if(error.code!=='ENOENT')throw error;await fs.mkdir(path.dirname(destination),{recursive:true});await fs.mkdir(destination)});
 const electronDist=path.join(root,'node_modules','electron','dist');
 for(const entry of await fs.readdir(electronDist))await fs.cp(path.join(electronDist,entry),path.join(destination,entry),{recursive:true,errorOnExist:true,force:false});
 await fs.rename(path.join(destination,'electron.exe'),path.join(destination,'StayCraft.exe'));
 const resources=path.join(destination,'resources');await fs.cp(await developmentResources(root),resources,{recursive:true});
 const app=path.join(resources,'app');await fs.mkdir(path.join(app,'desktop'),{recursive:true});
 await fs.writeFile(path.join(app,'package.json'),JSON.stringify({name:'staycraft-desktop',version:'0.1.0',main:'desktop/main.cjs',private:true}));
 for(const file of ['main.cjs','preload.cjs','demo-preload.cjs','demo-backend.cjs','runtime.cjs','server.cjs','collection-targets.cjs','collector-runner.cjs'])await fs.cp(path.join(root,'desktop',file),path.join(app,'desktop',file));
 await fs.cp(path.join(root,'desktop','assets'),path.join(app,'desktop','assets'),{recursive:true});
 await auditResources(resources);
 console.log(destination);
})().catch(error=>{console.error(error.message);process.exitCode=1});
