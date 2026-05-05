const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Recording
  recordingStarted:    ()              => ipcRenderer.send('recording:started'),
  recordingStopped:    ()              => ipcRenderer.send('recording:stopped'),
  updateSteps:         (steps)         => ipcRenderer.send('recording:steps-update', steps),

  // Float window receives these
  onRecordingStatus:   (cb)            => ipcRenderer.on('recording:status',       (_, v) => cb(v)),
  onStepsUpdate:       (cb)            => ipcRenderer.on('recording:steps-update', (_, v) => cb(v)),
  floatStopRecording:  ()              => ipcRenderer.send('float:stop-recording'),
  floatHide:           ()              => ipcRenderer.send('float:hide'),

  // Global shortcut from main process
  onToggleRecording:   (cb)            => ipcRenderer.on('shortcut:toggle-recording', () => cb()),

  // ✅ Global steps from uiohook (cross-app recording)
  onGlobalStep:        (cb)            => ipcRenderer.on('global:step', (_, step) => cb(step)),

  // Window
  setAlwaysOnTop:      (flag)          => ipcRenderer.invoke('window:set-always-on-top', flag),

  // Terminal
  runCommand:          (command)       => ipcRenderer.invoke('terminal:run', command),
  spawnCommand:        (id, cmd, args) => ipcRenderer.send('terminal:spawn', { id, command: cmd, args }),
  onTerminalOutput:    (cb)            => ipcRenderer.on('terminal:output', (_, v) => cb(v)),

  // Cleanup
  removeAllListeners:  (channel)       => ipcRenderer.removeAllListeners(channel),
});