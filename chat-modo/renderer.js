const { ipcRenderer } = require('electron');

class ChatModoApp {
    constructor() {
        this.container = document.getElementById('chat-container');
        this.maxMessages = 10000; // Beaucoup plus de messages (pratiquement infini)
        this.userColors = new Map();
        this.colorIndex = 0;
        this.colors = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5', 
                      'color-6', 'color-7', 'color-8', 'color-9', 'color-10'];
        
        this.sevenTVEmotes = new Map();
        this.globalSevenTVEmotes = new Map();
        this.isConnected = false;
        this.isPinned = true;
        this.isDarkTheme = true;
        
        // Système de filtrage
        this.isFilterPanelOpen = false;
        this.roleFilters = {
            moderator: true,
            broadcaster: true,
            vip: true,
            verified: true,
            subscriber: true,
            prime: true,
            turbo: true,
            ambassador: true,
            artist: true,
            staff: true
        };
        this.selectedUser = '';
        this.allUsers = new Set();
        this.allMessages = []; // Stocker tous les messages
        
        this.initializeUI();
        this.loadSevenTVEmotes();
        this.connectToTwitchChat();
        this.initStreamlabsEvents();
    }

    initializeUI() {
        // Contrôles de la barre de titre
        document.getElementById('close-btn').addEventListener('click', () => {
            ipcRenderer.invoke('close-app');
        });

        document.getElementById('minimize-btn').addEventListener('click', () => {
            ipcRenderer.invoke('minimize-app');
        });

        document.getElementById('pin-toggle').addEventListener('click', () => {
            this.togglePin();
        });

        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('filter-toggle').addEventListener('click', () => {
            this.toggleFilterPanel();
        });

        // Initialiser l'état des boutons
        this.updatePinButton();
        this.updateThemeButton();
        this.updateConnectionStatus('Connexion en cours...', false);
        this.initializeFilters();
    }

    async togglePin() {
        this.isPinned = await ipcRenderer.invoke('toggle-always-on-top');
        this.updatePinButton();
    }

    updatePinButton() {
        const pinBtn = document.getElementById('pin-toggle');
        if (this.isPinned) {
            pinBtn.classList.add('active');
            pinBtn.textContent = '📌';
            pinBtn.title = 'Désépingler la fenêtre';
        } else {
            pinBtn.classList.remove('active');
            pinBtn.textContent = '📌';
            pinBtn.title = 'Épingler la fenêtre';
        }
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        const body = document.body;
        
        if (this.isDarkTheme) {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
        } else {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
        }
        
        this.updateThemeButton();
        
        // Sauvegarder la préférence
        localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    }

    updateThemeButton() {
        const themeBtn = document.getElementById('theme-toggle');
        if (this.isDarkTheme) {
            themeBtn.textContent = '🌙';
            themeBtn.title = 'Passer au thème clair';
        } else {
            themeBtn.textContent = '☀️';
            themeBtn.title = 'Passer au thème sombre';
        }
    }

    updateConnectionStatus(text, connected) {
        const statusElement = document.getElementById('connection-status');
        const dotElement = statusElement.querySelector('.connection-dot');
        const textElement = statusElement.querySelector('.connection-text');
        
        textElement.textContent = text;
        
        if (connected) {
            dotElement.classList.add('connected');
            statusElement.classList.add('show');
            setTimeout(() => {
                statusElement.classList.remove('show');
            }, 3000);
        } else {
            dotElement.classList.remove('connected');
            statusElement.classList.add('show');
        }
        
        this.isConnected = connected;
    }

    toggleFilterPanel() {
        this.isFilterPanelOpen = !this.isFilterPanelOpen;
        const panel = document.getElementById('filter-panel');
        const btn = document.getElementById('filter-toggle');
        
        if (this.isFilterPanelOpen) {
            panel.classList.add('open');
            btn.classList.add('active');
        } else {
            panel.classList.remove('open');
            btn.classList.remove('active');
        }
    }

    initializeFilters() {
        // Événements pour les checkboxes de rôles
        Object.keys(this.roleFilters).forEach(role => {
            const checkbox = document.getElementById(`filter-${role}`);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.roleFilters[role] = checkbox.checked;
                    this.applyFilters();
                });
            }
        });

        // Événement pour le sélecteur d'utilisateur
        const userSelect = document.getElementById('user-filter');
        userSelect.addEventListener('change', () => {
            this.selectedUser = userSelect.value;
            this.applyFilters();
        });

        // Événement pour le bouton de réinitialisation
        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearAllFilters();
        });
    }

    updateUserFilter() {
        const userSelect = document.getElementById('user-filter');
        const currentValue = userSelect.value;
        
        // Vider et repeupler la liste
        userSelect.innerHTML = '<option value="">Tous les utilisateurs</option>';
        
        // Ajouter tous les utilisateurs triés par ordre alphabétique
        const sortedUsers = Array.from(this.allUsers).sort();
        sortedUsers.forEach(username => {
            const option = document.createElement('option');
            option.value = username;
            option.textContent = username;
            if (username === currentValue) {
                option.selected = true;
            }
            userSelect.appendChild(option);
        });
    }

    getUserRoles(badges) {
        const roles = [];
        if (!badges) return roles;
        
        if (badges.moderator) roles.push('moderator');
        if (badges.broadcaster) roles.push('broadcaster');
        if (badges.vip) roles.push('vip');
        if (badges.verified) roles.push('verified');
        if (badges.subscriber) roles.push('subscriber');
        if (badges.prime || badges.premium) roles.push('prime');
        if (badges.turbo) roles.push('turbo');
        if (badges.ambassador) roles.push('ambassador');
        if (badges.artist) roles.push('artist');
        if (badges.staff || badges.admin || badges.globalMod) roles.push('staff');
        
        return roles;
    }

    shouldShowMessage(messageData) {
        // Filtrage par utilisateur spécifique
        if (this.selectedUser && messageData.username !== this.selectedUser) {
            return false;
        }
        
        // Filtrage par rôles
        const userRoles = this.getUserRoles(messageData.badges);
        const hasActiveRole = userRoles.some(role => this.roleFilters[role]);
        
        return hasActiveRole;
    }

    applyFilters() {
        // Parcourir tous les messages stockés et appliquer les filtres
        this.allMessages.forEach((messageData, index) => {
            const messageElement = this.container.children[index];
            if (messageElement) {
                if (this.shouldShowMessage(messageData)) {
                    messageElement.classList.remove('filtered');
                } else {
                    messageElement.classList.add('filtered');
                }
            }
        });
        
        // Faire défiler vers le bas après filtrage
        this.scrollToBottom();
    }

    clearAllFilters() {
        // Réinitialiser tous les filtres de rôles
        Object.keys(this.roleFilters).forEach(role => {
            this.roleFilters[role] = true;
            const checkbox = document.getElementById(`filter-${role}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        // Réinitialiser le filtre utilisateur
        this.selectedUser = '';
        document.getElementById('user-filter').value = '';
        
        // Appliquer les filtres
        this.applyFilters();
    }

    connectToTwitchChat() {
        const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
        
        socket.onopen = () => {
            console.log('Connecté au chat Twitch de fugu_fps');
            socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            socket.send('PASS SCHMOOPIIE');
            socket.send('NICK justinfan12345');
            socket.send('JOIN #fugu_fps');
            
            this.updateConnectionStatus('Connecté à Twitch', true);
        };

        socket.onmessage = (event) => {
            const message = event.data;
            
            if (message.startsWith('PING')) {
                socket.send('PONG :tmi.twitch.tv');
                return;
            }

            this.parseIRCMessage(message);
        };

        socket.onerror = (error) => {
            console.error('Erreur de connexion au chat Twitch:', error);
            this.updateConnectionStatus('Erreur de connexion', false);
        };

        socket.onclose = () => {
            console.log('Connexion au chat Twitch fermée');
            this.updateConnectionStatus('Reconnexion...', false);
            
            setTimeout(() => {
                console.log('Tentative de reconnexion...');
                this.connectToTwitchChat();
            }, 5000);
        };
    }

    parseIRCMessage(rawMessage) {
        // Parser les messages IRC de Twitch
        if (!rawMessage.includes('PRIVMSG')) return;
        
        try {
            // Debug - afficher le message brut
            console.log('Message brut IRC:', rawMessage);
            
            // Méthode améliorée pour extraire le nom d'utilisateur
            // Chercher le pattern :username!username@username.tmi.twitch.tv
            let username = 'Anonyme';
            
            // Chercher le nom d'utilisateur juste avant "PRIVMSG"
            const privmsgMatch = rawMessage.match(/\s:([^!]+)![^@]+@[^\.]+\.tmi\.twitch\.tv\s+PRIVMSG/);
            if (privmsgMatch) {
                username = privmsgMatch[1];
            } else {
                // Méthode de fallback - chercher display-name dans les tags
                const displayNameMatch = rawMessage.match(/display-name=([^;]*)/);
                if (displayNameMatch && displayNameMatch[1]) {
                    username = displayNameMatch[1];
                } else {
                    // Dernière méthode de fallback
                    const fallbackMatch = rawMessage.match(/:([^!]+)!/);
                    if (fallbackMatch) {
                        username = fallbackMatch[1];
                    }
                }
            }
            
            // Extraire les emotes Twitch depuis les tags IRC
            let twitchEmotes = null;
            const emotesMatch = rawMessage.match(/emotes=([^;]*)/);
            if (emotesMatch && emotesMatch[1] && emotesMatch[1] !== '') {
                twitchEmotes = emotesMatch[1];
            }
            
            // Méthode plus simple pour extraire le message
            // Chercher tout ce qui suit "PRIVMSG #fugu_fps :"
            const privmsgIndex = rawMessage.indexOf('PRIVMSG #fugu_fps :');
            let messageText = '';
            
            if (privmsgIndex !== -1) {
                messageText = rawMessage.substring(privmsgIndex + 'PRIVMSG #fugu_fps :'.length);
                // Nettoyer les caractères de fin de ligne
                messageText = messageText.replace(/\r\n?|\n/g, '');
            }
            
            // Extraire les badges depuis les tags IRC
            const badges = this.extractBadges(rawMessage);
            
            // FILTRAGE: Afficher uniquement les messages des rôles élevés (filtrage de base)
            const hasHighRole = badges.moderator || 
                               badges.broadcaster || 
                               badges.vip || 
                               badges.verified || 
                               badges.ambassador || 
                               badges.staff ||
                               badges.admin ||
                               badges.globalMod ||
                               badges.subscriber ||
                               badges.prime ||
                               badges.premium ||
                               badges.turbo ||
                               badges.artist ||
                               badges.dj;
            
            // Si l'utilisateur n'a pas de rôle élevé, ignorer le message
            if (!hasHighRole) {
                return; // Ne pas afficher les messages des utilisateurs normaux
            }
            
            // Debug - afficher les messages parsés
            console.log('Message parsé:', { username, messageText, badges, twitchEmotes });
            
            // Ajouter le message au chat seulement s'il y a du texte
            if (messageText.trim()) {
                this.addMessage({
                    nick: username,
                    text: messageText,
                    badges: badges,
                    twitchEmotes: twitchEmotes
                });
            }
        } catch (error) {
            console.error('Erreur lors du parsing du message:', error);
        }
    }

    extractBadges(rawMessage) {
        const badges = {};
        
        // Extraire les badges depuis les tags IRC (format Twitch)
        if (rawMessage.includes('badges=')) {
            const badgeMatch = rawMessage.match(/badges=([^;]*)/);
            if (badgeMatch && badgeMatch[1]) {
                const badgeList = badgeMatch[1].split(',');
                badgeList.forEach(badge => {
                    const [type, version] = badge.split('/');
                    
                    // Rôles de modération et diffusion
                    if (type === 'moderator') {
                        badges.moderator = true;
                        badges.moderatorVersion = version;
                    }
                    if (type === 'broadcaster') {
                        badges.broadcaster = true;
                        badges.broadcasterVersion = version;
                    }
                    
                    // Rôles VIP et privilégiés
                    if (type === 'vip') {
                        badges.vip = true;
                        badges.vipVersion = version;
                    }
                    if (type === 'verified') {
                        badges.verified = true;
                        badges.verifiedVersion = version;
                    }
                    
                    // Rôles premium et abonnements spéciaux
                    if (type === 'premium') {
                        badges.premium = true;
                        badges.premiumVersion = version;
                    }
                    if (type === 'turbo') {
                        badges.turbo = true;
                        badges.turboVersion = version;
                    }
                    if (type === 'prime') {
                        badges.prime = true;
                        badges.primeVersion = version;
                    }
                    
                    // Rôles artistiques et communautaires
                    if (type === 'ambassador') {
                        badges.ambassador = true;
                        badges.ambassadorVersion = version;
                    }
                    if (type === 'artist-badge' || type === 'artist') {
                        badges.artist = true;
                        badges.artistVersion = version;
                    }
                    if (type === 'dj') {
                        badges.dj = true;
                        badges.djVersion = version;
                    }
                    
                    // Staff et employés Twitch
                    if (type === 'staff') {
                        badges.staff = true;
                        badges.staffVersion = version;
                    }
                    if (type === 'admin') {
                        badges.admin = true;
                        badges.adminVersion = version;
                    }
                    if (type === 'global_mod') {
                        badges.globalMod = true;
                        badges.globalModVersion = version;
                    }
                    
                    // Garder les autres badges existants pour l'affichage
                    if (type === 'subscriber') {
                        badges.subscriber = true;
                        badges.subscriberVersion = version;
                    }
                    if (type === 'predictions') {
                        badges.predictions = true;
                        badges.predictionsVersion = version;
                    }
                    if (type === 'bits') {
                        badges.bits = true;
                        badges.bitsVersion = version;
                    }
                    if (type === 'sub-gifter') {
                        badges.subGifter = true;
                        badges.subGifterVersion = version;
                    }
                    if (type === 'sub-gift-leader') {
                        badges.subGiftLeader = true;
                        badges.subGiftLeaderVersion = version;
                    }
                    if (type === 'bits-leader') {
                        badges.bitsLeader = true;
                        badges.bitsLeaderVersion = version;
                    }
                    if (type === 'clips-leader') {
                        badges.clipsLeader = true;
                        badges.clipsLeaderVersion = version;
                    }
                    if (type === 'no-audio' || type === 'no_audio') {
                        badges.noAudio = true;
                        badges.noAudioVersion = version;
                    }
                    if (type === 'no-video' || type === 'no_video') {
                        badges.noVideo = true;
                        badges.noVideoVersion = version;
                    }
                    if (type === 'anonymous-cheerer') {
                        badges.anonymousCheerer = true;
                        badges.anonymousCheererVersion = version;
                    }
                    // Badges spéciaux/événements
                    if (type.includes('game-award') || type.includes('twitchcon') || type.includes('recap') || type.includes('zevent') || type.includes('pixel-heart') || type.includes('arcane') || type.includes('lol') || type.includes('rplace') || type.includes('glhf') || type.includes('glitchcon') || type.includes('share-the-love') || type.includes('subtember') || type.includes('raging-wolf') || type.includes('gone-bananas') || type.includes('speedons') || type.includes('elden-ring')) {
                        badges.special = true;
                        badges.specialType = type;
                        badges.specialVersion = version;
                    }
                });
            }
        }
        
        return badges;
    }

    async loadSevenTVEmotes() {
        try {
            console.log('🚀 Début du chargement des emotes 7TV...');
            
            // Charger les emotes globales 7TV
            console.log('📡 Récupération des emotes globales...');
            const globalResponse = await fetch('https://7tv.io/v3/emote-sets/global');
            console.log('🌐 Réponse globale:', globalResponse.status, globalResponse.statusText);
            
            if (globalResponse.ok) {
                const globalData = await globalResponse.json();
                console.log('📦 Données globales reçues:', globalData);
                
                if (globalData.emotes && Array.isArray(globalData.emotes)) {
                    console.log(`📊 Nombre d'emotes globales trouvées: ${globalData.emotes.length}`);
                    
                    globalData.emotes.forEach((emote, index) => {
                        if (index < 5) {
                            console.log(`🔍 Emote globale ${index}:`, emote);
                        }
                        
                        // Nouveau format 7TV - structure différente
                        if (emote.name && emote.data && emote.data.host && emote.data.host.files) {
                            // Construire les URLs à partir des fichiers
                            const urls = emote.data.host.files.map(file => `//${emote.data.host.url}/${file.name}`);
                            
                            this.globalSevenTVEmotes.set(emote.name, {
                                id: emote.id,
                                name: emote.name,
                                urls: urls
                            });
                            
                            if (index < 5) {
                                console.log(`✅ Emote globale ${index} ajoutée:`, emote.name, urls);
                            }
                        } else {
                            if (index < 5) {
                                console.log(`❌ Emote globale ${index} incomplète:`, emote);
                            }
                        }
                    });
                } else {
                    console.log('❌ Pas d\'emotes dans la réponse globale ou format incorrect');
                }
            } else {
                console.error('❌ Échec de récupération des emotes globales:', globalResponse.status);
            }

            // Charger les emotes spécifiques au canal fugu_fps directement via l'ID du set
            console.log('📡 Récupération des emotes du canal fugu_fps via le set ID...');
            
            const setResponse = await fetch('https://7tv.io/v3/emote-sets/01GEG2EPE80006SAE3KT92JGK5');
            console.log('📺 Réponse set d\'emotes:', setResponse.status, setResponse.statusText);
            
            if (setResponse.ok) {
                const setData = await setResponse.json();
                console.log('📦 Données du set reçues:', setData);
                
                if (setData.emotes && Array.isArray(setData.emotes)) {
                    console.log(`📊 Nombre d'emotes du canal trouvées: ${setData.emotes.length}`);
                    
                    setData.emotes.forEach((emote, index) => {
                        if (index < 10) {
                            console.log(`🔍 Emote canal ${index}:`, emote);
                        }
                        
                        // Nouveau format 7TV - structure différente
                        if (emote.name && emote.data && emote.data.host && emote.data.host.files) {
                            // Construire les URLs à partir des fichiers
                            const urls = emote.data.host.files.map(file => `//${emote.data.host.url}/${file.name}`);
                            
                            this.sevenTVEmotes.set(emote.name, {
                                id: emote.id,
                                name: emote.name,
                                urls: urls
                            });
                            
                            if (index < 10) {
                                console.log(`✅ Emote canal ${index} ajoutée:`, emote.name, urls);
                            }
                        } else {
                            if (index < 10) {
                                console.log(`❌ Emote canal ${index} incomplète:`, emote);
                            }
                        }
                    });
                } else {
                    console.log('❌ Pas d\'emotes dans la réponse du set ou format incorrect');
                }
            } else {
                console.error('❌ Échec de récupération des emotes du set:', setResponse.status);
            }

            console.log(`✅ 7TV emotes chargées: ${this.sevenTVEmotes.size} emotes du canal + ${this.globalSevenTVEmotes.size} emotes globales`);
            
            // Debug - afficher toutes les emotes du canal pour vérifier
            if (this.sevenTVEmotes.size > 0) {
                console.log('📋 Toutes les emotes du canal fugu_fps:', Array.from(this.sevenTVEmotes.keys()).sort());
            }
            if (this.globalSevenTVEmotes.size > 0) {
                console.log('📋 Exemples d\'emotes globales:', Array.from(this.globalSevenTVEmotes.keys()).slice(0, 20));
            }
            
            // Vérifier spécifiquement certaines emotes
            const testEmotes = ['WHAT', 'LeaClassic', 'Kappa', 'KEKW', 'CDEC', 'EZ'];
            testEmotes.forEach(emote => {
                const inChannel = this.sevenTVEmotes.has(emote);
                const inGlobal = this.globalSevenTVEmotes.has(emote);
                console.log(`🔎 Emote "${emote}" - Canal: ${inChannel}, Global: ${inGlobal}`);
                
                // Afficher l'URL de l'emote si trouvée
                if (inChannel) {
                    const emoteData = this.sevenTVEmotes.get(emote);
                    console.log(`📸 URL emote "${emote}":`, emoteData.urls);
                } else if (inGlobal) {
                    const emoteData = this.globalSevenTVEmotes.get(emote);
                    console.log(`📸 URL emote "${emote}":`, emoteData.urls);
                }
            });
            
        } catch (error) {
            console.error('💥 Erreur lors du chargement des emotes 7TV:', error);
            console.error('📍 Stack trace:', error.stack);
        }
    }

    parseSevenTVEmotes(message) {
        if (!message) return message;

        console.log('🔍 Parsing 7TV emotes pour:', message);
        
        // Diviser le message en mots et traiter chaque mot individuellement
        const words = message.split(/(\s+)/); // Garde les espaces dans le tableau
        console.log('📝 Mots détectés:', words);
        
        for (let i = 0; i < words.length; i++) {
            let word = words[i].trim();
            if (!word) continue; // Ignorer les espaces vides
            
            console.log(`🔎 Vérification du mot: "${word}"`);
            
            let emoteFound = false;
            let emoteData = null;
            
            // Chercher dans les emotes du canal d'abord (priorité)
            if (this.sevenTVEmotes.has(word)) {
                emoteData = this.sevenTVEmotes.get(word);
                emoteFound = true;
                console.log(`✅ Emote trouvée dans le canal: ${word}`, emoteData);
            }
            // Chercher dans les emotes globales si pas trouvé dans le canal
            else if (this.globalSevenTVEmotes.has(word)) {
                emoteData = this.globalSevenTVEmotes.get(word);
                emoteFound = true;
                console.log(`✅ Emote trouvée globalement: ${word}`, emoteData);
            }
            
            if (emoteFound && emoteData && emoteData.urls && Array.isArray(emoteData.urls)) {
                // Chercher l'URL appropriée (priorité aux tailles plus grandes)
                const imageUrl = emoteData.urls.find(url => url.includes('2x.webp')) || 
                                emoteData.urls.find(url => url.includes('1x.webp')) ||
                                emoteData.urls[0];
                
                if (imageUrl) {
                    const fullUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl;
                    const emoteImg = `<img class="emote-7tv" src="${fullUrl}" alt="${word}" title="${word}">`;
                    words[i] = words[i].replace(word, emoteImg);
                    console.log(`🎨 Emote remplacée: "${word}" → ${fullUrl}`);
                } else {
                    console.log(`❌ Pas d'URL d'image valide pour l'emote ${word}`);
                }
            } else {
                if (word.length > 2) { // Éviter le spam pour les petits mots
                    console.log(`⚪ Mot normal: "${word}"`);
                }
            }
            
            // Debug spécial pour LeaClassic
            if (word === 'LeaClassic') {
                console.log('🚨 LeaClassic détecté ! Debug complet:');
                console.log('Dans canal:', this.sevenTVEmotes.has('LeaClassic'));
                console.log('Dans global:', this.globalSevenTVEmotes.has('LeaClassic'));
                
                if (this.sevenTVEmotes.has('LeaClassic')) {
                    const emote = this.sevenTVEmotes.get('LeaClassic');
                    console.log('Données de l\'emote LeaClassic:', emote);
                }
                
                // Chercher des emotes similaires
                const similarEmotes = [];
                this.sevenTVEmotes.forEach((emote, name) => {
                    if (name.toLowerCase().includes('lea') || name.toLowerCase().includes('classic')) {
                        similarEmotes.push(name);
                    }
                });
                console.log('Emotes similaires trouvées:', similarEmotes);
            }
        }
        
        const parsedMessage = words.join('');

        if (parsedMessage !== message) {
            console.log('🏁 Message après parsing emotes:', parsedMessage);
        }

        return parsedMessage;
    }

    parseTwitchEmotes(message, emoteData) {
        if (!message || !emoteData) return message;

        console.log('🟣 Parsing emotes Twitch pour:', message);
        console.log('🟣 Données emotes Twitch:', emoteData);

        let result = message;
        
        // Parser les emotes Twitch depuis les tags IRC
        // Format: emote_id:start_pos-end_pos,start_pos-end_pos/emote_id:start_pos-end_pos
        const emoteEntries = emoteData.split('/');
        
        // Collecter toutes les positions d'emotes pour les traiter en ordre inverse
        const emoteReplacements = [];
        
        emoteEntries.forEach(entry => {
            const [emoteId, positions] = entry.split(':');
            if (!emoteId || !positions) return;
            
            const positionPairs = positions.split(',');
            positionPairs.forEach(pair => {
                const [start, end] = pair.split('-').map(Number);
                if (isNaN(start) || isNaN(end)) return;
                
                const emoteName = message.substring(start, end + 1);
                emoteReplacements.push({
                    start,
                    end: end + 1,
                    emoteId,
                    emoteName
                });
            });
        });
        
        // Trier par position de fin en ordre décroissant pour remplacer de droite à gauche
        emoteReplacements.sort((a, b) => b.start - a.start);
        
        // Remplacer les emotes
        emoteReplacements.forEach(replacement => {
            const { start, end, emoteId, emoteName } = replacement;
            const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/2.0`;
            const emoteImg = `<img class="emote-twitch" src="${emoteUrl}" alt="${emoteName}" title="${emoteName}">`;
            
            result = result.substring(0, start) + emoteImg + result.substring(end);
            console.log(`🟣 Emote Twitch remplacée: "${emoteName}" → ${emoteUrl}`);
        });

        return result;
    }

    initStreamlabsEvents() {
        // Écouter les événements de chat de Streamlabs OBS (en backup)
        window.addEventListener('onEventReceived', (obj) => {
            if (obj.detail.event && obj.detail.event.type === 'message') {
                this.addMessage(obj.detail.event.data);
            }
        });

        // Pour les tests avec StreamElements (alternative)
        window.addEventListener('onWidgetLoad', (obj) => {
            console.log('Widget chargé pour fugu_fps');
        });

        console.log('Widget de chat initialisé pour fugu_fps');
    }

    cleanMessage(text) {
        // Nettoyer le message des caractères spéciaux et balises (mais garder les emotes)
        return text.trim();
    }

    getUserColor(username) {
        if (!this.userColors.has(username)) {
            this.userColors.set(username, this.colors[this.colorIndex % this.colors.length]);
            this.colorIndex++;
        }
        return this.userColors.get(username);
    }

    getUserBadgeClass(badges) {
        if (!badges) return '';
        
        if (badges.moderator) return 'moderator';
        if (badges.vip) return 'vip';
        if (badges.subscriber) return 'subscriber';
        if (badges.predictions) return 'predictions';
        if (badges.premium || badges.prime) return 'premium';
        
        return '';
    }

    addMessage(data) {
        const username = data.nick || data.username || 'Utilisateur';
        let message = this.cleanMessage(data.text || data.message || '');
        
        // Ajouter l'utilisateur à la liste
        this.allUsers.add(username);
        this.updateUserFilter();
        
        // Parser les emotes Twitch en premier (priorité aux emotes natives)
        if (data.twitchEmotes) {
            message = this.parseTwitchEmotes(message, data.twitchEmotes);
        }
        
        // Ensuite parser les emotes 7TV sur le texte restant
        message = this.parseSevenTVEmotes(message);
        
        // Stocker les données du message pour le filtrage
        const messageData = {
            username: username,
            message: message,
            badges: data.badges,
            timestamp: Date.now()
        };
        
        this.allMessages.push(messageData);
        
        // Créer l'élément de message
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        // Déterminer la couleur et les badges
        const userColor = this.getUserColor(username);
        const badgeClass = this.getUserBadgeClass(data.badges);
        
        // Créer l'affichage des badges avec les vraies images Twitch
        let badgeDisplay = '';
        if (data.badges) {
            if (data.badges.broadcaster) {
                badgeDisplay += `<img class="badge-image" src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1" alt="Broadcaster" title="Broadcaster">`;
            }
            if (data.badges.moderator) {
                badgeDisplay += `<img class="badge-image" src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1" alt="Moderator" title="Moderator">`;
            }
            if (data.badges.vip) {
                badgeDisplay += `<img class="badge-image" src="https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1" alt="VIP" title="VIP">`;
            }
            if (data.badges.subscriber) {
                // Badge d'abonné personnalisé de fugu_fps depuis les fichiers locaux
                const subVersion = data.badges.subscriberVersion || '0';
                let subBadgeFile = '';
                
                // Mapper les versions aux noms de fichiers
                switch(subVersion) {
                    case '0':
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/1-mois.png';
                        break;
                    case '1':
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/1-mois.png';
                        break;
                    case '2':
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/2-mois.png';
                        break;
                    case '3':
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/3-mois.png';
                        break;
                    case '6':
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/6-mois.png';
                        break;
                    case '9':
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/9-mois.png';
                        break;
                    case '12':
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/1-an.png';
                        break;
                    case '18':
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/18-mois.png';
                        break;
                    case '24':
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/2-ans.png';
                        break;
                    default:
                        // Pour les versions non prévues, utiliser le badge 1 mois
                        subBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/1-mois.png';
                }
                
                badgeDisplay += `<img class="badge-image" src="${subBadgeFile}" alt="Subscriber ${subVersion}" title="Abonné ${subVersion} mois" onerror="this.src='https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1'">`;
            }
            if (data.badges.predictions) {
                // Badge de prédiction personnalisé avec vos images locales
                const predVersion = data.badges.predictionsVersion || '1';
                let predBadgeFile = '';
                
                // Mapper les versions de prédiction aux fichiers
                switch(predVersion) {
                    case '1':
                    case 'blue-1':
                        predBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/predi-1.png';
                        break;
                    case '2':
                    case 'blue-2':
                        predBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/predi-2.png';
                        break;
                    default:
                        // Par défaut, utiliser predi-1
                        predBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/predi-1.png';
                }
                
                badgeDisplay += `<img class="badge-image" src="${predBadgeFile}" alt="Prediction ${predVersion}" title="Prédiction ${predVersion}" onerror="this.src='https://static-cdn.jtvnw.net/badges/v1/73e8b446-2ca8-4dc7-912c-e35fc11d1c4e/1'">`;
            }
            // Badge Prime/Premium
            if (data.badges.prime || data.badges.premium) {
                badgeDisplay += `<img class="badge-image" src="https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/prime.png" alt="Prime" title="Prime Gaming">`;
            }
            // Badge Turbo
            if (data.badges.turbo) {
                badgeDisplay += `<img class="badge-image" src="https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/turbo.png" alt="Turbo" title="Turbo">`;
            }
            // Badge Verified
            if (data.badges.verified) {
                badgeDisplay += `<img class="badge-image" src="https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/verified.png" alt="Verified" title="Verified">`;
            }
            // Badge DJ
            if (data.badges.dj) {
                badgeDisplay += `<img class="badge-image" src="https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/dj.png" alt="DJ" title="Twitch DJ">`;
            }
            // Badge Ambassador
            if (data.badges.ambassador) {
                badgeDisplay += `<img class="badge-image" src="https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/ambassador.png" alt="Ambassador" title="Twitch Ambassador">`;
            }
            // Badge Artist
            if (data.badges.artist) {
                badgeDisplay += `<img class="badge-image" src="https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/Artist.png" alt="Artist" title="Artiste">`;
            }
            
            // Badges Bits/Cheers
            if (data.badges.bits) {
                const bitsVersion = data.badges.bitsVersion || '1';
                let bitsBadgeFile = '';
                
                // Mapper les niveaux de bits aux fichiers
                if (parseInt(bitsVersion) >= 5000000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-5000000.png';
                else if (parseInt(bitsVersion) >= 4500000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-4500000.png';
                else if (parseInt(bitsVersion) >= 4000000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-4000000.png';
                else if (parseInt(bitsVersion) >= 3500000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-3500000.png';
                else if (parseInt(bitsVersion) >= 3000000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-3000000.png';
                else if (parseInt(bitsVersion) >= 2500000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-2500000.png';
                else if (parseInt(bitsVersion) >= 2000000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-2000000.png';
                else if (parseInt(bitsVersion) >= 1750000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-1750000.png';
                else if (parseInt(bitsVersion) >= 1500000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-1500000.png';
                else if (parseInt(bitsVersion) >= 1250000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-1250000.png';
                else if (parseInt(bitsVersion) >= 1000000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-1000000.png';
                else if (parseInt(bitsVersion) >= 900000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-900000.png';
                else if (parseInt(bitsVersion) >= 800000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-800000.png';
                else if (parseInt(bitsVersion) >= 750000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-750000.png';
                else if (parseInt(bitsVersion) >= 700000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-700000.png';
                else if (parseInt(bitsVersion) >= 600000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-600000.png';
                else if (parseInt(bitsVersion) >= 500000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-500000.png';
                else if (parseInt(bitsVersion) >= 400000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-400000.png';
                else if (parseInt(bitsVersion) >= 300000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-300000.png';
                else if (parseInt(bitsVersion) >= 200000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-200000.png';
                else if (parseInt(bitsVersion) >= 100000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-100000.png';
                else if (parseInt(bitsVersion) >= 50000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-50000.png';
                else if (parseInt(bitsVersion) >= 25000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-25000.png';
                else if (parseInt(bitsVersion) >= 10000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-10000.png';
                else if (parseInt(bitsVersion) >= 5000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-5000.png';
                else if (parseInt(bitsVersion) >= 1000) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-1000.png';
                else if (parseInt(bitsVersion) >= 100) bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-100.png';
                else bitsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/cheer-1.png';
                
                badgeDisplay += `<img class="badge-image" src="${bitsBadgeFile}" alt="Bits ${bitsVersion}" title="Bits ${bitsVersion}">`;
            }
            
            // Badges Sub Gift Leader (utilise les fichiers gifter.png)
            if (data.badges.subGiftLeader) {
                const giftLeaderVersion = data.badges.subGiftLeaderVersion || '1';
                let gifterBadgeFile = '';
                
                // Les gift leaders utilisent les fichiers gifter-1.png, gifter-2.png, gifter-3.png
                switch(giftLeaderVersion) {
                    case '1':
                        gifterBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/gifter-1.png';
                        break;
                    case '2':
                        gifterBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/gifter-2.png';
                        break;
                    case '3':
                        gifterBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/gifter-3.png';
                        break;
                    default:
                        // Par défaut, utiliser gifter-1.png pour niveau 1
                        gifterBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/gifter-1.png';
                }
                
                badgeDisplay += `<img class="badge-image" src="${gifterBadgeFile}" alt="Gift Leader ${giftLeaderVersion}" title="Gift Leader ${giftLeaderVersion}">`;
            }
            // Badges Sub Gifter (utilise les fichiers sub-gift-X.png pour les quantités)
            else if (data.badges.subGifter) {
                const giftVersion = data.badges.subGifterVersion || '1';
                let giftBadgeFile = '';
                
                if (parseInt(giftVersion) >= 5000) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-5000.png';
                else if (parseInt(giftVersion) >= 4000) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-4000.png';
                else if (parseInt(giftVersion) >= 3000) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-3000.png';
                else if (parseInt(giftVersion) >= 2000) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-2000.png';
                else if (parseInt(giftVersion) >= 1000) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-1000.png';
                else if (parseInt(giftVersion) >= 950) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-950.png';
                else if (parseInt(giftVersion) >= 900) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-900.png';
                else if (parseInt(giftVersion) >= 850) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-850.png';
                else if (parseInt(giftVersion) >= 800) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-800.png';
                else if (parseInt(giftVersion) >= 750) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-750.png';
                else if (parseInt(giftVersion) >= 700) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-700.png';
                else if (parseInt(giftVersion) >= 650) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-650.png';
                else if (parseInt(giftVersion) >= 600) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-600.png';
                else if (parseInt(giftVersion) >= 550) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-550.png';
                else if (parseInt(giftVersion) >= 500) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-500.png';
                else if (parseInt(giftVersion) >= 450) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-450.png';
                else if (parseInt(giftVersion) >= 400) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-400.png';
                else if (parseInt(giftVersion) >= 350) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-350.png';
                else if (parseInt(giftVersion) >= 300) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-300.png';
                else if (parseInt(giftVersion) >= 250) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-250.png';
                else if (parseInt(giftVersion) >= 200) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-200.png';
                else if (parseInt(giftVersion) >= 150) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-150.png';
                else if (parseInt(giftVersion) >= 100) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-100.png';
                else if (parseInt(giftVersion) >= 50) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-50.png';
                else if (parseInt(giftVersion) >= 25) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-25.png';
                else if (parseInt(giftVersion) >= 10) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-10.png';
                else if (parseInt(giftVersion) >= 5) giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-5.png';
                else giftBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/sub-gift-1.png';
                
                badgeDisplay += `<img class="badge-image" src="${giftBadgeFile}" alt="Sub Gifter ${giftVersion}" title="Sub Gifter ${giftVersion}">`;
            }
            
            // Badges Clips Leader
            if (data.badges.clipsLeader) {
                const clipsVersion = data.badges.clipsLeaderVersion || '1';
                let clipsBadgeFile = '';
                
                // Mapper les niveaux de clips aux fichiers
                switch(clipsVersion) {
                    case '1':
                        clipsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/clipe-1.png';
                        break;
                    case '2':
                        clipsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/clipe-2.png';
                        break;
                    case '3':
                        clipsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/clipe-3.png';
                        break;
                    default:
                        // Par défaut, utiliser clipe-1
                        clipsBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/clipe-1.png';
                }
                
                badgeDisplay += `<img class="badge-image" src="${clipsBadgeFile}" alt="Clips Leader ${clipsVersion}" title="Clips Leader ${clipsVersion}">`;
            }
            
            // Badge No Audio (listen only)
            if (data.badges.noAudio) {
                badgeDisplay += `<img class="badge-image" src="https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/no-audio.png" alt="No Audio" title="Audio désactivé - Écoute uniquement">`;
            }
            // Badge No Video (listen only)
            if (data.badges.noVideo) {
                badgeDisplay += `<img class="badge-image" src="https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/listen.png" alt="Listen Only" title="Écoute uniquement - Pas de vidéo">`;
            }
            
            // Badge Anonymous Cheerer
            if (data.badges.anonymousCheerer) {
                badgeDisplay += `<img class="badge-image" src="https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/anonymous-cheerer.png" alt="Anonymous Cheerer" title="Cheerer Anonyme">`;
            }
            
            // Badges spéciaux/événements
            if (data.badges.special) {
                const specialType = data.badges.specialType;
                let specialBadgeFile = '';
                
                // Mapper les badges spéciaux
                if (specialType.includes('game-award-2023')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/game-award-2023.png';
                else if (specialType.includes('golden-predictor-game-award-2023')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/golden-predictor-game-award-2023.png';
                else if (specialType.includes('twitchcon-2025')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/twitchcon-2025.png';
                else if (specialType.includes('twitchrecap-2024') || specialType.includes('twitch-recap-2024')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/twitch-recap-2024.png';
                else if (specialType.includes('twitch-recap-2023') || specialType.includes('twitchrecap-2023')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/twitch-recap-2023.png';
                else if (specialType.includes('twitch-inter-2023')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/twitch-inter-2023.png';
                else if (specialType.includes('zevent-2024')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/zevent-2024.png';
                else if (specialType.includes('subtember-2024')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/subtember-2024.png';
                else if (specialType.includes('lol-mid-season-2025-support')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/lol-mid-season-2025-support-a-streamer.png';
                else if (specialType.includes('lol-mid-season-2025')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/lol-mid-season-2025.png';
                else if (specialType.includes('premiere-arcane-2') || specialType.includes('arcane-season-2-premiere')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/premiere-arcane-2.png';
                else if (specialType.includes('rplace-cake-2023') || specialType.includes('rplace-2023')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/rplace-cake-2023.png';
                else if (specialType.includes('share-the-love')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/share-the-love.png';
                else if (specialType.includes('gold-pixel-hear-2024')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/gold-pixel-hear-2024.png';
                else if (specialType.includes('purple-pixel-hear-2024') || specialType.includes('purple-pixel-heart---together-for-good-24')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/purple-pixel-heart-2024.png';
                else if (specialType.includes('ruby-pixel-heart-2024')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/ruby-pixel-heart-2024.png';
                else if (specialType.includes('clip-the-hall')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/clip-the-hall.png';
                else if (specialType.includes('raging-wolf')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/raging-wolf.png';
                else if (specialType.includes('gone-bananas')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/banana.png';
                else if (specialType.includes('speedons-5-badge') || specialType.includes('speedons')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/speedons-5.png';
                else if (specialType.includes('elden-ring-wylder')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/elden-ring-wylder.png';
                else if (specialType.includes('elden-ring-recluse')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/elden-ring-recluse.png';
                else if (specialType.includes('glhf') || specialType.includes('GLHF')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/GLHF.png';
                else if (specialType.includes('glitchcon') || specialType.includes('Glitchcon')) specialBadgeFile = 'https://raw.githubusercontent.com/scorpio74890-alt/test-twitch/main/Glitchcon.png';
                
                if (specialBadgeFile) {
                    badgeDisplay += `<img class="badge-image" src="${specialBadgeFile}" alt="${specialType}" title="${specialType}">`;
                }
            }
        }

        messageElement.innerHTML = `
            <span class="badge-display">${badgeDisplay}</span>
            <span class="username ${userColor} ${badgeClass}">${username}</span>
            <span class="separator">:</span>
            <span class="message-content">${message}</span>
        `;

        // Appliquer les filtres immédiatement
        if (!this.shouldShowMessage(messageData)) {
            messageElement.classList.add('filtered');
        }

        // Ajouter le message au container
        this.container.appendChild(messageElement);

        // Limiter le nombre de messages (garder la sync avec allMessages)
        this.limitMessages();

        // Faire défiler vers le bas
        this.scrollToBottom();
    }

    limitMessages() {
        // Messages illimités - pas de suppression des anciens messages
        // while (this.container.children.length > this.maxMessages) {
        //     this.container.removeChild(this.container.firstChild);
        // }
        
        // // Maintenir la synchronisation avec allMessages
        // while (this.allMessages.length > this.maxMessages) {
        //     this.allMessages.shift();
        // }
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    // Charger la préférence de thème
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    }
    
    new ChatModoApp();
});
