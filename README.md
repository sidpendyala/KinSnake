# 🐍 KinSnake - Hand Gesture Controlled Snake Game

A modern, fully-integrated snake game controlled by hand gestures. Built with Next.js, Python, C, and MediaPipe.

## ✨ Features

### 🎮 Game Features
- **Hand Gesture Control** - Point your finger to control the snake (UP, DOWN, LEFT, RIGHT)
- **60-Second Challenge** - Race against time to eat as many apples as possible
- **Beautiful UI** - Purple-themed modern interface with animations
- **Keyboard Support** - Arrow keys and WASD for traditional control
- **Accessibility** - High contrast mode, reduced motion, screen reader support

### 🔧 Technical Features
- **Full Backend Integration** - Python + C controller
- **Real-time Communication** - WebSocket connection for instant gesture feedback
- **C Systems Controller** - Demonstrates IPC via Windows named pipes
- **MediaPipe Hand Tracking** - Professional-grade hand landmark detection
- **Dual Tracking Modes** - Browser-based or backend processing
- **Responsive UI** - Modern interface with smooth animations

## 🏗️ Architecture

```
Frontend (Next.js/React)
    ↕ WebSocket
Python Backend (FastAPI)
    ↕ Named Pipe
C Controller (motion_controller_persistent.exe)
```


## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** - [Download](https://www.python.org/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Webcam**
- **Windows OS** (for C controller)

### Installation

1. **Clone the Repository**
   ```bash
   git clone <your-repo-url>
   cd KinSnake
   ```

2. **Install Dependencies**
   
   **Backend:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements_server.txt
   ```
   
   **Frontend:**
   ```bash
   npm install
   ```

### Running the Application

#### Option 1: Start Everything at Once (Recommended)

```bash
start-all.bat
```

This opens two terminal windows:
- Backend server on `http://localhost:8000`
- Frontend on `http://localhost:3000`

#### Option 2: Start Individually

**Terminal 1 - Backend:**
```bash
start-backend.bat
```

**Terminal 2 - Frontend:**
```bash
start-frontend.bat
```

### Access the Game

1. Open your browser to **http://localhost:3000**
2. Grant camera permissions when prompted
3. Select which hand to use (left or right)
4. Watch the **Backend Status** widget - it should show all green
5. Press **Start Challenge** to begin
6. **Point your index finger** to control the snake!

## 🎮 How to Play

### Hand Gestures
- **Point UP** - Snake moves up
- **Point DOWN** - Snake moves down
- **Point LEFT** - Snake moves left
- **Point RIGHT** - Snake moves right

### Keyboard Controls (Alternative)
- **Arrow Keys** or **WASD** - Control snake direction
- Works alongside hand gestures

### Game Rules
- Eat apples (red dots) to grow your snake
- Avoid hitting yourself
- You have 60 seconds to score as many points as possible
- Your best score is saved locally

## 📊 Backend Status Widget

The game shows real-time status of backend components:

- 🟢 **Server: Connected** - WebSocket connection active
- 🟢 **C Controller: Running** - Motion controller operational

If any component shows red, restart the backend server.

## 📁 Project Structure

```
KinSnake/
├── backend/                          # Python backend
│   ├── server.py                    # FastAPI WebSocket server
│   ├── hand_tracking.py             # Standalone hand tracker
│   ├── requirements_server.txt        # Python dependencies
│   └── c_controller/                # C motion controller
│       ├── motion_controller_persistent.c
│       └── motion_controller_persistent.exe
├── src/                             # Next.js frontend
│   ├── app/
│   │   └── page.tsx                 # Main game page
│   ├── components/
│   │   ├── SnakeGameBoard.tsx       # Game logic
│   │   ├── BackendStatus.tsx        # Backend status display
│   │   └── ...
│   └── hooks/
│       ├── useBackendConnection.ts  # Backend WebSocket hook
│       └── useHandGestureDetection.ts
├── start-all.bat                    # Start everything
├── start-backend.bat                # Start backend only
├── start-frontend.bat               # Start frontend only
└── README.md                        # This file
```

## 🎓 Educational Value

This project demonstrates advanced concepts in:

### Systems Programming (CMPSC 311)
- ✅ **Inter-Process Communication** (IPC) via Windows named pipes
- ✅ **Process Management** (Python spawning and controlling C processes)
- ✅ **Signal Handling** (Graceful shutdown with SIGINT/SIGTERM)
- ✅ **Command Processing** (Real-time gesture command pipeline)
- ✅ **Windows API** (CreateNamedPipe, ReadFile, ConnectNamedPipe)

### Web Development
- ✅ **WebSocket Communication** (Real-time bidirectional messaging)
- ✅ **REST API** (FastAPI backend endpoints)
- ✅ **React State Management** (Complex game state handling)
- ✅ **Custom React Hooks** (Backend connection management)

### AI/ML
- ✅ **Computer Vision** (MediaPipe hand tracking)
- ✅ **Machine Learning** (21-point hand landmark detection)

## 📚 Documentation

- **[backend/README.md](backend/README.md)** - Backend-specific documentation

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Framer Motion** - Animations

### Backend
- **Python 3.8+** - Backend language
- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **MediaPipe** - Hand tracking
- **OpenCV** - Computer vision
- **WebSocket** - Real-time communication

### Systems
- **C** - Motion controller
- **Windows Named Pipes** - IPC
- **WebSocket** - Real-time communication

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- **MediaPipe** - Google's hand tracking solution
- **Next.js Team** - Amazing React framework
- **FastAPI** - Modern Python web framework

---

**Built with Python, C, Next.js, React, and ❤️**

🐍 Point your finger and play! 👆✨

---

Built by Siddharth Pendyala, Palash Doshi, Viraj Mishra, Keshav Khandelwal