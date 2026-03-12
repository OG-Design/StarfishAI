import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api-nest', {
    fetch: (url: string, options: any = {}) => ipcRenderer.invoke('http-get', url, options)
});
contextBridge.exposeInMainWorld('electronAPI', {
    onElectronData: (callback: any) => {
        ipcRenderer.on("electron-data", (_, data)=> callback(data));
    }
});