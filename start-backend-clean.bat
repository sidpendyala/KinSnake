@echo off
REM KinSnake Backend Startup Script - Clean Installation Version
REM Kills existing Python processes and recreates virtual environment if needed

echo ========================================
echo KinSnake Backend Server (Clean Start)
echo ========================================
echo.

REM Kill any running Python processes
echo [CLEANUP] Stopping any running Python processes...
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

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

REM Check if venv exists and if installation failed before
if exist "venv" (
    echo [INFO] Existing virtual environment found
    echo [INFO] Checking if it's working...
    
    REM Try to activate and check if it works
    call venv\Scripts\activate.bat
    python -c "import fastapi" >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Virtual environment appears broken
        echo [CLEANUP] Removing old virtual environment...
        call venv\Scripts\deactivate.bat >nul 2>&1
        timeout /t 1 /nobreak >nul
        rmdir /s /q venv
        echo [SETUP] Creating fresh virtual environment...
        python -m venv venv
        if errorlevel 1 (
            echo [ERROR] Failed to create virtual environment
            pause
            exit /b 1
        )
        call venv\Scripts\activate.bat
        echo [SETUP] Installing dependencies...
        pip install -r requirements_server.txt
        if errorlevel 1 (
            echo [ERROR] Failed to install dependencies
            pause
            exit /b 1
        )
    ) else (
        echo [INFO] Virtual environment is working
    )
) else (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    
    call venv\Scripts\activate.bat
    
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
    echo.
    echo [WARNING] .env file not found
    echo Voice narration will be disabled without ElevenLabs API key
    echo To enable voice:
    echo   1. Run: python setup_voice.py
    echo   2. Or copy .env.example to .env and add your API key
    echo.
    timeout /t 3 /nobreak >nul
)

REM Start the server
echo.
echo [SERVER] Starting KinSnake Backend Server...
echo [SERVER] Server will run on http://localhost:8000
echo [SERVER] WebSocket available at ws://localhost:8000/ws
echo [SERVER] Press Ctrl+C to stop
echo.

python server.py

REM Deactivate virtual environment on exit
call venv\Scripts\deactivate.bat

