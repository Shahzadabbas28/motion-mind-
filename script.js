// script.js – COMPLETE UPDATED VERSION WITH ENGLISH GESTURES
// Fixed camera-gesture linking, independent detection, and status updates

const screens = {
  login: document.getElementById('login-screen'),
  register: document.getElementById('register-screen'),
  dashboard: document.getElementById('dashboard-screen'),
  whiteboard: document.getElementById('whiteboard-screen'),
  games: document.getElementById('games-screen'),
  presentation: document.getElementById('presentation-screen'),
  settings: document.getElementById('settings-screen'),
  profile: document.getElementById('profile-screen'),
  help: document.getElementById('help-screen')
};

const navLinks = document.querySelectorAll('.nav-link');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toRegisterLink = document.getElementById('toRegister');
const toLoginLink = document.getElementById('toLogin');
const profileEmailSpan = document.getElementById('profileEmail');
const profileEmailDisplay = document.getElementById('profileEmailDisplay');
const backButtons = document.querySelectorAll('.back-btn');

// Camera control buttons
const startCameraBtn = document.getElementById('start-camera-btn');
const stopCameraBtn = document.getElementById('stop-camera-btn');
const restartCameraBtn = document.getElementById('restart-camera-btn');
const startMiniCameraBtn = document.getElementById('start-mini-camera-btn');
const stopMiniCameraBtn = document.getElementById('stop-mini-camera-btn');
const startGamesCameraBtn = document.getElementById('start-games-camera-btn');
const stopGamesCameraBtn = document.getElementById('stop-games-camera-btn');
const startPresentationCameraBtn = document.getElementById('start-presentation-camera-btn');
const stopPresentationCameraBtn = document.getElementById('stop-presentation-camera-btn');

// Camera status message
const cameraStatusMessage = document.getElementById('camera-status-message');

let currentUser = null;
let currentGame = null;
let playerScore = 0, computerScore = 0, basketballScore = 0, spellsCast = 0;
let isDrawing = false, lastX = 0, lastY = 0;
let strokes = []; // For undo
const drawingGesture = 'one_finger_up';
const eraseGesture = 'two_fingers_up';
const colorChangeGesture = 'three_fingers_up';
const selectGesture = 'thumbs_up';
const backGesture = 'fist';
const clearGesture = 'open_palm';

// Screen-specific intervals and states
const screenStates = {
  dashboard: {
    gestureInterval: null,
    statusInterval: null,
    gestureUpdateActive: false
  },
  whiteboard: {
    gestureInterval: null,
    statusInterval: null,
    drawingInterval: null,
    gestureUpdateActive: false
  },
  games: {
    gestureInterval: null,
    statusInterval: null,
    gameInterval: null,
    gestureUpdateActive: false
  },
  presentation: {
    gestureInterval: null,
    statusInterval: null,
    presentationInterval: null,
    gestureUpdateActive: false
  }
};

let appIntervals = new Set(); // Use Set for better tracking
let lastGestureUpdate = 0;
// MEDIUM SENSITIVITY - Changed from 150ms to 350ms
const GESTURE_UPDATE_INTERVAL = 350; // ms - Medium sensitivity

// Camera state
let cameraActive = false;
let cameraRequested = false;
let cameraError = null;
let cameraInitializing = false;

// Settings state
let gestureSensitivity = 5;
let currentTheme = 'dark';

// Load settings from localStorage
function loadSettings() {
  const savedSensitivity = localStorage.getItem('gestureSensitivity');
  const savedTheme = localStorage.getItem('theme');
  
  if (savedSensitivity) {
    gestureSensitivity = parseInt(savedSensitivity);
    document.getElementById('gestureSensitivity').value = gestureSensitivity;
  }
  
  if (savedTheme) {
    currentTheme = savedTheme;
    document.getElementById('themeSelect').value = currentTheme;
    applyTheme(currentTheme);
  }
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('gestureSensitivity', gestureSensitivity.toString());
  localStorage.setItem('theme', currentTheme);
}

// Apply theme to the application
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
  } else {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  }
}

// Interval manager
function setAppInterval(fn, delay, screenId = null) {
  const id = setInterval(fn, delay);
  appIntervals.add(id);
  
  // Track screen-specific intervals
  if (screenId && screenStates[screenId]) {
    // Find which type of interval this is
    if (fn.toString().includes('get_gesture')) {
      screenStates[screenId].gestureInterval = id;
    } else if (fn.toString().includes('camera_status')) {
      screenStates[screenId].statusInterval = id;
    } else if (fn.toString().includes('game_action')) {
      screenStates[screenId].gameInterval = id;
    } else if (fn.toString().includes('get_hand_position')) {
      screenStates[screenId].drawingInterval = id;
    } else if (fn.toString().includes('presentation')) {
      screenStates[screenId].presentationInterval = id;
    }
  }
  
  return id;
}

function clearAppInterval(id) {
  clearInterval(id);
  appIntervals.delete(id);
}

function clearAllIntervals() {
  appIntervals.forEach(id => clearInterval(id));
  appIntervals.clear();
  
  // Clear screen-specific intervals
  Object.keys(screenStates).forEach(screenId => {
    screenStates[screenId].gestureInterval = null;
    screenStates[screenId].statusInterval = null;
    screenStates[screenId].drawingInterval = null;
    screenStates[screenId].gameInterval = null;
    screenStates[screenId].presentationInterval = null;
    screenStates[screenId].gestureUpdateActive = false;
  });
}

