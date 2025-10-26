@echo off
REM KinSnake Complete System Startup Script
REM Starts both backend and frontend in separate windows

echo ========================================
echo KinSnake Complete System Startup
echo ========================================
echo.
echo Starting Backend and Frontend servers...
echo.

REM Start backend in new window (using clean version)
start "KinSnake Backend" cmd /k "%~dp0start-backend-clean.bat"

REM Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "KinSnake Frontend" cmd /k "%~dp0start-frontend.bat"

echo.
echo ========================================
echo Both servers are starting...
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Close this window or press any key to exit
echo (Backend and Frontend will keep running)
echo ========================================
pause >nul

