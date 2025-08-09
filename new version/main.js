const { app, BrowserWindow, Menu, ipcMain, shell, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const VersionManager = require('./src/version-manager');
const fetch = require('node-fetch');

let mainWindow;
let settingsWindow;
let versionManager;

// Configuration and data management (will be initialized after app is ready)
let DATA_DIR;
let SETTINGS_FILE;
let CHAT_DATA_FILE;
let SESSION_LOG_FILE;

function initializeDataPaths() {
    DATA_DIR = path.join(app.getPath('userData'), 'data');
    SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
    CHAT_DATA_FILE = path.join(DATA_DIR, 'chat_data.json');
    SESSION_LOG_FILE = path.join(DATA_DIR, 'session_log.json');

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

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
  helix: {
    clientId: '',
    accessToken: ''
  },
  openTabs: [],
  activeTab: null
};



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

  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'assets', 'icon.ico')
    : path.join(__dirname, 'assets', 'icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;

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
    icon: icon,
    title: 'ModDeck v3'
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
  // Initialize data paths first
  initializeDataPaths();

  // Set app icon for taskbar
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'assets', 'icon.ico')
    : path.join(__dirname, 'assets', 'icon.png');

  if (fs.existsSync(iconPath)) {
    const icon = nativeImage.createFromPath(iconPath);
    app.setAppUserModelId('com.fugufps.moddeck-v3');
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.fugufps.moddeck-v3');
    }
  }

  // Initialize version manager
  versionManager = new VersionManager();

  createWindow();

  // Check for updates on startup using our custom version manager
  if (process.env.NODE_ENV !== 'development') {
    // Use both electron-updater and our custom version manager
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

// ========== Twitch Helix Moderation (Main process) ==========
let helixCache = {
  selfUserId: null,
  loginToId: new Map()
};

function getHelixHeaders() {
  const settings = loadSettings();
  if (!settings.helix?.clientId || !settings.helix?.accessToken) {
    throw new Error('Missing Helix credentials');
  }
  return {
    'Client-ID': settings.helix.clientId,
    'Authorization': `Bearer ${settings.helix.accessToken}`,
    'Content-Type': 'application/json'
  };
}

async function helixGetSelfUserId() {
  if (helixCache.selfUserId) return helixCache.selfUserId;
  const headers = getHelixHeaders();
  const res = await fetch('https://api.twitch.tv/helix/users', { headers });
  if (!res.ok) throw new Error(`Helix get self failed: ${res.status}`);
  const data = await res.json();
  const id = data?.data?.[0]?.id;
  if (!id) throw new Error('Unable to resolve self user id');
  helixCache.selfUserId = id;
  return id;
}

async function helixGetUserIdByLogin(login) {
  if (helixCache.loginToId.has(login)) return helixCache.loginToId.get(login);
  const headers = getHelixHeaders();
  const url = `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Helix get user failed: ${res.status}`);
  const data = await res.json();
  const id = data?.data?.[0]?.id;
  if (!id) throw new Error(`User not found: ${login}`);
  helixCache.loginToId.set(login, id);
  return id;
}

async function ensureIds(channelLogin) {
  const broadcasterId = await helixGetUserIdByLogin(channelLogin);
  const moderatorId = await helixGetSelfUserId();
  return { broadcasterId, moderatorId };
}

async function getUserBanHistory(channelLogin, targetLogin) {
  try {
    const ids = await ensureIds(channelLogin);
    if (!ids) return null;

    const targetId = await helixGetUserIdByLogin(targetLogin);
    if (!targetId) return null;

    const headers = getHelixHeaders();
    const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${ids.broadcasterId}&moderator_id=${ids.moderatorId}&user_id=${targetId}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Failed to get ban history: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error getting user ban history:', error);
    return null;
  }
}

async function getUserMessages(channelLogin, targetLogin) {
  try {
    const ids = await ensureIds(channelLogin);
    if (!ids) return null;

    const targetId = await helixGetUserIdByLogin(targetLogin);
    if (!targetId) return null;

    const headers = getHelixHeaders();

    // Get user information from Twitch API
    const userUrl = `https://api.twitch.tv/helix/users?id=${targetId}`;
    const userRes = await fetch(userUrl, { headers });

    let userInfo = null;
    if (userRes.ok) {
      const userData = await userRes.json();
      userInfo = userData.data?.[0] || null;
    }

    // Note: Twitch API doesn't provide direct access to chat history
    // We'll return user info and let the frontend use local messages
    return {
      userInfo: userInfo,
      messages: [] // Will be populated from local storage
    };
  } catch (error) {
    console.error('Error getting user messages:', error);
    return {
      userInfo: null,
      messages: []
    };
  }
}