// === SCREEN NAVIGATION ===
function showScreen(screenId) {
  clearAllIntervals();
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[screenId]) {
    screens[screenId].classList.add('active');

    // DASHBOARD
    if (screenId === 'dashboard') {
      if (currentUser) {
        profileEmailSpan.textContent = currentUser;
        profileEmailDisplay.textContent = currentUser;
      }
      
      // Start camera status polling
      screenStates.dashboard.statusInterval = setAppInterval(() => checkCameraStatus(), 1000, 'dashboard');
      
      // Start gesture updates if camera is active
      if (cameraActive) {
        startWebcam();
        startGestureDetection('dashboard');
      }
    } 
    // WHITEBOARD
    else if (screenId === 'whiteboard') {
      // Start camera status polling
      screenStates.whiteboard.statusInterval = setAppInterval(() => checkCameraStatus(), 1000, 'whiteboard');
      
      // Start gesture detection and drawing if camera is active
      if (cameraActive) {
        startMiniWebcam();
        startGestureDetection('whiteboard');
        startGestureDrawing();
      }
    } 
    // GAMES
    else if (screenId === 'games') {
      // Start camera status polling
      screenStates.games.statusInterval = setAppInterval(() => checkCameraStatus(), 1000, 'games');
      
      // Start gesture detection if camera is active
      if (cameraActive) {
        startMiniWebcam();
        startGestureDetection('games');
        
        // Initialize current game if one is selected
        if (currentGame) {
          if (currentGame === 'basketball') {
            initBasketball();
          } else if (currentGame === 'spells') {
            initSpells();
          } else if (currentGame === 'rps') {
            initRockPaperScissors();
          }
        }
      }
    } 
    // PRESENTATION
    else if (screenId === 'presentation') {
      // Start camera status polling
      screenStates.presentation.statusInterval = setAppInterval(() => checkCameraStatus(), 1000, 'presentation');
      
      // Start gesture detection and presentation control if camera is active
      if (cameraActive) {
        startMiniWebcam();
        startGestureDetection('presentation');
        startPresentationControl();
      }
    } 
    // SETTINGS
    else if (screenId === 'settings') {
      loadSettings();
    }
  }
}

// === AUTH ===
toRegisterLink.addEventListener('click', e => { e.preventDefault(); showScreen('register'); });
toLoginLink.addEventListener('click', e => { e.preventDefault(); showScreen('login'); });

loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  // Show loading state
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  
  fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    credentials: 'same-origin'  // Include cookies for session
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      currentUser = email;
      alert('Login successful!');
      showScreen('dashboard');
    } else {
      alert(data.message || 'Login failed');
    }
  })
  .catch(error => {
    console.error('Login error:', error);
    alert('An error occurred during login');
  })
  .finally(() => {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  });
});

registerForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirmPassword').value;
  
  if (!email) return alert('Enter email');
  if (password !== confirm) return alert('Passwords do not match');
  if (password.length < 6) return alert('Password must be at least 6 characters');
  
  // Show loading state
  const submitBtn = registerForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
  
  fetch('/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    credentials: 'same-origin'  // Include cookies for session
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      currentUser = email;
      alert('Registered & logged in!');
      showScreen('dashboard');
    } else {
      alert(data.message || 'Registration failed');
    }
  })
  .catch(error => {
    console.error('Registration error:', error);
    alert('An error occurred during registration');
  })
  .finally(() => {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  });
});

navLinks.forEach(l => l.addEventListener('click', e => {
  e.preventDefault();
  const t = e.currentTarget.dataset.screen;
  if (t === 'dashboard' && !currentUser) { 
    alert('Login first!'); 
    showScreen('login'); 
    return; 
  }
  showScreen(t);
}));

document.querySelectorAll('.dashboard-buttons .btn').forEach(b => {
  b.addEventListener('click', e => showScreen(e.currentTarget.dataset.screen));
});

backButtons.forEach(b => b.addEventListener('click', () => {
  const t = b.dataset.screen || 'dashboard';
  showScreen(t);
}));

logoutBtn.addEventListener('click', e => {
  e.preventDefault();
  fetch('/logout', {
    method: 'POST',
    credentials: 'same-origin'  // Include cookies for session
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        currentUser = null;
        stopWebcam();
        alert('Logged out.');
        showScreen('login');
      } else {
        alert(data.message || 'Logout failed');
      }
    })
    .catch(error => {
      console.error('Logout error:', error);
      alert('An error occurred during logout');
    });
});

// === CAMERA CONTROL ===
function checkCameraStatus() {
  fetch('/camera_status', {
    credentials: 'same-origin'  // Include cookies for session
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const wasActive = cameraActive;
      cameraActive = data.active;
      cameraRequested = data.requested;
      cameraError = data.error;
      cameraInitializing = data.initializing;
      
      // If camera just turned on, start gesture detection on current screen
      if (!wasActive && cameraActive) {
        const currentScreen = Object.keys(screens).find(screenId => 
          screens[screenId] && screens[screenId].classList.contains('active')
        );
        
        if (currentScreen && currentScreen !== 'login' && currentScreen !== 'register' && 
            currentScreen !== 'settings' && currentScreen !== 'profile' && currentScreen !== 'help') {
          
          // Start mini webcam first
          startMiniWebcam();
          
          // Then start gesture detection
          startGestureDetection(currentScreen);
          
          // Start screen-specific features
          if (currentScreen === 'whiteboard') {
            startGestureDrawing();
          } else if (currentScreen === 'presentation') {
            startPresentationControl();
          } else if (currentScreen === 'games' && currentGame) {
            if (currentGame === 'basketball') {
              initBasketball();
            } else if (currentGame === 'spells') {
              initSpells();
            } else if (currentGame === 'rps') {
              initRockPaperScissors();
            }
          }
        }
      }
      // If camera just turned off, stop everything
      else if (wasActive && !cameraActive) {
        stopMiniWebcam();
        stopGestureDetection();
        stopGestureDrawing();
      }
      
      updateCameraUI();
      
      // If camera is initializing, check again after a short delay
      if (cameraInitializing) {
        setTimeout(checkCameraStatus, 1000);
      }
    })
    .catch(error => {
      console.error('Camera status check error:', error);
      cameraActive = false;
      cameraError = "Failed to check camera status";
      updateCameraUI();
    });
}

