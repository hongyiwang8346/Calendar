const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(app.getPath('appData'), 'LuluTimeTracker', 'data.json');

function ensureDirExists() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clampToScreen(x, y, w, h) {
  const { x: sx, y: sy, width: sw, height: sh } = screen.getPrimaryDisplay().workArea;
  return {
    x: Math.max(sx, Math.min(x, sx + sw - w)),
    y: Math.max(sy, Math.min(y, sy + sh - h))
  };
}

let mainWindow = null;
let savedBounds = null;
let petWindow = null;
let tray = null;

// ── Create main tracker window ────────────────────────────────
function createMainWindow() {
  ensureDirExists();
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workArea;

  mainWindow = new BrowserWindow({
    width: 340, height: 140,
    x: sw - 340 - 20,
    y: sh - 140 - 20,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('maximize', () => mainWindow.webContents.send('maximize-change', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('maximize-change', false));
}

// ── Create pet window ─────────────────────────────────────────
function createPetWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workArea;

  petWindow = new BrowserWindow({
    width: 200, height: 260,
    x: sw - 220,
    y: sh - 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'pet-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  petWindow.loadFile('pet.html');
  petWindow.setIgnoreMouseEvents(false);
}

// ── Tray icon ─────────────────────────────────────────────────
function createTray() {
  // Build a simple orange circle icon programmatically (guaranteed to work)
  // 16x16 RGBA buffer: orange circle on transparent bg
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = 6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dist = Math.sqrt((x-cx)**2 + (y-cy)**2);
      if (dist <= r) {
        buf[i]   = 245; // R (orange)
        buf[i+1] = 166; // G
        buf[i+2] = 35;  // B
        buf[i+3] = 255; // A (fully opaque)
      } else {
        buf[i+3] = 0; // transparent
      }
    }
  }
  const icon = nativeImage.createFromBuffer(buf, { width: size, height: size });

  tray = new Tray(icon);
  tray.setToolTip('噜噜时间追踪器 🍊');

  // Rebuild menu dynamically so labels reflect current window state
  function refreshMenu() {
    const petVisible = petWindow && !petWindow.isDestroyed() && petWindow.isVisible();
    const menu = Menu.buildFromTemplate([
      {
        label: '📊 显示追踪器',
        click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } refreshMenu(); }
      },
      {
        label: petVisible ? '👋 隐藏噜噜' : '🐾 召唤噜噜',
        click: () => {
          if (!petWindow || petWindow.isDestroyed()) return;
          if (petVisible) { petWindow.hide(); }
          else { petWindow.show(); petWindow.focus(); }
          refreshMenu();
        }
      },
      { type: 'separator' },
      { label: '退出程序', role: 'quit' }
    ]);
    tray.setContextMenu(menu);
  }

  refreshMenu();

  // Single click also shows the menu (Windows tray behavior)
  tray.on('click', () => {
    refreshMenu(); // Ensure menu is up to date before showing
    tray.popUpContextMenu();
  });

  // Double click focuses tracker
  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

// ── IPC Handlers ─────────────────────────────────────────────
function registerIPC() {
  // Data persistence
  ipcMain.handle('load-data', () => {
    try {
      if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch(e) { console.error('load error:', e); }
    return { logs:[], schedules:{}, ideas:[], memos:[], reflections:{} };
  });

  ipcMain.handle('save-data', (event, data) => {
    try {
      ensureDirExists();
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch(e) { console.error('save error:', e); return false; }
  });

  // Window controls
  ipcMain.handle('toggle-always-on-top', () => {
    const on = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!on, 'screen-saver');
    return !on;
  });

  ipcMain.handle('is-always-on-top', () => mainWindow.isAlwaysOnTop());

  ipcMain.handle('set-window-size', (event, width, height) => {
    const b = mainWindow.getBounds();
    let nx = b.x - (width - b.width);
    let ny = b.y - (height - b.height);
    const clamped = clampToScreen(nx, ny, width, height);
    mainWindow.setBounds({ x: clamped.x, y: clamped.y, width, height });
    return true;
  });

  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-close', () => mainWindow.close());

  ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized());
  ipcMain.on('window-maximize', () => {
    savedBounds = mainWindow.getBounds();
    mainWindow.maximize();
  });
  ipcMain.on('window-unmaximize', () => {
    let bounds;
    if (savedBounds) {
      bounds = savedBounds;
      savedBounds = null;
    } else {
      const { width: sw, height: sh } = screen.getPrimaryDisplay().workArea;
      bounds = { x: sw - 340 - 20, y: sh - 140 - 20, width: 340, height: 140 };
    }
    const clamped = clampToScreen(bounds.x, bounds.y, bounds.width, bounds.height);
    mainWindow.setBounds({ x: clamped.x, y: clamped.y, width: bounds.width, height: bounds.height });
    mainWindow.webContents.send('maximize-change', false);
  });

  // Zoom level
  ipcMain.handle('get-zoom', () => mainWindow.webContents.getZoomFactor());
  ipcMain.handle('set-zoom', (event, factor) => {
    mainWindow.webContents.setZoomFactor(factor);
    return mainWindow.webContents.getZoomFactor();
  });

  // Pet window controls
  ipcMain.on('pet-move', (event, x, y) => {
    if (petWindow && !petWindow.isDestroyed()) petWindow.setPosition(Math.round(x), Math.round(y));
  });
  ipcMain.on('pet-hide', () => {
    if (petWindow && !petWindow.isDestroyed()) petWindow.hide();
  });
  ipcMain.on('pet-show', () => {
    if (petWindow && !petWindow.isDestroyed()) petWindow.show();
  });
  ipcMain.on('pet-toggle-top', () => {
    if (petWindow && !petWindow.isDestroyed()) {
      const on = petWindow.isAlwaysOnTop();
      petWindow.setAlwaysOnTop(!on, 'screen-saver');
    }
  });

  // Main window movement (JS-based drag for frameless window)
  ipcMain.on('main-move', (event, x, y) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const size = mainWindow.getSize();
      const clamped = clampToScreen(x, y, size[0], size[1]);
      mainWindow.setResizable(false);
      mainWindow.setPosition(clamped.x, clamped.y);
      mainWindow.setSize(size[0], size[1]);
      mainWindow.setResizable(true);
    }
  });

  // Mood relay: main tracker -> pet window
  ipcMain.on('pet-mood', (event, mood) => {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('mood-change', mood);
    }
  });

  // Update check — fetch latest release from GitHub
  const https = require('https');
  ipcMain.handle('check-update', () => {
    return new Promise((resolve) => {
      const opts = { hostname:'api.github.com', path:'/repos/hongyiwang8346/Calendar/releases/latest',
        headers:{ 'User-Agent':'LuluTimeTracker', Accept:'application/vnd.github+json' } };
      https.get(opts, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ latest: json.tag_name, url: json.html_url, body: json.body || '' });
          } catch(e) { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });
  });

  // Open external URL in browser
  ipcMain.handle('open-external', (event, url) => {
    return require('electron').shell.openExternal(url);
  });
}

// ── App lifecycle ─────────────────────────────────────────────

app.whenReady().then(() => {
  setTimeout(() => {
    createMainWindow();
    createPetWindow();
    createTray();
    registerIPC();
  }, 200);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createPetWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
