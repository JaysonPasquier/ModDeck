const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// Garder une référence globale de l'objet window
let mainWindow;

function createWindow() {
    // Créer la fenêtre du navigateur
    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        minWidth: 300,
        minHeight: 400,
        frame: false, // Enlever la barre de titre par défaut
        transparent: false,
        alwaysOnTop: true, // Toujours au-dessus
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Pour permettre les requêtes externes
        },
        show: false, // Ne pas montrer tout de suite
        titleBarStyle: 'hidden',
        roundedCorners: true,
        backgroundColor: '#1a1a1a'
    });

    // Charger le fichier HTML
    mainWindow.loadFile('index.html');

    // Afficher la fenêtre quand elle est prête
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Émettre un événement quand la fenêtre est fermée
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Empêcher l'ouverture de nouveaux onglets
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });

    // Supprimer le menu par défaut
    Menu.setApplicationMenu(null);
}

// Cette méthode sera appelée quand Electron aura fini de s'initialiser
app.whenReady().then(createWindow);

// Quitter quand toutes les fenêtres sont fermées
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

// IPC handlers pour les interactions
ipcMain.handle('close-app', () => {
    app.quit();
});

ipcMain.handle('minimize-app', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.handle('toggle-always-on-top', () => {
    if (mainWindow) {
        const isOnTop = mainWindow.isAlwaysOnTop();
        mainWindow.setAlwaysOnTop(!isOnTop);
        return !isOnTop;
    }
    return false;
});

// IPC handler pour ouvrir la console de dev
ipcMain.handle('open-devtools', () => {
    if (mainWindow) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
});