function updateCameraUI() {
  // Dashboard camera controls
  if (startCameraBtn && stopCameraBtn && restartCameraBtn) {
    if (cameraActive) {
      startCameraBtn.style.display = 'none';
      stopCameraBtn.style.display = 'inline-block';
      restartCameraBtn.style.display = 'inline-block';
    } else {
      startCameraBtn.style.display = 'inline-block';
      stopCameraBtn.style.display = 'none';
      restartCameraBtn.style.display = 'none';
    }
  }
  
  // Update webcam visibility - ALWAYS SHOW CONTAINER
  const webcamContainer = document.querySelector('.webcam-container');
  const webcamImg = document.getElementById('webcam');
  
  if (webcamContainer && webcamImg) {
    webcamContainer.style.display = 'block'; // Always show container
    if (cameraActive) {
      if (!webcamImg.src || webcamImg.src.endsWith('/')) {
        webcamImg.src = '/video_feed';
      }
    } else {
      webcamImg.src = '';
    }
  }
  
  // Update mini webcam visibility - FIX FOR ALL SCREENS
  const miniWebcamContainers = document.querySelectorAll('.mini-webcam-container');
  miniWebcamContainers.forEach(container => {
    const wrapper = container.querySelector('.webcam-wrapper');
    const miniWebcamImg = container.querySelector('#mini-webcam');
    const startBtn = container.querySelector('[id*="start"][id*="camera-btn"]');
    const stopBtn = container.querySelector('[id*="stop"][id*="camera-btn"]');
    
    if (wrapper && miniWebcamImg) {
      if (cameraActive) {
        wrapper.style.display = 'block';
        if (!miniWebcamImg.src || miniWebcamImg.src.endsWith('/')) {
          miniWebcamImg.src = '/video_feed';
        }
      } else {
        wrapper.style.display = 'none';
        miniWebcamImg.src = '';
      }
    }
    
    // Update button visibility
    if (startBtn && stopBtn) {
      if (cameraActive) {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
      } else {
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
      }
    }
  });
  
  // Update loading indicators
  const loadingIndicators = document.querySelectorAll('.webcam-loading');
  loadingIndicators.forEach(indicator => {
    if (cameraActive) {
      indicator.style.display = 'none';
    } else {
      indicator.innerHTML = '<i class="fas fa-video-slash"></i> Camera is off';
      indicator.style.display = 'flex';
    }
  });
}

// Dashboard camera controls
if (startCameraBtn) {
  startCameraBtn.addEventListener('click', () => {
    // Show loading state
    startCameraBtn.disabled = true;
    startCameraBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    
    fetch('/start_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // Camera initialization started, wait for status update
          console.log(data.message || 'Camera initialization started');
          
          // Poll for camera status until it's active or there's an error
          const statusCheckInterval = setInterval(() => {
            fetch('/camera_status', {
              credentials: 'same-origin'  // Include cookies for session
            })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
              })
              .then(statusData => {
                if (statusData.active) {
                  clearInterval(statusCheckInterval);
                  cameraActive = true;
                  cameraRequested = true;
                  cameraError = null;
                  cameraInitializing = false;
                  updateCameraUI();
                  startWebcam();
                  
                  // Start gesture detection on current screen
                  const currentScreen = Object.keys(screens).find(screenId => 
                    screens[screenId] && screens[screenId].classList.contains('active')
                  );
                  
                  if (currentScreen && currentScreen !== 'login' && currentScreen !== 'register' && 
                      currentScreen !== 'settings' && currentScreen !== 'profile' && currentScreen !== 'help') {
                    
                    // Start mini webcam first
                    startMiniWebcam();
                    
                    // Then start gesture detection
                    startGestureDetection(currentScreen);
                    
                    // Start screen-specific features
                    if (currentScreen === 'whiteboard') {
                      startGestureDrawing();
                    } else if (currentScreen === 'presentation') {
                      startPresentationControl();
                    } else if (currentScreen === 'games' && currentGame) {
                      if (currentGame === 'basketball') {
                        initBasketball();
                      } else if (currentGame === 'spells') {
                        initSpells();
                      } else if (currentGame === 'rps') {
                        initRockPaperScissors();
                      }
                    }
                  }
                } else if (statusData.error) {
                  clearInterval(statusCheckInterval);
                  cameraError = statusData.error;
                  updateCameraUI();
                  alert(cameraError);
                } else if (!statusData.initializing) {
                  clearInterval(statusCheckInterval);
                  // Initialization completed but not active
                  cameraError = "Camera initialization completed but camera is not active";
                  updateCameraUI();
                  alert(cameraError);
                }
              })
              .catch(error => {
                clearInterval(statusCheckInterval);
                console.error('Camera status check error:', error);
                cameraError = "Failed to check camera status";
                updateCameraUI();
                alert(cameraError);
              });
          }, 1000);
        } else {
          cameraError = data.error || 'Failed to start camera';
          updateCameraUI();
          alert(cameraError);
        }
        
        // Reset button state
        startCameraBtn.disabled = false;
        startCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
      })
      .catch(error => {
        console.error('Camera start error:', error);
        cameraError = 'An error occurred while starting the camera';
        updateCameraUI();
        alert(cameraError);
        
        // Reset button state
        startCameraBtn.disabled = false;
        startCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
      });
  });
}

