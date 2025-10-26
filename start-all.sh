#!/bin/bash
# KinSnake Complete System Startup Script for Unix/Linux/Mac
# Starts both backend and frontend in separate terminals

echo "========================================"
echo "KinSnake Complete System Startup"
echo "========================================"
echo ""
echo "Starting Backend and Frontend servers..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Function to detect OS and open terminal
start_in_terminal() {
    local title=$1
    local script=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR' && bash '$script'\""
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal --title="$title" -- bash -c "cd '$SCRIPT_DIR' && bash '$script'; exec bash"
        elif command -v xterm &> /dev/null; then
            xterm -title "$title" -e "cd '$SCRIPT_DIR' && bash '$script'; bash" &
        else
            echo "[WARNING] Could not find terminal emulator for $title"
            echo "Please run $script manually"
        fi
    else
        echo "[WARNING] Unsupported OS: $OSTYPE"
        echo "Please run scripts manually"
    fi
}

# Make scripts executable
chmod +x "$SCRIPT_DIR/start-backend.sh"
chmod +x "$SCRIPT_DIR/start-frontend.sh"

# Start backend
start_in_terminal "KinSnake Backend" "start-backend.sh"
sleep 3

# Start frontend
start_in_terminal "KinSnake Frontend" "start-frontend.sh"

echo ""
echo "========================================"
echo "Both servers are starting..."
echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Check the terminal windows for server output"
echo "========================================"

