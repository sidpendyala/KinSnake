# KinSnake Backend - Hand Tracking with C Controller

Backend system for KinSnake that provides hand tracking, C controller integration, and AI voice feedback.

**Note:** This backend is now fully integrated with the Next.js frontend. See the [main README](../README.md) and [INTEGRATION_GUIDE](../INTEGRATION_GUIDE.md) for the complete system.

## Integration Status

✅ **Fully Integrated** - Backend seamlessly connects to frontend via WebSocket  
✅ **C Controller** - Named pipe IPC with motion controller  
✅ **Real-time Communication** - WebSocket broadcasts gestures to all clients

## 🎯 Features

- **Real-time hand tracking** using MediaPipe AI
- **Index finger pointing detection** (UP, DOWN, LEFT, RIGHT)
- **C systems controller** demonstrating CMPSC 311 concepts
- **Named pipe IPC** between Python and C
- **Fast response** (2ms gesture update rate)
- **Clean termination** (X button, Ctrl+C, or 'q')

## 📁 Project Structure

```
MotionPlay/
├── hand_tracking.py                      # Main Python system
├── c_controller/
│   ├── motion_controller_persistent.c    # C source code
│   └── motion_controller_persistent.exe  # Compiled C controller
├── .env                                   # Your API keys (create this)
├── env_example.txt                        # Template
├── requirements_minimal.txt               # Dependencies
├── setup_voice.py                         # Voice setup helper
├── HOW_TO_RUN.md                         # Detailed instructions
├── SIMPLE_README.md                       # Quick reference
└── VOICE_SETUP.md                         # Voice configuration guide
```

## 🚀 Quick Start

### Running with Frontend Integration (Recommended)

From the project root, use the startup scripts:

**Windows:**
```bash
start-all.bat
```

**Mac/Linux:**
```bash
./start-all.sh
```

This starts both the backend server and frontend automatically.

### Running Backend Standalone

If you want to run the backend without the frontend:

**1. Install Dependencies**
```bash
pip install -r requirements_server.txt
```

**2. Setup Voice**
```bash
python setup_voice.py
```

**3. Run the Server**
```bash
python server.py
```

The WebSocket server will be available at `ws://localhost:8000/ws`

### Running Original Standalone Tracker

The original standalone hand tracker is still available:

```bash
pip install -r requirements_minimal.txt
python hand_tracking.py
```

This runs without the web interface - just OpenCV window with hand tracking.

## 🎮 How It Works

1. **MediaPipe** detects your hand and finger position
2. **Python** analyzes pointing direction
3. **Commands sent** to C controller via named pipe
5. **C controller** receives and executes commands

## 📊 System Architecture

```
Camera → MediaPipe → Python Handler → Named Pipe → C Controller
```

## 🎓 Educational Value (CMPSC 311)

Demonstrates:
- ✅ Inter-Process Communication (Named Pipes)
- ✅ Process Management (subprocess)
- ✅ Signal Handling (SIGINT, SIGTERM)
- ✅ Command Processing
- ✅ Windows API (CreateNamedPipe, ReadFile)
- ✅ Multithreading (voice in background)

## 🔧 Requirements

- Python 3.8+
- Webcam
- Windows OS (for C controller)

## 📝 Dependencies

- `opencv-python` - Camera and video
- `mediapipe` - Hand tracking AI
- `python-dotenv` - Configuration
- `numpy` - Math operations

## 🎤 Voice Features

- Only speaks when **direction changes**
- Says just the direction: "Up", "Down", "Left", "Right"
- Runs in **background thread** (non-blocking)
- **Normal speaking speed**

## 🐛 Troubleshooting

**Camera not working?**
```bash
taskkill /f /im python.exe
```

**C controller not responding?**
```bash
taskkill /f /im motion_controller_persistent.exe
```

**No voice?**
- Check `.env` file exists with valid API key
- Check internet connection
- Check system volume

**Hand not detected?**
- Improve lighting
- Keep hand clearly visible
- Point with INDEX FINGER

## 📖 Documentation

- `HOW_TO_RUN.md` - Complete running instructions
- `SIMPLE_README.md` - Quick reference guide
- `VOICE_SETUP.md` - Voice configuration details

## 🎯 Quick Commands

```bash
# Setup
pip install -r requirements_minimal.txt
python setup_voice.py

# Run
python hand_tracking.py

# Cleanup
taskkill /f /im python.exe
taskkill /f /im motion_controller_persistent.exe
```

---

**Created for CMPSC 311 - Systems Programming**

Point your finger and control the system! 👆✨