if (stopCameraBtn) {
  stopCameraBtn.addEventListener('click', () => {
    fetch('/stop_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          cameraActive = false;
          cameraRequested = false;
          cameraError = null;
          updateCameraUI();
          stopWebcam();
          stopGestureDetection();
          stopGestureDrawing();
        } else {
          alert('Failed to stop camera');
        }
      })
      .catch(error => {
        console.error('Camera stop error:', error);
        alert('An error occurred while stopping the camera');
      });
  });
}

if (restartCameraBtn) {
  restartCameraBtn.addEventListener('click', () => {
    fetch('/restart_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          console.log(data.message || 'Camera restart started');
          // Camera restart started, wait for status update
        } else {
          cameraError = data.error || 'Failed to restart camera';
          updateCameraUI();
          alert(cameraError);
        }
      })
      .catch(error => {
        console.error('Camera restart error:', error);
        cameraError = 'An error occurred while restarting the camera';
        updateCameraUI();
        alert(cameraError);
      });
  });
}

// Whiteboard camera controls
if (startMiniCameraBtn) {
  startMiniCameraBtn.addEventListener('click', () => {
    fetch('/start_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          console.log(data.message || 'Camera initialization started');
          
          // Start mini webcam immediately
          startMiniWebcam();
          
          // Start gesture detection
          startGestureDetection('whiteboard');
          
          // Start drawing
          startGestureDrawing();
        } else {
          cameraError = data.error || 'Failed to start camera';
          updateCameraUI();
          alert(cameraError);
        }
      })
      .catch(error => {
        console.error('Camera start error:', error);
        cameraError = 'An error occurred while starting the camera';
        updateCameraUI();
        alert(cameraError);
      });
  });
}

if (stopMiniCameraBtn) {
  stopMiniCameraBtn.addEventListener('click', () => {
    fetch('/stop_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          cameraActive = false;
          cameraRequested = false;
          cameraError = null;
          updateCameraUI();
          stopMiniWebcam();
          stopGestureDetection();
          stopGestureDrawing();
        } else {
          alert('Failed to stop camera');
        }
      })
      .catch(error => {
        console.error('Camera stop error:', error);
        alert('An error occurred while stopping the camera');
      });
  });
}

// Games camera controls
if (startGamesCameraBtn) {
  startGamesCameraBtn.addEventListener('click', () => {
    // Show loading state
    startGamesCameraBtn.disabled = true;
    startGamesCameraBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    
    fetch('/start_camera', { 
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.success) {
          console.log(data.message || 'Camera initialization started');
          
          // Start mini webcam immediately
          startMiniWebcam();
          
          // Start gesture detection
          startGestureDetection('games');
          
          // Initialize current game if one is selected
          if (currentGame) {
            if (currentGame === 'basketball') {
              initBasketball();
            } else if (currentGame === 'spells') {
              initSpells();
            } else if (currentGame === 'rps') {
              initRockPaperScissors();
            }
          }
          
          // Remove any camera notice
          const gameContainer = document.getElementById(`${currentGame}-game`);
          if (gameContainer) {
            const notice = gameContainer.querySelector('.camera-notice');
            if (notice) notice.remove();
          }
        } else {
          cameraError = data.error || 'Failed to start camera';
          updateCameraUI();
          alert(cameraError);
        }
        
        // Reset button state
        startGamesCameraBtn.disabled = false;
        startGamesCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
      })
      .catch(error => {
        console.error('Camera start error:', error);
        cameraError = 'An error occurred while starting the camera';
        updateCameraUI();
        alert(cameraError);
        
        // Reset button state
        startGamesCameraBtn.disabled = false;
        startGamesCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
      });
  });
}

if (stopGamesCameraBtn) {
  stopGamesCameraBtn.addEventListener('click', () => {
    fetch('/stop_camera', { 
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.success) {
          cameraActive = false;
          cameraRequested = false;
          cameraError = null;
          updateCameraUI();
          stopMiniWebcam();
          stopGestureDetection();
          
          // Clear game-specific intervals
          if (screenStates.games.drawingInterval) {
            clearAppInterval(screenStates.games.drawingInterval);
            screenStates.games.drawingInterval = null;
          }
        } else {
          alert('Failed to stop camera');
        }
      })
      .catch(error => {
        console.error('Camera stop error:', error);
        alert('An error occurred while stopping the camera');
      });
  });
}

// Presentation camera controls
if (startPresentationCameraBtn) {
  startPresentationCameraBtn.addEventListener('click', () => {
    fetch('/start_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          console.log(data.message || 'Camera initialization started');
          
          // Start mini webcam immediately
          startMiniWebcam();
          
          // Start gesture detection
          startGestureDetection('presentation');
          
          // Start presentation control
          startPresentationControl();
        } else {
          cameraError = data.error || 'Failed to start camera';
          updateCameraUI();
          alert(cameraError);
        }
      })
      .catch(error => {
        console.error('Camera start error:', error);
        cameraError = 'An error occurred while starting the camera';
        updateCameraUI();
        alert(cameraError);
      });
  });
}

