@echo off
REM ModDeck v2 Launcher Script for Windows
REM This script runs ModDeck without needing to build an executable

REM Set up logging - all output will go to moddeck-log.txt
set LOGFILE=%~dp0moddeck-log.txt

REM Clear previous log and start logging
echo =============================================== > "%LOGFILE%"
echo ModDeck v2 Launch Log - %date% %time% >> "%LOGFILE%"
echo =============================================== >> "%LOGFILE%"

echo Starting ModDeck v2...
echo Starting ModDeck v2... >> "%LOGFILE%"

REM Check if Node.js is installed
echo Checking Node.js installation... >> "%LOGFILE%"
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js to run ModDeck.
    echo Error: Node.js is not installed. Please install Node.js to run ModDeck. >> "%LOGFILE%"
    echo Download from: https://nodejs.org/ >> "%LOGFILE%"
    echo. >> "%LOGFILE%"
    echo Check moddeck-log.txt for details.
    pause
    exit /b 1
)
echo Node.js found! >> "%LOGFILE%"

REM Check if npm is installed
echo Checking npm installation... >> "%LOGFILE%"
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install npm to run ModDeck.
    echo Error: npm is not installed. Please install npm to run ModDeck. >> "%LOGFILE%"
    echo. >> "%LOGFILE%"
    echo Check moddeck-log.txt for details.
    pause
    exit /b 1
)
echo npm found! >> "%LOGFILE%"

REM Navigate to the script directory
cd /d "%~dp0"
echo Current directory: %cd% >> "%LOGFILE%"

REM Check and install dependencies
echo Checking dependencies... >> "%LOGFILE%"

REM Always run npm install to ensure everything is properly installed
echo Ensuring all dependencies are installed... >> "%LOGFILE%"
echo Installing/updating dependencies (this may take a few minutes)...

REM Check if package.json exists first
if not exist "package.json" (
    echo ERROR: package.json not found! >> "%LOGFILE%"
    echo ERROR: package.json not found! Cannot install dependencies.
    echo Make sure you're in the correct ModDeck directory.
    pause
    exit /b 1
)

echo package.json found, running npm install... >> "%LOGFILE%"
npm install >> "%LOGFILE%" 2>&1

echo npm install completed with exit code: %errorlevel% >> "%LOGFILE%"
if %errorlevel% neq 0 (
    echo npm install failed! Check moddeck-log.txt for details.
    echo npm install failed! >> "%LOGFILE%"
    pause
    exit /b 1
)

echo Dependencies installed successfully! >> "%LOGFILE%"

REM Run ModDeck
echo Launching ModDeck v2...
echo Launching ModDeck v2... >> "%LOGFILE%"
npm start >> "%LOGFILE%" 2>&1

echo =============================================== >> "%LOGFILE%"
echo ModDeck session ended - %date% %time% >> "%LOGFILE%"
echo =============================================== >> "%LOGFILE%"

echo.
echo All output has been saved to: moddeck-log.txt
echo Check this file for any error details.
pause
