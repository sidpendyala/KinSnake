"""
Clean Hand Tracking with MediaPipe
Detects finger pointing direction
With ElevenLabs voice narration
"""

import cv2
import mediapipe as mp
import time
import subprocess
import os
from dotenv import load_dotenv
import threading
import signal
import sys
import atexit

# Load environment variables
load_dotenv()

# ElevenLabs imports (new API)
try:
    from elevenlabs.client import ElevenLabs
    import pygame
    import io
    ELEVENLABS_AVAILABLE = True
    # Initialize pygame mixer for audio playback
    pygame.mixer.init()
except ImportError as e:
    ELEVENLABS_AVAILABLE = False
    print(f"[SYSTEM] Voice libraries not installed: {e}")

class HandTracker:
    def __init__(self):
        """Initialize MediaPipe hand tracker"""
        print("=== Hand Tracking System with Voice ===")
        
        # Setup cleanup handlers for Windows termination
        self.setup_signal_handlers()
        
        # ElevenLabs setup
        self.voice_enabled = False
        self.elevenlabs_client = None
        
        if ELEVENLABS_AVAILABLE:
            api_key = os.getenv('ELEVENLABS_API_KEY')
            if api_key and api_key != 'your_api_key_here':
                try:
                    self.elevenlabs_client = ElevenLabs(api_key=api_key)
                    self.voice_id = os.getenv('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM')
                    self.voice_enabled = True
                    print("[SYSTEM] Voice narration enabled")
                except Exception as e:
                    print(f"[SYSTEM] Voice disabled: {e}")
            else:
                print("[SYSTEM] Voice disabled (no API key)")
        else:
            print("[SYSTEM] Voice disabled (ElevenLabs not installed)")
        
        # MediaPipe setup
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_draw = mp.solutions.drawing_utils
        
        # Camera
        self.cap = None
        self.running = False
        
        # Gesture tracking
        self.last_gesture = None
        self.last_gesture_time = 0
        self.gesture_cooldown = 0.002  # 2ms between gestures
        self.last_spoken_gesture = None  # Track last spoken gesture separately
        
        # C controller
        self.c_controller = None
        
        print("[SYSTEM] Ready")
    
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful termination"""
        def signal_handler(signum, frame):
            print("\n[SYSTEM] Termination signal received, cleaning up...")
            self.running = False
            self.cleanup()
            sys.exit(0)
        
        # Handle Windows termination signals
        signal.signal(signal.SIGINT, signal_handler)   # Ctrl+C
        signal.signal(signal.SIGTERM, signal_handler)  # Termination
        if hasattr(signal, 'SIGBREAK'):
            signal.signal(signal.SIGBREAK, signal_handler)  # Windows Ctrl+Break
        
        # Register cleanup on exit
        atexit.register(self.cleanup)
    
    def start_controller(self):
        """Start C controller"""
        try:
            path = os.path.join(os.getcwd(), "c_controller", "motion_controller_persistent.exe")
            if not os.path.exists(path):
                print(f"[SYSTEM] Controller not found")
                return False
            
            self.c_controller = subprocess.Popen([path, "-d", "-l", "controller.log"])
            time.sleep(1)
            print("[SYSTEM] Controller started")
            return True
        except Exception as e:
            print(f"[SYSTEM] Controller error: {e}")
            return False
    
    def start_camera(self):
        """Start camera"""
        try:
            self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                return False
            
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            print("[SYSTEM] Camera ready")
            return True
        except Exception as e:
            print(f"[SYSTEM] Camera error: {e}")
            return False
    
    def detect_pointing_direction(self, hand_landmarks, frame_width, frame_height):
        """Detect which direction the index finger is pointing with improved accuracy"""
        # MediaPipe hand landmarks:
        # 0=wrist, 4=thumb_tip, 5=index_base, 6=index_mid, 7=index_2nd, 8=index_tip
        # 12=middle_tip, 16=ring_tip, 20=pinky_tip
        
        # Get index finger landmarks
        wrist = hand_landmarks.landmark[0]
        index_base = hand_landmarks.landmark[5]
        index_mid = hand_landmarks.landmark[6]
        index_tip = hand_landmarks.landmark[8]
        
        # Check if index finger is extended (tip higher than base)
        # This helps filter out when hand is closed
        if not self.is_finger_extended(hand_landmarks, 8):
            return None, (int(index_tip.x * frame_width), int(index_tip.y * frame_height))
        
        # Convert to pixel coordinates
        tip_x = int(index_tip.x * frame_width)
        tip_y = int(index_tip.y * frame_height)
        mid_x = int(index_mid.x * frame_width)
        mid_y = int(index_mid.y * frame_height)
        base_x = int(index_base.x * frame_width)
        base_y = int(index_base.y * frame_height)
        
        # Calculate pointing direction using vector from base through tip
        # Use both segments for better accuracy
        dx1 = mid_x - base_x
        dy1 = mid_y - base_y
        dx2 = tip_x - mid_x
        dy2 = tip_y - mid_y
        
        # Average the vectors for smoother direction
        dx = (dx1 + dx2) / 2
        dy = (dy1 + dy2) / 2
        
        # Determine direction based on dominant axis
        threshold = 15  # Minimum movement threshold
        
        if abs(dx) > abs(dy) and abs(dx) > threshold:
            if dx > 0:
                return "RIGHT", (tip_x, tip_y)
            else:
                return "LEFT", (tip_x, tip_y)
        elif abs(dy) > abs(dx) and abs(dy) > threshold:
            if dy > 0:
                return "DOWN", (tip_x, tip_y)
            else:
                return "UP", (tip_x, tip_y)
        
        return None, (tip_x, tip_y)
    
    def is_finger_extended(self, hand_landmarks, finger_tip_id):
        """Check if a finger is extended based on tip vs base position"""
        # Finger landmark IDs: thumb=4, index=8, middle=12, ring=16, pinky=20
        # Base IDs are tip_id - 3 (except thumb)
        
        if finger_tip_id == 4:  # Thumb
            tip = hand_landmarks.landmark[4]
            base = hand_landmarks.landmark[2]
        else:  # Other fingers
            tip = hand_landmarks.landmark[finger_tip_id]
            base = hand_landmarks.landmark[finger_tip_id - 2]  # MCP joint
        
        # For index finger (8), check if tip is farther from wrist than base
        wrist = hand_landmarks.landmark[0]
        
        # Calculate distances from wrist
        tip_dist = ((tip.x - wrist.x)**2 + (tip.y - wrist.y)**2)**0.5
        base_dist = ((base.x - wrist.x)**2 + (base.y - wrist.y)**2)**0.5
        
        # Finger is extended if tip is farther from wrist than base
        return tip_dist > base_dist * 1.1  # 10% margin
    
    def speak_gesture(self, gesture):
        """Speak the gesture using ElevenLabs - only when direction changes"""
        if not self.voice_enabled or not self.elevenlabs_client:
            return
        
        # Only speak if gesture changed
        if gesture == self.last_spoken_gesture:
            return
        
        # Update last spoken
        self.last_spoken_gesture = gesture
        
        # Use daemon thread to not block
        def speak():
            try:
                # Just say the direction
                text = gesture.capitalize()  # "UP" -> "Up", "LEFT" -> "Left"
                
                # Generate audio with normal speed
                audio_generator = self.elevenlabs_client.text_to_speech.convert(
                    voice_id=self.voice_id,
                    text=text,
                    model_id="eleven_monolingual_v1"  # Normal quality/speed
                )
                
                # Collect audio bytes
                audio_bytes = b"".join(audio_generator)
                
                # Play using pygame
                audio_stream = io.BytesIO(audio_bytes)
                pygame.mixer.music.load(audio_stream)
                pygame.mixer.music.play()
                
                # Wait for audio to finish before allowing next
                while pygame.mixer.music.get_busy():
                    pygame.time.Clock().tick(10)
                
            except Exception as e:
                # Silent fail to not spam console
                pass
        
        threading.Thread(target=speak, daemon=True).start()
    
    def send_gesture(self, gesture):
        """Send gesture to C controller and narrate"""
        current_time = time.time()
        
        # Rate limiting
        if current_time - self.last_gesture_time < self.gesture_cooldown:
            return
        
        try:
            # Send to C controller
            with open(r"\\.\pipe\vcgi_pipe", 'w') as pipe:
                pipe.write(f"{gesture}\n")
                pipe.flush()
            
            print(f"[SYSTEM] Sent: {gesture}")
            
            # Speak the gesture
            self.speak_gesture(gesture)
            
            self.last_gesture = gesture
            self.last_gesture_time = current_time
        except Exception as e:
            print(f"[SYSTEM] Send error: {e}")
    
    def run(self):
        """Main loop"""
        print("[SYSTEM] Starting...")
        
        # Start controller
        if not self.start_controller():
            print("[SYSTEM] Warning: Controller not started")
        
        # Start camera
        if not self.start_camera():
            print("[SYSTEM] Error: Camera failed")
            return
        
        self.running = True
        print("[SYSTEM] Ready! Point your INDEX FINGER to control")
        print("[SYSTEM] Press 'q' to quit")
        
        window_name = 'Hand Tracking - Point Your Finger'
        
        try:
            while self.running:
                ret, frame = self.cap.read()
                if not ret:
                    break
                
                # Flip for mirror effect
                frame = cv2.flip(frame, 1)
                
                # Convert to RGB for MediaPipe
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self.hands.process(rgb_frame)
                
                frame_height, frame_width = frame.shape[:2]
                
                # Draw instructions
                cv2.putText(frame, "Point your INDEX FINGER: UP, DOWN, LEFT, or RIGHT", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
                # Process hand landmarks
                if results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        # Draw hand skeleton
                        self.mp_draw.draw_landmarks(
                            frame, hand_landmarks, self.mp_hands.HAND_CONNECTIONS)
                        
                        # Detect pointing direction
                        gesture, finger_pos = self.detect_pointing_direction(
                            hand_landmarks, frame_width, frame_height)
                        
                        # Draw finger tip
                        cv2.circle(frame, finger_pos, 10, (0, 255, 0), -1)
                        
                        if gesture:
                            # Draw gesture
                            cv2.putText(frame, f"POINTING: {gesture}", (10, 60), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
                            
                            # Send to controller
                            self.send_gesture(gesture)
                
                # Show frame
                cv2.imshow(window_name, frame)
                
                # Quit check - must come before window check
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    print("\n[SYSTEM] Quit key pressed")
                    break
                
                # Check if window was closed (X button clicked)
                try:
                    if cv2.getWindowProperty(window_name, cv2.WND_PROP_VISIBLE) < 1:
                        print("\n[SYSTEM] Window X button clicked")
                        self.running = False
                        break
                except:
                    # Window was destroyed
                    print("\n[SYSTEM] Window closed")
                    self.running = False
                    break
                
        except KeyboardInterrupt:
            print("\n[SYSTEM] Stopped")
        except Exception as e:
            print(f"\n[SYSTEM] Error: {e}")
        finally:
            self.cleanup()
            # Force exit to ensure everything stops
            os._exit(0)
    
    def cleanup(self):
        """Cleanup - can be called multiple times safely"""
        if not hasattr(self, '_cleaned_up'):
            self._cleaned_up = False
        
        if self._cleaned_up:
            return
        
        self._cleaned_up = True
        print("[SYSTEM] Cleaning up...")
        self.running = False
        
        # Release camera
        if hasattr(self, 'cap') and self.cap:
            try:
                self.cap.release()
            except:
                pass
        
        # Close OpenCV windows
        try:
            cv2.destroyAllWindows()
        except:
            pass
        
        # Close MediaPipe hands
        if hasattr(self, 'hands'):
            try:
                self.hands.close()
            except:
                pass
        
        # Terminate C controller
        if hasattr(self, 'c_controller') and self.c_controller:
            try:
                self.c_controller.terminate()
                self.c_controller.wait(timeout=3)
                print("[SYSTEM] C controller terminated")
            except:
                try:
                    self.c_controller.kill()
                    print("[SYSTEM] C controller force stopped")
                except:
                    pass
        
        print("[SYSTEM] Cleanup complete")

def main():
    tracker = HandTracker()
    tracker.run()

if __name__ == "__main__":
    main()