if (stopPresentationCameraBtn) {
  stopPresentationCameraBtn.addEventListener('click', () => {
    fetch('/stop_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          cameraActive = false;
          cameraRequested = false;
          cameraError = null;
          updateCameraUI();
          stopMiniWebcam();
          stopGestureDetection();
        } else {
          alert('Failed to stop camera');
        }
      })
      .catch(error => {
        console.error('Camera stop error:', error);
        alert('An error occurred while stopping the camera');
      });
  });
}

// === WEBCAM ===
const video = document.getElementById('webcam');
const miniVideo = document.getElementById('mini-webcam');

function startWebcam() {
  if (!video || !cameraActive) return;
  
  // Show loading indicator
  const loadingIndicator = document.querySelector('#dashboard-screen .webcam-loading');
  if (loadingIndicator) {
    loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading camera...';
    loadingIndicator.style.display = 'flex';
  }
  
  video.src = '/video_feed';
  video.onload = () => {
    console.log('Dashboard webcam loaded');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  };
  
  video.onerror = () => {
    console.error('Camera failed to load');
    if (loadingIndicator) {
      loadingIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Camera error';
    }
  };
}

function stopWebcam() { 
  if (video) video.src = ''; 
}

function startMiniWebcam() {
  if (!miniVideo || !cameraActive) return;
  
  // Show loading indicator
  const loadingIndicators = document.querySelectorAll('.side-panel .webcam-loading');
  loadingIndicators.forEach(indicator => {
    if (indicator) {
      indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading camera...';
      indicator.style.display = 'flex';
    }
  });
  
  miniVideo.src = '/video_feed';
  miniVideo.onload = () => { 
    loadingIndicators.forEach(indicator => {
      if (indicator) indicator.style.display = 'none'; 
    });
  };
  
  miniVideo.onerror = () => { 
    loadingIndicators.forEach(indicator => {
      if (indicator) {
        indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Camera error'; 
      }
    });
  };
}

function stopMiniWebcam() {
  if (miniVideo) miniVideo.src = '';
  const loadingIndicators = document.querySelectorAll('.side-panel .webcam-loading');
  loadingIndicators.forEach(indicator => {
    if (indicator) { 
      indicator.innerHTML = '<i class="fas fa-video-slash"></i> Camera is off'; 
      indicator.style.display = 'flex'; 
    }
  });
}

// === GESTURE DETECTION ===
function startGestureDetection(screenId) {
  if (!cameraActive || !screenStates[screenId] || screenStates[screenId].gestureUpdateActive) return;
  
  // Stop any existing gesture detection for this screen
  if (screenStates[screenId].gestureInterval) {
    clearAppInterval(screenStates[screenId].gestureInterval);
  }
  
  screenStates[screenId].gestureUpdateActive = true;
  
  // Start gesture polling for this screen
  screenStates[screenId].gestureInterval = setAppInterval(() => {
    const now = Date.now();
    if (now - lastGestureUpdate < GESTURE_UPDATE_INTERVAL) return;
    
    lastGestureUpdate = now;
    fetch('/get_gesture', {
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Update gesture UI for this screen
        updateGestureUIForScreen(screenId, data.gesture);
        
        // Screen-specific gesture handling
        if (screenId === 'games' && data.gesture && data.gesture !== 'unknown') {
          handleGameGesture(data.gesture);
        } else if (screenId === 'presentation' && data.gesture && data.gesture !== 'unknown') {
          handlePresentationGesture(data.gesture);
        }
      })
      .catch(error => {
        console.error('Error fetching gesture:', error);
        updateGestureUIForScreen(screenId, null);
      });
  }, 350, screenId); // Using medium sensitivity interval
}

function stopGestureDetection() {
  // Stop gesture detection for all screens
  Object.keys(screenStates).forEach(screenId => {
    if (screenStates[screenId].gestureInterval) {
      clearAppInterval(screenStates[screenId].gestureInterval);
      screenStates[screenId].gestureInterval = null;
    }
    screenStates[screenId].gestureUpdateActive = false;
  });
  
  // Reset gesture UI
  updateGestureUIForScreen('dashboard', null);
  updateGestureUIForScreen('whiteboard', null);
  updateGestureUIForScreen('games', null);
  updateGestureUIForScreen('presentation', null);
}

function updateGestureUIForScreen(screenId, gesture) {
  // Find the gesture status elements for this screen
  const screen = screens[screenId];
  if (!screen) return;
  
  // Get all possible gesture status elements in this screen
  const currentGestureEls = screen.querySelectorAll('#current-gesture');
  const gestureDotEls = screen.querySelectorAll('#gesture-dot');
  const gestureFeedbackEls = screen.querySelectorAll('#gesture-feedback');
  
  const names = {
    "one_finger_up": "One Finger Up",
    "two_fingers_up": "Two Fingers Up",
    "three_fingers_up": "Three Fingers Up",
    "thumbs_up": "Thumbs Up",
    "fist": "Fist",
    "open_palm": "Open Palm",
    "unknown": "None"
  };
  
  const name = names[gesture] || "None";
  
  // Update all gesture status elements in this screen
  currentGestureEls.forEach(el => {
    if (el) el.textContent = name;
  });
  
  gestureDotEls.forEach(el => {
    if (el) el.classList.toggle('active', gesture && gesture !== 'unknown');
  });
  
  gestureFeedbackEls.forEach(el => {
    if (el) el.textContent = gesture && gesture !== 'unknown' ? `Detected: ${name}` : "Waiting for gesture...";
  });
}

