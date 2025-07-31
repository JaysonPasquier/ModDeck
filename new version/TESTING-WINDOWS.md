# Testing ModDeck on Windows from WSL

## Problem
You're developing in WSL but want to test the Windows version of the Electron app.

## Solutions

### Option 1: Run from Windows accessing WSL files
1. **Access WSL files from Windows:**
   - Open Windows Explorer
   - Go to: `\\wsl$\Ubuntu\home\scorpio\twitch\fugu\ModDeck\new version`
   - Or navigate to your WSL distribution name if different

2. **Install Node.js on Windows:**
   - Download and install Node.js for Windows from nodejs.org
   - Restart your command prompt/PowerShell

3. **Run from Windows Command Prompt:**
   ```cmd
   cd "\\wsl$\Ubuntu\home\scorpio\twitch\fugu\ModDeck\new version"
   npm install
   npm start
   ```

### Option 2: Copy files to Windows (Recommended for testing)
1. **Create a Windows copy:**
   ```bash
   # From WSL
   cp -r "/home/scorpio/twitch/fugu/ModDeck/new version" /mnt/c/Users/[YourUsername]/Desktop/ModDeck-Windows-Test
   ```

2. **Run from Windows:**
   ```cmd
   cd C:\Users\[YourUsername]\Desktop\ModDeck-Windows-Test
   npm install
   npm start
   ```

### Option 3: Use the launcher script directly on Windows
1. **Copy the bat file to Windows desktop:**
   ```bash
   # From WSL
   cp "/home/scorpio/twitch/fugu/ModDeck/new version/run-moddeck.bat" /mnt/c/Users/[YourUsername]/Desktop/
   ```

2. **Double-click the bat file on Windows desktop**

### Option 4: Build portable version
```bash
# From WSL or Windows
npm run build-portable

# This creates a dist folder with a portable app
# Copy dist/win-unpacked to Windows and run the .exe inside
```

## Recommended Approach

1. **For quick testing:** Use Option 2 (copy to Windows)
2. **For development:** Keep working in WSL, copy to Windows when you need to test
3. **For distribution:** Use `npm run build-zip` to create Windows archives

## Automation Script
Create this script to quickly copy and test:

```bash
#!/bin/bash
# File: sync-to-windows.sh

WINDOWS_PATH="/mnt/c/Users/[YourUsername]/Desktop/ModDeck-Test"

echo "🔄 Syncing to Windows..."
rm -rf "$WINDOWS_PATH"
cp -r "/home/scorpio/twitch/fugu/ModDeck/new version" "$WINDOWS_PATH"

echo "✅ Files copied to: $WINDOWS_PATH"
echo "🚀 Now run from Windows Command Prompt:"
echo "   cd \"C:\\Users\\[YourUsername]\\Desktop\\ModDeck-Test\""
echo "   npm install"
echo "   npm start"
```

## Troubleshooting

### If Node.js path issues occur:
- Make sure Node.js is installed on Windows
- Add Node.js to Windows PATH
- Use Windows Command Prompt, not PowerShell if there are issues

### If file permission issues:
- Run Windows Command Prompt as Administrator
- Or use PowerShell with appropriate execution policy

### If packages don't install:
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again from Windows
