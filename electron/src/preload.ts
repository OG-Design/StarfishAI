import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api-nest', {
    fetch: (url: string, options: any = {}) => ipcRenderer.invoke('http-get', url, options)
});