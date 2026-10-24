// Keep local .env contents out of uploaded Workers; runtime settings use bindings.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const cli=path.join(root,'node_modules/@opennextjs/cloudflare/dist/cli/index.js');
const envFile=path.join(root,'.open-next/cloudflare/next-env.mjs');
const empty='export const production = {};\nexport const development = {};\nexport const test = {};\n';
const action=process.argv[2];
if(!['build','preview','deploy'].includes(action))throw new Error('Expected build, preview or deploy');
if(action!=='build'&&(!fs.existsSync(envFile)||fs.readFileSync(envFile,'utf8')!==empty))throw new Error('Run npm run cf:build first; local environment files must not be uploaded.');
const result=spawnSync(process.execPath,[cli,action],{cwd:root,stdio:'inherit',env:{...process.env,MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0',FORMAL_AUTO_REPLY_ENABLED:'0'}});
if(action==='build'&&fs.existsSync(envFile))fs.writeFileSync(envFile,empty);
process.exitCode=result.status??1;
