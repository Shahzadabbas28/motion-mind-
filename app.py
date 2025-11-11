from flask import Flask, Response, render_template_string, jsonify, send_from_directory, request, session, make_response
import cv2
import mediapipe as mp
import numpy as np
import time
import os
import threading
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'motion-mind-secret-key-change-in-production'  # Change this in production!
CORS(app)  # Enable CORS for all routes

# --- MEDIAPIPE INITIALIZATION ---
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

# Get confidence values from environment variables or use defaults
MIN_DETECTION_CONFIDENCE = float(os.environ.get('MIN_DETECTION_CONFIDENCE', 0.7))
MIN_TRACKING_CONFIDENCE = float(os.environ.get('MIN_TRACKING_CONFIDENCE', 0.7))

hands = mp_hands.Hands(
    min_detection_confidence=MIN_DETECTION_CONFIDENCE, 
    min_tracking_confidence=MIN_TRACKING_CONFIDENCE,
    max_num_hands=1  # Limit to one hand for better performance
)

# --- CAMERA MANAGEMENT ---
camera_lock = threading.Lock()
camera = None
camera_active = False
camera_requested = False  # New flag to track if user has requested camera
camera_error = None  # Track camera errors
camera_initializing = False  # Track if camera is currently initializing

def initialize_camera(max_retries=3):
    global camera, camera_active, camera_requested, camera_error, camera_initializing
    print("Attempting to initialize camera...")
    camera_error = None
    camera_initializing = True
    
    methods_to_try = [
        ("DirectShow, Index 0", cv2.VideoCapture(0, cv2.CAP_DSHOW)),
        ("Default, Index 0", cv2.VideoCapture(0)),
        ("MSMF, Index 0", cv2.VideoCapture(0, cv2.CAP_MSMF)),
        ("Default, Index 1", cv2.VideoCapture(1)),
    ]
    
    for attempt in range(max_retries):
        print(f"Camera initialization attempt {attempt + 1}/{max_retries}")
        for name, cap in methods_to_try:
            try:
                with camera_lock:
                    if cap.isOpened():
                        ret, frame = cap.read()
                        if ret:
                            print(f"✅ Camera successfully initialized with: {name}")
                            camera = cap
                            camera_active = True
                            camera_requested = True
                            camera_error = None
                            camera_initializing = False
                            return cap
                        else:
                            cap.release()
                    else:
                        cap.release()
            except Exception as e:
                print(f"Error initializing camera with {name}: {str(e)}")
                try:
                    cap.release()
                except:
                    pass
        time.sleep(1)  # Wait before retry
    
    print("❌ ERROR: Could not initialize any camera after multiple attempts.")
    camera_active = False
    camera_error = "Camera initialization failed. Please check if camera is connected and not in use by another application."
    camera_initializing = False
    return None

def release_camera():
    global camera, camera_active, camera_requested, camera_error, camera_initializing
    with camera_lock:
        if camera is not None:
            camera.release()
            camera = None
        camera_active = False
        camera_requested = False
        camera_error = None
        camera_initializing = False

# --- USER MANAGEMENT (SIMPLE MOCK DATABASE) ---
# In production, use a real database
users = {
    "user@example.com": {
        "password": generate_password_hash("password"),
        "id": "1"
    }
}

# --- GESTURE DETECTION ---
gesture_state = {"last_gesture": None, "last_gesture_time": 0}
hand_position = {"x": 0, "y": 0, "z": 0, "visible": False}

def detect_gesture(hand_landmarks):
    # Get landmark positions
    thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
    thumb_ip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_IP]
    index_finger_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
    index_finger_pip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_PIP]
    middle_finger_tip = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_TIP]
    middle_finger_pip = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_PIP]
    ring_finger_tip = hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_TIP]
    ring_finger_pip = hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_PIP]
    pinky_tip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_TIP]
    pinky_pip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_PIP]
    
    # 1. One Finger Up (Index finger up) - Drawing
    if (index_finger_tip.y < index_finger_pip.y and 
        middle_finger_tip.y > middle_finger_pip.y and 
        ring_finger_tip.y > ring_finger_pip.y and 
        pinky_tip.y > pinky_pip.y):
        return "one_finger_up"
    
    # 2. Two Fingers Up (Index and Middle) - Erase
    if (index_finger_tip.y < index_finger_pip.y and 
        middle_finger_tip.y < middle_finger_pip.y and 
        ring_finger_tip.y > ring_finger_pip.y and 
        pinky_tip.y > pinky_pip.y):
        return "two_fingers_up"
    
    # 3. Three Fingers Up (Index, middle, ring) - Color change
    if (index_finger_tip.y < index_finger_pip.y and 
        middle_finger_tip.y < middle_finger_pip.y and 
        ring_finger_tip.y < ring_finger_pip.y and 
        pinky_tip.y > pinky_pip.y):
        return "three_fingers_up"
    
    # 4. Thumbs Up - Select/Confirm
    if (thumb_tip.y < index_finger_pip.y and 
        thumb_tip.y < middle_finger_pip.y and 
        thumb_tip.y < ring_finger_pip.y and 
        thumb_tip.y < pinky_pip.y):
        return "thumbs_up"
    
    # 5. Fist - Back/Cancel
    if (index_finger_tip.y > index_finger_pip.y and 
        middle_finger_tip.y > middle_finger_pip.y and 
        ring_finger_tip.y > ring_finger_pip.y and 
        pinky_tip.y > pinky_pip.y):
        return "fist"
    
    # 6. Open Palm - Clear/Reset
    if (index_finger_tip.y < index_finger_pip.y and 
        middle_finger_tip.y < middle_finger_pip.y and 
        ring_finger_tip.y < ring_finger_pip.y and 
        pinky_tip.y < pinky_pip.y and
        thumb_tip.y < thumb_ip.y): # Thumb should also be up
        return "open_palm"
    
    # Default to unknown
    return "unknown"

