"""
WebSocket Server for Hand Tracking Integration
Bridges frontend with Python backend and C controller
"""

import asyncio
import json
import cv2
import mediapipe as mp
import numpy as np
import subprocess
import os
from dotenv import load_dotenv
import signal
import sys
import atexit
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import base64
import threading
import time

# Load environment variables
load_dotenv()

# Voice system removed

app = FastAPI(title="KinSnake Backend Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HandTrackingServer:
    def __init__(self):
        print("=== KinSnake Backend Server ===")
        
        # Setup cleanup handlers
        self.setup_signal_handlers()
        
        # Camera setup
        self.cap = None
        self.camera_active = False
        self.selected_handedness = "right"
        self.active_stream_websocket = None  # Track which websocket owns the stream
        self.game_is_running = False  # Track if game is active
        
        # MediaPipe setup (optimized for better tracking)
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            model_complexity=1,  # 1 = balanced (better tracking than 0)
            min_detection_confidence=0.6,  # Higher for better initial detection
            min_tracking_confidence=0.5  # Balanced for smooth tracking
        )
        
        # Gesture tracking - INSTANT response
        self.last_gesture = None
        self.last_gesture_time = 0
        self.gesture_cooldown = 0.05  # 50ms - INSTANT response
        self.gesture_history = []  # Track recent gestures for stability
        self.stable_gesture = None  # Current stable gesture
        
        # C controller
        self.c_controller = None
        self.start_controller()
        
        # Active websocket connections
        self.active_connections: list[WebSocket] = []
        
        # Frame streaming
        self.streaming_active = False
        
        print("[SERVER] Ready")
    
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful termination"""
        def signal_handler(signum, frame):
            print("\n[SERVER] Termination signal received, cleaning up...")
            self.cleanup()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        if hasattr(signal, 'SIGBREAK'):
            signal.signal(signal.SIGBREAK, signal_handler)
        
        atexit.register(self.cleanup)
    
    def start_controller(self):
        """Start bidirectional C controller"""
        try:
            controller_path = Path(__file__).parent / "c_controller" / "motion_controller_bidirectional.exe"
            if not controller_path.exists():
                print(f"[SERVER] Bidirectional controller not found at {controller_path}")
                # Fallback to old controller
                controller_path = Path(__file__).parent / "c_controller" / "motion_controller_persistent.exe"
                if not controller_path.exists():
                    print(f"[SERVER] No controller found")
                    return False
            
            log_path = Path(__file__).parent / "controller.log"
            
            # Check if controller is already running by trying to open the pipe
            try:
                test_pipe = open(r"\\.\pipe\vcgi_pipe", 'w')
                test_pipe.close()
                print("[SERVER] C Controller already running")
                return True
            except:
                pass  # Controller not running, start it
            
            self.c_controller = subprocess.Popen(
                [str(controller_path), "-d", "-l", str(log_path)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_CONSOLE  # Show controller window
            )
            time.sleep(2)  # Give controller more time to create pipe
            print("[SERVER] C Controller started (bidirectional mode)")
            print("[SERVER] Controller window should be visible")
            return True
        except Exception as e:
            print(f"[SERVER] Controller error: {e}")
            return False
    
    def detect_pointing_direction(self, hand_landmarks, frame_width, frame_height):
        """Detect which direction the index finger is pointing with stability"""
        wrist = hand_landmarks.landmark[0]
        index_base = hand_landmarks.landmark[5]
        index_mid = hand_landmarks.landmark[6]
        index_2nd = hand_landmarks.landmark[7]
        index_tip = hand_landmarks.landmark[8]
        
        # Check if index finger is extended
        if not self.is_finger_extended(hand_landmarks, 8):
            return None
        
        # Convert to pixel coordinates
        tip_x = int(index_tip.x * frame_width)
        tip_y = int(index_tip.y * frame_height)
        second_x = int(index_2nd.x * frame_width)
        second_y = int(index_2nd.y * frame_height)
        mid_x = int(index_mid.x * frame_width)
        mid_y = int(index_mid.y * frame_height)
        base_x = int(index_base.x * frame_width)
        base_y = int(index_base.y * frame_height)
        
        # Calculate pointing direction using entire finger
        dx1 = mid_x - base_x
        dy1 = mid_y - base_y
        dx2 = second_x - mid_x
        dy2 = second_y - mid_y
        dx3 = tip_x - second_x
        dy3 = tip_y - second_y
        
        # Weighted average (tip segment weighted more)
        dx = (dx1 + dx2 + dx3 * 2) / 4
        dy = (dy1 + dy2 + dy3 * 2) / 4
        
        # Lower threshold - responsive but clear
        threshold = 15
        
        # Use angles for accurate direction
        if abs(dx) > threshold or abs(dy) > threshold:
            angle = np.arctan2(dy, dx) * 180 / np.pi  # -180 to 180
            
            # Map angles to directions
            if -40 <= angle <= 40:
                detected = "RIGHT"
            elif 50 < angle <= 130:
                detected = "DOWN"
            elif angle > 140 or angle <= -140:
                detected = "LEFT"
            else:  # -130 < angle < -50
                detected = "UP"
            
            # Light stability check: requires 2 out of last 3 frames (FASTER)
            self.gesture_history.append(detected)
            if len(self.gesture_history) > 3:
                self.gesture_history.pop(0)
            
            # Quick confirmation - 2 out of 3 frames
            if len(self.gesture_history) >= 2 and self.gesture_history.count(detected) >= 2:
                return detected
        
        return None
    
    def is_finger_extended(self, hand_landmarks, finger_tip_id):
        """Check if a finger is extended STRICTLY"""
        if finger_tip_id == 4:  # Thumb
            tip = hand_landmarks.landmark[4]
            base = hand_landmarks.landmark[2]
        else:  # Other fingers
            tip = hand_landmarks.landmark[finger_tip_id]
            mid = hand_landmarks.landmark[finger_tip_id - 1]
            base = hand_landmarks.landmark[finger_tip_id - 2]
        
        wrist = hand_landmarks.landmark[0]
        
        # Calculate distances from wrist
        tip_dist = ((tip.x - wrist.x)**2 + (tip.y - wrist.y)**2)**0.5
        base_dist = ((base.x - wrist.x)**2 + (base.y - wrist.y)**2)**0.5
        
        # STRICT check if finger is straight and extended
        if finger_tip_id != 4:
            mid_dist = ((mid.x - wrist.x)**2 + (mid.y - wrist.y)**2)**0.5
            # Finger must be clearly extended AND straight
            is_extended = tip_dist > base_dist * 1.15  # Stricter (was 1.05)
            is_straight = mid_dist > base_dist and mid_dist < tip_dist
            
            # Also check other fingers are NOT extended (only index pointing)
            if finger_tip_id == 8:  # Index finger
                # Check that middle, ring, pinky are curled
                middle_tip = hand_landmarks.landmark[12]
                ring_tip = hand_landmarks.landmark[16]
                pinky_tip = hand_landmarks.landmark[20]
                
                middle_dist = ((middle_tip.x - wrist.x)**2 + (middle_tip.y - wrist.y)**2)**0.5
                ring_dist = ((ring_tip.x - wrist.x)**2 + (ring_tip.y - wrist.y)**2)**0.5
                pinky_dist = ((pinky_tip.x - wrist.x)**2 + (pinky_tip.y - wrist.y)**2)**0.5
                
                # Other fingers should be closer to wrist (curled)
                others_curled = (middle_dist < tip_dist * 0.9 and 
                               ring_dist < tip_dist * 0.9 and 
                               pinky_dist < tip_dist * 0.9)
                
                return is_extended and is_straight and others_curled
            
            return is_extended and is_straight
        
        return tip_dist > base_dist * 1.1
    
    
    def send_to_controller(self, gesture):
        """Send gesture to C controller (only when game is running)"""
        # Only send gestures when game is active
        if not self.game_is_running:
            return None
        
        current_time = time.time()
        
        # Only send if gesture changed or enough time passed
        if gesture == self.last_gesture and current_time - self.last_gesture_time < self.gesture_cooldown:
            return gesture  # Return cached gesture
        
        try:
            # Write only - don't wait for response (non-blocking)
            with open(r"\\.\pipe\vcgi_pipe", 'w', buffering=1) as pipe:
                pipe.write(f"{gesture}\n")
                pipe.flush()
            
            print(f"[SERVER] → C Controller: {gesture}")
            
            
            self.last_gesture = gesture
            self.last_gesture_time = current_time
            return gesture
            
        except Exception as e:
            # C controller not running - silently continue
            return None
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.active_connections.remove(conn)
    
    async def process_frame(self, frame_data: str, handedness: str = "right"):
        """Process frame from frontend and detect gestures"""
        try:
            # Decode base64 frame
            frame_bytes = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return {"error": "Invalid frame"}
            
            # Convert to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.hands.process(rgb_frame)
            
            frame_height, frame_width = frame.shape[:2]
            
            if results.multi_hand_landmarks and results.multi_handedness:
                for hand_landmarks, hand_info in zip(results.multi_hand_landmarks, results.multi_handedness):
                    # Filter by handedness
                    detected_hand = hand_info.classification[0].label.lower()
                    if detected_hand != handedness.lower():
                        continue
                    
                    # Detect gesture
                    gesture = self.detect_pointing_direction(hand_landmarks, frame_width, frame_height)
                    
                    if gesture:
                        # Send to C controller (non-blocking)
                        self.send_to_controller(gesture)
                        
                        # Broadcast to frontend
                        await self.broadcast({
                            "type": "gesture",
                            "direction": gesture,
                            "timestamp": time.time()
                        })
                        
                        return {
                            "success": True,
                            "gesture": gesture,
                            "handDetected": True
                        }
            
            return {"success": True, "handDetected": False}
            
        except Exception as e:
            print(f"[SERVER] Frame processing error: {e}")
            return {"error": str(e)}
    
    def start_camera(self):
        """Start camera capture"""
        if self.camera_active:
            return True
        
        try:
            self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                print("[SERVER] Failed to open camera")
                return False
            
            # High resolution for quality
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            self.camera_active = True
            print("[SERVER] Camera started")
            return True
        except Exception as e:
            print(f"[SERVER] Camera error: {e}")
            return False
    
    def stop_camera(self):
        """Stop camera capture"""
        if self.cap:
            try:
                self.cap.release()
                self.cap = None
            except:
                pass
        self.camera_active = False
        print("[SERVER] Camera stopped")
    
    async def stream_camera_frames(self, websocket: WebSocket):
        """Stream camera frames with hand tracking overlay (optimized for low latency)"""
        # Prevent duplicate streams
        if self.active_stream_websocket is not None:
            print(f"[SERVER] Stream already active, stopping old stream")
            self.streaming_active = False
            await asyncio.sleep(0.2)
        
        if not self.start_camera():
            await websocket.send_json({
                "type": "error",
                "message": "Failed to start camera"
            })
            return
        
        self.streaming_active = True
        self.active_stream_websocket = websocket
        print(f"[SERVER] Starting optimized camera stream for client")
        
        frame_count = 0
        last_frame_time = 0
        last_gesture_broadcast = 0
        
        last_error_time = 0
        
        try:
            while self.streaming_active and self.camera_active:
                try:
                    # Read frame
                    ret, frame = self.cap.read()
                    if not ret:
                        await asyncio.sleep(0.01)
                        continue
                    
                    frame_count += 1
                    current_time = time.time()
                    
                    # Flip for mirror effect
                    frame = cv2.flip(frame, 1)
                    
                    frame_height, frame_width = frame.shape[:2]
                    
                    # Process EVERY frame for maximum responsiveness
                    gesture = None
                    if True:  # Process every frame
                        try:
                            # Convert to RGB for MediaPipe
                            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                            results = self.hands.process(rgb_frame)
                            
                            # Draw hand landmarks if detected
                            if results.multi_hand_landmarks and results.multi_handedness:
                                for hand_landmarks, hand_info in zip(results.multi_hand_landmarks, results.multi_handedness):
                                    # Filter by handedness
                                    detected_hand = hand_info.classification[0].label.lower()
                                    if detected_hand != self.selected_handedness.lower():
                                        continue
                                    
                                    # Draw hand skeleton
                                    self.draw_hand_landmarks(frame, hand_landmarks, frame_width, frame_height)
                                    
                                    # Detect gesture
                                    gesture = self.detect_pointing_direction(hand_landmarks, frame_width, frame_height)
                                    
                                    # Always draw gesture text for visual feedback
                                    if gesture:
                                        # Draw gesture text with background
                                        text = f"POINTING: {gesture}"
                                        font = cv2.FONT_HERSHEY_SIMPLEX
                                        (text_width, text_height), _ = cv2.getTextSize(text, font, 1.2, 2)
                                        
                                        cv2.rectangle(frame, (5, 5), (text_width + 25, text_height + 25), (0, 0, 0), -1)
                                        cv2.rectangle(frame, (5, 5), (text_width + 25, text_height + 25), (0, 255, 0), 3)
                                        cv2.putText(frame, text, (15, text_height + 15), font, 1.2, (0, 255, 0), 2)
                                        
                                        # Only send to controller and broadcast when game is running
                                        if self.game_is_running:
                                            # Send to C controller (non-blocking)
                                            self.send_to_controller(gesture)
                                            
                                            # Broadcast gesture
                                            try:
                                                await self.broadcast({
                                                    "type": "gesture",
                                                    "direction": gesture,
                                                    "timestamp": current_time
                                                })
                                            except Exception as be:
                                                print(f"[SERVER] Broadcast error: {be}")
                                            
                                            last_gesture_broadcast = current_time
                        except Exception as mp_error:
                            # MediaPipe errors shouldn't stop the stream
                            if current_time - last_error_time > 5:
                                print(f"[SERVER] MediaPipe error (continuing): {mp_error}")
                                last_error_time = current_time
                    
                    # Send frames at 15fps
                    if current_time - last_frame_time >= 0.066:
                        try:
                            # Check if websocket is still connected
                            if websocket.client_state.name == "DISCONNECTED":
                                print("[SERVER] WebSocket disconnected, stopping stream")
                                break
                            
                            # Encode with good quality
                            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                            frame_base64 = base64.b64encode(buffer).decode('utf-8')
                            
                            # Send frame (with timeout to prevent blocking)
                            await asyncio.wait_for(
                                websocket.send_json({
                                    "type": "camera_frame",
                                    "frame": f"data:image/jpeg;base64,{frame_base64}",
                                    "timestamp": current_time
                                }),
                                timeout=0.1
                            )
                            last_frame_time = current_time
                        except asyncio.TimeoutError:
                            # Skip this frame if send is too slow
                            pass
                        except RuntimeError as re:
                            # WebSocket closed mid-send
                            print(f"[SERVER] WebSocket closed during send: {re}")
                            break
                        except Exception as send_error:
                            error_str = str(send_error).lower()
                            if "closed" in error_str or "send" in error_str:
                                print(f"[SERVER] WebSocket closed, stopping stream")
                                break
                            print(f"[SERVER] Frame send error: {send_error}")
                    
                    # Small sleep to yield
                    await asyncio.sleep(0.005)
                    
                except Exception as loop_error:
                    # Log but continue
                    if current_time - last_error_time > 5:
                        print(f"[SERVER] Loop error (continuing): {loop_error}")
                        last_error_time = current_time
                    await asyncio.sleep(0.01)
                
        except Exception as e:
            print(f"[SERVER] Fatal streaming error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.streaming_active = False
            if self.active_stream_websocket == websocket:
                self.active_stream_websocket = None
            print("[SERVER] Camera stream stopped")
    
    def draw_hand_landmarks_fast(self, frame, hand_landmarks, frame_width, frame_height):
        """Draw simplified hand landmarks for speed"""
        # Only draw essential lines
        connections = [
            (0, 5), (5, 9), (9, 13), (13, 17),  # Palm
            (5, 6), (6, 7), (7, 8),  # Index finger only
        ]
        
        for start_idx, end_idx in connections:
            start = hand_landmarks.landmark[start_idx]
            end = hand_landmarks.landmark[end_idx]
            
            start_x = int(start.x * frame_width)
            start_y = int(start.y * frame_height)
            end_x = int(end.x * frame_width)
            end_y = int(end.y * frame_height)
            
            cv2.line(frame, (start_x, start_y), (end_x, end_y), (0, 255, 0), 2)
        
        # Draw only key points
        wrist = hand_landmarks.landmark[0]
        index_tip = hand_landmarks.landmark[8]
        
        for landmark in [wrist, index_tip]:
            x = int(landmark.x * frame_width)
            y = int(landmark.y * frame_height)
            cv2.circle(frame, (x, y), 6, (255, 255, 0), -1)
    
    def draw_hand_landmarks(self, frame, hand_landmarks, frame_width, frame_height):
        """Draw ALL 21 hand landmarks with MAXIMUM visibility"""
        # Draw ALL connections for complete skeleton
        all_connections = [
            # Thumb
            (0, 1), (1, 2), (2, 3), (3, 4),
            # Index finger
            (0, 5), (5, 6), (6, 7), (7, 8),
            # Middle finger
            (0, 9), (9, 10), (10, 11), (11, 12),
            # Ring finger
            (0, 13), (13, 14), (14, 15), (15, 16),
            # Pinky
            (0, 17), (17, 18), (18, 19), (19, 20),
            # Palm
            (5, 9), (9, 13), (13, 17)
        ]
        
        # Draw THICK green lines
        for start_idx, end_idx in all_connections:
            start_point = hand_landmarks.landmark[start_idx]
            end_point = hand_landmarks.landmark[end_idx]
            
            start_x = int(start_point.x * frame_width)
            start_y = int(start_point.y * frame_height)
            end_x = int(end_point.x * frame_width)
            end_y = int(end_point.y * frame_height)
            
            # THICK green lines for visibility
            cv2.line(frame, (start_x, start_y), (end_x, end_y), (0, 255, 0), 4)
        
        # Draw ALL 21 landmark dots with color coding
        for idx, landmark in enumerate(hand_landmarks.landmark):
            x = int(landmark.x * frame_width)
            y = int(landmark.y * frame_height)
            
            # Color code by importance
            if idx == 0:
                # WRIST - HUGE CYAN DOT
                cv2.circle(frame, (x, y), 18, (255, 255, 0), -1)  # Cyan
                cv2.circle(frame, (x, y), 18, (255, 255, 255), 4)  # White border
            elif idx == 8:
                # INDEX TIP - HUGE RED DOT (MOST IMPORTANT FOR POINTING)
                cv2.circle(frame, (x, y), 18, (0, 0, 255), -1)  # Red
                cv2.circle(frame, (x, y), 18, (255, 255, 255), 4)  # White border
            elif idx in [4, 12, 16, 20]:
                # Other fingertips - LARGE YELLOW
                cv2.circle(frame, (x, y), 12, (0, 255, 255), -1)  # Yellow
                cv2.circle(frame, (x, y), 12, (0, 255, 0), 3)  # Green border
            else:
                # All other joints - MEDIUM BRIGHT GREEN
                cv2.circle(frame, (x, y), 10, (0, 255, 0), -1)  # Green
                cv2.circle(frame, (x, y), 10, (255, 255, 255), 2)  # White border
        
        # Draw pointing line from wrist to index tip
        wrist = hand_landmarks.landmark[0]
        index_tip = hand_landmarks.landmark[8]
        wrist_x = int(wrist.x * frame_width)
        wrist_y = int(wrist.y * frame_height)
        index_x = int(index_tip.x * frame_width)
        index_y = int(index_tip.y * frame_height)
        cv2.line(frame, (wrist_x, wrist_y), (index_x, index_y), (255, 0, 255), 3)  # Magenta line
    
    def cleanup(self):
        """Cleanup resources"""
        print("[SERVER] Cleaning up...")
        
        self.streaming_active = False
        self.stop_camera()
        
        if hasattr(self, 'hands'):
            try:
                self.hands.close()
            except:
                pass
        
        if hasattr(self, 'c_controller') and self.c_controller:
            try:
                self.c_controller.terminate()
                self.c_controller.wait(timeout=3)
                print("[SERVER] C controller terminated")
            except:
                try:
                    self.c_controller.kill()
                except:
                    pass
        
        print("[SERVER] Cleanup complete")

# Global server instance
server = HandTrackingServer()

@app.get("/")
async def root():
    return {
        "service": "KinSnake Backend Server",
        "status": "running",
        "c_controller_running": server.c_controller is not None and server.c_controller.poll() is None
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "controller": server.c_controller is not None and server.c_controller.poll() is None
    }


@app.get("/test-code-update")
async def test_code_update():
    """Test if server is using updated code"""
    print("[CODE UPDATE TEST] This message proves the server is using updated code!")
    return {"message": "Code update test - check server logs for confirmation"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    server.active_connections.append(websocket)
    print(f"[SERVER] Client connected. Total connections: {len(server.active_connections)}")
    
    stream_task = None
    camera_started_by_this_connection = False
    
    try:
        await websocket.send_json({
            "type": "connected",
            "controller_running": server.c_controller is not None
        })
        
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "start_camera":
                # Start streaming camera feed
                handedness = data.get("handedness", "right")
                server.selected_handedness = handedness
                server.game_is_running = False  # Start with game not running
                print(f"[SERVER] Starting camera stream with {handedness} hand")
                
                # Cancel existing stream if any
                if stream_task and not stream_task.done():
                    server.streaming_active = False
                    stream_task.cancel()
                    await asyncio.sleep(0.1)
                
                # Start new streaming task
                stream_task = asyncio.create_task(server.stream_camera_frames(websocket))
                camera_started_by_this_connection = True
            
            elif data.get("type") == "stop_camera":
                # Stop streaming
                server.streaming_active = False
                if stream_task and not stream_task.done():
                    stream_task.cancel()
                server.stop_camera()
            
            elif data.get("type") == "frame":
                # Process frame and detect gestures (legacy support)
                result = await server.process_frame(
                    data.get("frame"),
                    data.get("handedness", "right")
                )
                await websocket.send_json({
                    "type": "frame_result",
                    **result
                })
            
            elif data.get("type") == "game_state":
                # Frontend telling us game state
                game_running = data.get("running", False)
                server.game_is_running = game_running
                print(f"[SERVER] Game state updated: {'RUNNING' if game_running else 'STOPPED'}")
            
            elif data.get("type") == "command":
                # Direct command from frontend
                gesture = data.get("gesture")
                if gesture:
                    server.send_to_controller(gesture)
                    await server.broadcast({
                        "type": "gesture",
                        "direction": gesture,
                        "timestamp": time.time()
                    })
    
    except WebSocketDisconnect:
        print(f"[SERVER] Client disconnecting (clean)")
    except Exception as e:
        print(f"[SERVER] WebSocket error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up only if this connection started the camera
        if camera_started_by_this_connection:
            server.streaming_active = False
            if stream_task and not stream_task.done():
                stream_task.cancel()
                try:
                    await stream_task
                except asyncio.CancelledError:
                    pass
        
        # Remove from connections
        try:
            server.active_connections.remove(websocket)
        except:
            pass
        
        print(f"[SERVER] Client fully disconnected. Total connections: {len(server.active_connections)}")

@app.on_event("shutdown")
async def shutdown_event():
    server.cleanup()

if __name__ == "__main__":
    print("[SERVER] Starting KinSnake Backend Server on http://localhost:8000")
    print("[SERVER] WebSocket available at ws://localhost:8000/ws")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

