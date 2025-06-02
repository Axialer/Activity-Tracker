const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onActivityUpdate: (callback) => ipcRenderer.on('activity-update', callback),
  resetActivityData: () => ipcRenderer.send('reset-activity-data'),
  exportData: () => ipcRenderer.send('export-data'),
  setTrackingInterval: (interval) => ipcRenderer.send('set-interval', interval),
  onAppStartTime: (callback) => ipcRenderer.on('app-start-time', callback),
  requestAppActivityLog: (appName) => ipcRenderer.send('request-app-activity-log', appName),
  onResponseAppActivityLog: (callback) => ipcRenderer.on('response-app-activity-log', callback),
  updateNotes: (notes) => ipcRenderer.send('update-notes', notes),
  showNotification: (title, message) => ipcRenderer.invoke('show-notification', title, message),
  onNoteNotified: (callback) => ipcRenderer.on('note-notified', callback),
  onRequestNotesUpdate: (callback) => ipcRenderer.on('request-notes-update', callback),
  saveNotes: (notesData) => ipcRenderer.invoke('save-notes', notesData),
  loadNotes: () => ipcRenderer.invoke('load-notes')
});