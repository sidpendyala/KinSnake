@echo off
REM KinSnake Frontend Startup Script for Windows
REM Starts Next.js development server

echo ========================================
echo KinSnake Frontend (Next.js)
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [SETUP] Installing dependencies...
    npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the frontend
echo [FRONTEND] Starting Next.js development server...
echo [FRONTEND] Server will run on http://localhost:3000
echo [FRONTEND] Press Ctrl+C to stop
echo.

npm run dev

