const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const { uIOhook, UiohookKey } = require('uiohook-napi');

let mainWindow = null;
let floatWindow = null;
let isRecording = false;

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0a0b0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  const isDev = process.env.NODE_ENV !== 'production';
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../autorift-app/dist/index.html')}`
  );

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  trackWindowNavigations(mainWindow);
}

function createFloatWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  floatWindow = new BrowserWindow({
    width: 230,
    height: 160,
    x: width - 260,
    y: height - 190,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV !== 'production';
  floatWindow.loadURL(
    isDev
      ? 'http://localhost:5173/#/float'
      : `file://${path.join(__dirname, '../autorift-app/dist/index.html')}#/float`
  );

  floatWindow.on('closed', () => { floatWindow = null; });
}

async function loadAndRegisterTaskShortcuts() {
  try {
    const res = await fetch('http://localhost:8000/tasks');
    const tasks = await res.json();

    for (const [taskId, data] of Object.entries(tasks)) {
      if (!data.shortcut_key) continue;

      const electronShortcut = data.shortcut_key
        .split('+')
        .map(k => {
          if (k === 'ctrl') return 'CommandOrControl';
          return k.charAt(0).toUpperCase() + k.slice(1);
        })
        .join('+');

      if (globalShortcut.isRegistered(electronShortcut)) continue;

      globalShortcut.register(electronShortcut, async () => {
        console.log(`[AutoRift] Shortcut fired: ${data.shortcut_key} → "${data.task}"`);
        try {
          await fetch('http://localhost:8000/run-by-shortcut', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortcut_key: data.shortcut_key })
          });
          mainWindow?.webContents.send('task:shortcut-triggered', {
            shortcut: data.shortcut_key,
            task: data.task
          });
        } catch (e) {
          console.error('[AutoRift] Shortcut run failed:', e.message);
        }
      });

      console.log(`[AutoRift] Registered: ${electronShortcut} → "${data.task}"`);
    }
  } catch (e) {
    console.error('[AutoRift] Could not load task shortcuts:', e.message);
  }
}

function trackWindowNavigations(win) {
  win.webContents.on('did-navigate', (event, url) => {
    if (!isRecording) return;
    if (url.includes('localhost:5173') || url.includes('autorift-app')) return;
    const step = {
      id: `step_${Date.now()}_navigate`,
      type: 'navigate',
      timestamp: new Date().toISOString(),
      payload: { url },
    };
    mainWindow?.webContents.send('global:step', step);
    floatWindow?.webContents.send('recording:steps-update', step);
    console.log(`[AutoRift] Navigate recorded: ${url}`);
  });

  win.webContents.on('did-navigate-in-page', (event, url) => {
    if (!isRecording) return;
    if (url.includes('localhost:5173') || url.includes('autorift-app')) return;
    const step = {
      id: `step_${Date.now()}_navigate`,
      type: 'navigate',
      timestamp: new Date().toISOString(),
      payload: { url },
    };
    mainWindow?.webContents.send('global:step', step);
  });
}

function startGlobalTracking() {
  uIOhook.on('click', (e) => {
    if (!isRecording) return;
    const step = {
      id: `step_${Date.now()}_click`,
      type: 'click',
      timestamp: new Date().toISOString(),
      payload: {
        x: e.x,
        y: e.y,
        button: e.button === 1 ? 'left' : e.button === 2 ? 'right' : 'middle',
        selector: `screen(${e.x},${e.y})`,
      },
    };
    mainWindow?.webContents.send('global:step', step);
    floatWindow?.webContents.send('recording:steps-update', step);
  });

  uIOhook.on('keydown', (e) => {
    if (!isRecording) return;
    const namedKeys = {
      [UiohookKey.Enter]: 'Enter',
      [UiohookKey.Escape]: 'Escape',
      [UiohookKey.Tab]: 'Tab',
      [UiohookKey.Backspace]: 'Backspace',
      [UiohookKey.Delete]: 'Delete',
      [UiohookKey.ArrowUp]: 'ArrowUp',
      [UiohookKey.ArrowDown]: 'ArrowDown',
      [UiohookKey.ArrowLeft]: 'ArrowLeft',
      [UiohookKey.ArrowRight]: 'ArrowRight',
    };
    const keyName = namedKeys[e.keycode];
    if (!keyName) return;
    const step = {
      id: `step_${Date.now()}_key`,
      type: 'keydown',
      timestamp: new Date().toISOString(),
      payload: { key: keyName },
    };
    mainWindow?.webContents.send('global:step', step);
  });

  uIOhook.start();
}