// === GAMES ===
function initGame(name) {
  clearAllIntervals();
  document.querySelectorAll('.game-container').forEach(c => c.classList.add('hidden'));
  document.getElementById(`${name}-game`).classList.remove('hidden');
  currentGame = name;

  // Start gesture detection if camera is active
  if (cameraActive) {
    startGestureDetection('games');
    
    // Initialize the specific game
    if (name === 'rps') {
      initRockPaperScissors();
    } else if (name === 'basketball') {
      initBasketball();
    } else if (name === 'spells') {
      initSpells();
    }
  } else {
    // Show message to start camera
    const gameContainer = document.getElementById(`${name}-game`);
    if (gameContainer) {
      const message = document.createElement('div');
      message.className = 'camera-notice';
      message.innerHTML = '<i class="fas fa-video-slash"></i> Please start the camera to play this game';
      message.style.padding = '1rem';
      message.style.background = 'rgba(255, 107, 107, 0.2)';
      message.style.borderRadius = '8px';
      message.style.marginBottom = '1rem';
      message.style.textAlign = 'center';
      
      // Remove any existing notice
      const existingNotice = gameContainer.querySelector('.camera-notice');
      if (existingNotice) existingNotice.remove();
      
      // Insert at the beginning of the game container
      gameContainer.insertBefore(message, gameContainer.firstChild);
    }
  }
}

function handleGameGesture(gesture) {
  if (!currentGame) return;
  
  if (currentGame === 'rps') {
    playRPS(gesture);
  } else if (currentGame === 'basketball') {
    handleBasketballGesture(gesture);
  } else if (currentGame === 'spells') {
    castSpell(gesture);
  }
}

function initRockPaperScissors() {
  playerScore = computerScore = 0;
  updateRPSScore();
  
  // Add visual feedback for gesture detection
  const playerGestureEl = document.getElementById('player-gesture');
  if (playerGestureEl) {
    playerGestureEl.style.transition = 'all 0.3s ease';
  }
}

function playRPS(g) {
  const map = { 'fist': 'rock', 'open_palm': 'paper', 'two_fingers_up': 'scissors' };
  const p = map[g]; 
  if (!p) return;
  
  const playerGestureEl = document.getElementById('player-gesture');
  const computerGestureEl = document.getElementById('computer-gesture');
  const gameResultEl = document.getElementById('game-result');
  
  if (!playerGestureEl || !computerGestureEl || !gameResultEl) return;
  
  // Animate player gesture
  playerGestureEl.style.transform = 'scale(1.2)';
  playerGestureEl.textContent = p;
  
  // Generate computer choice with animation
  setTimeout(() => {
    const choices = ['rock', 'paper', 'scissors'];
    const c = choices[Math.floor(Math.random() * 3)];
    computerGestureEl.style.transform = 'scale(1.2)';
    computerGestureEl.textContent = c;
    
    // Determine result
    let res = p === c ? "Tie!" : 
      (p === 'rock' && c === 'scissors') || 
      (p === 'paper' && c === 'rock') || 
      (p === 'scissors' && c === 'paper') ? 
      (playerScore++, "You win!") : 
      (computerScore++, "Computer wins!");
      
    gameResultEl.textContent = res;
    updateRPSScore();
    
    // Reset animations
    setTimeout(() => {
      playerGestureEl.style.transform = 'scale(1)';
      computerGestureEl.style.transform = 'scale(1)';
    }, 500);
  }, 300);
}

function updateRPSScore() {
  const playerScoreEl = document.getElementById('player-score');
  const computerScoreEl = document.getElementById('computer-score');
  
  if (playerScoreEl) playerScoreEl.textContent = playerScore;
  if (computerScoreEl) computerScoreEl.textContent = computerScore;
}

