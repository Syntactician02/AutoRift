const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// uiohook is optional — don't crash if not installed
let uIOhook = null, UiohookKey = {};
try {
  const lib = require('uiohook-napi');
  uIOhook = lib.uIOhook;
  UiohookKey = lib.UiohookKey;
} catch (e) {
  console.warn('[AutoRift] uiohook-napi not available — global input tracking disabled');
}

let mainWindow = null;
let floatWindow = null;
let backendProcess = null;
let isRecording = false;

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// ── Start Python backend automatically ────────────────────────────────────────
function startBackend() {
  const isDev = process.env.NODE_ENV !== 'production';
  const backendDir = isDev
    ? path.join(__dirname, '..', 'backend')
    : path.join(process.resourcesPath, 'backend');

  if (!fs.existsSync(backendDir)) {
    console.error('[AutoRift] Backend dir not found:', backendDir);
    return;
  }

  // cwd MUST be backendDir so Python relative imports and tasks_log.json resolve correctly
  backendProcess = spawn('python', ['-m', 'uvicorn', 'app:app', '--port', '8000'], {
    cwd: backendDir,
    shell: process.platform === 'win32',
    env: { ...process.env },
  });

  backendProcess.stdout.on('data', d => process.stdout.write(`[Backend] ${d}`));
  backendProcess.stderr.on('data', d => process.stderr.write(`[Backend] ${d}`));
  backendProcess.on('close', code => console.log(`[AutoRift] Backend exited (${code})`));
  console.log('[AutoRift] Backend started from', backendDir);
}

// ── Window creators ───────────────────────────────────────────────────────────
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
}

function createFloatWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  floatWindow = new BrowserWindow({
    width: 230, height: 160,
    x: width - 260, y: height - 190,
    alwaysOnTop: true, frame: false, transparent: true,
    resizable: false, skipTaskbar: true, hasShadow: true,
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

// ── Task shortcut loader ──────────────────────────────────────────────────────
async function loadAndRegisterTaskShortcuts() {
  try {
    const res = await fetch('http://localhost:8000/tasks');
    const tasks = await res.json();
    for (const [taskId, data] of Object.entries(tasks)) {
      if (!data.shortcut_key) continue;
      const electronShortcut = data.shortcut_key
        .split('+')
        .map(k => k === 'ctrl' ? 'CommandOrControl' : k.charAt(0).toUpperCase() + k.slice(1))
        .join('+');
      if (globalShortcut.isRegistered(electronShortcut)) continue;
      globalShortcut.register(electronShortcut, async () => {
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
      console.log(`[AutoRift] Registered shortcut: ${electronShortcut}`);
    }
  } catch (e) {
    console.warn('[AutoRift] Could not load shortcuts:', e.message);
  }
}

// ── Global input tracking ─────────────────────────────────────────────────────
function startGlobalTracking() {
  if (!uIOhook) return;

  uIOhook.on('click', (e) => {
    if (!isRecording) return;
    const step = {
      id: `step_${Date.now()}_click`,
      type: 'click',
      timestamp: new Date().toISOString(),
      payload: { x: e.x, y: e.y, button: e.button === 1 ? 'left' : 'right', selector: `screen(${e.x},${e.y})` },
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
  if (uIOhook) uIOhook.stop();
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startBackend();          // start Python backend first
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

  // Wait 3s for backend to boot, then register saved shortcuts
  setTimeout(loadAndRegisterTaskShortcuts, 3000);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopGlobalTracking();
  if (backendProcess) {
    backendProcess.kill();
    console.log('[AutoRift] Backend killed');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createMainWindow();
});

// ── Recording IPC ─────────────────────────────────────────────────────────────
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

ipcMain.on('float:hide', () => { floatWindow?.hide(); });

// ── Window IPC ────────────────────────────────────────────────────────────────
ipcMain.handle('window:set-always-on-top', (_, flag) => {
  mainWindow?.setAlwaysOnTop(flag);
  return flag;
});

// ── Terminal IPC ──────────────────────────────────────────────────────────────
ipcMain.handle('terminal:run', async (_, command) => {
  return new Promise((resolve) => {
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      resolve({ success: !error, stdout: stdout || '', stderr: stderr || '', error: error?.message || null, code: error?.code ?? 0 });
    });
  });
});

ipcMain.on('terminal:spawn', (event, { id, command, args = [] }) => {
  const proc = spawn(command, args, { shell: true });
  proc.stdout.on('data', d => event.sender.send('terminal:output', { id, type: 'stdout', data: d.toString() }));
  proc.stderr.on('data', d => event.sender.send('terminal:output', { id, type: 'stderr', data: d.toString() }));
  proc.on('close', code => event.sender.send('terminal:output', { id, type: 'close', code }));
});

// ── Task IPC ──────────────────────────────────────────────────────────────────
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
  } catch (e) { return {}; }
});

ipcMain.handle('task:get-status', async () => {
  try {
    const res = await fetch('http://localhost:8000/status');
    return await res.json();
  } catch (e) { return {}; }
});

ipcMain.handle('task:pause', async () => {
  try {
    await fetch('http://localhost:8000/pause', { method: 'POST' });
    return { status: 'paused' };
  } catch (e) { return { status: 'error', message: e.message }; }
});

ipcMain.handle('task:resume', async () => {
  try {
    await fetch('http://localhost:8000/resume', { method: 'POST' });
    return { status: 'resumed' };
  } catch (e) { return { status: 'error', message: e.message }; }
});

ipcMain.handle('task:inject-input', async (_, { instruction }) => {
  try {
    const res = await fetch('http://localhost:8000/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction })
    });
    return await res.json();
  } catch (e) { return { status: 'error', message: e.message }; }
});