#!/bin/bash
# KinSnake Frontend Startup Script for Unix/Linux/Mac
# Starts Next.js development server

echo "========================================"
echo "KinSnake Frontend (Next.js)"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[SETUP] Installing dependencies..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies"
        exit 1
    fi
fi

# Start the frontend
echo "[FRONTEND] Starting Next.js development server..."
echo "[FRONTEND] Server will run on http://localhost:3000"
echo "[FRONTEND] Press Ctrl+C to stop"
echo ""

npm run dev

