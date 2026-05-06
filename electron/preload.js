const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Recording
  recordingStarted:    ()              => ipcRenderer.send('recording:started'),
  recordingStopped:    ()              => ipcRenderer.send('recording:stopped'),
  updateSteps:         (steps)         => ipcRenderer.send('recording:steps-update', steps),

  // Float window
  onRecordingStatus:   (cb)            => ipcRenderer.on('recording:status',       (_, v) => cb(v)),
  onStepsUpdate:       (cb)            => ipcRenderer.on('recording:steps-update', (_, v) => cb(v)),
  floatStopRecording:  ()              => ipcRenderer.send('float:stop-recording'),
  floatHide:           ()              => ipcRenderer.send('float:hide'),

  // Global shortcuts
  onToggleRecording:   (cb)            => ipcRenderer.on('shortcut:toggle-recording', () => cb()),
  onGlobalStep:        (cb)            => ipcRenderer.on('global:step', (_, step) => cb(step)),

  // Window
  setAlwaysOnTop:      (flag)          => ipcRenderer.invoke('window:set-always-on-top', flag),

  // Terminal
  runCommand:          (command)       => ipcRenderer.invoke('terminal:run', command),
  spawnCommand:        (id, cmd, args) => ipcRenderer.send('terminal:spawn', { id, command: cmd, args }),
  onTerminalOutput:    (cb)            => ipcRenderer.on('terminal:output', (_, v) => cb(v)),

  // ✅ TASK APIs — new additions
  submitTask:          (task, shortcutKey) => ipcRenderer.invoke('task:submit', { task, shortcutKey }),
  getAllTasks:          ()              => ipcRenderer.invoke('task:get-all'),
  getTaskStatus:       ()              => ipcRenderer.invoke('task:get-status'),
  pauseTask:           ()              => ipcRenderer.invoke('task:pause'),
  resumeTask:          ()              => ipcRenderer.invoke('task:resume'),
  injectInput:         (instruction)   => ipcRenderer.invoke('task:inject-input', { instruction }),

  // ✅ Task events from main process
  onShortcutTriggered: (cb)            => ipcRenderer.on('task:shortcut-triggered', (_, v) => cb(v)),

  // Cleanup
  removeAllListeners:  (channel)       => ipcRenderer.removeAllListeners(channel),
});