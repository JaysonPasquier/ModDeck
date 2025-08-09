# ModDeck v3

A modern, feature-rich Twitch chat widget with advanced moderation tools for streamers and moderators.

## 🎉 What's New in v3

ModDeck v3 represents a complete transformation with:
- **🎨 Complete UI Modernization**: Glass morphism design, responsive layout, modern animations
- **🔧 Advanced Moderation System**: Full Twitch Helix API integration with comprehensive moderation tools
- **🌍 Complete French Localization**: Full bilingual support with proper translations
- **📱 Mobile & Tablet Support**: Responsive design that works on all screen sizes
- **⚡ Performance Improvements**: Optimized rendering and better memory management

See the [CHANGELOG.md](changelog/v3.md) for detailed information about all changes.

## Features

### 🎯 Core Features
- **External Chat Widget**: Always-on-top window that doesn't interfere with your stream
- **Real-time Twitch Chat**: Connect to any Twitch channel and view live chat
- **Smart Filtering**: Filter messages by user, role, or keywords
- **Mention Tracking**: Dedicated tab for tracking mentions and important messages
- **Enhanced Badge Support**: Full support for all Twitch badges with custom images
- **Username Colors**: Display chat with authentic Twitch username colors + fallback system
- **Emote Integration**: Full support for Twitch emotes and 7TV emotes
- **Custom Badge Images**: Support for channel-specific subscriber and event badges

### 🔧 Advanced Moderation System (NEW in v3)
- **Twitch Helix API Integration**: Full integration with Twitch's modern API for reliable moderation
- **Comprehensive Moderation Actions**:
  - Delete messages with reason tracking
  - Timeout users with custom duration and reason
  - Ban users with detailed reason logging
  - Unban users with confirmation
- **Moderation Log**: Dedicated tab to track all moderation actions with timestamps and details
- **Visual Moderation Indicators**: Real-time visual feedback for deleted messages, timeouts, and bans
- **User History**: View recent messages from any user for context
- **Recurrent Message Detection**: Automatically detect and flag similar messages
- **Context Menus**: Right-click menus for quick moderation actions

### 🛠️ Interface Features
- **Custom Title Bar**: Minimal, modern interface without traditional window borders
- **Resizable Widget**: Adjust size and position to fit your workspace
- **Tab Navigation**: Switch between chat, mentions, and moderation log
- **Auto-scroll**: Automatically scroll to new messages
- **Connection Status**: Real-time connection indicator and controls
- **Modern Design**: Glass morphism effects, rounded corners, and smooth animations
- **Responsive Layout**: Adapts to different screen sizes and orientations
- **Touch-Friendly**: Optimized for touch devices and tablets

### ⚙️ Settings & Customization
- **Window Management**: Save window size, position, and always-on-top preference
- **Filter Preferences**: Customize what badges and colors to show
- **Mention Keywords**: Set custom keywords that trigger mention notifications
- **Theme Support**: Dark theme with light theme planned
- **Auto-save**: All preferences are automatically saved
- **Twitch API Integration**: Configure Helix API credentials for advanced moderation
- **Language Support**: Switch between English and French
- **Advanced Filtering**: More granular control over message filtering

### 🔄 Data Management
- **24-hour Data Retention**: Chat data automatically cleans up after 24 hours
- **Persistent Settings**: User preferences and login data are permanently stored
- **Real-time Saving**: Chat messages and mentions are saved as they arrive

### 🚀 Update System
- **Auto-updater**: Built-in update system that checks GitHub releases
- **Update Notifications**: Get notified when new versions are available
- **One-click Updates**: Download and install updates with a single click

## Installation & Running

### Quick Start (No Installation Required)
ModDeck v3 is designed to run as a lightweight widget without traditional installation:

**On Linux/macOS:**
```bash
# Clone and run directly
git clone https://github.com/JaysonPasquier/ModDeck.git
cd "ModDeck/new version"
./run-moddeck.sh
```

**On Windows:**
```cmd
# Clone and run directly
git clone https://github.com/JaysonPasquier/ModDeck.git
cd "ModDeck/new version"
run-moddeck.bat
```

### Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)

### Manual Setup
If you prefer manual setup:

1. Clone the repository:
   ```bash
   git clone https://github.com/JaysonPasquier/ModDeck.git
   cd "ModDeck/new version"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the widget:
   ```bash
   npm start
   ```

### Distribution (Optional)
If you want to create portable packages (NO .exe files):

```bash
# Create portable folder (recommended)
npm run build-portable

