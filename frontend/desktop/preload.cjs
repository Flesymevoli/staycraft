const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('staycraftDesktop',{
 status:()=>ipcRenderer.invoke('staycraft:status'),
 openLogin:()=>ipcRenderer.invoke('staycraft:login'),
 collectAndSync:hotels=>ipcRenderer.invoke('staycraft:collect',hotels),
 readTargets:()=>ipcRenderer.invoke('staycraft:targets'),
 saveTargets:input=>ipcRenderer.invoke('staycraft:save-targets',input),
});