function stopGlobalTracking() {
  uIOhook.stop();
}

app.whenReady().then(() => {
  createMainWindow();
  createFloatWindow();
  startGlobalTracking();

  globalShortcut.register('CommandOrControl+Shift+R', () => {
    isRecording = !isRecording;
    mainWindow?.webContents.send('shortcut:toggle-recording');
    if (isRecording) {
      floatWindow?.show();
      floatWindow?.webContents.send('recording:status', { recording: true });
    } else {
      floatWindow?.webContents.send('recording:status', { recording: false });
    }
  });

  globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (!floatWindow) return;
    floatWindow.isVisible() ? floatWindow.hide() : floatWindow.show();
  });

  loadAndRegisterTaskShortcuts();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopGlobalTracking();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createMainWindow();
});

ipcMain.on('recording:started', () => {
  isRecording = true;
  floatWindow?.show();
  floatWindow?.webContents.send('recording:status', { recording: true });
});

ipcMain.on('recording:stopped', () => {
  isRecording = false;
  floatWindow?.webContents.send('recording:status', { recording: false });
});

ipcMain.on('recording:steps-update', (_, steps) => {
  floatWindow?.webContents.send('recording:steps-update', steps);
});

ipcMain.on('float:stop-recording', () => {
  isRecording = false;
  mainWindow?.webContents.send('shortcut:toggle-recording');
});

ipcMain.on('float:hide', () => {
  floatWindow?.hide();
});

ipcMain.handle('window:set-always-on-top', (_, flag) => {
  mainWindow?.setAlwaysOnTop(flag);
  return flag;
});

ipcMain.handle('terminal:run', async (_, command) => {
  return new Promise((resolve) => {
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || '',
        error: error?.message || null,
        code: error?.code ?? 0,
      });
    });
  });
});

ipcMain.on('terminal:spawn', (event, { id, command, args = [] }) => {
  const proc = spawn(command, args, { shell: true });
  proc.stdout.on('data', (data) => {
    event.sender.send('terminal:output', { id, type: 'stdout', data: data.toString() });
  });
  proc.stderr.on('data', (data) => {
    event.sender.send('terminal:output', { id, type: 'stderr', data: data.toString() });
  });
  proc.on('close', (code) => {
    event.sender.send('terminal:output', { id, type: 'close', code });
  });
});

ipcMain.handle('task:submit', async (_, { task, shortcutKey }) => {
  try {
    const res = await fetch('http://localhost:8000/start-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, shortcut_key: shortcutKey || null })
    });
    const data = await res.json();
    await loadAndRegisterTaskShortcuts();
    return data;
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});

ipcMain.handle('task:get-all', async () => {
  try {
    const res = await fetch('http://localhost:8000/tasks');
    return await res.json();
  } catch (e) {
    return {};
  }
});

ipcMain.handle('task:get-status', async () => {
  try {
    const res = await fetch('http://localhost:8000/status');
    return await res.json();
  } catch (e) {
    return {};
  }
});

ipcMain.handle('task:pause', async () => {
  try {
    await fetch('http://localhost:8000/pause', { method: 'POST' });
    return { status: 'paused' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});

ipcMain.handle('task:resume', async () => {
  try {
    await fetch('http://localhost:8000/resume', { method: 'POST' });
    return { status: 'resumed' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});

ipcMain.handle('task:inject-input', async (_, { instruction }) => {
  try {
    const res = await fetch('http://localhost:8000/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction })
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});