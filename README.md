

# Motion Mind - AI Gesture Control

<div align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/Flask-2.3.3-green.svg" alt="Flask Version">
  <img src="https://img.shields.io/badge/MediaPipe-0.10.7-orange.svg" alt="MediaPipe Version">
  <img src="https://img.shields.io/badge/OpenCV-4.8.1-red.svg" alt="OpenCV Version">
  <img src="https://img.shields.io/badge/License-MIT-purple.svg" alt="License">
</div>

<div align="center">
  <h3>🤚 Control your digital world with hand gestures 🤚</h3>
  <p>A revolutionary web application that lets you control whiteboard, games, and presentations through hand gestures using computer vision and MediaPipe.</p>
</div>

## 📸 Demo

<div align="center">
  <img src="https://via.placeholder.com/800x450/1a1a2e/ffffff?text=Motion+Mind+Demo" alt="Motion Mind Demo">
</div>

## 🌟 Features

- **🖐️ Gesture Recognition**: Detects 6 different hand gestures with high accuracy
- **🎨 Whiteboard**: Draw, erase, and change colors with intuitive hand gestures
- **🎮 Games**: Play Rock-Paper-Scissors, Basketball, and Magic Spells games
- **📊 Presentation Control**: Navigate slides seamlessly using hand gestures
- **🔐 User Authentication**: Secure login and registration system
- **📱 Responsive Design**: Works perfectly on desktop and mobile devices
- **🎨 Theme Switching**: Toggle between light and dark themes
- **⚙️ Customizable Sensitivity**: Adjust gesture detection sensitivity to your preference

## 📋 Requirements

- Python 3.7+ (you have 3.10.11 ✓)
- A webcam or camera device
- Modern web browser (Chrome, Firefox, Edge, Safari)

## 🚀 Installation

1. **Clone this repository**
   ```bash
   git clone https://github.com/Shahzadabbas28/motion-mind.git
   cd motion-mind
   ```

2. **Activate your virtual environment**
   ```bash
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install required packages**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

## 🤚 Gesture Guide

| Gesture | Action | Description |
|---------|--------|-------------|
| 👆 One Finger Up | Drawing/Aim | Point with your index finger |
| ✌️ Two Fingers Up | Erase/Scissors | Raise index and middle fingers |
| 🤟 Three Fingers Up | Color Change/Fire Spell | Raise index, middle, and ring fingers |
| 👍 Thumbs Up | Select/Shoot | Give a thumbs up |
| ✊ Fist | Back/Rock | Make a closed fist |
| 🖐️ Open Palm | Clear/Paper/Ice Spell | Show your open palm |

## 📖 How to Use

1. **Login or create account**
2. **Click "Start Camera"** to enable gesture detection
3. **Choose a feature**: Whiteboard, Games, or Presentation
4. **Use hand gestures** to control the application

## 🏗️ Project Structure

```
motion-mind/
├── app.py              # Main Flask application
├── index.html          # HTML page
├── script.js           # JavaScript code
├── style.css           # Styling
├── requirements.txt    # Python packages
└── README.md           # This file
```

## 🖥️ Application Screens

### Dashboard
- View gesture guide
- Access all features
- Control camera

### Whiteboard
- Draw with one finger
- Erase with two fingers
- Change colors with three fingers
- Clear canvas with open palm

### Games
- **Rock-Paper-Scissors**: Use Fist (Rock), Open Palm (Paper), Two Fingers (Scissors)
- **Basketball**: Aim with one finger, shoot with thumbs up
- **Magic Spells**: Cast spells with different gestures

### Presentation
- Navigate slides with gestures
- One Finger Up: Next slide
- Fist: Previous slide
- Open Palm: Start/Stop presentation

### Settings
- Adjust gesture sensitivity
- Switch between light and dark themes

## 🔧 Troubleshooting

### Camera Issues
- Ensure your camera is connected and not in use by another application
- Try restarting the camera using the "Restart Camera" button
- Check browser permissions for camera access

### Gesture Detection Problems
- Ensure good lighting conditions
- Position your hand clearly in front of the camera
- Adjust gesture sensitivity in the settings
- Make sure your entire hand is visible in the frame

### Performance Issues
- Close other applications that might be using the camera
- Ensure your system meets the minimum requirements
- Try reducing gesture sensitivity in settings

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for hand tracking functionality
- [Flask](https://flask.palletsprojects.com/) for the web framework
- [OpenCV](https://opencv.org/) for computer vision operations
- [Font Awesome](https://fontawesome.com/) for icons

## 📞 Contact

- **Phone**: +92300-5704178
- **Email**: shahzadabbas4178@gmail.com

## 🔗 Project Link

[https://github.com/Shahzadabbas28/motion-mind](https://github.com/Shahzadabbas28/motion-mind)

<div align="center">
  <p>Made with ❤️ by Shahzad Abbas</p>
</div>
