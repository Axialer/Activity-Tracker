const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onActivityUpdate: (callback) => ipcRenderer.on('activity-update', callback),
  resetActivityData: () => ipcRenderer.send('reset-activity-data'),
  exportData: () => ipcRenderer.send('export-data'),
  setTrackingInterval: (interval) => ipcRenderer.send('set-interval', interval),
  onAppStartTime: (callback) => ipcRenderer.on('app-start-time', callback),
  requestAppActivityLog: (appName) => ipcRenderer.send('request-app-activity-log', appName),
  onResponseAppActivityLog: (callback) => ipcRenderer.on('response-app-activity-log', callback)
});