#!/bin/bash

# UI Tests Runner Script for EngageNinja

set -e

echo "🚀 Starting UI Automation Tests..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install test dependencies if needed
if [ ! -d "tests/node_modules" ]; then
    echo "📦 Installing test dependencies..."
    cd tests
    npm install
    cd ..
fi

# Start backend in test mode if not already running
echo "🔄 Checking backend test server..."
if ! curl -s http://localhost:5174/health > /dev/null 2>&1; then
    echo "⚠️  Backend test server not running. Starting..."
    npm run dev:test &
    BACKEND_PID=$!

    # Wait for backend to start
    echo "⏳ Waiting for backend to start..."
    sleep 10

    # Check if backend started successfully
    if ! curl -s http://localhost:5174/health > /dev/null 2>&1; then
        echo "❌ Failed to start backend test server"
        exit 1
    fi

    # Kill backend when done
    trap "echo '🛑 Stopping backend server...'; kill $BACKEND_PID 2>/dev/null" EXIT
fi

# Run tests
echo "🧪 Running UI tests..."
cd tests

# Run specific test suite if provided
if [ "$1" == "auth" ]; then
    npm run test:auth
elif [ "$1" == "dashboard" ]; then
    npm run test:dashboard
elif [ "$1" == "contacts" ]; then
    npm run test:contacts
elif [ "$1" == "campaigns" ]; then
    npm run test:campaigns
elif [ "$1" == "templates" ]; then
    npm run test:templates
else
    # Run all tests
    npm run test
fi

echo "✅ UI tests completed successfully!"