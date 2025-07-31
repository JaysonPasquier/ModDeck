#!/bin/bash

# Quick sync script to copy ModDeck to Windows for testing
# Replace [YourUsername] with your actual Windows username

WINDOWS_USERNAME="utilisateur"
WINDOWS_PATH="/mnt/c/Users/$WINDOWS_USERNAME/Desktop/ModDeck-Test"
SOURCE_PATH="/home/scorpio/twitch/fugu/ModDeck/new version"

echo "🔄 Syncing ModDeck to Windows for testing..."

# Remove old version
if [ -d "$WINDOWS_PATH" ]; then
    echo "🗑️  Removing old version..."
    rm -rf "$WINDOWS_PATH"
fi

# Copy new version
echo "📁 Copying files..."
cp -r "$SOURCE_PATH" "$WINDOWS_PATH"

# Remove WSL-specific files that might cause issues on Windows
rm -f "$WINDOWS_PATH/run-moddeck.sh"

echo "✅ Files copied to: $WINDOWS_PATH"
echo ""
echo "🚀 To test on Windows:"
echo "   1. Open Windows Command Prompt"
echo "   2. Run: cd \"C:\\Users\\$WINDOWS_USERNAME\\Desktop\\ModDeck-Test\""
echo "   3. Run: npm install"
echo "   4. Run: npm start"
echo ""
echo "💡 Or just double-click 'run-moddeck.bat' in the folder!"

# Make the Windows batch file executable (just in case)
chmod +x "$WINDOWS_PATH/run-moddeck.bat" 2>/dev/null || true

echo "🎯 Ready for Windows testing!"