function initBasketball() {
  basketballScore = 0;
  const scoreEl = document.getElementById('score');
  if (scoreEl) scoreEl.textContent = `Score: ${basketballScore}`;
  
  const ball = document.getElementById('ball');
  if (ball) {
    ball.style.left = '50%'; 
    ball.style.bottom = '10%';
    ball.style.transition = 'all 0.3s ease';
  }
  
  // Start hand position tracking for aiming
  if (screenStates.games.drawingInterval) {
    clearAppInterval(screenStates.games.drawingInterval);
  }
  
  screenStates.games.drawingInterval = setAppInterval(() => {
    fetch('/get_hand_position', {
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(pos => {
        if (!pos.visible || !ball) return;
        const aimX = pos.x * 100;
        ball.style.left = `${aimX}%`;
      })
      .catch(error => {
        console.error('Hand position error:', error);
      });
  }, 100, 'games');
}

function handleBasketballGesture(gesture) {
  if (gesture === selectGesture) {  // thumbs_up
    shootBall();
  }
}

function shootBall() {
  const ball = document.getElementById('ball');
  const hoop = document.getElementById('hoop');
  const scoreEl = document.getElementById('score');
  
  if (!ball || !hoop || !scoreEl) return;
  
  const ballRect = ball.getBoundingClientRect();
  const hoopRect = hoop.getBoundingClientRect();
  
  // Calculate if ball is aligned with hoop
  const isAligned = Math.abs(ballRect.left + ballRect.width/2 - (hoopRect.left + hoopRect.width/2)) < 50;
  
  // Animate the shot
  ball.style.transition = 'bottom 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  ball.style.bottom = '70%';
  
  setTimeout(() => {
    // Check if shot was successful
    if (isAligned) {
      basketballScore++;
      scoreEl.textContent = `Score: ${basketballScore}`;
      scoreEl.classList.add('success');
      setTimeout(() => scoreEl.classList.remove('success'), 1000);
      
      // Show success animation
      const successMsg = document.createElement('div');
      successMsg.textContent = 'SCORE!';
      successMsg.style.position = 'absolute';
      successMsg.style.top = '30%';
      successMsg.style.left = '50%';
      successMsg.style.transform = 'translateX(-50%)';
      successMsg.style.fontSize = '2rem';
      successMsg.style.fontWeight = 'bold';
      successMsg.style.color = '#51cf66';
      successMsg.style.textShadow = '0 0 10px rgba(81, 207, 102, 0.8)';
      successMsg.style.animation = 'successFade 1s ease-out';
      
      const court = document.querySelector('.basketball-court');
      if (court) {
        court.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 1000);
      }
    }
    
    // Reset ball position
    setTimeout(() => { 
      ball.style.transition = 'none'; 
      ball.style.left = '50%'; 
      ball.style.bottom = '10%'; 
    }, 500);
  }, 1000);
}

function initSpells() {
  spellsCast = 0;
  const spellScoreEl = document.getElementById('spell-score');
  if (spellScoreEl) spellScoreEl.textContent = `Spells Cast: ${spellsCast}`;
  
  // Clear any existing spell effects
  const spellTarget = document.getElementById('spell-target');
  if (spellTarget) {
    spellTarget.innerHTML = '';
  }
}

function castSpell(g) {
  const display = document.getElementById('spell-cast');
  const target = document.getElementById('spell-target');
  
  if (!display || !target) return;
  
  let type, color, emoji;
  if (g === colorChangeGesture) { 
    type = 'Fire'; 
    color = '#ff4500'; 
    emoji = '🔥'; 
  }
  else if (g === clearGesture) { 
    type = 'Ice'; 
    color = '#00bfff'; 
    emoji = '❄️'; 
  }
  else if (g === drawingGesture) { 
    type = 'Lightning'; 
    color = '#ffff00'; 
    emoji = '⚡'; 
  }
  else return;
  
  // Update spell display with animation
  display.textContent = `${type} Spell!`; 
  display.style.color = color;
  display.style.transform = 'scale(1.2)';
  
  // Create spell effect
  const ef = document.createElement('div');
  ef.className = 'spell-effect'; 
  ef.textContent = emoji; 
  ef.style.color = color;
  ef.style.left = `${Math.random() * 80 + 10}%`; 
  ef.style.top = `${Math.random() * 80 + 10}%`;
  ef.style.fontSize = '5rem';
  ef.style.filter = `drop-shadow(0 0 20px ${color})`;
  ef.style.animation = 'spellFloat 2s ease-in-out';
  
  target.appendChild(ef);
  
  // Animate spell effect
  setTimeout(() => { 
    ef.style.transform = 'scale(2)'; 
    ef.style.opacity = '0'; 
  }, 100);
  
  // Remove effect after animation
  setTimeout(() => ef.remove(), 1100);
  
  // Update score
  spellsCast++;
  const spellScoreEl = document.getElementById('spell-score');
  if (spellScoreEl) spellScoreEl.textContent = `Spells Cast: ${spellsCast}`;
  
  // Reset display animation
  setTimeout(() => {
    display.style.transform = 'scale(1)';
  }, 500);
}

// Update game card click handlers
document.querySelectorAll('.game-card').forEach(c => {
  c.addEventListener('click', e => {
    const game = e.currentTarget.dataset.game;
    if (game) initGame(game);
  });
});

// === WHITEBOARD ===
function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  
  return ctx;
}

