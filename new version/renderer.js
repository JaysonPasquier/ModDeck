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
        this.mentionKeywords = [];

        // Global mentions system
        this.allMentions = [];

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
                'Login to send messages': 'Login to send messages'
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
                'Login to send messages': 'Connectez-vous pour envoyer des messages'
            }
        };

        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadSevenTVEmotes();
        await this.loadChatData();
        this.setupEventListeners();
        this.setupIpcListeners();
        this.updateUI();
        this.updateLanguage(); // Add language update
        this.checkForSavedLogin();

        // Update keywords after settings are loaded
        this.updateMentionKeywords();
        console.log('Mention keywords loaded:', this.mentionKeywords);

        // Load saved tabs after potential login (no delay needed since loadChatData no longer creates tabs)
        await this.loadSavedTabs();
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

            // Load global 7TV emotes
            const globalResponse = await fetch('https://7tv.io/v3/emote-sets/global');
            if (globalResponse.ok) {
                const globalData = await globalResponse.json();
                globalData.emotes.forEach(emote => {
                    this.globalSevenTVEmotes.set(emote.name, {
                        id: emote.id,
                        name: emote.name,
                        urls: emote.data.host.url
                    });
                });
                console.log(`Loaded ${this.globalSevenTVEmotes.size} global 7TV emotes`);
            }
        } catch (error) {
            console.error('Error loading 7TV emotes:', error);
        }
    }

    async loadChannelSevenTVEmotes(channelName) {
        try {
            const response = await fetch(`https://7tv.io/v3/users/twitch/${channelName}`);
            if (response.ok) {
                const userData = await response.json();
                if (userData.emote_set && userData.emote_set.emotes) {
                    const channelEmotes = new Map();
                    userData.emote_set.emotes.forEach(emote => {
                        channelEmotes.set(emote.name, {
                            id: emote.id,
                            name: emote.name,
                            urls: emote.data.host.url
                        });
                    });
                    this.sevenTVEmotes.set(channelName, channelEmotes);
                    console.log(`Loaded ${channelEmotes.size} 7TV emotes for ${channelName}`);
                }
            }
        } catch (error) {
            console.error(`Error loading 7TV emotes for ${channelName}:`, error);
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

        const timeStr = messageObj.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

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

    // Switch between main tabs (Chat/Mentions)
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

            const client = new tmi.Client(clientOptions);

            // Set up event listeners
            client.on('connected', () => {
                console.log(`Connected to ${channelName}`);
                this.channels.get(channelName).isConnected = true;
                this.updateChannelStatus(channelName, 'connected');
                this.showNotification(`Connected to #${channelName}`, 'success');
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
            }
        });

        // Chat container scroll event
        const chatContainer = document.getElementById(`chat-${channelName}`);
        chatContainer.addEventListener('scroll', () => {
            const isScrolledToBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 1;
            this.updateScrollButton(channelName, !isScrolledToBottom);
        });
    }

    async sendMessage(channelName) {
        if (!this.isLoggedIn) {
            this.showNotification('Please login to send messages', 'error');
            return;
        }

        const input = document.getElementById(`input-${channelName}`);
        const message = input.value.trim();

        if (!message) return;

        const client = this.clients.get(channelName);
        if (!client) {
            this.showNotification('Not connected to channel', 'error');
            return;
        }

        try {
            await client.say(`#${channelName}`, message);
            input.value = '';

            // Auto-resize textarea
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

        // Check for duplicate messages
        const existingMessage = channelData.messages.find(msg => msg.id === messageId);
        if (existingMessage) {
            console.log('Duplicate message detected, skipping:', messageId);
            return;
        }

        // Create message object
        const messageObj = {
            id: messageId,
            username: userstate['display-name'] || userstate.username,
            message: message,
            timestamp: new Date(),
            userstate: userstate,
            channel: channelName,
            badges: this.parseBadges(userstate.badges, channelName),
            color: this.getUserColor(userstate),
            isMention: this.checkIfMention(message),
            role: this.getUserRole(userstate),
            isSelf: self
        };

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

            // Only add badge if it uses a local image (not external URL)
            if (badgeImageUrl.startsWith('images/badges/')) {
                const badgeInfo = {
                    type: badgeType,
                    version: version,
                    title: this.getBadgeTitle(badgeType, version),
                    imageUrl: badgeImageUrl
                };
                badgeList.push(badgeInfo);
            }
        }

        return badgeList;
    }

    getBadgeTitle(badgeType, version) {
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
            'speedons-5': 'Speedons 5',
            'elden-ring-wylder': 'Elden Ring Wylder',
            'elden-ring-recluse': 'Elden Ring Recluse',
            'glhf': 'GLHF',
            'glitchcon': 'GlitchCon'
        };
        return titles[badgeType] || badgeType;
    }

    getBadgeImageUrl(badgeType, version, channelName) {
        // Use local badge images from the images directory (like the HTML example)
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
            'speedons-5': 'images/badges/speedons-5.png',
            'elden-ring-wylder': 'images/badges/elden-ring-wylder.png',
            'elden-ring-recluse': 'images/badges/elden-ring-recluse.png',
            'glhf': 'images/badges/GLHF.png',
            'glitchcon': 'images/badges/Glitchcon.png'
        };

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

        // Enable text selection
        messageEl.style.userSelect = 'text';
        messageEl.style.webkitUserSelect = 'text';

        // Create badges HTML
        const badgesHtml = messageObj.badges.map(badge =>
            `<img src="${badge.imageUrl}" alt="${badge.title}" title="${badge.title}" class="badge-image">`
        ).join('');

        // Process message with emotes
        const processedMessage = this.processMessageEmotes(messageObj.message, messageObj.userstate, messageObj.channel);

        // Create timestamp
        const timestamp = this.settings.showTimestamps ?
            `<span class="timestamp">${messageObj.timestamp.toLocaleTimeString()}</span>` : '';

        const userColor = typeof messageObj.color === 'string' && messageObj.color.startsWith('#')
            ? messageObj.color
            : '';

        messageEl.innerHTML = `
            ${timestamp}
            <div class="message-content">
                <div class="user-info">
                    <div class="badges">${badgesHtml}</div>
                    <span class="username" style="${userColor ? `color: ${userColor}` : ''}">${messageObj.username}</span>
                </div>
                <span class="message-text">${processedMessage}</span>
            </div>
        `;

        return messageEl;
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
                const emoteHtml = `<img src="${emoteUrl}" alt="${emote.emoteName}" class="emote-twitch" title="${emote.emoteName}">`;

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
        if (channelEmotes) {
            channelEmotes.forEach((emote, emoteName) => {
                const emoteUrl = `https:${emote.urls}/1x.webp`;
                const emoteHtml = `<img src="${emoteUrl}" alt="${emoteName}" class="emote-7tv" title="${emoteName}">`;
                processedMessage = replaceEmoteInText(processedMessage, emoteName, emoteHtml);
            });
        }

        // Then check global emotes
        this.globalSevenTVEmotes.forEach((emote, emoteName) => {
            // Only process if the emote name exists as a whole word in text content
            if (processedMessage.includes(emoteName)) {
                const emoteUrl = `https:${emote.urls}/1x.webp`;
                const emoteHtml = `<img src="${emoteUrl}" alt="${emoteName}" class="emote-7tv" title="${emoteName}">`;
                processedMessage = replaceEmoteInText(processedMessage, emoteName, emoteHtml);
            }
        });

        return processedMessage;
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

        // Main tabs (Chat/Mentions)
        document.getElementById('chat-tab').addEventListener('click', () => this.switchMainTab('chat'));
        document.getElementById('mentions-tab').addEventListener('click', () => this.switchMainTab('mentions'));

        // Mentions functionality
        document.getElementById('clear-mentions').addEventListener('click', () => this.clearAllMentions());

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

        // Save opened tabs
        this.settings.openTabs = Array.from(this.channels.keys());
        this.settings.activeTab = this.activeChannel;

        try {
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
}

// Initialize the app
const modDeck = new ModDeckApp();

// Make it globally accessible for onclick handlers
window.modDeck = modDeck;