const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('staycraftDesktop',{
 openDemo:()=>ipcRenderer.invoke('staycraft:open-demo'),
 status:()=>ipcRenderer.invoke('staycraft:status'),
 openLogin:()=>ipcRenderer.invoke('staycraft:login'),
 collectAndSync:hotels=>ipcRenderer.invoke('staycraft:collect',hotels),
 retrySync:()=>ipcRenderer.invoke('staycraft:retry-sync'),
 cancel:()=>ipcRenderer.invoke('staycraft:cancel'),
 readTargets:()=>ipcRenderer.invoke('staycraft:targets'),
 saveTargets:input=>ipcRenderer.invoke('staycraft:save-targets',input),
});
