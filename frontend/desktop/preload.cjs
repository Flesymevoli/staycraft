const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('staycraftDesktop',{
 status:()=>ipcRenderer.invoke('staycraft:status'),
 openLogin:()=>ipcRenderer.invoke('staycraft:login'),
 collectAndSync:hotels=>ipcRenderer.invoke('staycraft:collect',hotels),
});