def update_hand_position(hand_landmarks):
    if hand_landmarks:
        # Use the wrist as a reference point for hand position
        wrist = hand_landmarks.landmark[mp_hands.HandLandmark.WRIST]
        hand_position["x"] = wrist.x
        hand_position["y"] = wrist.y
        hand_position["z"] = wrist.z
        hand_position["visible"] = True
    else:
        hand_position["visible"] = False

# --- FRAME GENERATION ---
frame_skip = 0  # Skip every other frame to reduce processing

@app.route('/update_settings', methods=['POST'])
def update_settings():
    try:
        data = request.get_json()
        if not data:
            return jsonify(success=False, message="No data provided"), 400
        
        # Update gesture sensitivity
        if 'sensitivity' in data:
            sensitivity = int(data['sensitivity'])
            # Update global variables or environment variables
            global MIN_DETECTION_CONFIDENCE, MIN_TRACKING_CONFIDENCE
            # Map sensitivity (1-10) to confidence values (0.5-0.9)
            MIN_DETECTION_CONFIDENCE = 0.5 + (sensitivity / 10) * 0.4
            MIN_TRACKING_CONFIDENCE = 0.5 + (sensitivity / 10) * 0.4
            
            # Reinitialize hands with new confidence values
            global hands
            hands = mp_hands.Hands(
                min_detection_confidence=MIN_DETECTION_CONFIDENCE, 
                min_tracking_confidence=MIN_TRACKING_CONFIDENCE,
                max_num_hands=1
            )
        
        # Update theme (frontend only)
        if 'theme' in data:
            theme = data['theme']
            # Theme is handled entirely in frontend with localStorage
            pass
        
        return jsonify(success=True, message="Settings updated successfully")
    except Exception as e:
        print(f"Settings update error: {str(e)}")
        return jsonify(success=False, message="An error occurred while updating settings"), 500

