const {contextBridge}=require('electron');
const unavailable=async()=>({state:'failed',sample:true,error:'demo_only'});
contextBridge.exposeInMainWorld('staycraftDesktop',{status:async()=>({state:'idle',sample:true}),openLogin:unavailable,collectAndSync:unavailable});
