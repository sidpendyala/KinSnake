@echo off
REM KinSnake Backend Startup Script for Windows
REM Starts Python WebSocket server with C controller and ElevenLabs voice

echo ========================================
echo KinSnake Backend Server
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

REM Navigate to backend directory
cd /d "%~dp0backend"

REM Check if virtual environment exists
if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if dependencies are installed
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo [SETUP] Installing dependencies...
    pip install -r requirements_server.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found
    echo Please create .env file with your ElevenLabs API key
    echo You can copy .env.example and update it with your key
    echo.
    echo Voice narration will be disabled without API key
    echo.
    pause
)

REM Start the server
echo [SERVER] Starting KinSnake Backend Server...
echo [SERVER] Server will run on http://localhost:8000
echo [SERVER] WebSocket available at ws://localhost:8000/ws
echo [SERVER] Press Ctrl+C to stop
echo.

python server.py

REM Deactivate virtual environment on exit
call venv\Scripts\deactivate.bat

