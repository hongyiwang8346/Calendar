const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petApi', {
  // Mood change from tracker
  onMoodChange: (cb) => ipcRenderer.on('mood-change', (e, mood) => cb(mood)),
  // Window movement (drag)
  moveWindow: (x, y) => ipcRenderer.send('pet-move', x, y),
  // Visibility
  hide: () => ipcRenderer.send('pet-hide'),
  toggleAlwaysOnTop: () => ipcRenderer.send('pet-toggle-top'),
});
