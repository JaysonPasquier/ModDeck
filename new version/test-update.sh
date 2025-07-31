#!/bin/bash

# Test script for ModDeck update system

echo "🔧 Testing ModDeck Update System"
echo "================================="

cd "/home/scorpio/twitch/fugu/ModDeck/new version"

echo "📋 Current version in package.json:"
grep '"version"' package.json

echo ""
echo "📁 Available changelog files:"
ls -la changelog/

echo ""
echo "🚀 Starting ModDeck to test update system..."
echo "   1. App should start with v1.0.0"
echo "   2. Update banner should appear after 3 seconds"
echo "   3. Click 'Update' to see v2.0.0 changelog"
echo "   4. Confirm to apply update"
echo "   5. App should update to v2.0.0"

echo ""
echo "💡 If you want to reset to v1 for testing:"
echo "   - Change package.json version back to 1.0.0"
echo "   - Remove or rename changelog/v2.md"

npm start
