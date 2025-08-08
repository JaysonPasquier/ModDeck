#!/bin/bash

# ModDeck v3 Launcher Script
# This script runs ModDeck without needing to build an executable

echo "Starting ModDeck v3..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to run ModDeck."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm to run ModDeck."
    exit 1
fi

# Navigate to the script directory
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run ModDeck
echo "Launching ModDeck v3..."
npm start