def generate_frames():
    global frame_skip
    while True:
        # Only generate frames if camera is active
        if camera is None or not camera_active:
            # Return a single frame indicating camera is off
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "CAMERA IS OFF", (150, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.putText(frame, "Click 'Start Camera' to begin", (100, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            success = False
            frame = None
            
            with camera_lock:
                if camera is not None and camera.isOpened():
                    try:
                        success, frame = camera.read()
                    except Exception as e:
                        print(f"Error reading from camera: {str(e)}")
                        success = False
            
            if not success or frame is None:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(frame, "FRAME CAPTURE ERROR", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            else:
                frame_skip += 1
                if frame_skip % 2 != 0:  # Skip every other frame
                    continue
                    
                frame = cv2.flip(frame, 1)
                
                # Convert to RGB for MediaPipe
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                try:
                    results = hands.process(rgb_frame)
                except Exception as e:
                    print(f"Error processing frame with MediaPipe: {str(e)}")
                    results = None

                # Draw hand landmarks
                if results and results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                        
                        # Update hand position
                        update_hand_position(hand_landmarks)
                        
                        # Detect and display gesture
                        gesture = detect_gesture(hand_landmarks)
                        current_time = time.time()
                        if gesture and (current_time - gesture_state["last_gesture_time"] > 1):
                            gesture_state["last_gesture"] = gesture
                            gesture_state["last_gesture_time"] = current_time
                        
                        # Display gesture name in English
                        gesture_names = {
                            "one_finger_up": "One Finger Up - Drawing",
                            "two_fingers_up": "Two Fingers Up - Erase",
                            "three_fingers_up": "Three Fingers Up - Color",
                            "thumbs_up": "Thumbs Up - Select",
                            "fist": "Fist - Back",
                            "open_palm": "Open Palm - Clear",
                            "unknown": "Unknown"
                        }
                        
                        display_text = gesture_names.get(gesture, "Unknown")
                        cv2.putText(frame, f"Gesture: {display_text}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                else:
                    # Update hand visibility when no hands detected
                    hand_position["visible"] = False
                    # Reset gesture state after a delay when no hands detected
                    current_time = time.time()
                    if current_time - gesture_state["last_gesture_time"] > 2:
                        gesture_state["last_gesture"] = None
                    
                    cv2.putText(frame, "No Hands Detected", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        # Add timestamp
        cv2.putText(frame, f"Time: {time.strftime('%H:%M:%S')}", (10, 460), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        try:
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        except Exception as e:
            print(f"Error encoding frame: {str(e)}")
            # Send a blank frame on error
            blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(blank_frame, "FRAME ENCODING ERROR", (100, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            ret, buffer = cv2.imencode('.jpg', blank_frame)
            frame_bytes = buffer.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

# --- FLASK ROUTES ---
@app.route('/')
def index():
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "index.html not found", 404

@app.route('/video_feed')
def video_feed():
    # Only provide video feed if camera is active
    if not camera_active:
        return Response(status=204)  # No Content
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/get_gesture')
def get_gesture():
    return jsonify(gesture=gesture_state["last_gesture"])

@app.route('/get_hand_position')
def get_hand_position():
    return jsonify(hand_position)

@app.route('/game_action/<game_name>')
def game_action(game_name):
    gesture = gesture_state["last_gesture"]
    return jsonify(game=game_name, gesture=gesture, position=hand_position)

@app.route('/login', methods=['POST'])
def login():
    try:
        # Get JSON data if sent as JSON
        if request.is_json:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
        else:
            # Get form data
            email = request.form.get('email')
            password = request.form.get('password')
        
        if not email or not password:
            return jsonify(success=False, message="Email and password are required"), 400
        
        # Find user by email
        user = users.get(email)
        
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['email'] = email
            # Make session permanent
            session.permanent = True
            return jsonify(success=True, message="Login successful")
        else:
            return jsonify(success=False, message="Invalid credentials"), 401
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify(success=False, message="An error occurred during login"), 500

@app.route('/register', methods=['POST'])
def register():
    try:
        # Get JSON data if sent as JSON
        if request.is_json:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
        else:
            # Get form data
            email = request.form.get('email')
            password = request.form.get('password')
        
        if not email or not password:
            return jsonify(success=False, message="Email and password are required"), 400
        
        if email in users:
            return jsonify(success=False, message="Email already exists"), 400
        
        if len(password) < 6:
            return jsonify(success=False, message="Password must be at least 6 characters"), 400
        
        # Create new user
        users[email] = {
            "password": generate_password_hash(password),
            "id": str(len(users) + 1)
        }
        
        session['user_id'] = users[email]['id']
        session['email'] = email
        # Make session permanent
        session.permanent = True
        return jsonify(success=True, message="Registration successful")
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify(success=False, message="An error occurred during registration"), 500

@app.route('/logout', methods=['POST'])
def logout():
    try:
        session.clear()
        return jsonify(success=True, message="Logged out successfully")
    except Exception as e:
        print(f"Logout error: {str(e)}")
        return jsonify(success=False, message="An error occurred during logout"), 500

@app.route('/check_auth')
def check_auth():
    try:
        if 'user_id' in session:
            return jsonify(authenticated=True, email=session.get('email'))
        return jsonify(authenticated=False)
    except Exception as e:
        print(f"Auth check error: {str(e)}")
        return jsonify(authenticated=False)

# --- CAMERA CONTROL ROUTES ---
@app.route('/camera_status')
def camera_status():
    return jsonify(
        active=camera_active, 
        requested=camera_requested, 
        error=camera_error,
        initializing=camera_initializing
    )

@app.route('/start_camera', methods=['POST'])
def start_camera():
    global camera_initializing
    if camera_initializing:
        return jsonify(success=False, error="Camera is already initializing")
    
    if not camera_requested:
        # Start camera initialization in a separate thread
        init_thread = threading.Thread(target=initialize_camera)
        init_thread.daemon = True
        init_thread.start()
        return jsonify(success=True, message="Camera initialization started")
    
    return jsonify(success=camera_active, error=camera_error)

@app.route('/stop_camera', methods=['POST'])
def stop_camera():
    release_camera()
    return jsonify(success=True, message="Camera stopped successfully")

@app.route('/restart_camera', methods=['POST'])
def restart_camera():
    release_camera()
    time.sleep(1)  # Give time for resources to be released
    # Start camera initialization in a separate thread
    init_thread = threading.Thread(target=initialize_camera)
    init_thread.daemon = True
    init_thread.start()
    return jsonify(success=True, message="Camera restart started")

# --- CLEANUP ON APP SHUTDOWN ---
@app.teardown_appcontext
def cleanup(error):
    if error:
        app.logger.error(f"Error: {error}")

# Don't initialize camera on startup
# initialize_camera()  # REMOVED

if __name__ == '__main__':
    try:
        app.run(debug=True, use_reloader=False, host='0.0.0.0', port=5000)
    finally:
        release_camera()