# Create zip/archive files
npm run build-zip
```

This creates compressed archives instead of traditional installers or executables.

## Usage

### Getting Started
1. Launch ModDeck v3
2. Enter a Twitch channel name in the connection field
3. Click "Connect" to start receiving chat messages
4. Use the tabs to switch between chat, mentions, and moderation log
5. Apply filters to focus on specific users, roles, or keywords

### Advanced Moderation (NEW in v3)
To use the advanced moderation features:

1. **Setup Twitch API Credentials**:
   - Go to [Twitch Developer Console](https://dev.twitch.tv/console)
   - Create a new application
   - Get your Client ID and generate an OAuth token with moderator permissions
   - Add these credentials in the settings

2. **Moderation Actions**:
   - **Right-click** on any message to open the context menu
   - Choose from: Delete Message, Timeout User, Ban User, View History
   - Set custom duration and reason for timeouts and bans
   - View the Moderation Log tab to see all actions

3. **Visual Feedback**:
   - Deleted messages are marked with "DELETED" badge and strikethrough
   - Timed-out users show "TIMEOUT" badge on their messages
   - Banned users show "BANNED" badge on their messages
   - All moderation actions are logged with timestamps and details

### Badge System
ModDeck v3 includes comprehensive badge support:

- **Standard Badges**: Broadcaster, Moderator, VIP, Subscriber
- **Activity Badges**: Bits, Sub Gifter, Clips Leader, Predictions
- **Special Badges**: Prime Gaming, Turbo, Verified, Artist
- **Event Badges**: Game Awards, ZEvent, TwitchCon, Arcane, etc.
- **Custom Images**: Place badge images in the `images/` folder for channel-specific designs

See `images/README.md` for complete badge image specifications.

### Emote Support
- **Twitch Emotes**: Native Twitch emotes with proper sizing
- **7TV Emotes**: Both global and channel-specific 7TV emotes
- **Auto-loading**: Emotes are automatically fetched and cached
- **Fallback**: Graceful fallback if emote services are unavailable

### Settings
- Click the settings icon (⚙️) in the title bar to open preferences
- Adjust window size, position, and behavior
- Configure mention keywords and chat display options
- Set up auto-update preferences

### Keyboard Shortcuts
- **Enter**: Connect/disconnect when channel input is focused
- **Tab Navigation**: Click tabs or use mouse to switch between chat and mentions

## Technical Details

### Built With
- **Electron**: Cross-platform desktop application framework
- **TMI.js**: Twitch chat client for JavaScript
- **electron-updater**: Automatic update system
- **node-fetch**: HTTP client for Twitch Helix API integration
- **Native HTML/CSS/JS**: No heavy frameworks for optimal performance

### Architecture
- **Main Process** (`main.js`): Handles window management, settings, and auto-updates
- **Renderer Process** (`renderer.js`): Manages UI, chat connection, and data display
- **Settings Window** (`settings.html`): Separate window for configuration
- **Data Management**: Local JSON storage with automatic cleanup

### Data Storage
```
data/
├── settings.json        # User preferences and configuration
└── chat_data.json      # Chat messages and mentions (auto-cleaned)
```

## Development

### Project Structure
```
new version/
├── main.js              # Electron main process
├── renderer.js          # Chat logic and UI management
├── index.html           # Main application window
├── settings.html        # Settings window
├── style.css            # Application styles
├── package.json         # Dependencies and build config
├── assets/              # Icons and images
└── data/               # Local data storage (created at runtime)
```

### Scripts
- `npm start`: Run the widget directly
- `npm run dev`: Run with development flags
- `npm run build-portable`: Create portable folder (no installer)
- `npm run build-zip`: Create compressed archives
- `npm run pack`: Build directory only

### Distribution Options
Instead of traditional .exe files, ModDeck v3 offers:

1. **Direct Running**: Use the launcher scripts (`run-moddeck.sh` or `run-moddeck.bat`)
2. **Portable Folder**: `npm run build-portable` creates a folder you can move anywhere
3. **Compressed Archive**: `npm run build-zip` creates zip/tar.gz files for easy sharing

```bash
# Create portable version (recommended approach)
npm run build-portable

# The result will be in dist/win-unpacked, dist/linux-unpacked, or dist/mac
# You can copy this folder anywhere and run the executable inside
```

## Features Roadmap

### ✅ Completed
- [x] Real-time Twitch chat integration
- [x] Message filtering and search
- [x] Mention tracking and notifications
- [x] Enhanced badge support with custom images
- [x] Username color support (user colors + fallback system)
- [x] Twitch emote integration
- [x] 7TV emote integration (global and channel-specific)
- [x] Settings management
- [x] Auto-update system
- [x] 24-hour data retention
- [x] Always-on-top widget mode
- [x] Custom badge images for subscribers, predictions, bits, etc.
- [x] Event badge support (Game Awards, ZEvent, etc.)

### 🚧 In Progress
- [ ] Twitch OAuth integration for moderation actions
- [ ] Light theme support
- [ ] Advanced message formatting
- [ ] BTTV emote support

### 📋 Planned
- [ ] Ban/timeout users directly from the widget
- [ ] FFZ emote support
- [ ] Message history search
- [ ] Multiple channel support
- [ ] Plugin system for extensions
- [ ] Custom CSS themes
- [ ] Voice message support
- [ ] Advanced filtering (regex support)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m "Add feature description"`
5. Push to your fork: `git push origin feature-name`
6. Create a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Contact: fugu_fps on Twitch

## Changelog

### v2.0.0 (Current)
- Complete rewrite with modern architecture
- New tabbed interface with chat and mentions
- Advanced filtering and search capabilities
- Auto-update system with GitHub integration
- Improved performance and memory management
- 24-hour automatic data cleanup
- Enhanced settings management
- Modern dark theme UI
- **NEW**: Complete Twitch emote integration
- **NEW**: 7TV emote support (global and channel-specific)
- **NEW**: Enhanced badge system with custom images
- **NEW**: Username color support (user colors + fallback system)
- **NEW**: Support for all Twitch badge types
- **NEW**: Event badge support (Game Awards, ZEvent, etc.)
- **NEW**: Custom badge images for subscribers, predictions, bits
- **NEW**: Automatic emote caching and loading
- **NEW**: No .exe distribution - runs as lightweight widget

---

**Made with ❤️ for the streaming community**
