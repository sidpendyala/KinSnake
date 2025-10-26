@echo off
REM Start C Controller Separately
REM Use this if you want to see the controller running

echo ========================================
echo KinSnake C Controller
echo ========================================
echo.

cd /d "%~dp0backend\c_controller"

if not exist "motion_controller_bidirectional.exe" (
    echo [ERROR] motion_controller_bidirectional.exe not found
    echo Please compile the C controller first
    pause
    exit /b 1
)

echo [CONTROLLER] Starting bidirectional controller...
echo [CONTROLLER] Press Ctrl+C to stop
echo.

motion_controller_bidirectional.exe -d -l ..\controller.log

echo.
echo [CONTROLLER] Stopped
pause

