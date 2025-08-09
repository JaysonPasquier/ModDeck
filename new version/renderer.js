const { ipcRenderer } = require('electron');
const tmi = require('tmi.js');

class ModDeckApp {
    constructor() {
        this.clients = new Map(); // Map of channel -> TMI client
        this.channels = new Map(); // Map of channel -> channel data
        this.activeChannel = null;
        this.settings = {};
        this.isLoggedIn = false;
        this.twitchUsername = '';
        this.twitchOAuth = '';

        // Enhanced features
        this.userColors = new Map();
        this.colorIndex = 0;
        this.colors = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5',
                      'color-6', 'color-7', 'color-8', 'color-9', 'color-10'];

        // Cache for 7TV emotes
        this.sevenTVEmotes = new Map();
        this.globalSevenTVEmotes = new Map();

        // Cache for Twitch badges
        this.globalBadges = new Map();
        this.channelBadges = new Map();

        this.mentionKeywords = [];

        // Global mentions system
        this.allMentions = [];

        // Recurrent/spam detection structures per channel
        // Maps channelName -> { events: Array<{ key: string, time: number }>, counts: Map<string, number> }
        this.recurrenceTrackers = new Map();

        // Moderation tracking
        this.moderationLog = [];
        this.showModLog = false;

        // Reply functionality
        this.replyTarget = null;
        this.pendingReplies = new Map(); // Store pending replies to detect them when they echo back

        // Helix API capabilities
        this.helixAvailable = false;

        // Localization
        this.translations = {
            en: {
                'Connect Channel': 'Connect Channel',
                'Channel Name': 'Channel Name',
                'Connect': 'Connect',
                'Settings': 'Settings',
                'Language': 'Language',
                'Theme': 'Theme',
                'Save Settings': 'Save Settings',
                'English': 'English',
                'French': 'French',
                'Light': 'Light',
                'Dark': 'Dark',
                'Connect to Twitch': 'Connect to Twitch',
                'Send': 'Send',
                'Broadcaster': 'Broadcaster',
                'Moderator': 'Moderator',
                'VIP': 'VIP',
                'Verified': 'Verified',
                'Subscriber': 'Subscriber',
                'Viewer': 'Viewer',
                'New messages': 'New messages',
                'Connect Your Twitch Account': 'Connect Your Twitch Account',
                'Login to send messages and access subscriber features': 'Login to send messages and access subscriber features',
                'Your Twitch Username': 'Your Twitch Username',
                'OAuth Token (oauth:xxxxx)': 'OAuth Token (oauth:xxxxx)',
                'Login to Twitch': 'Login to Twitch',
                'Logout': 'Logout',
                'Get your OAuth token from': 'Get your OAuth token from',
                'Chat': 'Chat',
                'Mentions': 'Mentions',
                'Add Channel': 'Add Channel',
                'No channels added yet': 'No channels added yet',
                'Click the + button to add your first channel': 'Click the + button to add your first channel',
                'Enter channel name': 'Enter channel name',
                'Cancel': 'Cancel',
                'Add': 'Add',
                'Clear': 'Clear',
                'Filters': 'Filters',
                'Filter by user...': 'Filter by user...',
                'Filter by keyword...': 'Filter by keyword...',
                'Special members (comma-separated)...': 'Special members (comma-separated)...',
                'Roles:': 'Roles:',
                'Connecting to': 'Connecting to',
                'Chat messages will appear here once connected.': 'Chat messages will appear here once connected.',
                'Type a message...': 'Type a message...',
                'Login to send messages': 'Login to send messages',
                'Mod Log': 'Mod Log',
                'Clear Log': 'Clear Log',
                'Export': 'Export',
                'No moderation actions yet': 'No moderation actions yet',
                'Actions will appear here when you perform moderation': 'Actions will appear here when you perform moderation',
                'Timeout User': 'Timeout User',
                'Ban User': 'Ban User',
                'Unban User': 'Unban User',
                'Delete Message': 'Delete Message',
                'View History': 'View History',
                'Duration (seconds)': 'Duration (seconds)',
                'Reason': 'Reason',
                'Confirm': 'Confirm',
                'User History': 'User History',
                'Recent messages from': 'Recent messages from',
                'No messages found': 'No messages found',
                'DELETED': 'DELETED',
                'TIMEOUT': 'TIMEOUT',
                'BANNED': 'BANNED',
                'Recurrent': 'Recurrent',
                'Twitch API': 'Twitch API',
                'Client ID': 'Client ID',
                'OAuth Access Token': 'OAuth Access Token',
                'Requires moderator permissions': 'Requires moderator permissions',
                'Welcome to ModDeck v3!': 'Welcome to ModDeck v3!',
                'Moderation Log': 'Moderation Log',
                'Moderation actions': 'Moderation actions',
                'Channel': 'Channel',
                'Target': 'Target',
                'Moderator': 'Moderator',
                'Action': 'Action',
                'Time': 'Time',
                'Details': 'Details',
                'Export Moderation Log': 'Export Moderation Log',
                'Moderation log exported successfully': 'Moderation log exported successfully',
                'Failed to export moderation log': 'Failed to export moderation log',
                'Mentions & Keywords': 'Mentions & Keywords',
                'Clear All': 'Clear All',
                'No mentions yet': 'Aucune mention pour le moment',
                'Keywords': 'Mots-clés',
                'Current Keywords': 'Mots-clés actuels',
                'Add Keyword': 'Ajouter un mot-clé',
                'Remove Keyword': 'Supprimer le mot-clé',
                'Enter keyword': 'Entrez le mot-clé',
                'Add': 'Ajouter',
                'Remove': 'Supprimer',
                'Window Settings': 'Paramètres de fenêtre',
                'Always on top': 'Toujours au premier plan',
                'Auto-scroll': 'Défilement automatique',
                'Show timestamps': 'Afficher les horodatages',
                'Highlight mentions': 'Mettre en surbrillance les mentions',
                'Chat Settings': 'Paramètres de chat',
                'Show badges': 'Afficher les badges',
                'Show colors': 'Afficher les couleurs',
                'Enable mentions': 'Activer les mentions',
                'Mention Settings': 'Paramètres de mentions',
                'Mention keywords (comma-separated)': 'Mots-clés de mention (séparés par des virgules)',
                'Update Settings': 'Paramètres de mise à jour',
                'Auto-update': 'Mise à jour automatique',
                'Check for updates': 'Vérifier les mises à jour',
                'Update available': 'Mise à jour disponible',
                'Download update': 'Télécharger la mise à jour',
                'Install update': 'Installer la mise à jour',
                'Update downloaded': 'Mise à jour téléchargée',
                'Restart to install': 'Redémarrer pour installer',
                'No updates available': 'Aucune mise à jour disponible',
                'Error checking for updates': 'Erreur lors de la vérification des mises à jour',
                'Close': 'Fermer',
                'Minimize': 'Réduire',
                'Pin to top': 'Épingler au premier plan',
                'Unpin from top': 'Désépingler du premier plan',
                'Developer Tools': 'Outils de développement',
                'Create Desktop Shortcut': 'Créer un raccourci bureau',
                'Add to Start Menu': 'Ajouter au menu Démarrer',
                'Shortcut created': 'Raccourci créé',
                'Shortcut added': 'Raccourci ajouté',
                'Failed to create shortcut': 'Échec de la création du raccourci',
                'Failed to add to start menu': 'Échec de l\'ajout au menu Démarrer',
                'Message deleted': 'Message supprimé',
                'Message deleted successfully': 'Message supprimé avec succès',
                'Failed to delete message': 'Échec de la suppression du message',
                'User timed out': 'Utilisateur expulsé',
                'User banned': 'Utilisateur banni',
                'User unbanned': 'Utilisateur débanni',
                'Action successful': 'Action réussie',
                'Action failed': 'Action échouée',
                'Login required': 'Connexion requise',
                'Please login to perform this action': 'Veuillez vous connecter pour effectuer cette action',
                'Invalid credentials': 'Identifiants invalides',
                'Connection failed': 'Échec de la connexion',
                'Connected successfully': 'Connexion réussie',
                'Disconnected': 'Déconnecté',
                'Connecting...': 'Connexion...',
                'Disconnecting...': 'Déconnexion...',
                'Channel added': 'Canal ajouté',
                'Channel removed': 'Canal supprimé',
                'Failed to add channel': 'Échec de l\'ajout du canal',
                'Failed to remove channel': 'Échec de la suppression du canal',
                'Filter applied': 'Filtre appliqué',
                'Filter cleared': 'Filtre effacé',
                'No messages match filter': 'Aucun message ne correspond au filtre',
                'Scroll to bottom': 'Défiler vers le bas',
                'New messages below': 'Nouveaux messages en bas',
                'All caught up': 'Tout est à jour',
                'Loading...': 'Chargement...',
                'Error': 'Erreur',
                'Success': 'Succès',
                'Warning': 'Avertissement',
                'Info': 'Information',
                'Yes': 'Oui',
                'No': 'Non',
                'OK': 'OK',
                'Apply': 'Appliquer',
                'Reset': 'Réinitialiser',
                'Default': 'Par défaut',
                'Custom': 'Personnalisé',
                'Enabled': 'Activé',
                'Disabled': 'Désactivé',
                'On': 'Activé',
                'Off': 'Désactivé',
                'Active': 'Actif',
                'Inactive': 'Inactif',
                'Online': 'En ligne',
                'Offline': 'Hors ligne',
                'Connected': 'Connecté',
                'Disconnected': 'Déconnecté',
                'Pending': 'En attente',
                'Processing': 'En cours',
                'Complete': 'Terminé',
                'Failed': 'Échoué',
                'Unknown': 'Inconnu',
                'Loading emotes...': 'Chargement des emotes...',
                'Emotes loaded': 'Emotes chargées',
                'Failed to load emotes': 'Échec du chargement des emotes',
                'No emotes found': 'Aucune emote trouvée',
                'Emote cache cleared': 'Cache des emotes effacé',
                'Settings saved': 'Paramètres sauvegardés',
                'Settings loaded': 'Paramètres chargés',
                'Failed to save settings': 'Échec de la sauvegarde des paramètres',
                'Failed to load settings': 'Échec du chargement des paramètres',
                'Data exported': 'Données exportées',
                'Data imported': 'Données importées',
                'Failed to export data': 'Échec de l\'exportation des données',
                'Failed to import data': 'Échec de l\'importation des données',
                'Backup created': 'Sauvegarde créée',
                'Backup restored': 'Sauvegarde restaurée',
                'Failed to create backup': 'Échec de la création de la sauvegarde',
                'Failed to restore backup': 'Échec de la restauration de la sauvegarde',
                'Reply': 'Reply',
                'Replying to': 'Replying to',
                'Cancel Reply': 'Cancel Reply'
            },
            fr: {
                'Connect Channel': 'Connecter un Canal',
                'Channel Name': 'Nom du Canal',
                'Connect': 'Connecter',
                'Settings': 'Paramètres',
                'Language': 'Langue',
                'Theme': 'Thème',
                'Save Settings': 'Sauvegarder',
                'English': 'Anglais',
                'French': 'Français',
                'Light': 'Clair',
                'Dark': 'Sombre',
                'Connect to Twitch': 'Se connecter à Twitch',
                'Send': 'Envoyer',
                'Broadcaster': 'Diffuseur',
                'Moderator': 'Modérateur',
                'VIP': 'VIP',
                'Verified': 'Vérifié',
                'Subscriber': 'Abonné',
                'Viewer': 'Spectateur',
                'New messages': 'Nouveaux messages',
                'Mentions & Keywords': 'Mentions et Mots-clés',
                'Clear All': 'Tout effacer',
                'No mentions yet': 'Aucune mention pour le moment',
                'Keywords': 'Mots-clés',
                'Connect Your Twitch Account': 'Connectez votre compte Twitch',
                'Login to send messages and access subscriber features': 'Connectez-vous pour envoyer des messages et accéder aux fonctionnalités d\'abonné',
                'Your Twitch Username': 'Votre nom d\'utilisateur Twitch',
                'OAuth Token (oauth:xxxxx)': 'Token OAuth (oauth:xxxxx)',
                'Login to Twitch': 'Se connecter à Twitch',
                'Logout': 'Se déconnecter',
                'Get your OAuth token from': 'Obtenez votre token OAuth depuis',
                'Chat': 'Chat',
                'Mentions': 'Mentions',
                'Add Channel': 'Ajouter un Canal',
                'No channels added yet': 'Aucun canal ajouté pour le moment',
                'Click the + button to add your first channel': 'Cliquez sur le bouton + pour ajouter votre premier canal',
                'Enter channel name': 'Entrez le nom du canal',
                'Cancel': 'Annuler',
                'Add': 'Ajouter',
                'Clear': 'Effacer',
                'Filters': 'Filtres',
                'Filter by user...': 'Filtrer par utilisateur...',
                'Filter by keyword...': 'Filtrer par mot-clé...',
                'Special members (comma-separated)...': 'Membres spéciaux (séparés par des virgules)...',
                'Roles:': 'Rôles :',
                'Connecting to': 'Connexion à',
                'Chat messages will appear here once connected.': 'Les messages du chat apparaîtront ici une fois connecté.',
                'Type a message...': 'Tapez un message...',
                'Login to send messages': 'Connectez-vous pour envoyer des messages',
                'Mod Log': 'Journal de Modération',
                'Clear Log': 'Effacer le Journal',
                'Export': 'Exporter',
                'No moderation actions yet': 'Aucune action de modération pour le moment',
                'Actions will appear here when you perform moderation': 'Les actions apparaîtront ici lorsque vous effectuerez des modérations',
                'Timeout User': 'Expulser l\'Utilisateur',
                'Ban User': 'Bannir l\'Utilisateur',
                'Unban User': 'Débannir l\'Utilisateur',
                'Delete Message': 'Supprimer le Message',
                'View History': 'Voir l\'Historique',
                'Duration (seconds)': 'Durée (secondes)',
                'Reason': 'Raison',
                'Confirm': 'Confirmer',
                'User History': 'Historique de l\'Utilisateur',
                'Recent messages from': 'Messages récents de',
                'No messages found': 'Aucun message trouvé',
                'DELETED': 'SUPPRIMÉ',
                'TIMEOUT': 'EXPULSION',
                'BANNED': 'BANNI',
                'Recurrent': 'Récurrent',
                'Twitch API': 'API Twitch',
                'Client ID': 'ID Client',
                'OAuth Access Token': 'Token d\'Accès OAuth',
                'Requires moderator permissions': 'Nécessite les permissions de modérateur',
                'Welcome to ModDeck v3!': 'Bienvenue sur ModDeck v3 !',
                'Moderation Log': 'Journal de Modération',
                'Moderation actions': 'Actions de modération',
                'Channel': 'Canal',
                'Target': 'Cible',
                'Moderator': 'Modérateur',
                'Action': 'Action',
                'Time': 'Heure',
                'Details': 'Détails',
                'Export Moderation Log': 'Exporter le Journal de Modération',
                'Moderation log exported successfully': 'Journal de modération exporté avec succès',
                'Failed to export moderation log': 'Échec de l\'exportation du journal de modération',
                'Mentions & Keywords': 'Mentions et Mots-clés',
                'Clear All': 'Tout effacer',
                'No mentions yet': 'Aucune mention pour le moment',
                'Keywords': 'Mots-clés',
                'Current Keywords': 'Mots-clés actuels',
                'Add Keyword': 'Ajouter un mot-clé',
                'Remove Keyword': 'Supprimer le mot-clé',
                'Enter keyword': 'Entrez le mot-clé',
                'Add': 'Ajouter',
                'Remove': 'Supprimer',
                'Window Settings': 'Paramètres de fenêtre',
                'Always on top': 'Toujours au premier plan',
                'Auto-scroll': 'Défilement automatique',
                'Show timestamps': 'Afficher les horodatages',
                'Highlight mentions': 'Mettre en surbrillance les mentions',
                'Chat Settings': 'Paramètres de chat',
                'Show badges': 'Afficher les badges',
                'Show colors': 'Afficher les couleurs',
                'Enable mentions': 'Activer les mentions',
                'Mention Settings': 'Paramètres de mentions',
                'Mention keywords (comma-separated)': 'Mots-clés de mention (séparés par des virgules)',
                'Update Settings': 'Paramètres de mise à jour',
                'Auto-update': 'Mise à jour automatique',
                'Check for updates': 'Vérifier les mises à jour',
                'Update available': 'Mise à jour disponible',
                'Download update': 'Télécharger la mise à jour',
                'Install update': 'Installer la mise à jour',
                'Update downloaded': 'Mise à jour téléchargée',
                'Restart to install': 'Redémarrer pour installer',
                'No updates available': 'Aucune mise à jour disponible',
                'Error checking for updates': 'Erreur lors de la vérification des mises à jour',
                'Close': 'Fermer',
                'Minimize': 'Réduire',
                'Pin to top': 'Épingler au premier plan',
                'Unpin from top': 'Désépingler du premier plan',
                'Developer Tools': 'Outils de développement',
                'Create Desktop Shortcut': 'Créer un raccourci bureau',
                'Add to Start Menu': 'Ajouter au menu Démarrer',
                'Shortcut created': 'Raccourci créé',
                'Shortcut added': 'Raccourci ajouté',
                'Failed to create shortcut': 'Échec de la création du raccourci',
                'Failed to add to start menu': 'Échec de l\'ajout au menu Démarrer',
                'Message deleted': 'Message supprimé',
                'Message deleted successfully': 'Message supprimé avec succès',
                'Failed to delete message': 'Échec de la suppression du message',
                'User timed out': 'Utilisateur expulsé',
                'User banned': 'Utilisateur banni',
                'User unbanned': 'Utilisateur débanni',
                'Action successful': 'Action réussie',
                'Action failed': 'Action échouée',
                'Login required': 'Connexion requise',
                'Please login to perform this action': 'Veuillez vous connecter pour effectuer cette action',
                'Invalid credentials': 'Identifiants invalides',
                'Connection failed': 'Échec de la connexion',
                'Connected successfully': 'Connexion réussie',
                'Disconnected': 'Déconnecté',
                'Connecting...': 'Connexion...',
                'Disconnecting...': 'Déconnexion...',
                'Channel added': 'Canal ajouté',
                'Channel removed': 'Canal supprimé',
                'Failed to add channel': 'Échec de l\'ajout du canal',
                'Failed to remove channel': 'Échec de la suppression du canal',
                'Filter applied': 'Filtre appliqué',
                'Filter cleared': 'Filtre effacé',
                'No messages match filter': 'Aucun message ne correspond au filtre',
                'Scroll to bottom': 'Défiler vers le bas',
                'New messages below': 'Nouveaux messages en bas',
                'All caught up': 'Tout est à jour',
                'Loading...': 'Chargement...',
                'Error': 'Erreur',
                'Success': 'Succès',
                'Warning': 'Avertissement',
                'Info': 'Information',
                'Yes': 'Oui',
                'No': 'Non',
                'OK': 'OK',
                'Apply': 'Appliquer',
                'Reset': 'Réinitialiser',
                'Default': 'Par défaut',
                'Custom': 'Personnalisé',
                'Enabled': 'Activé',
                'Disabled': 'Désactivé',
                'On': 'Activé',
                'Off': 'Désactivé',
                'Active': 'Actif',
                'Inactive': 'Inactif',
                'Online': 'En ligne',
                'Offline': 'Hors ligne',
                'Connected': 'Connecté',
                'Disconnected': 'Déconnecté',
                'Pending': 'En attente',
                'Processing': 'En cours',
                'Complete': 'Terminé',
                'Failed': 'Échoué',
                'Unknown': 'Inconnu',
                'Loading emotes...': 'Chargement des emotes...',
                'Emotes loaded': 'Emotes chargées',
                'Failed to load emotes': 'Échec du chargement des emotes',
                'No emotes found': 'Aucune emote trouvée',
                'Emote cache cleared': 'Cache des emotes effacé',
                'Settings saved': 'Paramètres sauvegardés',
                'Settings loaded': 'Paramètres chargés',
                'Failed to save settings': 'Échec de la sauvegarde des paramètres',
                'Failed to load settings': 'Échec du chargement des paramètres',
                'Data exported': 'Données exportées',
                'Data imported': 'Données importées',
                'Failed to export data': 'Échec de l\'exportation des données',
                'Failed to import data': 'Échec de l\'importation des données',
                'Backup created': 'Sauvegarde créée',
                'Backup restored': 'Sauvegarde restaurée',
                'Failed to create backup': 'Échec de la création de la sauvegarde',
                'Failed to restore backup': 'Échec de la restauration de la sauvegarde',
                'Add your first channel to get started': 'Ajoutez votre premier canal pour commencer',
                'Add New Channel': 'Ajouter un nouveau canal',
                'Account': 'Compte',
                'total messages': 'messages au total',
                'Update available!': 'Mise à jour disponible!',
                'Update': 'Mettre à jour',
                'Logged in as': 'Connecté en tant que',
                'Reply': 'Répondre',
                'Replying to': 'Répondre à',
                'Cancel Reply': 'Annuler la réponse'
            }
        };

        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadSevenTVEmotes();
        await this.loadGlobalBadges();
        await this.loadChatData();
        this.setupEventListeners();
        this.setupIpcListeners();
        this.updateUI();
        this.updateLanguage(); // Add language update
        this.checkForSavedLogin();

