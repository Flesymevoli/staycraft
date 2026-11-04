// Formal data flow on loopback only; uses existing local environment configuration.
const {spawn}=require('node:child_process');
require('@next/env').loadEnvConfig(process.cwd(),true);
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3115'],{stdio:'inherit',windowsHide:true,env:{...process.env,...(process.env.STAYCRAFT_PREVIEW_OFFICIAL==='1'?{MODEL_NAME:'',MODEL_BASE_URL:'',MODEL_API_KEY:''}:{}),STAYCRAFT_HOSTED:'1',HOMESTAY_LOCAL_DATA:'0',MODEL_ENABLED:'1',FORMAL_MODEL_ENABLED:'1',FORMAL_AUTO_REPLY_ENABLED:'0',STAYCRAFT_OPERATOR_SAMPLE:'0',STAYCRAFT_QA_AUTH_FIXTURES:'0',STAYCRAFT_QA_IMPORT_DB:'0'}});
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());child.on('exit',code=>process.exitCode=code||0);
