#!/bin/bash
# KinSnake Backend Startup Script for Unix/Linux/Mac
# Starts Python WebSocket server with C controller and ElevenLabs voice

echo "========================================"
echo "KinSnake Backend Server"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/backend" || exit 1

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "[SETUP] Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment
source venv/bin/activate

# Check if dependencies are installed
if ! pip show fastapi &> /dev/null; then
    echo "[SETUP] Installing dependencies..."
    pip install -r requirements_server.txt
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies"
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "[WARNING] .env file not found"
    echo "Please create .env file with your ElevenLabs API key"
    echo "You can copy .env.example and update it with your key"
    echo ""
    echo "Voice narration will be disabled without API key"
    echo ""
fi

# Start the server
echo "[SERVER] Starting KinSnake Backend Server..."
echo "[SERVER] Server will run on http://localhost:8000"
echo "[SERVER] WebSocket available at ws://localhost:8000/ws"
echo "[SERVER] Press Ctrl+C to stop"
echo ""

python3 server.py

# Deactivate virtual environment on exit
deactivate