function startGestureDrawing() {
  if (!cameraActive) return;
  
  const canvas = document.getElementById('whiteboard-canvas');
  if (!canvas) return;
  
  const ctx = setupCanvas(canvas);
  ctx.lineCap = 'round'; 
  ctx.lineJoin = 'round'; 
  ctx.lineWidth = 3;
  ctx.strokeStyle = document.getElementById('colorPicker').value;
  strokes = [];

  // Hand position tracking for drawing
  screenStates.whiteboard.drawingInterval = setAppInterval(() => {
    fetch('/get_hand_position', {
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(pos => {
        if (!pos.visible) { isDrawing = false; return; }
        const x = pos.x * canvas.offsetWidth, y = pos.y * canvas.offsetHeight;
        
        fetch('/get_gesture', {
          credentials: 'same-origin'  // Include cookies for session
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then(g => {
            const ges = g.gesture;

            if (ges === drawingGesture) {
              if (!isDrawing) { isDrawing = true; lastX = x; lastY = y; return; }
              ctx.globalCompositeOperation = 'source-over';
              ctx.lineWidth = 3;
              ctx.strokeStyle = document.getElementById('colorPicker').value;
              ctx.beginPath(); 
              ctx.moveTo(lastX, lastY); 
              ctx.lineTo(x, y); 
              ctx.stroke();
              strokes.push({ 
                type: 'draw', 
                from: {x: lastX, y: lastY}, 
                to: {x, y}, 
                color: ctx.strokeStyle, 
                width: 3 
              });
              lastX = x; lastY = y;
            }
            else if (ges === eraseGesture) {
              if (!isDrawing) { isDrawing = true; lastX = x; lastY = y; return; }
              ctx.globalCompositeOperation = 'destination-out';
              ctx.lineWidth = 20;
              ctx.beginPath(); 
              ctx.moveTo(lastX, lastY); 
              ctx.lineTo(x, y); 
              ctx.stroke();
              strokes.push({ 
                type: 'erase', 
                from: {x: lastX, y: lastY}, 
                to: {x, y}, 
                width: 20 
              });
              lastX = x; lastY = y;
            }
            else if (ges === colorChangeGesture) {
              const hue = Math.floor(pos.x * 360);
              const hex = hslToHex(hue, 100, 50);
              ctx.strokeStyle = hex;
              document.getElementById('colorPicker').value = hex;
            }
            else if (ges === clearGesture) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              strokes = [];
              isDrawing = false;
            }
            else {
              isDrawing = false;
              ctx.globalCompositeOperation = 'source-over';
              ctx.lineWidth = 3;
            }
          })
          .catch(error => {
            console.error('Gesture drawing error:', error);
          });
      })
      .catch(error => {
        console.error('Hand position error:', error);
      });
  }, 50, 'whiteboard');
}

function stopGestureDrawing() {
  // Clear the drawing interval
  if (screenStates.whiteboard.drawingInterval) {
    clearAppInterval(screenStates.whiteboard.drawingInterval);
    screenStates.whiteboard.drawingInterval = null;
  }
}

document.getElementById('undoBtn').addEventListener('click', () => {
  strokes.pop();
  redrawCanvas();
});

function redrawCanvas() {
  const canvas = document.getElementById('whiteboard-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes.forEach(s => {
    ctx.globalCompositeOperation = s.type === 'erase' ? 'destination-out' : 'source-over';
    ctx.lineWidth = s.width;
    if (s.type !== 'erase') ctx.strokeStyle = s.color;
    ctx.beginPath(); 
    ctx.moveTo(s.from.x, s.from.y); 
    ctx.lineTo(s.to.x, s.to.y); 
    ctx.stroke();
  });
}

document.getElementById('clearBtn').addEventListener('click', () => {
  const canvas = document.getElementById('whiteboard-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes = [];
});

document.getElementById('colorPicker').addEventListener('change', e => {
  const canvas = document.getElementById('whiteboard-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = e.target.value;
});

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// === PRESENTATION ===
let currentSlide = 1, totalSlides = 5, presentationActive = false;

function initAlternativePresentation() {
  document.getElementById('total-slides').textContent = totalSlides;
  showSlide(1);
  // Initialize presentation status
  updatePresentationStatus('Ready', 'None');
}

function showSlide(n) {
  document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
  const el = document.querySelector(`[data-slide="${n}"]`);
  if (el) el.classList.add('active');
  document.getElementById('current-slide').textContent = n;
  currentSlide = n;
}

function nextSlideAlternative() { 
  if (currentSlide < totalSlides) { 
    showSlide(currentSlide + 1); 
    updatePresentationStatus('Next Slide', 'Next'); 
  } 
}

function previousSlideAlternative() { 
  if (currentSlide > 1) { 
    showSlide(currentSlide - 1); 
    updatePresentationStatus('Previous Slide', 'Previous'); 
  } 
}

function togglePresentationAlternative() { 
  presentationActive = !presentationActive; 
  updatePresentationStatus(presentationActive ? 'Started' : 'Paused', 'Play/Pause'); 
}

function updatePresentationStatus(action, icon) {
  const statusEl = document.getElementById('presentation-status');
  const lastActionEl = document.getElementById('last-action');
  
  if (statusEl) {
    statusEl.textContent = presentationActive ? 'Running' : 'Paused';
  }
  
  if (lastActionEl) {
    lastActionEl.textContent = `${icon} ${action}`;
  }
}

function handlePresentationGesture(gesture) {
  if (gesture === drawingGesture) nextSlideAlternative();
  else if (gesture === backGesture) previousSlideAlternative();
  else if (gesture === clearGesture) togglePresentationAlternative();
}

document.getElementById('prev-slide-btn')?.addEventListener('click', previousSlideAlternative);
document.getElementById('next-slide-btn')?.addEventListener('click', nextSlideAlternative);

function startPresentationControl() {
  if (!cameraActive) return;
  
  initAlternativePresentation();
  
  // Presentation gesture handling is now handled by handlePresentationGesture
}

// === SETTINGS ===
document.getElementById('settingsForm').addEventListener('submit', e => {
  e.preventDefault();
  
  // Get values from form
  gestureSensitivity = parseInt(document.getElementById('gestureSensitivity').value);
  currentTheme = document.getElementById('themeSelect').value;
  
  // Save to localStorage
  saveSettings();
  
  // Apply theme
  applyTheme(currentTheme);
  
  // Send sensitivity to backend (if needed)
  fetch('/update_settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sensitivity: gestureSensitivity,
      theme: currentTheme
    }),
    credentials: 'same-origin'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      alert('Settings saved successfully!');
    } else {
      alert(data.message || 'Failed to save settings');
    }
  })
  .catch(error => {
    console.error('Settings save error:', error);
    alert('An error occurred while saving settings');
  });
});

// Add event listeners for real-time updates
document.getElementById('gestureSensitivity').addEventListener('input', e => {
  gestureSensitivity = parseInt(e.target.value);
  // You might want to update the UI in real-time here
});

document.getElementById('themeSelect').addEventListener('change', e => {
  currentTheme = e.target.value;
  applyTheme(currentTheme);
});

// === INIT ===
// Check if user is already logged in
fetch('/check_auth', {
  credentials: 'same-origin'  // Include cookies for session
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.authenticated) {
      currentUser = data.email;
      showScreen('dashboard');
    } else {
      showScreen('login');
    }
  })
  .catch(error => {
    console.error('Auth check error:', error);
    showScreen('login');
  });