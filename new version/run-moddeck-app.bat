@echo off
REM ModDeck v3 Launcher

echo ==========================================
echo ModDeck v3 - Launcher
echo ==========================================
echo.

echo.

REM Navigate to script directory
cd /d "%~dp0"
echo Current directory: %cd%
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found! Please install npm
    pause
    exit /b 1
)
echo ✅ npm found

REM Check package.json
if not exist "package.json" (
    echo ❌ package.json not found! Make sure you're in the ModDeck directory
    pause
    exit /b 1
)
echo ✅ package.json found

echo.
echo 🚀 Starting ModDeck v3...
echo.

REM Start ModDeck directly
npm start

echo.
echo 📝 ModDeck has closed.
pause
