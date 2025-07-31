# Chat Modo - Application Electron

Application de chat filtré pour modérateurs/VIP Twitch de fugu_fps.

## Fonctionnalités

- ✅ **Filtrage intelligent** : Affiche uniquement les messages des modérateurs, VIP, diffuseur, vérifiés, etc.
- 🎨 **Thèmes** : Sombre et clair avec commutateur facile
- 📌 **Toujours au-dessus** : Option pour épingler la fenêtre
- 🎭 **Emotes** : Support complet des emotes Twitch et 7TV
- 🔄 **Reconnexion automatique** : Se reconnecte automatiquement en cas de perte de connexion
- 🎯 **Interface moderne** : Coins arrondis, animations fluides

## Installation

1. Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé
2. Ouvrez un terminal dans le dossier `chat-modo`
3. Installez les dépendances :
   ```bash
   npm install
   ```

## Utilisation

### Démarrage en mode développement
```bash
npm start
```

### Construction de l'exécutable
```bash
npm run build
```

L'exécutable sera créé dans le dossier `dist/`.

## Contrôles

- **🌙/☀️** : Changer le thème (sombre/clair)
- **📌** : Épingler/désépingler la fenêtre (toujours au-dessus)
- **─** : Réduire la fenêtre
- **✕** : Fermer l'application

## Filtrage des messages

L'application affiche uniquement les messages des utilisateurs ayant les rôles suivants :
- Modérateur (🛡️)
- Diffuseur/Streamer (👑)
- VIP (💎)
- Vérifié (✅)
- Ambassadeur Twitch
- Staff Twitch
- Admin Twitch
- Modérateur global

## Support technique

- Compatible Windows, macOS et Linux
- Connexion directe au chat Twitch IRC
- Support des emotes 7TV du canal fugu_fps
- Interface responsive et moderne
