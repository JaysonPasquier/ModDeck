const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow;
let settingsWindow;

// Configuration and data management
const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CHAT_DATA_FILE = path.join(DATA_DIR, 'chat_data.json');
const SESSION_LOG_FILE = path.join(DATA_DIR, 'session_log.json');

// Default settings
const DEFAULT_SETTINGS = {
  windowSize: { width: 400, height: 600 },
  windowPosition: { x: 100, y: 100 },
  alwaysOnTop: true,
  autoUpdate: true,
  twitchChannel: '',
  filterSettings: {
    showBadges: true,
    showColors: true,
    enableMentions: true
  },
  theme: 'dark',
  language: 'en',
  autoScroll: true,
  showTimestamps: true,
  highlightMentions: true,
  mentionKeywords: 'fugu_fps,moddeck',
  openTabs: [],
  activeTab: null
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load settings
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return DEFAULT_SETTINGS;
}

// Session tracking functions
function loadSessionLog() {
  try {
    if (fs.existsSync(SESSION_LOG_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_LOG_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading session log:', error);
  }
  return {
    lastDataReset: null,
    sessions: []
  };
}

function saveSessionLog(sessionLog) {
  try {
    fs.writeFileSync(SESSION_LOG_FILE, JSON.stringify(sessionLog, null, 2));
  } catch (error) {
    console.error('Error saving session log:', error);
  }
}

function logAppSession() {
  const sessionLog = loadSessionLog();
  const now = new Date();
  const today = now.toDateString();

  // Add current session
  sessionLog.sessions.push({
    startTime: now.toISOString(),
    date: today
  });

  // Keep only last 30 days of sessions
  const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
  sessionLog.sessions = sessionLog.sessions.filter(session =>
    new Date(session.startTime) > thirtyDaysAgo
  );

  saveSessionLog(sessionLog);
  return sessionLog;
}

function shouldResetDataToday() {
  const sessionLog = loadSessionLog();
  const now = new Date();
  const today = now.toDateString();
  const currentHour = now.getHours();

  // Only reset after 18h (6 PM)
  if (currentHour < 18) {
    return false;
  }

  // Check if we already reset data today
  if (sessionLog.lastDataReset) {
    const lastResetDate = new Date(sessionLog.lastDataReset).toDateString();
    if (lastResetDate === today) {
      return false; // Already reset today
    }
  }

  // Check if this is the first session today after 18h
  const todaySessions = sessionLog.sessions.filter(session => session.date === today);

  if (todaySessions.length === 0) {
    // This is the first session today, reset data
    return true;
  }

  return false;
}

function markDataResetToday() {
  const sessionLog = loadSessionLog();
  sessionLog.lastDataReset = new Date().toISOString();
  saveSessionLog(sessionLog);
}

// Save settings
function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Clean chat data daily at 18h
function cleanOldChatData() {
  try {
    // Log this app session
    logAppSession();

    // Check if we should reset data today
    if (shouldResetDataToday()) {
      console.log('Resetting chat data - first session today after 18h');

      // Reset chat data completely
      const cleanedData = {
        messages: [],
        mentions: [],
        lastCleaned: Date.now(),
        resetReason: 'Daily reset at 18h'
      };

      fs.writeFileSync(CHAT_DATA_FILE, JSON.stringify(cleanedData, null, 2));
      markDataResetToday();
      console.log('Chat data reset successfully');
    } else {
      console.log('Chat data not reset - already reset today or before 18h');
    }
  } catch (error) {
    console.error('Error managing chat data:', error);
  }
}

function createWindow() {
  const settings = loadSettings();

  // Validate and sanitize window dimensions
  const minWidth = 350;
  const minHeight = 400;
  const maxWidth = 2000;
  const maxHeight = 1500;

  let windowWidth = settings.windowSize.width;
  let windowHeight = settings.windowSize.height;
  let windowX = settings.windowPosition.x;
  let windowY = settings.windowPosition.y;

  // Ensure window dimensions are within reasonable bounds
  if (windowWidth < minWidth || windowWidth > maxWidth) {
    windowWidth = 400; // Default width
  }
  if (windowHeight < minHeight || windowHeight > maxHeight) {
    windowHeight = 600; // Default height
  }

  // Ensure window position is on screen (basic validation)
  if (windowX < 0 || windowX > 1920) { // Assuming common screen widths
    windowX = 100;
  }
  if (windowY < 0 || windowY > 1080) { // Assuming common screen heights
    windowY = 100;
  }

  console.log(`Creating window with dimensions: ${windowWidth}x${windowHeight} at (${windowX}, ${windowY})`);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    minWidth: minWidth,
    minHeight: minHeight,
    frame: false,
    transparent: false,
    alwaysOnTop: settings.alwaysOnTop,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      enableRemoteModule: false,
      partition: 'persist:moddeck' // Add persistent partition for localStorage
    },
    show: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, 'assets', 'icon.svg')
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Check for daily data reset on startup
    cleanOldChatData();

    // Set up periodic checking every hour to see if we need to reset
    setInterval(cleanOldChatData, 60 * 60 * 1000);
  });

  // Track window resize events and save dimensions in real-time
  let saveTimeout;
  const saveWindowDimensions = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    // Throttle saves to avoid excessive file writes
    saveTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        const settings = loadSettings();
        settings.windowSize = { width: bounds.width, height: bounds.height };
        settings.windowPosition = { x: bounds.x, y: bounds.y };
        saveSettings(settings);
        console.log('Window dimensions saved:', bounds);
      }
    }, 500); // Save after 500ms of no resize activity
  };

  // Save dimensions when window is resized
  mainWindow.on('resize', saveWindowDimensions);

  // Save dimensions when window is moved
  mainWindow.on('move', saveWindowDimensions);

  mainWindow.on('closed', () => {
    // Final save of window position and size before closing
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      const settings = loadSettings();
      settings.windowSize = { width: bounds.width, height: bounds.height };
      settings.windowPosition = { x: bounds.x, y: bounds.y };
      saveSettings(settings);
    }
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  Menu.setApplicationMenu(null);
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 700,
    parent: mainWindow,
    modal: true,
    frame: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false,
    title: 'ModDeck Settings'
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  // Check for updates on startup
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();
  }
}).catch(error => {
  console.error('Error during app initialization:', error);
});