ipcMain.handle('mod-delete-message', async (event, { channelLogin, messageId }) => {
  try {
    const { broadcasterId, moderatorId } = await ensureIds(channelLogin);
    const headers = getHelixHeaders();
    // Use Chat Delete endpoint (v1): DELETE /moderation/chat?broadcaster_id&moderator_id&message_id
    const url = `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&message_id=${encodeURIComponent(messageId)}`;
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Helix delete failed: ${res.status} ${detail}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Helix delete error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mod-timeout', async (event, { channelLogin, targetLogin, seconds, reason }) => {
  try {
    const { broadcasterId, moderatorId } = await ensureIds(channelLogin);
    const targetId = await helixGetUserIdByLogin(targetLogin);
    const headers = getHelixHeaders();
    const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`;
    const body = {
      data: {
        user_id: targetId,
        duration: seconds,
        reason: reason || 'ModDeck timeout'
      }
    };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Helix timeout failed: ${res.status} ${detail}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Helix timeout error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mod-ban', async (event, { channelLogin, targetLogin, reason }) => {
  try {
    const { broadcasterId, moderatorId } = await ensureIds(channelLogin);
    const targetId = await helixGetUserIdByLogin(targetLogin);
    const headers = getHelixHeaders();
    const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`;
    const body = {
      data: {
        user_id: targetId,
        reason: reason || 'ModDeck ban'
      }
    };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Helix ban failed: ${res.status} ${detail}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Helix ban error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mod-unban', async (event, { channelLogin, targetLogin }) => {
  try {
    const { broadcasterId, moderatorId } = await ensureIds(channelLogin);
    const targetId = await helixGetUserIdByLogin(targetLogin);
    const headers = getHelixHeaders();
    const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&user_id=${targetId}`;
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Helix unban failed: ${res.status} ${detail}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Helix unban error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pin-message', async (event, { channelLogin, message, username, messageId }) => {
  try {
    const { broadcasterId, moderatorId } = await ensureIds(channelLogin);
    const headers = getHelixHeaders();
    const url = `https://api.twitch.tv/helix/chat/announcements`;
    const body = {
      broadcaster_id: broadcasterId,
      moderator_id: moderatorId,
      message: `📌 PINNED: ${message}` // Add pin emoji and prefix
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Helix announcement failed: ${res.status} ${detail}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Helix announcement error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-prediction', async (event, { channelLogin, title, outcomes, duration }) => {
  try {
    const { broadcasterId } = await ensureIds(channelLogin);
    const headers = getHelixHeaders();
    const url = `https://api.twitch.tv/helix/predictions`;
    const body = {
      broadcaster_id: broadcasterId,
      title: title,
      outcomes: outcomes.map(outcome => ({ title: outcome })),
      prediction_window: duration
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Helix create prediction failed: ${res.status} ${detail}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Helix create prediction error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-prediction', async (event, { channelLogin }) => {
  try {
    const { broadcasterId } = await ensureIds(channelLogin);
    const headers = getHelixHeaders();
    const url = `https://api.twitch.tv/helix/predictions?broadcaster_id=${broadcasterId}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Helix get prediction failed: ${res.status} ${detail}`);
    }
    const data = await res.json();
    return {
      success: true,
      prediction: data.data && data.data.length > 0 ? data.data[0] : null
    };
  } catch (error) {
    console.error('Helix get prediction error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('end-prediction', async (event, { channelLogin, winningOutcome }) => {
  try {
    const { broadcasterId } = await ensureIds(channelLogin);
    const headers = getHelixHeaders();

    // First get current prediction to get prediction ID
    const getPredictionUrl = `https://api.twitch.tv/helix/predictions?broadcaster_id=${broadcasterId}`;
    const getPredictionRes = await fetch(getPredictionUrl, { headers });
    if (!getPredictionRes.ok) {
      throw new Error('Failed to get current prediction');
    }
    const predictionData = await getPredictionRes.json();
    if (!predictionData.data || predictionData.data.length === 0) {
      throw new Error('No active prediction found');
    }

    const prediction = predictionData.data[0];
    const winningOutcomeId = winningOutcome === 'outcome1' ?
      prediction.outcomes[0].id : prediction.outcomes[1].id;

    const url = `https://api.twitch.tv/helix/predictions`;
    const body = {
      broadcaster_id: broadcasterId,
      id: prediction.id,
      status: 'RESOLVED',
      winning_outcome_id: winningOutcomeId
    };
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Helix end prediction failed: ${res.status} ${detail}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Helix end prediction error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cancel-prediction', async (event, { channelLogin }) => {
  try {
    const { broadcasterId } = await ensureIds(channelLogin);
    const headers = getHelixHeaders();

    // First get current prediction to get prediction ID
    const getPredictionUrl = `https://api.twitch.tv/helix/predictions?broadcaster_id=${broadcasterId}`;
    const getPredictionRes = await fetch(getPredictionUrl, { headers });
    if (!getPredictionRes.ok) {
      throw new Error('Failed to get current prediction');
    }
    const predictionData = await getPredictionRes.json();
    if (!predictionData.data || predictionData.data.length === 0) {
      throw new Error('No active prediction found');
    }

    const prediction = predictionData.data[0];

    const url = `https://api.twitch.tv/helix/predictions`;
    const body = {
      broadcaster_id: broadcasterId,
      id: prediction.id,
      status: 'CANCELED'
    };
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Helix cancel prediction failed: ${res.status} ${detail}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Helix cancel prediction error:', error);
    return { success: false, error: error.message };
  }
});

    ipcMain.handle('get-user-ban-history', async (event, { channelLogin, targetLogin }) => {
      try {
        const banHistory = await getUserBanHistory(channelLogin, targetLogin);
        return { success: true, data: banHistory };
      } catch (error) {
        console.error('Error getting user ban history:', error);
        return { success: false, error: error.message };
      }
    });

    // Get user messages from Twitch API
    ipcMain.handle('get-user-messages', async (event, { channelLogin, targetLogin }) => {
      try {
        const messages = await getUserMessages(channelLogin, targetLogin);
        return { success: true, data: messages };
      } catch (error) {
        console.error('Error getting user messages:', error);
        return { success: false, error: error.message };
      }
    });

// Send chat message via Helix API
ipcMain.handle('helix-send-message', async (event, { channelLogin, message, replyToMessageId = null }) => {
  try {
    const broadcasterId = await helixGetUserIdByLogin(channelLogin);
    const senderId = await helixGetSelfUserId();

    const body = {
      broadcaster_id: broadcasterId,
      sender_id: senderId,
      message: message
    };

    // Add reply parent if specified
    if (replyToMessageId) {
      body.reply_parent_message_id = replyToMessageId;
    }

    const headers = getHelixHeaders();
    const res = await fetch('https://api.twitch.tv/helix/chat/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Helix send message failed: ${res.status} - ${errorData?.message || 'Unknown error'}`);
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error sending message via Helix:', error);
    return { success: false, error: error.message };
  }
});

// Validate Helix token/scopes
ipcMain.handle('validate-helix', async () => {
  try {
    const settings = loadSettings();
    if (!settings.helix?.accessToken) {
      return { ok: false, error: 'No access token set' };
    }
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${settings.helix.accessToken}` }
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.message || `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('check-for-updates', async () => {
  try {
    // Use our custom version manager first
    if (versionManager) {
      const customUpdate = await versionManager.checkForUpdates();
      if (customUpdate.hasUpdate) {
        return customUpdate;
      }
    }

    // Fallback to electron-updater
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

// Add new IPC handler for custom update system
ipcMain.handle('check-changelog-updates', async () => {
  try {
    if (!versionManager) {
      throw new Error('Version manager not initialized');
    }
    return await versionManager.checkForUpdates();
  } catch (error) {
    console.error('Changelog update check failed:', error);
    throw error;
  }
});

// Add IPC handler for applying custom updates
ipcMain.handle('apply-changelog-update', async (event, updateInfo) => {
  try {
    if (!versionManager) {
      throw new Error('Version manager not initialized');
    }

    const result = await versionManager.applyUpdate(updateInfo);

    if (result.success) {
      // Notify main window about successful update
      if (mainWindow) {
        mainWindow.webContents.send('update-applied', result);
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to apply update:', error);
    throw error;
  }
});

// Add IPC handler for downloading changelog content
ipcMain.handle('download-changelog', async (event, changelogUrl) => {
  try {
    if (!versionManager) {
      throw new Error('Version manager not initialized');
    }
    return await versionManager.downloadChangelog(changelogUrl);
  } catch (error) {
    console.error('Failed to download changelog:', error);
    throw error;
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
});

ipcMain.handle('add-to-start-menu', async () => {
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