        // Check Helix API availability for proper replies
        await this.checkHelixAvailability();

        // Update keywords after settings are loaded
        this.updateMentionKeywords();
        console.log('Mention keywords loaded:', this.mentionKeywords);

        // Load saved tabs after potential login (no delay needed since loadChatData no longer creates tabs)
        await this.loadSavedTabs();

        // Check for updates on startup (with a delay to not interfere with initial loading)
        setTimeout(() => {
            this.checkForUpdates();
        }, 3000);
    }

    async loadSettings() {
        try {
            this.settings = await ipcRenderer.invoke('get-settings');
            this.updateMentionKeywords();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = {
                autoScroll: true,
                showTimestamps: true,
                highlightMentions: true,
                mentionKeywords: 'fugu_fps,',
                language: 'fr',
                theme: 'dark'
            };
        }
    }

    updateMentionKeywords() {
        const keywords = this.settings.mentionKeywords || 'fugu_fps,';
        this.mentionKeywords = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
        console.log('Updated mention keywords:', this.mentionKeywords);
        console.log('Raw keywords setting:', this.settings.mentionKeywords);
    }

    async loadSevenTVEmotes() {
        try {
            console.log('Loading 7TV emotes...');

            // Load global 7TV emotes using the correct API endpoint
            const globalResponse = await fetch('https://7tv.io/v3/emote-sets/global');
            if (globalResponse.ok) {
                const globalData = await globalResponse.json();
                if (globalData.emotes) {
                    globalData.emotes.forEach(emote => {
                        // Use the correct structure like the working chat widget
                        if (emote.name && emote.data && emote.data.host && emote.data.host.files) {
                            // Build URLs from the files array like the working widget
                            const urls = emote.data.host.files.map(file => `//${emote.data.host.url}/${file.name}`);

                            this.globalSevenTVEmotes.set(emote.name, {
                                id: emote.id,
                                name: emote.name,
                                urls: urls
                            });

                            // Debug: Log the specific emote we're looking for
                            if (emote.name === 'catsittingverycomfortablearoundacampfirewithitsfriends') {
                                console.log('7TV Debug - Found target emote in global emotes:', emote);
                            }
                        }
                    });
                    console.log(`Loaded ${this.globalSevenTVEmotes.size} global 7TV emotes`);
                }
            } else {
                console.warn('Failed to load global 7TV emotes:', globalResponse.status);
            }
        } catch (error) {
            console.error('Error loading 7TV emotes:', error);
        }
    }

        async loadChannelSevenTVEmotes(channelName) {
        try {
            // Use hardcoded emote set ID for fugu_fps like the working chat widget
            // This avoids the 404 errors from the user API
            let emoteSetId = null;

            if (channelName === 'fugu_fps') {
                emoteSetId = '01GEG2EPE80006SAE3KT92JGK5';
                console.log(`Using hardcoded emote set ID for ${channelName}: ${emoteSetId}`);
            } else {
                // For other channels, try to get the emote set ID dynamically
                const userResponse = await fetch(`https://7tv.io/v3/users/twitch/${channelName}`);
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    if (userData.emote_set && userData.emote_set.id) {
                        emoteSetId = userData.emote_set.id;
                        console.log(`Found emote set ID for ${channelName}: ${emoteSetId}`);
                    }
                }
            }

            if (emoteSetId) {
                // Fetch the emotes using the emote set ID
                const emotesResponse = await fetch(`https://7tv.io/v3/emote-sets/${emoteSetId}`);
                if (emotesResponse.ok) {
                    const emotesData = await emotesResponse.json();
                    if (emotesData.emotes) {
                        const channelEmotes = new Map();
                        emotesData.emotes.forEach(emote => {
                            // Use the correct structure like the working chat widget
                            if (emote.name && emote.data && emote.data.host && emote.data.host.files) {
                                // Build URLs from the files array like the working widget
                                const urls = emote.data.host.files.map(file => `//${emote.data.host.url}/${file.name}`);

                                channelEmotes.set(emote.name, {
                                    id: emote.id,
                                    name: emote.name,
                                    urls: urls
                                });

                                // Debug: Log the specific emote we're looking for
                                if (emote.name === 'catsittingverycomfortablearoundacampfirewithitsfriends') {
                                    console.log('7TV Debug - Found target emote in channel:', emote);
                                }
                            }
                        });
                        this.sevenTVEmotes.set(channelName, channelEmotes);
                        console.log(`Loaded ${channelEmotes.size} 7TV emotes for ${channelName}`);
                    } else {
                        console.log(`No emotes found in set for ${channelName}`);
                    }
                } else {
                    console.warn(`Failed to load emote set for ${channelName}:`, emotesResponse.status);
                }
            } else {
                console.log(`No emote set found for ${channelName}`);
            }
        } catch (error) {
            console.error(`Error loading 7TV emotes for ${channelName}:`, error);
        }
    }

    async loadGlobalBadges() {
        try {
            console.log('Loading global Twitch badges...');

            const response = await fetch('https://api.twitch.tv/helix/chat/badges/global', {
                headers: {
                    'Client-ID': 'gp762nuuoqcoxypju8c569th9wz7q5',
                    'Authorization': 'Bearer m15k59400wm8tosv4499famn76qpr3'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Global badges response:', data);

                if (data.data) {
                    data.data.forEach(badgeSet => {
                        const setId = badgeSet.set_id;
                        const versions = new Map();

                        badgeSet.versions.forEach(version => {
                            versions.set(version.id, {
                                id: version.id,
                                title: version.title,
                                description: version.description,
                                imageUrl1x: version.image_url_1x,
                                imageUrl2x: version.image_url_2x,
                                imageUrl4x: version.image_url_4x,
                                clickAction: version.click_action,
                                clickUrl: version.click_url
                            });
                        });

                        this.globalBadges.set(setId, versions);
                    });

                    console.log(`Loaded ${this.globalBadges.size} global badge sets`);
                }
            } else {
                console.warn('Failed to load global badges:', response.status);
            }
        } catch (error) {
            console.error('Error loading global badges:', error);
        }
    }

    async loadChannelBadges(channelName) {
        try {
            console.log(`Loading channel badges for ${channelName}...`);

            // First get the channel ID
            const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${channelName}`, {
                headers: {
                    'Client-ID': 'gp762nuuoqcoxypju8c569th9wz7q5',
                    'Authorization': 'Bearer m15k59400wm8tosv4499famn76qpr3'
                }
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                if (userData.data && userData.data.length > 0) {
                    const channelId = userData.data[0].id;

                    // Now get the channel badges
                    const badgesResponse = await fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${channelId}`, {
                        headers: {
                            'Client-ID': 'gp762nuuoqcoxypju8c569th9wz7q5',
                            'Authorization': 'Bearer m15k59400wm8tosv4499famn76qpr3'
                        }
                    });

                    if (badgesResponse.ok) {
                        const badgesData = await badgesResponse.json();
                        console.log(`Channel badges response for ${channelName}:`, badgesData);

                        if (badgesData.data) {
                            const channelBadgeSets = new Map();

                            badgesData.data.forEach(badgeSet => {
                                const setId = badgeSet.set_id;
                                const versions = new Map();

                                badgeSet.versions.forEach(version => {
                                    versions.set(version.id, {
                                        id: version.id,
                                        title: version.title,
                                        description: version.description,
                                        imageUrl1x: version.image_url_1x,
                                        imageUrl2x: version.image_url_2x,
                                        imageUrl4x: version.image_url_4x,
                                        clickAction: version.click_action,
                                        clickUrl: version.click_url
                                    });
                                });

                                channelBadgeSets.set(setId, versions);
                            });

                            this.channelBadges.set(channelName, channelBadgeSets);
                            console.log(`Loaded ${channelBadgeSets.size} badge sets for ${channelName}`);
                        }
                    } else {
                        console.warn(`Failed to load channel badges for ${channelName}:`, badgesResponse.status);
                    }
                }
            } else {
                console.warn(`Failed to get channel ID for ${channelName}:`, userResponse.status);
            }
        } catch (error) {
            console.error(`Error loading channel badges for ${channelName}:`, error);
        }
    }

    translate(key) {
        const lang = this.settings.language || 'fr';
        return this.translations[lang]?.[key] || key;
    }

    updateLanguage() {
        // Update all translatable elements with correct selectors
        const elementsToTranslate = [
            { selector: '#save-settings', text: this.translate('Save Settings') },
            { selector: '.send-btn', text: this.translate('Send') },
            { selector: '#login-btn', text: this.translate('Login to Twitch') },
            { selector: '#logout-btn', text: this.translate('Logout') },
            { selector: '#add-channel-btn', text: this.translate('Add') },
            { selector: '#cancel-add-channel', text: this.translate('Cancel') },
            { selector: '#chat-tab', text: this.translate('Chat') },
            { selector: '#mentions-tab', text: this.translate('Mentions') }
        ];

        elementsToTranslate.forEach(({ selector, text }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = text;
            }
        });

        // Update login section text
        const loginHeader = document.querySelector('.login-header h3');
        if (loginHeader) {
            loginHeader.textContent = this.translate('Connect Your Twitch Account');
        }

        const loginSubtext = document.querySelector('.login-header p');
        if (loginSubtext) {
            loginSubtext.textContent = this.translate('Login to send messages and access subscriber features');
        }

        // Update input placeholders
        const usernameInput = document.getElementById('twitch-username');
        if (usernameInput) {
            usernameInput.placeholder = this.translate('Your Twitch Username');
        }

        const oauthInput = document.getElementById('twitch-oauth');
        if (oauthInput) {
            oauthInput.placeholder = this.translate('OAuth Token (oauth:xxxxx)');
        }

        const newChannelInput = document.getElementById('new-channel-input');
        if (newChannelInput) {
            newChannelInput.placeholder = this.translate('Enter channel name');
        }

        // Update static text elements
        const oauthHelp = document.querySelector('.login-help p');
        if (oauthHelp) {
            const link = oauthHelp.querySelector('a');
            const linkHref = link ? link.href : 'https://twitchapps.com/tmi/';
            const linkTarget = link ? link.target : '_blank';
            oauthHelp.innerHTML = `<small>${this.translate('Get your OAuth token from')} <a href="${linkHref}" target="${linkTarget}">twitchapps.com/tmi</a></small>`;
        }

        // Update no-channels message
        const noChannelsTitle = document.querySelector('#no-channels h3');
        if (noChannelsTitle) {
            noChannelsTitle.textContent = this.translate('No channels added yet');
        }

        const noChannelsText = document.querySelector('#no-channels p');
        if (noChannelsText) {
            noChannelsText.textContent = this.translate('Click the + button to add your first channel');
        }

        // Update settings button title (tooltip) only, not the content
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.title = this.translate('Settings');
        }

        // Update select options for language
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.innerHTML = `
                <option value="en">${this.translate('English')}</option>
                <option value="fr">${this.translate('French')}</option>
            `;
            languageSelect.value = this.settings.language || 'fr';
        }

        // Update select options for theme
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.innerHTML = `
                <option value="dark">${this.translate('Dark')}</option>
                <option value="light">${this.translate('Light')}</option>
            `;
            themeSelect.value = this.settings.theme || 'dark';
        }

        // Update scroll-to-bottom button text
        const scrollButtons = document.querySelectorAll('.scroll-to-bottom-btn');
        scrollButtons.forEach(btn => {
            const textSpan = btn.querySelector('span');
            if (textSpan) {
                textSpan.textContent = this.translate('New messages');
            }
        });

        // Update channel filter placeholders and labels
        document.querySelectorAll('[data-filter="user"]').forEach(input => {
            input.placeholder = this.translate('Filter by user...');
        });

        document.querySelectorAll('[data-filter="keyword"]').forEach(input => {
            input.placeholder = this.translate('Filter by keyword...');
        });

        document.querySelectorAll('[data-filter="special"]').forEach(input => {
            input.placeholder = this.translate('Special members (comma-separated)...');
        });

        document.querySelectorAll('.role-filter-label').forEach(label => {
            label.textContent = this.translate('Roles:');
        });

        document.querySelectorAll('.clear-btn').forEach(btn => {
            btn.textContent = this.translate('Clear');
        });

        // Update header action buttons
        document.querySelectorAll('.header-action-btn').forEach(btn => {
            if (btn.textContent.includes('Clear')) {
                btn.textContent = this.translate('Clear');
            } else if (btn.textContent.includes('Filters')) {
                btn.textContent = this.translate('Filters');
            }
        });

        // Update chat input placeholders
        document.querySelectorAll('.chat-input').forEach(input => {
            if (input.disabled) {
                input.placeholder = this.translate('Login to send messages');
            } else {
                input.placeholder = this.translate('Type a message...');
            }
        });

        // Update elements with data-translate attributes
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (key) {
                element.textContent = this.translate(key);
            }
        });

        // Update elements with data-translate-placeholder attributes
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            if (key) {
                element.placeholder = this.translate(key);
            }
        });

        // The tab elements are now handled by data-translate attributes, so this is no longer needed

        // Most elements are now handled by data-translate attributes
        // Only keep essential ones that can't use data-translate

        // Update status bar elements
        const messageCount = document.getElementById('message-count');
        if (messageCount && messageCount.textContent.includes('total messages')) {
            const count = messageCount.textContent.match(/\d+/);
            if (count) {
                messageCount.textContent = `${count[0]} ${this.translate('total messages')}`;
            }
        }
    }

    checkForSavedLogin() {
        try {
            // Check if localStorage is available
            if (typeof Storage === "undefined") {
                console.warn('localStorage is not supported');
                return;
            }

            const savedUsername = localStorage.getItem('twitch_username');
            const savedOAuth = localStorage.getItem('twitch_oauth');

            console.log('Checking for saved login...', {
                hasUsername: !!savedUsername,
                hasOAuth: !!savedOAuth
            });

            if (savedUsername && savedOAuth) {
                console.log('Found saved credentials, attempting auto-login');
                document.getElementById('twitch-username').value = savedUsername;
                document.getElementById('twitch-oauth').value = savedOAuth;
                this.loginToTwitch();
            } else {
                console.log('No saved credentials found');
            }
        } catch (error) {
            console.error('Error checking for saved login:', error);
        }
    }

    async loginToTwitch() {
        const username = document.getElementById('twitch-username').value.trim();
        const oauth = document.getElementById('twitch-oauth').value.trim();

        if (!username || !oauth) {
            this.showNotification('Please enter both username and OAuth token', 'error');
            return;
        }

        if (!oauth.startsWith('oauth:')) {
            this.showNotification('OAuth token must start with "oauth:"', 'error');
            return;
        }

        try {
            // Test connection with a minimal client
            const testClient = new tmi.Client({
                identity: {
                    username: username,
                    password: oauth
                },
                channels: []
            });

            await testClient.connect();
            await testClient.disconnect();

            // If successful, save credentials
            this.twitchUsername = username;
            this.twitchOAuth = oauth;
            this.isLoggedIn = true;

            // Save to localStorage with error handling
            try {
                localStorage.setItem('twitch_username', username);
                localStorage.setItem('twitch_oauth', oauth);
                console.log('Credentials saved to localStorage successfully');
            } catch (error) {
                console.error('Failed to save credentials to localStorage:', error);
                this.showNotification('Warning: Login will not persist after restart', 'warning');
            }

            this.updateLoginUI();
            this.showNotification('Successfully logged in to Twitch!', 'success');

            // Reconnect all existing channels with auth
            this.reconnectAllChannelsWithAuth();

        } catch (error) {
            console.error('Login failed:', error);
            this.showNotification('Login failed. Check your credentials.', 'error');
        }
    }

    logout() {
        this.isLoggedIn = false;
        this.twitchUsername = '';
        this.twitchOAuth = '';

        localStorage.removeItem('twitch_username');
        localStorage.removeItem('twitch_oauth');

        document.getElementById('twitch-username').value = '';
        document.getElementById('twitch-oauth').value = '';

        this.updateLoginUI();
        this.showNotification('Logged out from Twitch', 'info');

        // Reconnect all channels without auth (read-only)
        this.reconnectAllChannelsWithAuth();
    }

    updateLoginUI() {
        const loginSection = document.getElementById('login-section');
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const loggedInUser = document.getElementById('logged-in-user');
        const usernameDisplay = document.getElementById('username-display');
        const profileBtn = document.getElementById('profile-btn');

        if (this.isLoggedIn) {
            // Hide login section completely when logged in
            loginSection.style.display = 'none';

            // Show profile button with avatar
            profileBtn.classList.remove('hidden');
            this.loadUserAvatar();

            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            loggedInUser.classList.remove('hidden');
            usernameDisplay.textContent = this.twitchUsername;
        } else {
            // Show login section when not logged in
            loginSection.style.display = 'block';

            // Hide profile button
            profileBtn.classList.add('hidden');

            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            loggedInUser.classList.add('hidden');
        }

        // Update all chat input states
        this.channels.forEach((channel, channelName) => {
            this.updateChatInputState(channelName);
        });
    }

    async loadUserAvatar() {
        if (!this.twitchUsername) return;

        try {
            // Use Twitch's profile picture API endpoint
            // This endpoint doesn't require authentication and returns the user's profile picture
            const profilePictureUrl = `https://static-cdn.jtvnw.net/jtv_user_pictures/${this.twitchUsername.toLowerCase()}-profile_image-300x300.png`;

            // Fallback to default if the specific profile image doesn't exist
            const fallbackUrl = `https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png`;

            const profileAvatar = document.getElementById('profile-avatar');
            const profileModalAvatar = document.getElementById('profile-modal-avatar');
            const profileModalUsername = document.getElementById('profile-modal-username');

            // Try to load the user's profile picture
            const img = new Image();
            img.onload = () => {
                profileAvatar.src = profilePictureUrl;
                profileModalAvatar.src = profilePictureUrl;
            };
            img.onerror = () => {
                // If user's profile picture fails, use default
                profileAvatar.src = fallbackUrl;
                profileModalAvatar.src = fallbackUrl;
            };
            img.src = profilePictureUrl;

            profileModalUsername.textContent = this.twitchUsername;

        } catch (error) {
            console.error('Error loading user avatar:', error);
            // Use default avatar on error
            const fallbackUrl = `https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png`;
            document.getElementById('profile-avatar').src = fallbackUrl;
            document.getElementById('profile-modal-avatar').src = fallbackUrl;
        }
    }

    // Initialize mentions system
    initMentions() {
        this.allMentions = [];
        this.updateMentionsCounter();
    }

    // Add mention to global mentions list
    addMention(messageObj) {
        console.log('Adding mention:', messageObj.message, 'from channel:', messageObj.channel);
        this.allMentions.unshift(messageObj); // Add to beginning

        // Limit to last 100 mentions
        if (this.allMentions.length > 100) {
            this.allMentions = this.allMentions.slice(0, 100);
        }

        this.updateMentionsCounter();
        this.renderMentionsList();
        console.log('Total mentions now:', this.allMentions.length);

        // Show notification
        this.showNotification(`New mention in #${messageObj.channel}`, 'mention');
    }

    // Update mentions counter
    updateMentionsCounter() {
        // Add delay to ensure DOM is ready
        setTimeout(() => {
            const counter = document.getElementById('mentions-count');
            if (!counter) {
                console.warn('Mentions counter element not found in DOM');
                return;
            }

            const count = this.allMentions.length;

            if (count > 0) {
                counter.textContent = count > 99 ? '99+' : count;
                counter.classList.remove('hidden');
            } else {
                counter.classList.add('hidden');
            }
        }, 10);
    }

    // Render mentions list
    renderMentionsList() {
        const mentionsList = document.getElementById('mentions-list');
        const noMentions = document.getElementById('no-mentions');

        if (!mentionsList) {
            console.warn('Mentions list element not found in DOM');
            return;
        }

        if (this.allMentions.length === 0) {
            if (noMentions) {
                noMentions.style.display = 'flex';
            }
            return;
        }

        if (noMentions) {
            noMentions.style.display = 'none';
        }

        // Clear existing mentions
        mentionsList.innerHTML = '';

        // Add each mention (limit to last 50 to avoid performance issues)
        const recentMentions = this.allMentions.slice(0, 50);
        recentMentions.forEach(mention => {
            const mentionElement = this.createMentionElement(mention);
            mentionsList.appendChild(mentionElement);
        });

        console.log(`Rendered ${recentMentions.length} mentions out of ${this.allMentions.length} total`);
    }

    // Create mention element
    createMentionElement(messageObj) {
        const mentionDiv = document.createElement('div');
        mentionDiv.className = 'mention-item';

        // Highlight keywords in message
        let highlightedMessage = messageObj.message;
        this.mentionKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlightedMessage = highlightedMessage.replace(regex, `<span class="mention-keyword">${keyword}</span>`);
        });

        // Ensure timestamp is a Date
        let ts = messageObj.timestamp;
        const tsDate = ts instanceof Date ? ts : new Date(ts);
        const timeStr = tsDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        mentionDiv.innerHTML = `
            <div class="mention-header">
                <div class="mention-user" style="color: ${messageObj.color}">
                    ${messageObj.username}
                </div>
                <div class="mention-info">
                    <span class="mention-channel">#${messageObj.channel}</span>
                    <span class="mention-time">${timeStr}</span>
                </div>
            </div>
            <div class="mention-message">${highlightedMessage}</div>
        `;

        return mentionDiv;
    }

    // Clear all mentions
    clearAllMentions() {
        this.allMentions = [];
        this.updateMentionsCounter();
        this.renderMentionsList();
    }

    // Switch between main tabs (Chat/Mentions/ModLog)
    switchMainTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-content`).classList.add('active');

        // Show/hide channel tabs wrapper
        const channelTabsWrapper = document.getElementById('chat-tab-content');
        channelTabsWrapper.style.display = tabName === 'chat' ? 'block' : 'none';

        // Special handling for modlog tab
        if (tabName === 'modlog') {
            this.showModLog = true;
            this.updateModLogUI();
            // Clear mod log notification when accessing the tab
            const modlogCounter = document.getElementById('modlog-count');
            if (modlogCounter) {
                modlogCounter.classList.add('hidden');
                modlogCounter.textContent = '0';
            }
        } else {
            this.showModLog = false;
        }
    }

    async reconnectAllChannelsWithAuth() {
        // Disconnect all existing clients
        for (const [channelName, client] of this.clients) {
            try {
                await client.disconnect();
            } catch (error) {
                console.error(`Error disconnecting from ${channelName}:`, error);
            }
        }
        this.clients.clear();

        // Reconnect all channels
        for (const channelName of this.channels.keys()) {
            await this.connectToChannel(channelName, false); // false = don't add tab again
        }
    }

    async addChannel() {
        const input = document.getElementById('new-channel-input');
        const channelName = input.value.trim().toLowerCase().replace('#', '');

        if (!channelName) {
            this.showNotification('Please enter a channel name', 'error');
            return;
        }

        if (this.channels.has(channelName)) {
            this.showNotification('Channel already added', 'error');
            this.closeModal('add-channel-modal');
            return;
        }

        input.value = '';
        this.closeModal('add-channel-modal');

        await this.connectToChannel(channelName, true);

        // Save tab state
        this.saveTabState();
    }

    async connectToChannel(channelName, addTab = true) {
        try {
            if (addTab) {
                // Check if we have saved chat data for this channel
                let savedMessages = [];
                let savedMessageCount = 0;
                let savedMentionCount = 0;

                if (this.savedChatData && this.savedChatData.channels && this.savedChatData.channels[channelName]) {
                    // Find messages for this channel from the saved data
                    savedMessages = this.savedChatData.messages ?
                        this.savedChatData.messages.filter(msg => msg.channel === channelName) : [];

                    savedMessageCount = this.savedChatData.channels[channelName].messageCount || savedMessages.length;
                    savedMentionCount = this.savedChatData.channels[channelName].mentionCount || 0;

                    console.log(`Restoring ${savedMessages.length} messages for #${channelName}`);
                }

                // Create channel data
                this.channels.set(channelName, {
                    messages: savedMessages,
                    mentions: [],
                    isConnected: false,
                    messageCount: savedMessageCount,
                    mentionCount: savedMentionCount
                });

                // Create tab
                this.createChannelTab(channelName);
                this.createChannelPanel(channelName);

                // Restore saved messages to UI if any
                if (savedMessages.length > 0) {
                    const container = document.getElementById(`chat-${channelName}`);
                    if (container) {
                        // Remove welcome message
                        const welcomeMessage = container.querySelector('.welcome-message');
                        if (welcomeMessage) {
                            welcomeMessage.remove();
                        }

                        // Add restored messages
                        savedMessages.forEach(messageObj => {
                            // Convert timestamp string back to Date object
                            if (typeof messageObj.timestamp === 'string') {
                                messageObj.timestamp = new Date(messageObj.timestamp);
                            }
                            const messageElement = this.createMessageElement(messageObj);
                            container.appendChild(messageElement);
                        });

                        // Scroll to bottom
                        container.scrollTop = container.scrollHeight;
                    }
                }

                this.switchToChannel(channelName);

                // Load channel-specific 7TV emotes
                await this.loadChannelSevenTVEmotes(channelName);

                // Update message counter
                this.updateMessageCount();
            }

            // Update status
            this.updateChannelStatus(channelName, 'connecting');

            // Create TMI client
            const clientOptions = {
                channels: [`#${channelName}`]
            };

            // Add auth if logged in
            if (this.isLoggedIn) {
                clientOptions.identity = {
                    username: this.twitchUsername,
                    password: this.twitchOAuth
                };
            }

            const client = new tmi.Client({
                options: { debug: false },
                connection: { secure: true, reconnect: true },
                ...clientOptions
            });

            // Set up event listeners
            client.on('connected', async () => {
                console.log(`Connected to ${channelName}`);
                this.channels.get(channelName).isConnected = true;
                this.updateChannelStatus(channelName, 'connected');
                this.showNotification(`Connected to #${channelName}`, 'success');

                // Load 7TV emotes for this specific channel when connected
                console.log(`Loading 7TV emotes for channel: ${channelName}`);
                await this.loadChannelSevenTVEmotes(channelName);
                console.log(`7TV emotes loaded for ${channelName}: ${this.sevenTVEmotes.get(channelName)?.size || 0} emotes`);

                // Load channel badges when connected
                console.log(`Loading channel badges for ${channelName}`);
                await this.loadChannelBadges(channelName);
                console.log(`Channel badges loaded for ${channelName}: ${this.channelBadges.get(channelName)?.size || 0} badge sets`);
            });

            client.on('disconnected', () => {
                console.log(`Disconnected from ${channelName}`);
                this.channels.get(channelName).isConnected = false;
                this.updateChannelStatus(channelName, 'disconnected');
            });

            client.on('message', (channel, userstate, message, self) => {
                this.onMessage(channelName, channel, userstate, message, self);
            });

            client.on('reconnect', () => {
                console.log(`Reconnecting to ${channelName}...`);
                this.updateChannelStatus(channelName, 'connecting');
            });

            // Moderation/diagnostics listeners
            client.on('notice', (channel, msgid, message) => {
                console.log('NOTICE:', channel, msgid, message);
                // Surface common moderation notices
                if (msgid && /ban|timeout|unban|delete/i.test(msgid)) {
                    this.showNotification(message, 'info');
                }
            });

            client.on('messagedeleted', (channel, username, deletedMessage, userstate) => {
                console.log('Message deleted:', { channel, username, deletedMessage, userstate });
                this.showNotification(`Message deleted for ${username}`, 'success');

                // Mark message as deleted in UI if we can find it
                if (userstate?.targetMsgId) {
                    const messageElement = document.querySelector(`[data-message-id="${userstate.targetMsgId}"]`);
                    if (messageElement) {
                        this.markMessageAsDeleted(messageElement);
                    }
                }
            });

            client.on('timeout', (channel, username, reason, duration) => {
                console.log('Timeout:', { channel, username, duration, reason });
                this.showNotification(`Timed out ${username} (${Math.floor((duration||0)/60)}m)`, 'success');

                // Mark user as timed out in UI
                this.markUserAsTimedOut(channelName, username, duration || 0);
            });

            client.on('ban', (channel, username, reason) => {
                console.log('Ban:', { channel, username, reason });
                this.showNotification(`Banned ${username}`, 'success');

                // Mark user as banned in UI
                this.markUserAsBanned(channelName, username);
            });

            client.on('unban', (channel, username) => {
                console.log('Unban:', { channel, username });
                this.showNotification(`Unbanned ${username}`, 'success');

                // Remove ban indicators from user's messages
                this.markUserAsUnbanned(channelName, username);
            });

            // Connect
            await client.connect();
            this.clients.set(channelName, client);

        } catch (error) {
            console.error(`Error connecting to ${channelName}:`, error);
            this.updateChannelStatus(channelName, 'disconnected');
            this.showNotification(`Failed to connect to #${channelName}`, 'error');
        }
    }

    createChannelTab(channelName) {
        const tabsList = document.getElementById('tabs-list');
        const noChannels = document.getElementById('no-channels');

        // Hide no channels message
        noChannels.style.display = 'none';

        const tab = document.createElement('div');
        tab.className = 'channel-tab';
        tab.dataset.channel = channelName;

        tab.innerHTML = `
            <div class="channel-tab-status"></div>
            <span class="channel-tab-name">#${channelName}</span>
            <button class="channel-tab-close" onclick="modDeck.removeChannel('${channelName}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                </svg>
            </button>
        `;

        tab.addEventListener('click', (e) => {
            if (!e.target.closest('.channel-tab-close')) {
                this.switchToChannel(channelName);
            }
        });

        tabsList.appendChild(tab);
    }

    createChannelPanel(channelName) {
        const tabsContent = document.getElementById('tabs-content');

        const panel = document.createElement('div');
        panel.className = 'tab-panel';
        panel.dataset.channel = channelName;

        panel.innerHTML = `
            <div class="chat-panel">
                <div class="chat-header">
                    <div class="chat-header-left">
                        <div class="chat-header-title">#${channelName}</div>
                        <div class="chat-header-status">Connecting...</div>
                    </div>
                    <div class="chat-header-actions">
                        <button class="header-action-btn" onclick="modDeck.showPredictionMenu('${channelName}')">${this.translate('Predictions')}</button>
                        <button class="header-action-btn" onclick="modDeck.clearChannelMessages('${channelName}')">${this.translate('Clear')}</button>
                        <button class="header-action-btn" onclick="modDeck.toggleChannelFilters('${channelName}')">${this.translate('Filters')}</button>
                    </div>
                </div>

                <div class="filters-container" id="filters-${channelName}">
                    <div class="filter-group">
                        <input type="text" class="filter-input" placeholder="${this.translate('Filter by user...')}"
                               data-filter="user" data-channel="${channelName}">
                        <input type="text" class="filter-input" placeholder="${this.translate('Filter by keyword...')}"
                               data-filter="keyword" data-channel="${channelName}">
                        <input type="text" class="filter-input" placeholder="${this.translate('Special members (comma-separated)...')}"
                               data-filter="special" data-channel="${channelName}" title="Users in this list will always be shown regardless of role filters">
                        <div class="role-filter-container">
                            <label class="role-filter-label">${this.translate('Roles:')}</label>
                            <div class="role-checkboxes">
                                <label class="role-checkbox">
                                    <input type="checkbox" value="broadcaster" checked data-channel="${channelName}"> ${this.translate('Broadcaster')}
                                </label>
                                <label class="role-checkbox">
                                    <input type="checkbox" value="moderator" checked data-channel="${channelName}"> ${this.translate('Moderator')}
                                </label>
                                <label class="role-checkbox">
                                    <input type="checkbox" value="verified" checked data-channel="${channelName}"> ${this.translate('Verified')}
                                </label>
                                <label class="role-checkbox">
                                    <input type="checkbox" value="vip" checked data-channel="${channelName}"> ${this.translate('VIP')}
                                </label>
                                <label class="role-checkbox">
                                    <input type="checkbox" value="subscriber" checked data-channel="${channelName}"> ${this.translate('Subscriber')}
                                </label>
                                <label class="role-checkbox">
                                    <input type="checkbox" value="viewer" checked data-channel="${channelName}"> ${this.translate('Viewer')}
                                </label>
                            </div>
                        </div>
                    </div>
                    <button class="clear-btn" onclick="modDeck.clearChannelFilters('${channelName}')">${this.translate('Clear')}</button>
                </div>

                <div class="chat-container-wrapper">
                    <div class="chat-container" id="chat-${channelName}">
                        <div class="welcome-message">
                            <h3>${this.translate('Connecting to')} #${channelName}...</h3>
                            <p>${this.translate('Chat messages will appear here once connected.')}</p>
                        </div>
                    </div>
                    <button class="scroll-to-bottom-btn" id="scroll-btn-${channelName}"
                            onclick="modDeck.scrollToBottom('${channelName}')" style="display: none;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7,10L12,15L17,10H7Z"/>
                        </svg>
                        <span>${this.translate('New messages')}</span>
                    </button>
                </div>

                <div class="chat-input-section">
                    <div class="chat-input-container">
                        <textarea class="chat-input" id="input-${channelName}"
                                  placeholder="${this.isLoggedIn ? this.translate('Type a message...') : this.translate('Login to send messages')}"
                                  ${this.isLoggedIn ? '' : 'disabled'}
                                  data-channel="${channelName}"></textarea>
                        <button class="send-btn" id="send-${channelName}"
                                ${this.isLoggedIn ? '' : 'disabled'}
                                onclick="modDeck.sendMessage('${channelName}')">${this.translate('Send')}</button>
                    </div>
                </div>
            </div>
        `;

        tabsContent.appendChild(panel);

        // Add event listeners for filters
        this.setupChannelFilters(channelName);
    }

    switchToChannel(channelName) {
        // Update tabs
        document.querySelectorAll('.channel-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-channel="${channelName}"]`).classList.add('active');

        // Update panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.querySelector(`[data-channel="${channelName}"].tab-panel`).classList.add('active');

        this.activeChannel = channelName;
        this.updateChatInputState(channelName);

        // Clear any active reply when switching channels
        if (this.replyTarget && this.replyTarget.channel !== channelName) {
            this.clearReplyTarget();
        }

        // Re-process all messages with 7TV emotes for this channel
        this.reprocessMessagesWithEmotes(channelName);
    }

    updateChannelStatus(channelName, status) {
        const tab = document.querySelector(`[data-channel="${channelName}"].channel-tab`);
        const statusEl = tab?.querySelector('.channel-tab-status');
        const headerStatus = document.querySelector(`[data-channel="${channelName}"] .chat-header-status`);

        if (statusEl) {
            statusEl.className = `channel-tab-status ${status}`;
        }

        if (tab) {
            tab.classList.toggle('connected', status === 'connected');
        }

        if (headerStatus) {
            const statusText = {
                'connecting': 'Connecting...',
                'connected': 'Connected',
                'disconnected': 'Disconnected'
            };
            headerStatus.textContent = statusText[status] || status;
        }
    }

    setupChannelFilters(channelName) {
        const panel = document.querySelector(`[data-channel="${channelName}"].tab-panel`);

        // Filter inputs
        panel.querySelectorAll('.filter-input').forEach(input => {
            input.addEventListener('input', () => this.applyChannelFilters(channelName));
        });

        // Role checkboxes
        panel.querySelectorAll('.role-checkboxes input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.applyChannelFilters(channelName));
        });

        // Chat input for sending messages
        const chatInput = panel.querySelector('.chat-input');
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(channelName);
            } else if (e.key === 'Escape') {
                // Cancel reply with Escape key
                this.clearReplyTarget();
            }
        });

        // Chat container scroll event
        const chatContainer = document.getElementById(`chat-${channelName}`);
        chatContainer.addEventListener('scroll', () => {
            const isScrolledToBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 1;
            this.updateScrollButton(channelName, !isScrolledToBottom);
        });
    }

    async checkHelixAvailability() {
        try {
            const result = await ipcRenderer.invoke('validate-helix');
            this.helixAvailable = result.ok;
            if (this.helixAvailable) {
                console.log('Helix API available - replies will use proper threading');
            } else {
                console.log('Helix API not available - replies will use @mentions');
            }
        } catch (error) {
            console.error('Error checking Helix availability:', error);
            this.helixAvailable = false;
        }
    }

        async sendMessage(channelName) {
        if (!this.isLoggedIn) {
            this.showNotification('Please login to send messages', 'error');
            return;
        }

        const input = document.getElementById(`input-${channelName}`);
        const message = input.value.trim();

        if (!message) return;

        // Check if this is a reply and we have Helix API available
        if (this.replyTarget && this.replyTarget.channel === channelName && this.helixAvailable) {
            try {
                // Use Helix API for proper threaded replies
                const result = await ipcRenderer.invoke('helix-send-message', {
                    channelLogin: channelName,
                    message: message,
                    replyToMessageId: this.replyTarget.messageId
                });

                if (result.success) {
                    console.log('Reply sent successfully via Helix API');
                    input.value = '';
                    this.clearReplyTarget();
                    input.style.height = 'auto';
                    return;
                } else {
                    console.warn('Helix API failed, falling back to TMI:', result.error);
                    // Fall through to TMI fallback
                }
            } catch (error) {
                console.error('Helix API error, falling back to TMI:', error);
                // Fall through to TMI fallback
            }
        }

        // Fallback to TMI client (original method)
        const client = this.clients.get(channelName);
        if (!client) {
            this.showNotification('Not connected to channel', 'error');
            return;
        }

        try {
            let finalMessage = message;
            let replyContext = null;

            // Check if this is a reply (fallback mode)
            if (this.replyTarget && this.replyTarget.channel === channelName) {
                // Add @username prefix for replies (TMI fallback)
                finalMessage = `@${this.replyTarget.username} ${message}`;

                // Store reply context for when the message echoes back
                replyContext = {
                    username: this.replyTarget.username,
                    message: this.replyTarget.message
                };

                // Store pending reply to detect it when it echoes back
                const replyKey = `${channelName}:${this.twitchUsername}:${finalMessage}`;
                this.pendingReplies.set(replyKey, replyContext);

                // Clear old pending replies (cleanup)
                setTimeout(() => {
                    this.pendingReplies.delete(replyKey);
                }, 15000); // 15 seconds timeout
            }

            await client.say(`#${channelName}`, finalMessage);

            input.value = '';
            this.clearReplyTarget();
            input.style.height = 'auto';
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Failed to send message', 'error');
        }
    }



    updateChatInputState(channelName) {
        const input = document.getElementById(`input-${channelName}`);
        const sendBtn = document.getElementById(`send-${channelName}`);

        if (!input || !sendBtn) return;

        if (this.isLoggedIn) {
            input.disabled = false;
            input.placeholder = 'Type a message...';
            sendBtn.disabled = false;
        } else {
            input.disabled = true;
            input.placeholder = 'Login to send messages';
            sendBtn.disabled = true;
        }
    }

    async removeChannel(channelName) {
        if (!confirm(`Remove #${channelName}?`)) return;

        // Disconnect client
        const client = this.clients.get(channelName);
        if (client) {
            try {
                await client.disconnect();
            } catch (error) {
                console.error(`Error disconnecting from ${channelName}:`, error);
            }
            this.clients.delete(channelName);
        }

        // Remove data
        this.channels.delete(channelName);

        // Remove UI elements
        const tab = document.querySelector(`[data-channel="${channelName}"].channel-tab`);
        const panel = document.querySelector(`[data-channel="${channelName}"].tab-panel`);

        if (tab) tab.remove();
        if (panel) panel.remove();

        // Switch to another channel or show no channels
        const remainingChannels = Array.from(this.channels.keys());
        if (remainingChannels.length > 0) {
            this.switchToChannel(remainingChannels[0]);
        } else {
            document.getElementById('no-channels').style.display = 'flex';
            this.activeChannel = null;
        }

        this.showNotification(`Removed #${channelName}`, 'info');

        // Save tab state
        this.saveTabState();
    }

    onMessage(channelName, channel, userstate, message, self) {
        console.log(`[${channelName}] Color debug - userstate.color:`, userstate.color);

        const channelData = this.channels.get(channelName);
        if (!channelData) return;

        // Create unique message ID
        const messageId = userstate.id || `${Date.now()}-${Math.random()}`;

        // Check for duplicate messages (only check by message ID, not content)
        const existingMessage = channelData.messages.find(msg => msg.id === messageId);
        if (existingMessage) {
            console.log('Duplicate message ID detected, skipping:', messageId);
            return;
        }

        // Additional check for self-messages to prevent duplicates (only check by ID)
        if (self) {
            const recentSelfMessage = channelData.messages.find(msg =>
                msg.id === messageId && msg.isSelf
            );
            if (recentSelfMessage) {
                console.log('Recent self-message ID detected, skipping:', messageId);
                return;
            }
        }

                // Check if this message is a reply (starts with @username)
        const replyMatch = message.match(/^@(\w+)\s+(.+)$/);
        let replyTo = null;
        let actualMessage = message;

        // First, check if this is a pending reply we sent
        const replyKey = `${channelName}:${userstate['display-name'] || userstate.username}:${message}`;
        if (this.pendingReplies.has(replyKey)) {
            replyTo = this.pendingReplies.get(replyKey);
            actualMessage = replyMatch ? replyMatch[2] : message;
            this.pendingReplies.delete(replyKey); // Remove from pending
        } else if (replyMatch) {
            const replyUsername = replyMatch[1];
            actualMessage = replyMatch[2];

            // Find the most recent message from the replied-to user in this channel
            const recentMessages = channelData.messages
                .filter(msg => msg.username.toLowerCase() === replyUsername.toLowerCase())
                .slice(-5); // Last 5 messages from that user

            if (recentMessages.length > 0) {
                const targetMessage = recentMessages[recentMessages.length - 1];
                replyTo = {
                    username: targetMessage.username,
                    message: targetMessage.message.length > 50
                        ? targetMessage.message.substring(0, 50) + '...'
                        : targetMessage.message
                };
            }
        }

        // Create message object
        const messageObj = {
            id: messageId,
            username: userstate['display-name'] || userstate.username,
            message: actualMessage, // Use the message without @username prefix
            timestamp: new Date(),
            userstate: userstate,
            channel: channelName,
            badges: this.parseBadges(userstate.badges, channelName),
            color: this.getUserColor(userstate),
            isMention: this.checkIfMention(message),
            role: this.getUserRole(userstate),
            isSelf: self,
            recurrentCount: 0,
            replyTo: replyTo
        };

        // Update recurrent/spam tracking
        try {
            const tracker = this.getRecurrenceTracker(channelName);
            const now = Date.now();
            const windowMs = 60 * 1000; // 60 seconds window
            const key = this.normalizeMessageText(message);

            // Expire old events
            while (tracker.events.length > 0 && (now - tracker.events[0].time) > windowMs) {
                const expired = tracker.events.shift();
                const oldCount = (tracker.counts.get(expired.key) || 1) - 1;
                if (oldCount <= 0) tracker.counts.delete(expired.key); else tracker.counts.set(expired.key, oldCount);
            }

            // Add current event
            tracker.events.push({ key, time: now });
            const newCount = (tracker.counts.get(key) || 0) + 1;
            tracker.counts.set(key, newCount);
            messageObj.recurrentCount = newCount;
        } catch (e) {
            console.warn('Recurrent tracking error:', e);
        }

        // Add to channel messages
        channelData.messages.push(messageObj);
        channelData.messageCount++;

        // Check for mentions
        if (messageObj.isMention && !self) {
            channelData.mentions.push(messageObj);
            channelData.mentionCount++;
            this.addMention(messageObj);
        }

        // Update UI
        this.addMessageToUI(channelName, messageObj);
        this.updateMessageCount();

        // Save chat data periodically
        this.saveChatData();
    }

    parseBadges(badges, channelName) {
        if (!badges) return [];

        const badgeList = [];
        const badgeEntries = Object.entries(badges);

        for (const [badgeType, version] of badgeEntries) {
            // Only show subscriber badges for fugu_fps channel
            if (badgeType === 'subscriber' && channelName !== 'fugu_fps') {
                continue;
            }

            const badgeImageUrl = this.getBadgeImageUrl(badgeType, version, channelName);

            // Add badge if we have a valid URL (API or local)
            if (badgeImageUrl) {
                const badgeInfo = {
                    type: badgeType,
                    version: version,
                    title: this.getBadgeTitle(badgeType, version, channelName),
                    imageUrl: badgeImageUrl
                };
                badgeList.push(badgeInfo);
            }
        }

        return badgeList;
    }

    getBadgeTitle(badgeType, version, channelName) {
        // Check if we have channel-specific badges first
        const channelBadgeSets = this.channelBadges.get(channelName);
        if (channelBadgeSets && channelBadgeSets.has(badgeType)) {
            const versions = channelBadgeSets.get(badgeType);
            if (versions && versions.has(version)) {
                const badgeData = versions.get(version);
                return badgeData.title || badgeType;
            }
        }

        // Check global badges
        if (this.globalBadges.has(badgeType)) {
            const versions = this.globalBadges.get(badgeType);
            if (versions && versions.has(version)) {
                const badgeData = versions.get(version);
                return badgeData.title || badgeType;
            }
        }

        // Fallback to local titles
        const titles = {
            'broadcaster': 'Broadcaster',
            'moderator': 'Moderator',
            'vip': 'VIP',
            'subscriber': `Subscriber (${version} months)`,
            'premium': 'Prime',
            'prime': 'Prime',
            'turbo': 'Turbo',
            'staff': 'Staff',
            'admin': 'Admin',
            'global_mod': 'Global Moderator',
            'partner': 'Verified Partner',
            'verified': 'Verified',
            'no_audio': 'No Audio',
            'no-audio': 'No Audio',
            'no-video': 'No Video',
            'no_video': 'No Video',
            'dj': 'DJ',
            'ambassador': 'Ambassador',
            'anonymous-cheerer': 'Anonymous Cheerer',
            'artist-badge': 'Artist',
            'artist': 'Artist',
            'bits': `Bits ${version}`,
            'bits-leader': `Bits Leader ${version}`,
            'clips-leader': `Clips Leader ${version}`,
            'sub-gifter': `Sub Gifter ${version}`,
            'sub-gift-leader': `Gift Leader ${version}`,
            'predictions': 'Predictions',
            'game-award-2023': 'Game Award 2023',
            'golden-predictor-game-award-2023': 'Golden Predictor Game Award 2023',
            'twitchcon-2025': 'TwitchCon 2025',
            'twitch-recap-2024': 'Twitch Recap 2024',
            'twitch-recap-2023': 'Twitch Recap 2023',
            'twitch-inter-2023': 'Twitch Inter 2023',
            'zevent-2024': 'Z Event 2024',
            'subtember-2024': 'Subtember 2024',
            'lol-mid-season-2025-support-a-streamer': 'LoL Mid Season 2025 Support',
            'lol-mid-season-2025': 'LoL Mid Season 2025',
            'arcane-season-2-premiere': 'Arcane Season 2 Premiere',
            'premiere-arcane-2': 'Arcane Season 2 Premiere',
            'rplace-2023': 'r/place Cake 2023',
            'share-the-love': 'Share the Love',
            'gold-pixel-hear-2024': 'Gold Pixel Heart 2024',
            'purple-pixel-heart-2024': 'Purple Pixel Heart 2024',
            'ruby-pixel-heart-2024': 'Ruby Pixel Heart 2024',
            'clip-the-hall': 'Clip the Hall',
            'raging-wolf-helm': 'Raging Wolf',
            'gone-bananas': 'Gone Bananas',
            'speedons-5-badge': 'Speedons 5',
            'elden-ring-wylder': 'Elden Ring Wylder',
            'elden-ring-recluse': 'Elden Ring Recluse',
            'glhf': 'GLHF',
            'glitchcon': 'GlitchCon'
        };
        return titles[badgeType] || badgeType;
    }

    getBadgeImageUrl(badgeType, version, channelName) {
        // Check if we have channel-specific badges first
        const channelBadgeSets = this.channelBadges.get(channelName);
        if (channelBadgeSets && channelBadgeSets.has(badgeType)) {
            const versions = channelBadgeSets.get(badgeType);
            if (versions && versions.has(version)) {
                const badgeData = versions.get(version);
                console.log(`Found channel badge for ${badgeType} v${version}:`, badgeData);
                return badgeData.imageUrl2x || badgeData.imageUrl1x;
            }
        }

        // Check global badges
        if (this.globalBadges.has(badgeType)) {
            const versions = this.globalBadges.get(badgeType);
            if (versions && versions.has(version)) {
                const badgeData = versions.get(version);
                console.log(`Found global badge for ${badgeType} v${version}:`, badgeData);
                return badgeData.imageUrl2x || badgeData.imageUrl1x;
            }
        }

        // Fallback to local images
        const badgeMapping = {
            'broadcaster': 'images/badges/broadcaster.png',
            'moderator': 'images/badges/moderator.png',
            'vip': 'images/badges/vip.png',
            'subscriber': this.getSubscriberBadge(version),
            'premium': 'images/badges/prime.png',
            'prime': 'images/badges/prime.png',
            'turbo': 'images/badges/turbo.png',
            'staff': 'images/badges/staff.png',
            'admin': 'images/badges/admin.png',
            'global_mod': 'images/badges/global_mod.png',
            'partner': 'images/badges/verified.png',
            'verified': 'images/badges/verified.png',
            'no-audio': 'images/badges/no-audio.png',
            'no_audio': 'images/badges/no-audio.png',
            'no-video': 'images/badges/listen.png',
            'no_video': 'images/badges/listen.png',
            'dj': 'images/badges/dj.png',
            'ambassador': 'images/badges/ambassador.png',
            'anonymous-cheerer': 'images/badges/anonymous-cheerer.png',
            'artist-badge': 'images/badges/Artist.png',
            'artist': 'images/badges/Artist.png',
            'bits': this.getBitsBadge(version),
            'bits-leader': this.getBitsLeaderBadge(version),
            'sub-gifter': this.getSubGifterBadge(version),
            'sub-gift-leader': this.getGifterLeaderBadge(version),
            'clips-leader': this.getClipsLeaderBadge(version),
            'predictions': this.getPredictionBadge(version),
            // Special event badges
            'game-award-2023': 'images/badges/game-award-2023.png',
            'golden-predictor-game-award-2023': 'images/badges/golden-predictor-game-award-2023.png',
            'twitchcon-2025': 'images/badges/twitchcon-2025.png',
            'twitch-recap-2024': 'images/badges/twitch-recap-2024.png',
            'twitch-recap-2023': 'images/badges/twitch-recap-2023.png',
            'twitch-inter-2023': 'images/badges/twitch-inter-2023.png',
            'zevent-2024': 'images/badges/zevent-2024.png',
            'subtember-2024': 'images/badges/subtember-2024.png',
            'lol-mid-season-2025-support-a-streamer': 'images/badges/lol-mid-season-2025-support-a-streamer.png',
            'lol-mid-season-2025': 'images/badges/lol-mid-season-2025.png',
            'arcane-season-2-premiere': 'images/badges/premiere-arcane-2.png',
            'premiere-arcane-2': 'images/badges/premiere-arcane-2.png',
            'rplace-2023': 'images/badges/rplace-cake-2023.png',
            'share-the-love': 'images/badges/share-the-love.png',
            'gold-pixel-hear-2024': 'images/badges/gold-pixel-hear-2024.png',
            'purple-pixel-heart-2024': 'images/badges/purple-pixel-heart-2024.png',
            'ruby-pixel-heart-2024': 'images/badges/ruby-pixel-heart-2024.png',
            'clip-the-hall': 'images/badges/clip-the-hall.png',
            'raging-wolf-helm': 'images/badges/raging-wolf.png',
            'gone-bananas': 'images/badges/banana.png',
            'speedons-5-badge': 'images/badges/speedons-5.png',
            'elden-ring-wylder': 'images/badges/elden-ring-wylder.png',
            'elden-ring-recluse': 'images/badges/elden-ring-recluse.png',
            'glhf': 'images/badges/GLHF.png',
            'glitchcon': 'images/badges/Glitchcon.png'
        };

        console.log(`No API badge found for ${badgeType} v${version}, falling back to local image`);
        return badgeMapping[badgeType] || `images/badges/${badgeType}.png`;
    }

    getSubscriberBadge(version) {
        // Map subscriber versions to local badge files like in the HTML example
        const subVersion = parseInt(version) || 0;
        let subBadgeFile = '';

        switch(subVersion) {
            case 0:
            case 1:
                subBadgeFile = '1-mois.png';
                break;
            case 2:
                subBadgeFile = '2-mois.png';
                break;
            case 3:
                subBadgeFile = '3-mois.png';
                break;
            case 6:
                subBadgeFile = '6-mois.png';
                break;
            case 9:
                subBadgeFile = '9-mois.png';
                break;
            case 12:
                subBadgeFile = '1-an.png';
                break;
            case 18:
                subBadgeFile = '18-mois.png';
                break;
            case 24:
                subBadgeFile = '2-ans.png';
                break;
            default:
                subBadgeFile = '1-mois.png';
        }

        return `images/badges/${subBadgeFile}`;
    }

    getPredictionBadge(version) {
        const predVersion = version || '1';
        let predBadgeFile = '';

        switch(predVersion) {
            case '1':
            case 'blue-1':
                predBadgeFile = 'predi-1.png';
                break;
            case '2':
            case 'pink-2':
                predBadgeFile = 'predi-2.png';
                break;
            default:
                predBadgeFile = 'predi-1.png';
        }

        return `images/badges/${predBadgeFile}`;
    }

    getBitsBadge(version) {
        const bitsVersion = parseInt(version) || 1;
        let bitsBadgeFile = '';

        if (bitsVersion >= 1000000) bitsBadgeFile = 'cheer-1000000.png';
        else if (bitsVersion >= 100000) bitsBadgeFile = 'cheer-100000.png';
        else if (bitsVersion >= 50000) bitsBadgeFile = 'cheer-50000.png';
        else if (bitsVersion >= 25000) bitsBadgeFile = 'cheer-25000.png';
        else if (bitsVersion >= 10000) bitsBadgeFile = 'cheer-10000.png';
        else if (bitsVersion >= 5000) bitsBadgeFile = 'cheer-5000.png';
        else if (bitsVersion >= 1000) bitsBadgeFile = 'cheer-1000.png';
        else if (bitsVersion >= 100) bitsBadgeFile = 'cheer-100.png';
        else bitsBadgeFile = 'cheer-1.png';

        return `images/badges/${bitsBadgeFile}`;
    }

    getBitsLeaderBadge(version) {
        // Bits leader badges - similar structure to clips leader
        const bitsLeaderVersion = version || '1';
        let bitsLeaderBadgeFile = '';

        switch(bitsLeaderVersion) {
            case '1':
                bitsLeaderBadgeFile = 'bits-1.png';
                break;
            case '2':
                bitsLeaderBadgeFile = 'bits-2.png';
                break;
            case '3':
                bitsLeaderBadgeFile = 'bits-3.png';
                break;
            default:
                bitsLeaderBadgeFile = 'bits-1.png';
        }

        return `images/badges/${bitsLeaderBadgeFile}`;
    }

    getClipsLeaderBadge(version) {
        const clipsVersion = version || '1';
        let clipsBadgeFile = '';

        switch(clipsVersion) {
            case '1':
                clipsBadgeFile = 'clipe-1.png';
                break;
            case '2':
                clipsBadgeFile = 'clipe-2.png';
                break;
            case '3':
                clipsBadgeFile = 'clipe-3.png';
                break;
            default:
                clipsBadgeFile = 'clipe-1.png';
        }

        return `images/badges/${clipsBadgeFile}`;
    }

    getSubGifterBadge(version) {
        const giftVersion = parseInt(version) || 1;
        let giftBadgeFile = '';

        if (giftVersion >= 1000) giftBadgeFile = 'sub-gift-1000.png';
        else if (giftVersion >= 500) giftBadgeFile = 'sub-gift-500.png';
        else if (giftVersion >= 100) giftBadgeFile = 'sub-gift-100.png';
        else if (giftVersion >= 50) giftBadgeFile = 'sub-gift-50.png';
        else if (giftVersion >= 25) giftBadgeFile = 'sub-gift-25.png';
        else if (giftVersion >= 10) giftBadgeFile = 'sub-gift-10.png';
        else if (giftVersion >= 5) giftBadgeFile = 'sub-gift-5.png';
        else giftBadgeFile = 'sub-gift-1.png';

        return `images/badges/${giftBadgeFile}`;
    }

    getGifterLeaderBadge(version) {
        const giftLeaderVersion = version || '1';
        let gifterBadgeFile = '';

        switch(giftLeaderVersion) {
            case '1':
                gifterBadgeFile = 'gifter-1.png';
                break;
            case '2':
                gifterBadgeFile = 'gifter-2.png';
                break;
            case '3':
                gifterBadgeFile = 'gifter-3.png';
                break;
            default:
                gifterBadgeFile = 'gifter-1.png';
        }

        return `images/badges/${gifterBadgeFile}`;
    }

    getUserRole(userstate) {
        if (userstate.badges?.broadcaster) return 'broadcaster';
        if (userstate.mod) return 'moderator';
        if (userstate.badges?.partner) return 'verified';
        if (userstate.badges?.vip) return 'vip';
        if (userstate.subscriber) return 'subscriber';
        return 'viewer';
    }

    getUserColor(userstate) {
        console.log(`Getting user color for ${userstate.username}:`, userstate.color);

        // Use the color from Twitch if available
        if (userstate.color) {
            console.log(`Using Twitch color: ${userstate.color}`);
            return userstate.color;
        }

        // Fallback: assign a consistent color
        let userColor = this.userColors.get(userstate.username);
        if (!userColor) {
            userColor = this.colors[this.colorIndex % this.colors.length];
            this.userColors.set(userstate.username, userColor);
            this.colorIndex++;
            console.log(`Assigned fallback color: ${userColor}`);
        }

        return userColor;
    }

    checkIfMention(message) {
        const lowercaseMessage = message.toLowerCase();
        console.log('Checking mention for message:', message);
        console.log('Available keywords:', this.mentionKeywords);

        const isMention = this.mentionKeywords.some(keyword => {
            const found = lowercaseMessage.includes(keyword.toLowerCase());
            if (found) {
                console.log(`Found mention keyword "${keyword}" in message: "${message}"`);
            }
            return found;
        });

        console.log('Is mention:', isMention);
        return isMention;
    }

    addMessageToUI(channelName, messageObj) {
        const container = document.getElementById(`chat-${channelName}`);
        if (!container) return;

        // Remove welcome message if present
        const welcomeMessage = container.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // Check if user has scrolled up
        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;

        const messageElement = this.createMessageElement(messageObj);
        container.appendChild(messageElement);

        // Show/hide scroll to bottom button
        this.updateScrollButton(channelName, !isScrolledToBottom);

        // Only auto-scroll if user is at bottom or auto-scroll is enabled
        if (this.settings.autoScroll && isScrolledToBottom) {
            container.scrollTop = container.scrollHeight;
        }

        // Apply current filters
        this.applyChannelFilters(channelName);
    }

    updateScrollButton(channelName, show) {
        const scrollBtn = document.getElementById(`scroll-btn-${channelName}`);
        if (scrollBtn) {
            scrollBtn.style.display = show ? 'flex' : 'none';
        }
    }

    scrollToBottom(channelName) {
        const container = document.getElementById(`chat-${channelName}`);
        if (container) {
            container.scrollTop = container.scrollHeight;
            this.updateScrollButton(channelName, false);
        }
    }

    createMessageElement(messageObj) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${messageObj.isMention ? 'mention' : ''}`;
        messageEl.dataset.username = messageObj.username.toLowerCase();
        messageEl.dataset.role = messageObj.role;
        const messageId = messageObj.userstate?.id || messageObj.id || `fallback-${Date.now()}-${Math.random()}`;
        messageEl.dataset.messageId = messageId;

        // Enable text selection
        messageEl.style.userSelect = 'text';
        messageEl.style.webkitUserSelect = 'text';

        // Create badges HTML
        const badgesHtml = messageObj.badges.map(badge =>
            `<img src="${badge.imageUrl}" alt="${badge.title}" title="${badge.title}" class="badge-image">`
        ).join('');

        // Process message with emotes
        const processedMessage = this.processMessageEmotes(messageObj.message, messageObj.userstate, messageObj.channel);

                // Debug: Check if 7TV emotes are loaded
        if (messageObj.message.includes('catsittingverycomfortablearoundacampfirewithitsfriends')) {
            console.log('7TV Debug - Message contains 7TV emote name');
            console.log('Global 7TV emotes loaded:', this.globalSevenTVEmotes.size);
            console.log('Channel 7TV emotes loaded:', this.sevenTVEmotes.get(messageObj.channel)?.size || 0);

            // Check if the specific emote is loaded
            const channelEmotes = this.sevenTVEmotes.get(messageObj.channel);
            if (channelEmotes && channelEmotes.has('catsittingverycomfortablearoundacampfirewithitsfriends')) {
                const emote = channelEmotes.get('catsittingverycomfortablearoundacampfirewithitsfriends');
                console.log('7TV Debug - Emote found in channel emotes:', emote);

                // Debug the URL processing
                if (emote.urls && Array.isArray(emote.urls)) {
                    console.log('7TV Debug - Emote URLs:', emote.urls);
                    const imageUrl = emote.urls.find(url => url.includes('2x.webp')) ||
                                    emote.urls.find(url => url.includes('1x.webp')) ||
                                    emote.urls[0];
                    console.log('7TV Debug - Selected image URL:', imageUrl);
                    if (imageUrl) {
                        const fullUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl;
                        console.log('7TV Debug - Full URL:', fullUrl);
                    }
                }
            } else {
                console.log('7TV Debug - Emote NOT found in channel emotes');

                // Check global emotes
                if (this.globalSevenTVEmotes.has('catsittingverycomfortablearoundacampfirewithitsfriends')) {
                    const emote = this.globalSevenTVEmotes.get('catsittingverycomfortablearoundacampfirewithitsfriends');
                    console.log('7TV Debug - Emote found in global emotes:', emote);
                } else {
                    console.log('7TV Debug - Emote NOT found in global emotes either');
                }
            }

            console.log('Original message:', messageObj.message);
            console.log('Processed message:', processedMessage);
        }

        // Create timestamp
        const timestamp = this.settings.showTimestamps ?
            `<span class="timestamp">${messageObj.timestamp.toLocaleTimeString()}</span>` : '';

        const userColor = typeof messageObj.color === 'string' && messageObj.color.startsWith('#')
            ? messageObj.color
            : '';

        // Recurrent badge if the message was seen multiple times recently
        const recurrentBadge = (messageObj.recurrentCount && messageObj.recurrentCount >= 3)
            ? `<span class="recurrent-badge" title="Similar messages recently">Recurrent x${messageObj.recurrentCount}</span>`
            : '';

        // Reply context if this is a reply
        const replyContext = messageObj.replyTo ? `
            <div class="reply-context">
                <span class="reply-to-user">@${messageObj.replyTo.username}</span>
                <span class="reply-to-message">${messageObj.replyTo.message}</span>
            </div>
        ` : '';

        messageEl.innerHTML = `
            ${timestamp}
            <div class="message-actions">
                <button class="reply-btn ${messageId.includes('fallback-') || messageId.includes('-0.') ? 'disabled' : ''}"
                        data-translate="Reply"
                        title="${messageId.includes('fallback-') || messageId.includes('-0.') ? 'Cannot reply to old messages' : this.translate('Reply')}">↵</button>
            </div>
            <div class="message-content">
                ${replyContext}
                <div class="user-info">
                    <span class="badges">${badgesHtml}</span>
                    <span class="username" style="${userColor ? `color: ${userColor}` : ''}">${messageObj.username}</span>
                    ${recurrentBadge}
                </div>
                <span class="message-text">${processedMessage}</span>
            </div>
        `;

        // Add reply class if this is a reply
        if (messageObj.replyTo) {
            messageEl.classList.add('reply');
        }

        // Context menu for moderation actions
        messageEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.openMessageContextMenu(e, messageObj);
        });

        // Reply button functionality - use event delegation since innerHTML replaces elements
        messageEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('reply-btn')) {
                e.stopPropagation();
                // Get the message ID and text from the DOM element to ensure accuracy
                const messageId = messageEl.dataset.messageId;
                const username = messageEl.dataset.username;

                // Get the message text from the DOM element
                const messageTextElement = messageEl.querySelector('.message-text');
                const messageText = messageTextElement ? messageTextElement.textContent.trim() : messageObj.message;

                // Create a reliable message object for reply
                const replyMessageObj = {
                    ...messageObj,
                    userstate: { id: messageId },
                    id: messageId,
                    username: username,
                    message: messageText,
                    channel: messageObj.channel
                };

                console.log('Reply target from DOM:', {
                    messageId,
                    username,
                    messageText,
                    element: messageEl
                });

                if (!messageId) {
                    console.warn('Cannot reply: message ID is undefined');
                    this.showNotification('Cannot reply: message ID missing', 'error');
                    return;
                }

                // Check if this is a fallback ID (not a real Twitch message ID)
                if (messageId.includes('fallback-') || messageId.includes('-0.')) {
                    console.warn('Cannot reply to message with fallback ID:', messageId);
                    this.showNotification('Cannot reply to old messages (no Twitch ID)', 'warning');
                    return;
                }

                this.setReplyTarget(replyMessageObj);
            }
        });

        return messageEl;
    }

    // Helper function to find message by ID across all channels
    findMessageById(messageId) {
        if (!messageId) return null;

        for (const [channelName, channelData] of this.channels) {
            const message = channelData.messages.find(msg =>
                (msg.userstate?.id === messageId) || (msg.id === messageId)
            );
            if (message) {
                return message;
            }
        }
        return null;
    }

    // ===== Reply Functionality =====
    setReplyTarget(messageObj) {
        // Use the actual Twitch message ID from userstate for Helix API compatibility
        const twitchMessageId = messageObj.userstate?.id || messageObj.id;

        this.replyTarget = {
            username: messageObj.username,
            message: messageObj.message,
            channel: messageObj.channel,
            messageId: twitchMessageId
        };

        console.log('Reply target set:', {
            username: this.replyTarget.username,
            messageId: twitchMessageId,
            helixAvailable: this.helixAvailable
        });

        // Show reply indicator in the current channel's input area
        this.showReplyIndicator();
    }

    showReplyIndicator() {
        if (!this.replyTarget) {
            console.warn('showReplyIndicator called but no replyTarget set');
            return;
        }

        console.log('Showing reply indicator for:', this.replyTarget);

        // Get the current channel's input container
        const currentChannel = this.activeChannel;
        if (!currentChannel) {
            console.warn('No active channel for reply indicator');
            return;
        }

        // Find the active panel and its input section
        const activePanel = document.querySelector(`.tab-panel[data-channel="${currentChannel}"].active`);
        if (!activePanel) {
            console.warn('Active panel not found for channel:', currentChannel);
            return;
        }

        const inputContainer = activePanel.querySelector('.chat-input-section');
        if (!inputContainer) {
            console.warn('Input container not found in active panel');
            return;
        }

        // Remove any existing reply indicator
        this.clearReplyIndicator();

        // Create reply indicator
        const replyIndicator = document.createElement('div');
        replyIndicator.className = 'reply-indicator';
        replyIndicator.id = 'reply-indicator';

        const replyMode = this.helixAvailable ? '🧵 Threaded Reply' : '📝 @Mention Reply';
        const replyModeTitle = this.helixAvailable
            ? 'Using Twitch Reply API - creates a threaded reply'
            : 'Using @mention fallback - Helix API not configured';

        replyIndicator.innerHTML = `
            <div class="reply-text">
                <span class="reply-mode" title="${replyModeTitle}" style="font-size: 10px; opacity: 0.7; margin-right: 6px;">${replyMode}</span>
                <span class="reply-to" data-translate="Replying to">${this.translate('Replying to')}</span>
                <span class="reply-to-user">@${this.replyTarget.username}:</span>
                <span class="reply-message" title="Message ID: ${this.replyTarget.messageId}">${this.replyTarget.message}</span>
                <span class="reply-id" style="font-size: 9px; opacity: 0.5; margin-left: 8px;">[ID: ${this.replyTarget.messageId?.substring(0, 8)}...]</span>
            </div>
            <button class="cancel-reply" data-translate="Cancel Reply" title="${this.translate('Cancel Reply')}">×</button>
        `;

        // Add event listener for cancel button
        const cancelBtn = replyIndicator.querySelector('.cancel-reply');
        cancelBtn.addEventListener('click', () => {
            this.clearReplyTarget();
        });

        // Insert before the input area
        const inputRow = inputContainer.querySelector('.chat-input-container');
        if (inputRow) {
            inputContainer.insertBefore(replyIndicator, inputRow);
        }

        // Focus the input
        const chatInput = inputContainer.querySelector('.chat-input');
        if (chatInput) {
            chatInput.focus();
        }
    }

    clearReplyIndicator() {
        const replyIndicator = document.getElementById('reply-indicator');
        if (replyIndicator) {
            replyIndicator.remove();
        }
    }

    clearReplyTarget() {
        this.replyTarget = null;
        this.clearReplyIndicator();
    }

    // ===== Moderation & Context Menu =====
    openMessageContextMenu(event, messageObj) {
        // Remove any existing menu
        document.querySelectorAll('.md-context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'md-context-menu';

        const channelName = messageObj.channel;
        const username = messageObj.username;
        const realMsgId = messageObj?.userstate?.id || null;

        const addItem = (label, handler, disabled = false) => {
            const item = document.createElement('button');
            item.textContent = label;
            item.className = 'md-context-item';
            if (disabled) {
                item.disabled = true;
                item.classList.add('disabled');
            }
            item.addEventListener('click', async () => {
                try { await handler(); } finally { menu.remove(); }
            });
            menu.appendChild(item);
        };

                const canAct = this.isLoggedIn && !!this.clients.get(channelName);

        addItem('Copy message', async () => this.copyMessageText(messageObj));
        addItem('Delete message', async () => this.deleteMessage(channelName, realMsgId, username), !canAct || !realMsgId);
        addItem('Timeout User...', async () => this.showTimeoutDialog(channelName, username), !canAct);
        addItem('Ban User...', async () => this.showBanDialog(channelName, username), !canAct);
        addItem('Unban', async () => this.unbanUser(channelName, username), !canAct);
        addItem('View history', async () => this.showUserHistory(channelName, username));

        // Position near cursor with viewport bounds checking
        const x = event.clientX;
        const y = event.clientY;

        // Add menu to DOM first to get its dimensions
        document.body.appendChild(menu);

        // Get menu dimensions and viewport size
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate final position ensuring menu stays within viewport
        let finalX = x;
        let finalY = y;

        // Check right edge - if not enough space to the right, position to the left of cursor
        if (x + menuRect.width > viewportWidth) {
            if (x - menuRect.width > 10) {
                // Position to the left of cursor if there's enough space
                finalX = x - menuRect.width;
            } else {
                // Otherwise, position at right edge with margin
                finalX = viewportWidth - menuRect.width - 10;
            }
        }

        // Check bottom edge - if not enough space below, position above cursor
        if (y + menuRect.height > viewportHeight) {
            if (y - menuRect.height > 10) {
                // Position above cursor if there's enough space
                finalY = y - menuRect.height;
            } else {
                // Otherwise, position at bottom with margin
                finalY = viewportHeight - menuRect.height - 10;
            }
        }

        // Ensure menu doesn't go off the left or top
        finalX = Math.max(10, finalX);
        finalY = Math.max(10, finalY);

        // If menu is still too large for viewport, scale it down
        if (menuRect.width > viewportWidth - 20) {
            menu.style.maxWidth = `${viewportWidth - 20}px`;
            menu.style.width = `${viewportWidth - 20}px`;
        }

        if (menuRect.height > viewportHeight - 20) {
            menu.style.maxHeight = `${viewportHeight - 20}px`;
            menu.style.overflowY = 'auto';
        }

        // Apply final position
        menu.style.left = `${finalX}px`;
        menu.style.top = `${finalY}px`;

        // Click outside to close
        const close = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', close);
                document.removeEventListener('contextmenu', close);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', close);
            document.addEventListener('contextmenu', close);
        }, 0);
    }

    getModerationClient(channelName) {
        const client = this.clients.get(channelName);
        if (!this.isLoggedIn || !client) {
            this.showNotification('Login with a moderator account to perform actions', 'error');
            return null;
        }
        return client;
    }

    async deleteMessage(channelName, messageId, username) {
        if (!messageId) {
            this.showNotification('Cannot delete: missing message id', 'error');
            return;
        }

        // Find the message element
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);

        // Prefer Helix if configured
        const helixResult = await this.tryHelix('mod-delete-message', { channelLogin: channelName, messageId, username }, 'Message deleted');
        if (helixResult.success) {
            // Only mark as deleted if Helix succeeded
            if (messageElement) {
                this.markMessageAsDeleted(messageElement);
            }
            return;
        }

        // If it's a permission error, don't try fallback methods
        if (helixResult.isPermissionError) {
            return;
        }

        const client = this.getModerationClient(channelName);
        if (!client) return;
        try {
            await client.deletemessage(`#${channelName}`, messageId);
            this.showNotification('Message deleted', 'success');
            // Mark as deleted only if TMI succeeded
            if (messageElement) {
                this.markMessageAsDeleted(messageElement);
            }
        } catch (error) {
            console.error('Delete message failed:', error);
            // Fallback: send slash command directly
            try {
                await client.say(`#${channelName}`, `/delete ${messageId}`);
                this.showNotification('Delete requested', 'info');
                // Mark as deleted since we attempted it
                if (messageElement) {
                    this.markMessageAsDeleted(messageElement);
                }
            } catch (e2) {
                console.error('Fallback delete failed:', e2);
                this.showNotification('Failed to delete message', 'error');
            }
        }
    }

    markMessageAsDeleted(messageElement) {
        messageElement.classList.add('message-deleted');
        messageElement.style.opacity = '0.5';

        // Add a "DELETED" badge
        const badge = document.createElement('span');
        badge.className = 'deleted-badge';
        badge.textContent = 'DELETED';
        badge.style.cssText = `
            background: #e91e63;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            margin-left: 8px;
        `;

        const messageHeader = messageElement.querySelector('.message-header');
        if (messageHeader) {
            messageHeader.appendChild(badge);
        }

        // Add strike-through to message content
        const messageContent = messageElement.querySelector('.message-content');
        if (messageContent) {
            messageContent.style.textDecoration = 'line-through';
            messageContent.style.color = '#adadb8';
        }

        // Mark the message as deleted in the data
        const messageId = messageElement.getAttribute('data-message-id');
        if (messageId) {
            // Find and mark the message in all channel data
            for (const [channelName, channelData] of this.channels) {
                const message = channelData.messages.find(m => m.userstate?.id === messageId);
                if (message) {
                    message.deleted = true;
                    break;
                }
            }
        }
    }

    async timeoutUser(channelName, username, seconds, reason = 'ModDeck timeout') {
        // Prefer Helix if configured
        const helixResult = await this.tryHelix('mod-timeout', { channelLogin: channelName, targetLogin: username, seconds, reason }, `Timed out ${username} for ${Math.floor(seconds/60)}m`);
        if (helixResult.success) {
            // Only mark as timed out if Helix succeeded
            this.markUserAsTimedOut(channelName, username, seconds);
            return;
        }

        // If it's a permission error, don't try fallback methods
        if (helixResult.isPermissionError) {
            return;
        }

        const client = this.getModerationClient(channelName);
        if (!client) return;
        try {
            await client.timeout(`#${channelName}`, username, seconds, reason);
            this.showNotification(`Timed out ${username} for ${Math.floor(seconds/60)}m`, 'success');
            // Mark as timed out only if TMI succeeded
            this.markUserAsTimedOut(channelName, username, seconds);
        } catch (error) {
            console.error('Timeout failed:', error);
            // Fallback: slash command
            try {
                await client.say(`#${channelName}`, `/timeout ${username} ${seconds} ${reason}`);
                this.showNotification('Timeout requested', 'info');
                // Mark as timed out since we attempted it
                this.markUserAsTimedOut(channelName, username, seconds);
            } catch (e2) {
                console.error('Fallback timeout failed:', e2);
                this.showNotification('Failed to timeout user', 'error');
            }
        }
    }

    markUserAsTimedOut(channelName, username, seconds) {
        const container = document.getElementById(`chat-${channelName}`);
        if (!container) return;

        const userMessages = container.querySelectorAll(`[data-username="${username}"]`);
        userMessages.forEach(messageElement => {
            messageElement.classList.add('user-timed-out');
            messageElement.style.opacity = '0.6';

            // Add timeout badge
            const badge = document.createElement('span');
            badge.className = 'timeout-badge';
            badge.textContent = `TIMEOUT (${Math.floor(seconds/60)}m)`;
            badge.style.cssText = `
                background: #ff9800;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                margin-left: 8px;
            `;

            const messageHeader = messageElement.querySelector('.message-header');
            if (messageHeader && !messageHeader.querySelector('.timeout-badge')) {
                messageHeader.appendChild(badge);
            }
        });
    }

    async banUser(channelName, username, reason = 'ModDeck ban') {
        // Prefer Helix if configured
        const helixResult = await this.tryHelix('mod-ban', { channelLogin: channelName, targetLogin: username, reason }, `Banned ${username}`);
        if (helixResult.success) {
            // Only mark as banned if Helix succeeded
            this.markUserAsBanned(channelName, username);
            return;
        }

        // If it's a permission error, don't try fallback methods
        if (helixResult.isPermissionError) {
            return;
        }

        const client = this.getModerationClient(channelName);
        if (!client) return;
        try {
            await client.ban(`#${channelName}`, username, reason);
            this.showNotification(`Banned ${username}`, 'success');
            // Mark as banned only if TMI succeeded
            this.markUserAsBanned(channelName, username);
        } catch (error) {
            console.error('Ban failed:', error);
            // Fallback: slash command
            try {
                await client.say(`#${channelName}`, `/ban ${username} ${reason}`);
                this.showNotification('Ban requested', 'info');
                // Mark as banned since we attempted it
                this.markUserAsBanned(channelName, username);
            } catch (e2) {
                console.error('Fallback ban failed:', e2);
                this.showNotification('Failed to ban user', 'error');
            }
        }
    }

    markUserAsBanned(channelName, username) {
        const container = document.getElementById(`chat-${channelName}`);
        if (!container) return;

        const userMessages = container.querySelectorAll(`[data-username="${username}"]`);
        userMessages.forEach(messageElement => {
            messageElement.classList.add('user-banned');
            messageElement.style.opacity = '0.4';

            // Add ban badge
            const badge = document.createElement('span');
            badge.className = 'ban-badge';
            badge.textContent = 'BANNED';
            badge.style.cssText = `
                background: #f44336;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                margin-left: 8px;
            `;

            const messageHeader = messageElement.querySelector('.message-header');
            if (messageHeader && !messageHeader.querySelector('.ban-badge')) {
                messageHeader.appendChild(badge);
            }
        });
    }

    async unbanUser(channelName, username) {
        // Prefer Helix if configured
        const helixResult = await this.tryHelix('mod-unban', { channelLogin: channelName, targetLogin: username }, `Unbanned ${username}`);
        if (helixResult.success) {
            // Only remove ban indicators if Helix succeeded
            this.markUserAsUnbanned(channelName, username);
            return;
        }

        // If it's a permission error, don't try fallback methods
        if (helixResult.isPermissionError) {
            return;
        }

        const client = this.getModerationClient(channelName);
        if (!client) return;
        try {
            await client.unban(`#${channelName}`, username);
            this.showNotification(`Unbanned ${username}`, 'success');
            // Remove ban indicators only if TMI succeeded
            this.markUserAsUnbanned(channelName, username);
        } catch (error) {
            console.error('Unban failed:', error);
            // Fallback: slash command
            try {
                await client.say(`#${channelName}`, `/unban ${username}`);
                this.showNotification('Unban requested', 'info');
                // Remove ban indicators since we attempted it
                this.markUserAsUnbanned(channelName, username);
            } catch (e2) {
                console.error('Fallback unban failed:', e2);
                this.showNotification('Failed to unban user', 'error');
            }
        }
    }

    markUserAsUnbanned(channelName, username) {
        const container = document.getElementById(`chat-${channelName}`);
        if (!container) return;

        const userMessages = container.querySelectorAll(`[data-username="${username}"]`);
        userMessages.forEach(messageElement => {
            messageElement.classList.remove('user-banned');
            messageElement.style.opacity = '';

            // Remove ban badge
            const banBadge = messageElement.querySelector('.ban-badge');
            if (banBadge) {
                banBadge.remove();
            }
        });
    }

    showPredictionMenu(channelName) {
        // Create prediction management modal
        const modalId = 'prediction-menu-modal';
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Prediction Management - #${channelName}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="prediction-menu-section">
                        <h4>Create New Prediction</h4>
                        <div class="prediction-requirements">
                            <p><strong>Requirements:</strong> Channel Points must be enabled and you need broadcaster/moderator permissions.</p>
                        </div>
                        <div class="form-group">
                            <label for="new-prediction-title">Prediction Title:</label>
                            <input type="text" id="new-prediction-title" placeholder="Will I win this game?" required>
                        </div>
                        <div class="form-group">
                            <label for="new-prediction-outcome1">Outcome 1:</label>
                            <input type="text" id="new-prediction-outcome1" placeholder="Yes" required>
                        </div>
                        <div class="form-group">
                            <label for="new-prediction-outcome2">Outcome 2:</label>
                            <input type="text" id="new-prediction-outcome2" placeholder="No" required>
                        </div>
                        <div class="form-group">
                            <label for="new-prediction-duration">Duration (seconds):</label>
                            <input type="number" id="new-prediction-duration" value="60" min="30" max="1800" required>
                        </div>
                        <button class="btn btn-primary" onclick="modDeck.createPrediction('${channelName}')">Create Prediction</button>
                    </div>

                    <div class="prediction-menu-separator"></div>

                    <div class="prediction-menu-section">
                        <h4>Current Prediction</h4>
                        <div id="current-prediction-info">
                            <p>No active prediction</p>
                        </div>
                        <div class="prediction-actions" id="prediction-actions" style="display: none;">
                            <button class="btn btn-success" onclick="modDeck.endPrediction('${channelName}', 'outcome1')">End with Outcome 1</button>
                            <button class="btn btn-success" onclick="modDeck.endPrediction('${channelName}', 'outcome2')">End with Outcome 2</button>
                            <button class="btn btn-danger" onclick="modDeck.cancelPrediction('${channelName}')">Cancel Prediction</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.openModal(modalId);

        // Check for current prediction
        this.checkCurrentPrediction(channelName);
    }

    async showPredictionDialog(channelName) {
        // Create modal for prediction creation
        const modalId = 'prediction-modal';
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create Prediction</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="prediction-title">Prediction Title:</label>
                        <input type="text" id="prediction-title" placeholder="Will I win this game?" required>
                    </div>
                    <div class="form-group">
                        <label for="prediction-outcome1">Outcome 1:</label>
                        <input type="text" id="prediction-outcome1" placeholder="Yes" required>
                    </div>
                    <div class="form-group">
                        <label for="prediction-outcome2">Outcome 2:</label>
                        <input type="text" id="prediction-outcome2" placeholder="No" required>
                    </div>
                    <div class="form-group">
                        <label for="prediction-duration">Duration (seconds):</label>
                        <input type="number" id="prediction-duration" value="60" min="30" max="1800" required>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="window.modDeckApp.createPrediction('${channelName}')">Create Prediction</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.openModal(modalId);
    }

    async createPrediction(channelName) {
        try {
            const title = document.getElementById('new-prediction-title').value.trim();
            const outcome1 = document.getElementById('new-prediction-outcome1').value.trim();
            const outcome2 = document.getElementById('new-prediction-outcome2').value.trim();
            const duration = parseInt(document.getElementById('new-prediction-duration').value);

            if (!title || !outcome1 || !outcome2 || !duration) {
                this.showNotification('Please fill in all fields', 'error');
                return;
            }

            // Use the existing Helix infrastructure
            const result = await this.tryHelix('create-prediction', {
                channelLogin: channelName,
                title: title,
                outcomes: [outcome1, outcome2],
                duration: duration
            }, `Created prediction: ${title}`);

            if (result.success) {
                this.showNotification('Prediction created successfully', 'success');
                // Clear form
                document.getElementById('new-prediction-title').value = '';
                document.getElementById('new-prediction-outcome1').value = '';
                document.getElementById('new-prediction-outcome2').value = '';
                document.getElementById('new-prediction-duration').value = '60';
                // Refresh current prediction info
                this.checkCurrentPrediction(channelName);
            } else {
                // Check for specific error messages
                let errorMessage = 'Failed to create prediction.';
                if (result && result.error) {
                    if (result.error.includes('channel points not enabled')) {
                        errorMessage = 'Channel Points must be enabled to create predictions. Go to Creator Dashboard > Settings > Community > Channel Points and enable them.';
                    } else if (result.error.includes('403')) {
                        errorMessage = 'Permission denied. Make sure you have broadcaster or moderator permissions and proper Helix token.';
                    } else {
                        errorMessage = `Failed to create prediction: ${result.error}`;
                    }
                }
                this.showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Create prediction failed:', error);
            this.showNotification('Failed to create prediction: ' + error.message, 'error');
        }
    }

    async endPrediction(channelName, winningOutcome) {
        try {
            // Use the existing Helix infrastructure
            const result = await this.tryHelix('end-prediction', {
                channelLogin: channelName,
                winningOutcome: winningOutcome
            }, `Ended prediction with ${winningOutcome}`);

            if (result.success) {
                this.showNotification('Prediction ended successfully', 'success');
                // Refresh current prediction info
                this.checkCurrentPrediction(channelName);
            } else {
                this.showNotification('Failed to end prediction. Check Helix configuration.', 'error');
            }
        } catch (error) {
            console.error('End prediction failed:', error);
            this.showNotification('Failed to end prediction: ' + error.message, 'error');
        }
    }

    async cancelPrediction(channelName) {
        try {
            // Use the existing Helix infrastructure
            const result = await this.tryHelix('cancel-prediction', {
                channelLogin: channelName
            }, `Cancelled prediction`);

            if (result.success) {
                this.showNotification('Prediction cancelled successfully', 'success');
                // Refresh current prediction info
                this.checkCurrentPrediction(channelName);
            } else {
                this.showNotification('Failed to cancel prediction. Check Helix configuration.', 'error');
            }
        } catch (error) {
            console.error('Cancel prediction failed:', error);
            this.showNotification('Failed to cancel prediction: ' + error.message, 'error');
        }
    }

    async checkCurrentPrediction(channelName) {
        try {
            // Use the existing Helix infrastructure to get current prediction
            const result = await this.tryHelix('get-prediction', {
                channelLogin: channelName
            });

            const infoElement = document.getElementById('current-prediction-info');
            const actionsElement = document.getElementById('prediction-actions');

            if (result && result.prediction) {
                // Show current prediction info
                const prediction = result.prediction;
                infoElement.innerHTML = `
                    <div class="current-prediction">
                        <p><strong>Title:</strong> ${prediction.title}</p>
                        <p><strong>Status:</strong> ${prediction.status}</p>
                        <div class="prediction-outcomes">
                            <div class="outcome">
                                <strong>Outcome 1:</strong> ${prediction.outcomes[0]?.title || 'N/A'}
                            </div>
                            <div class="outcome">
                                <strong>Outcome 2:</strong> ${prediction.outcomes[1]?.title || 'N/A'}
                            </div>
                        </div>
                    </div>
                `;

                // Show action buttons if prediction is active
                if (prediction.status === 'ACTIVE') {
                    actionsElement.style.display = 'block';
                } else {
                    actionsElement.style.display = 'none';
                }
            } else {
                infoElement.innerHTML = '<p>No active prediction</p>';
                actionsElement.style.display = 'none';
            }
        } catch (error) {
            console.error('Check current prediction failed:', error);
            const infoElement = document.getElementById('current-prediction-info');
            if (infoElement) {
                infoElement.innerHTML = '<p>Could not load prediction info</p>';
            }
        }
    }

    async tryHelix(channel, payload, successMessage) {
        try {
            const result = await ipcRenderer.invoke(channel, payload);
            if (result && result.success) {
                if (successMessage) this.showNotification(successMessage, 'success');
                // Log successful moderation action
                this.logModerationAction(channel, payload, successMessage);
                return { success: true };
            }

            // Show specific error message for failed actions
            if (result && result.error) {
                let errorMessage = result.error;
                let isPermissionError = false;

                // Handle common permission errors
                if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                    errorMessage = `Permission denied: You are not a moderator/broadcaster in #${payload.channelLogin || payload.channelName}`;
                    isPermissionError = true;
                } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                    errorMessage = 'Authentication failed: Check your Helix API credentials';
                    isPermissionError = true;
                } else if (errorMessage.includes('404')) {
                    errorMessage = 'User or channel not found';
                }

                this.showNotification(errorMessage, 'error');
                console.warn('Helix call returned failure:', channel, result);

                return { success: false, isPermissionError, error: errorMessage };
            }
            return { success: false };
        } catch (err) {
            console.warn('Helix call failed or not configured:', channel, err);
            return { success: false };
        }
    }

    logModerationAction(action, payload, message) {
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            action: action,
            channel: payload.channelLogin || payload.channelName,
            target: payload.targetLogin || payload.username,
            moderator: this.twitchUsername,
            message: message,
            details: payload
        };

        this.moderationLog.unshift(logEntry);

        // Keep only last 1000 entries
        if (this.moderationLog.length > 1000) {
            this.moderationLog = this.moderationLog.slice(0, 1000);
        }

        // Update mod log UI if visible
        if (this.showModLog) {
            this.updateModLogUI();
        }

        // Update mod log counter
        this.updateModLogCounter();
    }

    updateModLogCounter() {
        const counter = document.getElementById('modlog-count');
        if (counter) {
            const count = this.moderationLog.length;
            if (count > 0) {
                counter.textContent = count;
                counter.classList.remove('hidden');
            } else {
                counter.classList.add('hidden');
            }
        }
    }

    showTimeoutDialog(channelName, username) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Timeout ${username}</h3>
                    <button class="close-modal-btn" id="close-timeout">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-item">
                        <label>Duration</label>
                        <select id="timeout-duration">
                            <option value="30">30 seconds</option>
                            <option value="60">1 minute</option>
                            <option value="300" selected>5 minutes</option>
                            <option value="600">10 minutes</option>
                            <option value="900">15 minutes</option>
                            <option value="1800">30 minutes</option>
                            <option value="3600">1 hour</option>
                            <option value="86400">24 hours</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>Reason (optional)</label>
                        <input type="text" id="timeout-reason" placeholder="e.g., Spam, Harassment, etc.">
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="confirm-timeout" class="primary-btn">Timeout User</button>
                    <button id="cancel-timeout" class="secondary-btn">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#close-timeout').addEventListener('click', () => document.body.removeChild(modal));
        modal.querySelector('#cancel-timeout').addEventListener('click', () => document.body.removeChild(modal));
        modal.querySelector('#confirm-timeout').addEventListener('click', () => {
            const duration = parseInt(document.getElementById('timeout-duration').value);
            const reason = document.getElementById('timeout-reason').value.trim();
            this.timeoutUser(channelName, username, duration, reason || 'ModDeck timeout');
            document.body.removeChild(modal);
        });
    }

    showBanDialog(channelName, username) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Ban ${username}</h3>
                    <button class="close-modal-btn" id="close-ban">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-item">
                        <label>Reason (optional)</label>
                        <input type="text" id="ban-reason" placeholder="e.g., Harassment, Terms violation, etc.">
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="confirm-ban" class="primary-btn danger">Ban User</button>
                    <button id="cancel-ban" class="secondary-btn">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#close-ban').addEventListener('click', () => document.body.removeChild(modal));
        modal.querySelector('#cancel-ban').addEventListener('click', () => document.body.removeChild(modal));
        modal.querySelector('#confirm-ban').addEventListener('click', () => {
            const reason = document.getElementById('ban-reason').value.trim();
            this.banUser(channelName, username, reason || 'ModDeck ban');
            document.body.removeChild(modal);
        });
    }

    updateModLogUI() {
        const modlogList = document.getElementById('modlog-list');
        const noModlog = document.getElementById('no-modlog');
        const modlogCount = document.getElementById('modlog-count');

        if (!modlogList) return;

        if (this.moderationLog.length === 0) {
            modlogList.innerHTML = '<div id="no-modlog" class="no-modlog"><p>No moderation actions yet. Actions will appear here when you perform moderation.</p></div>';
            if (modlogCount) {
                modlogCount.textContent = '0';
                modlogCount.classList.add('hidden');
            }
            return;
        }

        if (modlogCount) {
            modlogCount.textContent = this.moderationLog.length.toString();
            modlogCount.classList.remove('hidden');
        }

        const modlogHtml = this.moderationLog.map(entry => {
            const timeStr = entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = entry.timestamp.toLocaleDateString();

            let actionClass = 'delete';
            let actionText = 'DELETE';

            if (entry.action === 'mod-timeout') {
                actionClass = 'timeout';
                actionText = 'TIMEOUT';
            } else if (entry.action === 'mod-ban') {
                actionClass = 'ban';
                actionText = 'BAN';
            } else if (entry.action === 'mod-unban') {
                actionClass = 'unban';
                actionText = 'UNBAN';
            }

            const duration = entry.details.seconds ? ` (${Math.floor(entry.details.seconds/60)}m)` : '';
            const reason = entry.details.reason ? ` - ${entry.details.reason}` : '';

            return `
                <div class="modlog-item">
                    <div class="modlog-header-row">
                        <span class="modlog-action ${actionClass}">${actionText}${duration}</span>
                        <span class="modlog-time">${dateStr} ${timeStr}</span>
                    </div>
                    <div class="modlog-details">
                        <span class="modlog-channel">#${entry.channel}</span>
                        <span class="modlog-target">${entry.target}</span>
                        <span class="modlog-moderator">by ${entry.moderator}</span>
                        ${reason ? `<span class="modlog-reason">${reason}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        modlogList.innerHTML = modlogHtml;
    }

    exportModLog() {
        if (this.moderationLog.length === 0) {
            this.showNotification('No moderation actions to export', 'info');
            return;
        }

        const csvData = [
            ['Timestamp', 'Action', 'Channel', 'Target', 'Moderator', 'Reason', 'Details']
        ];

        this.moderationLog.forEach(entry => {
            let actionText = 'DELETE';
            if (entry.action === 'mod-timeout') actionText = 'TIMEOUT';
            else if (entry.action === 'mod-ban') actionText = 'BAN';
            else if (entry.action === 'mod-unban') actionText = 'UNBAN';

            const duration = entry.details.seconds ? ` (${Math.floor(entry.details.seconds/60)}m)` : '';
            const reason = entry.details.reason || '';

            csvData.push([
                entry.timestamp.toISOString(),
                actionText + duration,
                entry.channel,
                entry.target,
                entry.moderator,
                reason,
                JSON.stringify(entry.details)
            ]);
        });

        const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `moddeck-modlog-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Moderation log exported successfully', 'success');
    }

        async showUserHistory(channelName, username) {
        const channelData = this.channels.get(channelName);
        if (!channelData) return;

        // Get recent messages from this user (from local storage)
        const recent = channelData.messages
            .filter(m => (m.username || '').toLowerCase() === username.toLowerCase())
            .slice(-50)
            .reverse();

        // Count moderation actions against this user from local log
        const localBanCount = this.moderationLog.filter(log =>
            log.target && log.target.toLowerCase() === username.toLowerCase() &&
            log.action === 'ban' && log.channel === channelName
        ).length;

        const timeoutCount = this.moderationLog.filter(log =>
            log.target && log.target.toLowerCase() === username.toLowerCase() &&
            log.action === 'timeout' && log.channel === channelName
        ).length;

        // Try to get user info and ban history from Twitch API
        let twitchBanHistory = [];
        let totalBanCount = localBanCount;
        let userInfo = null;

        try {
            // Get ban history
            const banResult = await ipcRenderer.invoke('get-user-ban-history', {
                channelLogin: channelName,
                targetLogin: username
            });
            if (banResult.success && banResult.data) {
                twitchBanHistory = banResult.data;
                totalBanCount = twitchBanHistory.length;
            }

            // Get user info
            const userResult = await ipcRenderer.invoke('get-user-messages', {
                channelLogin: channelName,
                targetLogin: username
            });
            if (userResult.success && userResult.data) {
                userInfo = userResult.data.userInfo;
            }
        } catch (error) {
            console.log('Could not fetch Twitch data:', error);
        }

        // Get user's role and badges from recent messages
        const recentUserInfo = recent.length > 0 ? recent[0] : null;
        const userRole = recentUserInfo ? this.getUserRole(recentUserInfo.userstate) : 'Viewer';
        const userColor = recentUserInfo ? this.getUserColor(recentUserInfo.userstate) : '#ffffff';

        const modal = document.createElement('div');
        modal.className = 'modal';

        // Create user info header with Twitch API data
        let userDisplayName = username;
        let userCreatedAt = '';
        let userType = '';

        if (userInfo) {
            userDisplayName = userInfo.display_name || username;
            if (userInfo.created_at) {
                const createdDate = new Date(userInfo.created_at);
                userCreatedAt = createdDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
            }
            userType = userInfo.type || '';
        }

        const userInfoHtml = `
            <div style="background: rgba(145, 71, 255, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #9147ff;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: ${userColor};">${userDisplayName}</h4>
                    <div style="display: flex; gap: 8px;">
                        <span style="background: #464649; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">${userRole}</span>
                        ${userType ? `<span style="background: #9147ff; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">${userType}</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 16px; font-size: 13px; opacity: 0.8; margin-bottom: 8px;">
                    <span>📝 ${recent.length} recent messages</span>
                </div>
                ${userCreatedAt ? `<div style="font-size: 12px; opacity: 0.7;">📅 Account created: ${userCreatedAt}</div>` : ''}
            </div>
        `;

        const listHtml = recent.map(m => {
            const ts = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp);
            const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = ts.toLocaleDateString([], { month: 'short', day: 'numeric' });

            // Check if message was deleted
            const isDeleted = m.deleted || false;
            const deletedStyle = isDeleted ? 'opacity: 0.5; text-decoration: line-through;' : '';

            return `<div style="padding: 8px 0; border-bottom: 1px solid rgba(47, 47, 53, 0.5); ${deletedStyle}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="opacity: 0.7; font-size: 12px;">${dateStr} ${timeStr}</span>
                    ${isDeleted ? '<span style="background: #e91e63; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase;">DELETED</span>' : ''}
                </div>
                <span>${this.escapeHtml(m.message)}</span>
            </div>`;
        }).join('') || '<div style="opacity: 0.7; text-align: center; padding: 20px;">No recent messages found</div>';

        // Create ban history section if available
        let banHistoryHtml = '';
        if (twitchBanHistory.length > 0) {
            const banHistoryList = twitchBanHistory.map(ban => {
                const banDate = new Date(ban.created_at);
                const dateStr = banDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
                const timeStr = banDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const reason = ban.reason || 'No reason provided';
                const isActive = ban.expires_at ? new Date(ban.expires_at) > new Date() : true;

                return `<div style="padding: 8px 0; border-bottom: 1px solid rgba(47, 47, 53, 0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="opacity: 0.7; font-size: 12px;">${dateStr} ${timeStr}</span>
                        <span style="background: ${isActive ? '#f44336' : '#4caf50'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase;">${isActive ? 'ACTIVE' : 'EXPIRED'}</span>
                    </div>
                    <span style="opacity: 0.9;">${this.escapeHtml(reason)}</span>
                </div>`;
            }).join('');

            banHistoryHtml = `
                <h4 style="margin: 16px 0 8px 0; color: #f44336;">Ban History (Twitch API)</h4>
                <div style="background: rgba(244, 67, 54, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #f44336; margin-bottom: 16px;">
                    ${banHistoryList}
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow: auto;">
                <div class="modal-header">
                    <h3>User History: ${username}</h3>
                    <button class="close-modal-btn" id="close-history">×</button>
                </div>
                <div class="modal-body">
                    ${userInfoHtml}
                    ${banHistoryHtml}
                                    <h4 style="margin: 16px 0 8px 0; color: #9147ff;">Recent Messages (Local)</h4>
                <div style="background: rgba(145, 71, 255, 0.05); padding: 8px; border-radius: 4px; margin-bottom: 12px; font-size: 12px; opacity: 0.8;">
                    📝 Showing messages from when ModDeck was connected. Twitch API doesn't provide historical chat data.
                </div>
                ${listHtml}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#close-history').addEventListener('click', () => document.body.removeChild(modal));
    }

    // ===== Helpers for recurrence & safety =====
    getRecurrenceTracker(channelName) {
        if (!this.recurrenceTrackers.has(channelName)) {
            this.recurrenceTrackers.set(channelName, { events: [], counts: new Map() });
        }
        return this.recurrenceTrackers.get(channelName);
    }

    normalizeMessageText(text) {
        if (!text) return '';
        // Lowercase, remove punctuation, collapse whitespace
        return text
            .toLowerCase()
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    processMessageEmotes(message, userstate, channelName) {
        let processedMessage = message;

        // Process Twitch emotes first
        if (userstate.emotes) {
            // Sort emote positions from right to left to avoid position shifts
            const allEmotePositions = [];

            Object.keys(userstate.emotes).forEach(emoteId => {
                userstate.emotes[emoteId].forEach(position => {
                    const [start, end] = position.split('-').map(Number);
                    allEmotePositions.push({
                        start,
                        end,
                        emoteId,
                        emoteName: message.substring(start, end + 1)
                    });
                });
            });

            // Sort by start position (descending) to replace from right to left
            allEmotePositions.sort((a, b) => b.start - a.start);

            // Replace emotes by position, not by name to avoid conflicts
            allEmotePositions.forEach(emote => {
                const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${emote.emoteId}/default/dark/1.0`;
                const emoteHtml = `<img src="${emoteUrl}" alt="${emote.emoteName}" class="emote-twitch" title="${emote.emoteName}" data-emote-name="${emote.emoteName}">`;

                // Replace by position to avoid recursive replacement
                processedMessage = processedMessage.substring(0, emote.start) +
                                 emoteHtml +
                                 processedMessage.substring(emote.end + 1);
            });
        }

        // Process 7TV emotes (only on text parts, not HTML)
        processedMessage = this.process7TVEmotes(processedMessage, channelName);

        return processedMessage;
    }

    process7TVEmotes(message, channelName) {
        let processedMessage = message;

        // Function to replace emotes only in text content, not in HTML attributes
        const replaceEmoteInText = (text, emoteName, emoteHtml) => {
            // Split by HTML tags to only process text content
            const parts = text.split(/(<[^>]*>)/);

            return parts.map((part, index) => {
                // If this part is an HTML tag (odd indices), don't process it
                if (index % 2 === 1 || part.startsWith('<')) {
                    return part;
                }

                // Only replace in text content, using word boundaries
                const regex = new RegExp(`\\b${this.escapeRegex(emoteName)}\\b`, 'g');
                return part.replace(regex, emoteHtml);
            }).join('');
        };

        // Check channel-specific emotes first
        const channelEmotes = this.sevenTVEmotes.get(channelName);
        if (channelEmotes && channelEmotes.size > 0) {
            channelEmotes.forEach((emote, emoteName) => {
                if (processedMessage.includes(emoteName)) {
                    // Use the correct URL format like the working chat widget
                    if (emote.urls && Array.isArray(emote.urls)) {
                        // Find the appropriate URL (priority to 2x.webp)
                        const imageUrl = emote.urls.find(url => url.includes('2x.webp')) ||
                                        emote.urls.find(url => url.includes('1x.webp')) ||
                                        emote.urls[0];

                        if (imageUrl) {
                            const fullUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl;
                            const emoteHtml = `<img src="${fullUrl}" alt="${emoteName}" class="emote-7tv" title="${emoteName}" data-emote-name="${emoteName}">`;
                            processedMessage = replaceEmoteInText(processedMessage, emoteName, emoteHtml);
                        }
                    }
                }
            });
        }

        // Then check global emotes
        if (this.globalSevenTVEmotes.size > 0) {
            this.globalSevenTVEmotes.forEach((emote, emoteName) => {
                // Only process if the emote name exists as a whole word in text content
                if (processedMessage.includes(emoteName)) {
                    // Use the correct URL format like the working chat widget
                    if (emote.urls && Array.isArray(emote.urls)) {
                        // Find the appropriate URL (priority to 2x.webp)
                        const imageUrl = emote.urls.find(url => url.includes('2x.webp')) ||
                                        emote.urls.find(url => url.includes('1x.webp')) ||
                                        emote.urls[0];

                        if (imageUrl) {
                            const fullUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl;
                            const emoteHtml = `<img src="${fullUrl}" alt="${emoteName}" class="emote-7tv" title="${emoteName}" data-emote-name="${emoteName}">`;
                            processedMessage = replaceEmoteInText(processedMessage, emoteName, emoteHtml);
                        }
                    }
                }
            });
        }

        return processedMessage;
    }

    reprocessMessagesWithEmotes(channelName) {
        console.log(`Re-processing messages with 7TV emotes for channel: ${channelName}`);

        // Get the channel data
        const channelData = this.channels.get(channelName);
        if (!channelData || !channelData.messages) {
            console.log(`No messages found for channel: ${channelName}`);
            return;
        }

        // Get the chat container for this channel
        const chatContainer = document.getElementById(`chat-${channelName}`);
        if (!chatContainer) {
            console.log(`Chat container not found for channel: ${channelName}`);
            return;
        }

        // Get all message elements in the chat container
        const messageElements = chatContainer.querySelectorAll('.chat-message');
        console.log(`Found ${messageElements.length} message elements to re-process`);

        // Re-process each message
        messageElements.forEach((messageElement, index) => {
            const messageContent = messageElement.querySelector('.message-content');
            if (messageContent) {
                // Get the original message text (remove any existing emote images)
                let originalText = messageContent.innerHTML;

                // Remove existing 7TV emote images to get the original text
                const emoteImages = messageContent.querySelectorAll('.emote-7tv');
                emoteImages.forEach(img => {
                    originalText = originalText.replace(img.outerHTML, img.alt || img.title);
                });

                // Process the message with 7TV emotes for this channel
                const processedMessage = this.process7TVEmotes(originalText, channelName);

                // Update the message content
                messageContent.innerHTML = processedMessage;

                // Debug for the specific emote we're testing
                if (originalText.includes('catsittingverycomfortablearoundacampfirewithitsfriends')) {
                    console.log(`Re-processed message ${index}:`, {
                        original: originalText,
                        processed: processedMessage,
                        channel: channelName
                    });
                }
            }
        });

        console.log(`Finished re-processing messages for channel: ${channelName}`);
    }

    copyMessageText(messageObj) {
        try {
            // Get the original message text (before emote processing)
            let originalText = messageObj.message;

                        // If the message has been processed with emotes, we need to extract the original text
            // from the message element in the DOM
            const messageElement = document.querySelector(`[data-message-id="${messageObj.id}"]`);
            if (messageElement) {
                // Look for the message-text span specifically
                const messageText = messageElement.querySelector('.message-text');
                if (messageText) {
                    // Get only the text content, not the HTML structure
                    let currentContent = messageText.textContent || messageText.innerText || '';

                    // If we have text content, use it directly
                    if (currentContent.trim()) {
                        originalText = currentContent.trim();
                    } else {
                        // Fallback: Get the current HTML content and clean it
                        let htmlContent = messageText.innerHTML;

                        // Replace all 7TV emote images with their original text
                        const emoteImages = messageText.querySelectorAll('.emote-7tv');
                        emoteImages.forEach(img => {
                            const emoteName = img.alt || img.title || img.getAttribute('data-emote-name');
                            if (emoteName) {
                                htmlContent = htmlContent.replace(img.outerHTML, emoteName);
                            }
                        });

                        // Replace all Twitch emote images with their original text
                        const twitchEmoteImages = messageText.querySelectorAll('.emote-twitch');
                        twitchEmoteImages.forEach(img => {
                            const emoteName = img.alt || img.title || img.getAttribute('data-emote-name');
                            if (emoteName) {
                                htmlContent = htmlContent.replace(img.outerHTML, emoteName);
                            }
                        });

                        // Use the extracted text if we found emotes
                        if (emoteImages.length > 0 || twitchEmoteImages.length > 0) {
                            originalText = htmlContent;
                        }
                    }
                }
            }

            // Copy to clipboard
            navigator.clipboard.writeText(originalText).then(() => {
                this.showNotification('Message copied to clipboard', 'success');
                console.log('Copied message text:', originalText);
            }).catch(err => {
                console.error('Failed to copy message:', err);
                this.showNotification('Failed to copy message', 'error');
            });

        } catch (error) {
            console.error('Error copying message text:', error);
            this.showNotification('Failed to copy message', 'error');
        }
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    applyChannelFilters(channelName) {
        const panel = document.querySelector(`[data-channel="${channelName}"].tab-panel`);
        if (!panel) return;

        const userFilter = panel.querySelector('[data-filter="user"]').value.toLowerCase();
        const keywordFilter = panel.querySelector('[data-filter="keyword"]').value.toLowerCase();
        const specialFilter = panel.querySelector('[data-filter="special"]').value.toLowerCase();

        // Parse special members list
        const specialMembers = specialFilter ?
            specialFilter.split(',').map(name => name.trim().toLowerCase()).filter(name => name) : [];

        const checkedRoles = Array.from(panel.querySelectorAll('.role-checkboxes input:checked'))
            .map(cb => cb.value);

        const messages = panel.querySelectorAll('.chat-message');

        messages.forEach(message => {
            const username = message.dataset.username;
            const role = message.dataset.role;
            const messageText = message.querySelector('.message-text')?.textContent.toLowerCase() || '';

            let show = true;

            // Apply user filter
            if (userFilter && !username.includes(userFilter)) show = false;

            // Apply keyword filter
            if (keywordFilter && !messageText.includes(keywordFilter)) show = false;

            // Apply role filter, but special members bypass this
            const isSpecialMember = specialMembers.includes(username);
            if (!isSpecialMember && !checkedRoles.includes(role)) show = false;

            message.style.display = show ? 'flex' : 'none';
        });
    }

    clearChannelFilters(channelName) {
        const panel = document.querySelector(`[data-channel="${channelName}"].tab-panel`);
        if (!panel) return;

        panel.querySelectorAll('.filter-input').forEach(input => input.value = '');
        panel.querySelectorAll('.role-checkboxes input').forEach(cb => cb.checked = true);

        this.applyChannelFilters(channelName);
    }

    clearChannelMessages(channelName) {
        const container = document.getElementById(`chat-${channelName}`);
        if (!container) return;

        container.innerHTML = `
            <div class="welcome-message">
                <h3>Chat effacé pour #${channelName}</h3>
                <p>Les nouveaux messages apparaîtront ici.</p>
            </div>
        `;

        // Clear data
        const channelData = this.channels.get(channelName);
        if (channelData) {
            channelData.messages = [];
            channelData.mentions = [];
            channelData.messageCount = 0;
            channelData.mentionCount = 0;
        }

        this.updateMessageCount();
    }

    toggleChannelFilters(channelName) {
        const filtersContainer = document.getElementById(`filters-${channelName}`);
        if (filtersContainer) {
            filtersContainer.style.display = filtersContainer.style.display === 'none' ? 'flex' : 'none';
        }
    }

    updateMessageCount() {
        const totalMessages = Array.from(this.channels.values())
            .reduce((sum, channel) => sum + channel.messageCount, 0);

        document.getElementById('message-count').textContent = `${totalMessages} total messages`;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : '#5352ed'};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 13px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    setupEventListeners() {
        // Login/Logout
        document.getElementById('login-btn').addEventListener('click', () => this.loginToTwitch());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Profile button and logout modal
        document.getElementById('profile-btn').addEventListener('click', () => this.openModal('profile-modal'));
        document.getElementById('close-profile-modal').addEventListener('click', () => this.closeModal('profile-modal'));
        document.getElementById('logout-confirm-btn').addEventListener('click', () => {
            this.logout();
            this.closeModal('profile-modal');
        });
        document.getElementById('cancel-logout').addEventListener('click', () => this.closeModal('profile-modal'));

        // Main tabs (Chat/Mentions/ModLog)
        document.getElementById('chat-tab').addEventListener('click', () => this.switchMainTab('chat'));
        document.getElementById('mentions-tab').addEventListener('click', () => this.switchMainTab('mentions'));
        document.getElementById('modlog-tab').addEventListener('click', () => this.switchMainTab('modlog'));

        // Mentions functionality
        document.getElementById('clear-mentions').addEventListener('click', () => this.clearAllMentions());

        // Moderation log functionality
        document.getElementById('clear-modlog').addEventListener('click', () => {
            this.moderationLog = [];
            this.updateModLogUI();
            this.showNotification('Moderation log cleared', 'success');
        });

        document.getElementById('export-modlog').addEventListener('click', () => {
            this.exportModLog();
        });

        // Add channel
        document.getElementById('add-tab-btn').addEventListener('click', () => this.openModal('add-channel-modal'));
        document.getElementById('add-first-channel').addEventListener('click', () => this.openModal('add-channel-modal'));
        document.getElementById('add-channel-btn').addEventListener('click', () => this.addChannel());
        document.getElementById('cancel-add-channel').addEventListener('click', () => this.closeModal('add-channel-modal'));

        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal('add-channel-modal'));
        document.getElementById('close-settings').addEventListener('click', () => this.closeModal('settings-modal'));

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => this.openModal('settings-modal'));
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());

        // Theme and language change
        document.getElementById('theme-select').addEventListener('change', (e) => this.changeTheme(e.target.value));
        document.getElementById('language-select').addEventListener('change', (e) => this.changeLanguage(e.target.value));

        // Shortcuts
        document.getElementById('create-desktop-shortcut').addEventListener('change', (e) => {
            if (e.target.checked) this.createDesktopShortcut();
        });
        document.getElementById('add-to-start-menu').addEventListener('change', (e) => {
            if (e.target.checked) this.addToStartMenu();
        });

        // Enter key for add channel
        document.getElementById('new-channel-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addChannel();
            }
        });

        // Window controls
        document.getElementById('minimize-btn').addEventListener('click', () => {
            ipcRenderer.send('window-minimize');
        });

        document.getElementById('close-btn').addEventListener('click', () => {
            ipcRenderer.send('window-close');
        });

        document.getElementById('pin-btn').addEventListener('click', () => {
            ipcRenderer.send('window-toggle-pin');
        });

        document.getElementById('console-btn').addEventListener('click', () => {
            ipcRenderer.send('toggle-dev-tools');
        });

        // Update system
        document.getElementById('update-btn').addEventListener('click', () => this.handleUpdate());
        document.getElementById('dismiss-update').addEventListener('click', () => this.dismissUpdateBanner());
    }

    setupIpcListeners() {
        ipcRenderer.on('update-available', () => {
            document.getElementById('update-banner').classList.remove('hidden');
        });

        ipcRenderer.on('pin-changed', (event, isPinned) => {
            document.getElementById('pin-btn').classList.toggle('active', isPinned);
        });

        ipcRenderer.on('dev-tools-toggled', (event, isOpen) => {
            document.getElementById('console-btn').classList.toggle('active', isOpen);
        });
    }

    async saveSettings() {
        this.settings.autoScroll = document.getElementById('auto-scroll').checked;
        this.settings.showTimestamps = document.getElementById('show-timestamps').checked;
        this.settings.highlightMentions = document.getElementById('highlight-mentions').checked;
        this.settings.mentionKeywords = document.getElementById('mention-keywords').value;
        this.settings.theme = document.getElementById('theme-select').value;
        this.settings.language = document.getElementById('language-select').value;

        // Helix fields (if present)
        const clientIdInput = document.getElementById('helix-client-id');
        const accessTokenInput = document.getElementById('helix-access-token');
        this.settings.helix = {
            clientId: clientIdInput ? clientIdInput.value.trim() : (this.settings.helix?.clientId || ''),
            accessToken: accessTokenInput ? accessTokenInput.value.trim() : (this.settings.helix?.accessToken || '')
        };

        // Debug: Log what we're saving
        console.log('Saving Helix settings:', {
            clientId: this.settings.helix.clientId ? 'SET' : 'NOT SET',
            accessToken: this.settings.helix.accessToken ? 'SET' : 'NOT SET'
        });

        // Save opened tabs
        this.settings.openTabs = Array.from(this.channels.keys());
        this.settings.activeTab = this.activeChannel;

        try {
            // Optional: validate token to help user
            try {
                const validation = await ipcRenderer.invoke('validate-helix');
                if (!validation.ok) {
                    console.warn('Helix token validation failed:', validation.error);
                } else {
                    console.log('Helix token validation:', validation.data);
                }
            } catch (e) { /* ignore */ }

            await ipcRenderer.invoke('save-settings', this.settings);
            this.updateMentionKeywords();
            this.updateCurrentKeywordsDisplay();
            this.updateLanguage(); // Update language when settings change
            this.closeModal('settings-modal');
            this.showNotification('Settings saved!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    // Save tabs in real-time whenever they change
    async saveTabState() {
        if (!this.tabStateSaveTimeout) {
            this.tabStateSaveTimeout = setTimeout(async () => {
                try {
                    const currentSettings = await ipcRenderer.invoke('get-settings');
                    currentSettings.openTabs = Array.from(this.channels.keys());
                    currentSettings.activeTab = this.activeChannel;
                    await ipcRenderer.invoke('save-settings', currentSettings);
                } catch (error) {
                    console.error('Error saving tab state:', error);
                }
                this.tabStateSaveTimeout = null;
            }, 2000); // Save every 2 seconds at most
        }
    }

    // Load previously opened tabs
    async loadSavedTabs() {
        try {
            // Determine which channels to load - prefer saved chat data over settings
            let channelsToLoad = [];

            if (this.savedChatData && this.savedChatData.channels && Object.keys(this.savedChatData.channels).length > 0) {
                // Use channels from saved chat data
                channelsToLoad = Object.keys(this.savedChatData.channels);
                console.log('Loading channels from saved chat data:', channelsToLoad);
            } else if (this.settings.openTabs && this.settings.openTabs.length > 0) {
                // Fallback to settings if no chat data
                channelsToLoad = this.settings.openTabs;
                console.log('Loading channels from settings:', channelsToLoad);
            }

            if (channelsToLoad.length > 0) {
                for (const channelName of channelsToLoad) {
                    await this.connectToChannel(channelName, true);
                }

                // Switch to the previously active tab
                const activeTab = this.settings.activeTab || channelsToLoad[0];
                if (activeTab && this.channels.has(activeTab)) {
                    this.switchToChannel(activeTab);
                }
            }
        } catch (error) {
            console.error('Error loading saved tabs:', error);
        }
    }

    updateCurrentKeywordsDisplay() {
        const keywordsDisplay = document.getElementById('current-keywords');
        if (keywordsDisplay && this.mentionKeywords) {
            keywordsDisplay.textContent = this.mentionKeywords.join(', ');
        } else if (!keywordsDisplay) {
            console.warn('Keywords display element not found in DOM');
        }
    }

    changeTheme(theme) {
        document.body.className = `theme-${theme}`;
        this.settings.theme = theme;
    }

    async changeLanguage(language) {
        this.settings.language = language;
        // This would typically reload the app with new language
        this.showNotification('Language changed. Restart app to apply changes.', 'info');
    }

    async createDesktopShortcut() {
        try {
            await ipcRenderer.invoke('create-desktop-shortcut');
            this.showNotification('Desktop shortcut created!', 'success');
        } catch (error) {
            console.error('Error creating desktop shortcut:', error);
            this.showNotification('Failed to create desktop shortcut', 'error');
        }
    }

    async addToStartMenu() {
        try {
            await ipcRenderer.invoke('add-to-start-menu');
            this.showNotification('Added to Start Menu!', 'success');
        } catch (error) {
            console.error('Error adding to start menu:', error);
            this.showNotification('Failed to add to Start Menu', 'error');
        }
    }

    updateUI() {
        // Load settings into UI
        document.getElementById('auto-scroll').checked = this.settings.autoScroll ?? true;
        document.getElementById('show-timestamps').checked = this.settings.showTimestamps ?? true;
        document.getElementById('highlight-mentions').checked = this.settings.highlightMentions ?? true;
        document.getElementById('mention-keywords').value = this.settings.mentionKeywords || 'fugu_fps,moddeck';
        document.getElementById('theme-select').value = this.settings.theme || 'dark';
        document.getElementById('language-select').value = this.settings.language || 'fr';

        // Helix fields in settings modal (if present)
        const clientIdInput = document.getElementById('helix-client-id');
        const accessTokenInput = document.getElementById('helix-access-token');
        if (clientIdInput) clientIdInput.value = this.settings.helix?.clientId || '';
        if (accessTokenInput) accessTokenInput.value = this.settings.helix?.accessToken || '';

        // Debug: Log what we loaded
        console.log('Loaded Helix settings:', {
            clientId: this.settings.helix?.clientId ? 'SET' : 'NOT SET',
            accessToken: this.settings.helix?.accessToken ? 'SET' : 'NOT SET'
        });

        // Apply theme
        if (this.settings.theme) {
            this.changeTheme(this.settings.theme);
        }

        // Initialize mentions system now that DOM is loaded
        this.initMentions();
        this.updateCurrentKeywordsDisplay();
    }

    // Save chat data to persistent storage
    async saveChatData() {
        if (!this.chatDataSaveTimeout) {
            this.chatDataSaveTimeout = setTimeout(async () => {
                try {
                    const chatData = {
                        messages: [],
                        mentions: this.allMentions,
                        channels: {}
                    };

                    // Collect all messages from all channels
                    this.channels.forEach((channelData, channelName) => {
                        chatData.messages.push(...channelData.messages);
                        chatData.channels[channelName] = {
                            messageCount: channelData.messageCount,
                            mentionCount: channelData.mentionCount
                        };
                    });

                    await ipcRenderer.invoke('save-chat-data', chatData);
                    console.log('Chat data saved successfully');
                } catch (error) {
                    console.error('Error saving chat data:', error);
                }
                this.chatDataSaveTimeout = null;
            }, 5000); // Save every 5 seconds at most
        }
    }

    // Load chat data from persistent storage
    async loadChatData() {
        try {
            const chatData = await ipcRenderer.invoke('get-chat-data');

            if (chatData) {
                // Load mentions
                if (chatData.mentions) {
                    this.allMentions = chatData.mentions || [];
                    this.updateMentionsCounter();
                    this.renderMentionsList();
                }

                // Store saved chat data for later use when tabs are created
                this.savedChatData = chatData;

                if (chatData.channels && Object.keys(chatData.channels).length > 0) {
                    console.log('Loaded saved chat data for channels:', Object.keys(chatData.channels));
                } else {
                    console.log('No saved chat data found');
                }
            }
        } catch (error) {
            console.error('Error loading chat data:', error);
        }
    }

    // Update system methods
    async checkForUpdates() {
        try {
            console.log('Checking for updates...');
            const updateInfo = await ipcRenderer.invoke('check-changelog-updates');

            if (updateInfo.hasUpdate) {
                this.showUpdateBanner(updateInfo);
                this.showNotification(`Update available: v${updateInfo.latestVersion}`, 'info');
                console.log('Update available:', updateInfo);
            } else {
                console.log('No updates available');
            }

            return updateInfo;
        } catch (error) {
            console.error('Failed to check for updates:', error);
            this.showNotification('Failed to check for updates', 'error');
            return null;
        }
    }

    showUpdateBanner(updateInfo) {
        const banner = document.getElementById('update-banner');
        const updateText = document.getElementById('update-text');

        if (banner && updateText) {
            updateText.textContent = `Update available: v${updateInfo.latestVersion}`;
            banner.classList.remove('hidden');
        }
    }

    dismissUpdateBanner() {
        const banner = document.getElementById('update-banner');
        if (banner) {
            banner.classList.add('hidden');
        }
    }

    async handleUpdate() {
        try {
            const updateInfo = await ipcRenderer.invoke('check-changelog-updates');

            if (!updateInfo.hasUpdate) {
                this.showNotification('No updates available', 'info');
                return;
            }

            // Show loading state
            const updateBtn = document.getElementById('update-btn');
            const originalText = updateBtn.textContent;
            updateBtn.textContent = 'Updating...';
            updateBtn.disabled = true;

            // Download and show changelog
            const changelogContent = await ipcRenderer.invoke('download-changelog', updateInfo.changelogUrl);

            // Ask user for confirmation
            const confirmed = await this.showUpdateConfirmation(updateInfo, changelogContent);

            if (confirmed) {
                this.showNotification('Applying update...', 'info');

                // Apply the update
                const result = await ipcRenderer.invoke('apply-changelog-update', updateInfo);

                if (result.success) {
                    this.showNotification(`Update applied successfully! ${result.filesProcessed} files updated.`, 'success');
                    this.dismissUpdateBanner();

                    // Show restart notification
                    setTimeout(() => {
                        this.showRestartNotification();
                    }, 2000);
                } else {
                    this.showNotification(`Update failed: ${result.errors.join(', ')}`, 'error');
                }
            }

            // Reset button
            updateBtn.textContent = originalText;
            updateBtn.disabled = false;

        } catch (error) {
            console.error('Update failed:', error);
            this.showNotification(`Update failed: ${error.message}`, 'error');

            // Reset button
            const updateBtn = document.getElementById('update-btn');
            updateBtn.textContent = 'Update';
            updateBtn.disabled = false;
        }
    }

    async showUpdateConfirmation(updateInfo, changelogContent) {
        return new Promise((resolve) => {
            // Create confirmation modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                    <h3>Update Available: v${updateInfo.latestVersion}</h3>
                    <div style="margin: 20px 0;">
                        <h4>Changelog:</h4>
                        <div style="background: #1f1f23; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto;">
${changelogContent}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancel-update" class="btn btn-secondary">Cancel</button>
                        <button id="confirm-update" class="btn btn-primary">Apply Update</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('confirm-update').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });

            document.getElementById('cancel-update').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
        });
    }

    showRestartNotification() {
        const notification = document.createElement('div');
        notification.className = 'restart-notification';
        notification.innerHTML = `
            <div style="background: #9147ff; color: white; padding: 15px; border-radius: 8px; position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0;">Update Complete!</h4>
                <p style="margin: 0 0 15px 0;">Please restart ModDeck to apply all changes.</p>
                <button id="restart-now" style="background: white; color: #9147ff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Restart Now
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        document.getElementById('restart-now').addEventListener('click', () => {
            ipcRenderer.send('window-close');
        });

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 10000);
    }
}

// Initialize the app
const modDeck = new ModDeckApp();

// Make it globally accessible for onclick handlers
window.modDeck = modDeck;