# Motion Mind - AI Gesture Control

A web application that controls whiteboard, games, and presentations through hand gestures.

## Features

- **Gesture Recognition**: Detects 6 different hand gestures
- **Whiteboard**: Draw, erase, and change colors with hand gestures
- **Games**: Play Rock-Paper-Scissors, Basketball, and Magic Spells
- **Presentation Control**: Navigate slides using hand gestures
- **User Authentication**: Login and registration system
- **Responsive Design**: Works on desktop and mobile

## Requirements

- Python 3.7+ (you have 3.10.11 ✓)
- A webcam
- Modern web browser (Chrome, Firefox, Edge)

## Installation

1. Clone this repository
2. Activate your virtual environment
3. Install packages: `pip install -r requirements.txt`
4. Run: `python app.py`
5. Open browser to: `http://localhost:5000`

## Gesture Guide

| Gesture | Action |
|---------|--------|
| One Finger Up | Drawing / Next Slide |
| Two Fingers Up | Erase / Scissors |
| Three Fingers Up | Color Change / Fire Spell |
| Thumbs Up | Select / Shoot |
| Fist | Back / Rock |
| Open Palm | Clear / Paper / Ice Spell |

## How to Use

1. Login or create account
2. Click "Start Camera"
3. Choose Whiteboard, Games, or Presentation
4. Use hand gestures to control

## Project Structure
motion-mind/
├── app.py # Main Flask application
├── index.html # HTML page
├── script.js # JavaScript code
├── style.css # Styling
├── requirements.txt # Python packages
└── README.md # This file