// Handle cache errors gracefully
app.on('gpu-process-crashed', (event, killed) => {
  console.log('GPU process crashed, restarting...');
  if (mainWindow) {
    mainWindow.reload();
  }
});

// Ignore certificate errors for localhost connections
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('close-app', () => {
  app.quit();
});

ipcMain.handle('minimize-app', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// Add these missing handlers for the renderer
ipcMain.on('window-close', () => {
  app.quit();
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-toggle-pin', () => {
  if (mainWindow) {
    const isOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isOnTop);

    // Save setting
    const settings = loadSettings();
    settings.alwaysOnTop = !isOnTop;
    saveSettings(settings);

    // Send response back to renderer
    mainWindow.webContents.send('pin-changed', !isOnTop);
  }
});

ipcMain.on('toggle-dev-tools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      // Send state after a small delay to ensure DevTools are closed
      setTimeout(() => {
        mainWindow.webContents.send('dev-tools-toggled', false);
      }, 100);
    } else {
      mainWindow.webContents.openDevTools();
      // Send state after a small delay to ensure DevTools are opened
      setTimeout(() => {
        mainWindow.webContents.send('dev-tools-toggled', true);
      }, 100);
    }
  }
});

ipcMain.handle('toggle-always-on-top', () => {
  if (mainWindow) {
    const isOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isOnTop);

    // Save setting
    const settings = loadSettings();
    settings.alwaysOnTop = !isOnTop;
    saveSettings(settings);

    return !isOnTop;
  }
  return false;
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (event, newSettings) => {
  const currentSettings = loadSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  saveSettings(updatedSettings);

  // Apply window settings immediately, but preserve current size if not specified
  if (mainWindow) {
    // Only apply window size if explicitly provided in settings
    // This prevents automatic resizing from overriding user's manual resizing
    if (newSettings.windowSize && newSettings.applyWindowSize === true) {
      mainWindow.setSize(newSettings.windowSize.width, newSettings.windowSize.height);
    }
    if (newSettings.alwaysOnTop !== undefined) {
      mainWindow.setAlwaysOnTop(newSettings.alwaysOnTop);
    }
  }

  return updatedSettings;
});

// Add handler for manual window resizing from renderer (if needed)
ipcMain.handle('set-window-size', (event, width, height) => {
  if (mainWindow && width && height) {
    mainWindow.setSize(width, height);
    // Save the new size immediately
    const settings = loadSettings();
    settings.windowSize = { width, height };
    saveSettings(settings);
    return true;
  }
  return false;
});

// Add handler to get current window dimensions
ipcMain.handle('get-window-bounds', () => {
  if (mainWindow) {
    return mainWindow.getBounds();
  }
  return null;
});

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      hasUpdate: result?.updateInfo?.version !== app.getVersion(),
      currentVersion: app.getVersion(),
      latestVersion: result?.updateInfo?.version || app.getVersion()
    };
  } catch (error) {
    console.error('Update check failed:', error);
    return {
      hasUpdate: false,
      currentVersion: app.getVersion(),
      latestVersion: app.getVersion(),
      error: error.message
    };
  }
});

ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle('get-chat-data', () => {
  try {
    if (fs.existsSync(CHAT_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(CHAT_DATA_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading chat data:', error);
  }
  return { messages: [], mentions: [] };
});

ipcMain.handle('save-chat-data', (event, chatData) => {
  try {
    fs.writeFileSync(CHAT_DATA_FILE, JSON.stringify(chatData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving chat data:', error);
    return false;
  }
});

// Shortcut creation handlers
ipcMain.handle('create-desktop-shortcut', async () => {
  try {
    const os = require('os');
    const shortcutPath = path.join(os.homedir(), 'Desktop', 'ModDeck v2.lnk');

    if (process.platform === 'win32') {
      const shell = require('child_process');
      // Use the current working directory and run the batch file
      const appPath = path.join(__dirname, 'run-moddeck-app.bat');
      const command = `powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('${shortcutPath}'); $s.TargetPath='${appPath}'; $s.WorkingDirectory='${__dirname}'; $s.Save()";`;
      shell.exec(command);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error creating desktop shortcut:', error);
    return false;
  }
});ipcMain.handle('add-to-start-menu', async () => {
  try {
    if (process.platform === 'win32') {
      const os = require('os');
      const startMenuPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'ModDeck v2.lnk');

      const shell = require('child_process');
      // Use the current working directory and run the batch file
      const appPath = path.join(__dirname, 'run-moddeck-app.bat');
      const command = `powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('${startMenuPath}'); $s.TargetPath='${appPath}'; $s.WorkingDirectory='${__dirname}'; $s.Save()";`;
      shell.exec(command);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding to start menu:', error);
    return false;
  }
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available');
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

autoUpdater.on('error', (error) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-error', error.message);
  }
});
