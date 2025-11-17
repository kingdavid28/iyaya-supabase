#!/bin/bash

echo "🚀 Setting up Iyaya React Native App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "📦 Installing Expo CLI..."
    npm install -g @expo/cli
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Clear any existing cache
echo "🧹 Clearing cache..."
npm run start-clear &
sleep 5
pkill -f "expo start"

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your Firebase credentials"
echo "2. Run 'npm start' to start the development server"
echo "3. Scan the QR code with Expo Go app on your phone"
echo ""
echo "For backend setup, check the backend/ folder"
