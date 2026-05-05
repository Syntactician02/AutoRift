const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
let floatWindow = null;

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

app.whenReady().then(() => {
  createMainWindow();
  createFloatWindow();

  // Ctrl+Shift+R — toggle recording globally
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    mainWindow?.webContents.send('shortcut:toggle-recording');
  });

  // Ctrl+Shift+F — show/hide float window
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (!floatWindow) return;
    floatWindow.isVisible() ? floatWindow.hide() : floatWindow.show();
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (!mainWindow) createMainWindow();
});

// ── Recording IPC ──────────────────────────────────────────────────────────────
ipcMain.on('recording:started', () => {
  floatWindow?.show();
  floatWindow?.webContents.send('recording:status', { recording: true });
});

ipcMain.on('recording:stopped', () => {
  floatWindow?.webContents.send('recording:status', { recording: false });
});

ipcMain.on('recording:steps-update', (_, steps) => {
  floatWindow?.webContents.send('recording:steps-update', steps);
});

ipcMain.on('float:stop-recording', () => {
  mainWindow?.webContents.send('shortcut:toggle-recording');
});

ipcMain.on('float:hide', () => {
  floatWindow?.hide();
});

// ── Window IPC ─────────────────────────────────────────────────────────────────
ipcMain.handle('window:set-always-on-top', (_, flag) => {
  mainWindow?.setAlwaysOnTop(flag);
  return flag;
});

// ── Terminal IPC ───────────────────────────────────────────────────────────────
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