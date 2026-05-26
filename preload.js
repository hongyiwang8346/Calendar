const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  isAlwaysOnTop: () => ipcRenderer.invoke('is-always-on-top'),
  setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', width, height),
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  maximize: () => ipcRenderer.send('window-maximize'),
  unmaximize: () => ipcRenderer.send('window-unmaximize'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (cb) => ipcRenderer.on('maximize-change', (e, val) => cb(val)),
  getZoom: () => ipcRenderer.invoke('get-zoom'),
  setZoom: (factor) => ipcRenderer.invoke('set-zoom', factor),
  // Window movement (JS-based drag for frameless window)
  moveMainWindow: (x, y) => ipcRenderer.send('main-move', x, y),
  // Send mood to pet window
  sendPetMood: (mood) => ipcRenderer.send('pet-mood', mood),
  // Update check
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
