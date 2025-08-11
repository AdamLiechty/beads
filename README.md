# Kangaroo Rat Game

Live at https://kr.levitable.org

A React-based game where you control a kangaroo rat that moves around a grid, following a sequences of beads that code for directions on the grid, eating seeds avoiding snakes. Use this to introduce kids to the idea of an algorithm... in this case, by adding colored beads onto a bracelet that stand for UP, RIGHT, DOWN, and LEFT.

## 🎮 Game Features

- 🦘 **Kangaroo Rat Character**: Control a kangaroo rat that moves around a grid
- 🎯 **Bead Sequence Movement**: Follow colored bead sequences (Red - Right, Yellow - Down, Green - Left, Blue - Up, Black - Start of sequence, White - end of sequence)
- 🌱 **Seed Collection**: Find as many seeds as you can!
- 🐍 **Snake Avoidance**: If you run into a snake, you'll jump and flip to escape, but scamper back to your home, to continue your sequence.
- 🎨 **Smart Bead Detection**: Computer vision detects bead colors from a photo taken of the bracelet
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🧪 **Test Mode**: Use static images for testing bead detection and game mechanics without camera access

## 🔍 Bead Detection Technology

The game includes sophisticated bead color detection that:

- 📹 **Camera**: Take photo of bracelet for bead analysis
- 🎯 **Individual Bead Detection**: Finds edges and uses heuristics to identify individual beads around the ring.
- 🔢 **Ordered Color Sequence**: Extracts colors in the exact order they appear, starting at the black bead and proceeding around the ring to the ending white bead.
- 🎨 **Hex & RGB Values**: Shows both hexadecimal and RGB color values

## 🎯 How to Play

### 1. **Bead Detection Phase**
1. **Start Camera**: Click "Start Camera" to activate your device's camera
2. **Capture Bead Photo**: Take a photo of your bead sequence
3. **Analyze Beads**: The system automatically detects and orders the beads
4. **Review Sequence**: Check the detected bead sequence in the text box

### 2. **Game Phase**
1. **Set Bead Sequence**: Use the detected sequence or manually edit it
2. **Click "Go"**: Start the kangaroo rat's movement
3. **Watch Movement**: The rat follows the bead sequence:
   - 🔴 **Red (R)**: Move Right
   - 🟡 **Yellow (Y)**: Move Down
   - 🟢 **Green (G)**: Move Left
   - 🔵 **Blue (B)**: Move Up
   - ⚫ **Black (K)**: Signals start of the sequence
   - ⚪ **White (W)**: Signals end of the sequence
4. **Collect Seeds**: The kangaroo rat automatically eats seeds along its path
5. **Reset & Repeat**: Use "Reset Map" to start over and re-run your movement algorithm.

## 🚀 Getting Started

### Prerequisites

- Node.js (version 20 or higher)
- A modern web browser with camera access (for bead detection)
- Camera permissions enabled (for live detection)

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Game

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

3. Start playing by detecting beads and then controlling the kangaroo rat!

## 🎮 Game Controls

- **Direction Pad**: Shows the current movement direction
- **Bead Sequence**: Visual representation of the current bead sequence
- **Reset Map**: Start over with a clean grid
- **Reset Everything**: Clear all game state and start fresh

## 🧪 Test Mode

You can test the bead detection with static images without needing camera access:

1. **Add Test Images**: Place your test images in the `public/` directory
2. **Use Query Parameter**: Add `?test=yourimage.jpg` to the URL
   - Example: `http://localhost:5173?test=testbeads.jpg`
3. **Start Detection**: The system automatically analyzes the image
4. **View Results**: Beads will be detected and displayed in order

**Available Test Images:**
- `testbeads.jpg` - Sample beads image for testing

## 🔧 Technical Details

### Bead Detection Algorithm

The game uses advanced computer vision techniques:

1. **Image Preprocessing**: Converts image to binary mask using brightness thresholds
2. **Connected Component Analysis**: Finds connected regions of similar pixels
3. **Circularity Detection**: Analyzes shape properties to identify circular beads
4. **Color Extraction**: Determines dominant color for each detected bead
5. **Position Sorting**: Orders beads by their spatial position
6. **Duplicate Removal**: Eliminates overlapping or duplicate detections

### Detection Parameters

- **Minimum Bead Size**: 50 pixels (filters out noise)
- **Maximum Bead Size**: 5000 pixels (filters out large objects)
- **Circularity Threshold**: >3 (ensures roughly circular shapes)
- **Brightness Range**: 30-220 (excludes very dark/light pixels)
- **Duplicate Distance**: <30 pixels (removes overlapping detections)

### Color Classification

The system intelligently classifies bead colors:
- **Red (R)**: Hue 325°-30° (with vibrancy/brightness checks)
- **Yellow (Y)**: Hue 30°-90°
- **Green (G)**: Hue 85°-185°
- **Blue (B)**: Hue 185°-325°
- **Black (K)**: Very low brightness and saturation
- **White (W)**: High brightness, low saturation (including low-vibrancy "red" beads)

## 🏗️ Project Structure

```
src/
├── App.jsx              # Main application component with bead detection
├── App.css              # Application styles
├── index.css            # Global styles
├── main.jsx             # Application entry point
└── components/
    ├── KRMap.jsx        # Kangaroo rat game map and logic
    ├── KRMap.css        # Map component styles
    ├── DirectionPad.jsx # Direction indicator
    ├── DirectionPad.css # Direction pad styles
    ├── BeadSequence.jsx # Bead sequence visualization
    └── BeadSequence.css # Bead sequence styles
public/
├── testbeads.jpg        # Sample test image
├── kr.png              # Kangaroo rat character
├── s1.png-s5.png       # Seed images
└── vite.svg            # Vite logo
```

### Key Technologies

- **React 18**: UI framework
- **Vite**: Build tool and development server
- **OpenCV.js**: Computer vision library for bead detection
- **Canvas API**: Image processing and analysis
- **MediaDevices API**: Camera access
- **CSS Grid & Flexbox**: Responsive layout

## 🌐 Deployment

### GitHub Pages Deployment

This game is configured for automatic deployment to GitHub Pages with custom domain support.

#### Prerequisites
- GitHub repository with your code
- GitHub Actions enabled

#### Automatic Deployment (Recommended)
1. Push your code to the `main` branch
2. GitHub Actions will automatically build and deploy to GitHub Pages
3. Your game will be available at your configured domain

#### Manual Deployment
1. Install dependencies: `npm install`
2. Build the project: `npm run build`
3. Deploy to GitHub Pages: `npm run deploy`

## 🐛 Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Try refreshing the page
- Check if another application is using the camera
- Use test mode with `?test=testbeads.jpg` to verify the app works

### No Beads Detected
- Ensure good lighting conditions
- Hold the camera steady
- Make sure beads are clearly visible and separated
- Try adjusting the distance between camera and beads
- Ensure beads are roughly circular in shape
- Test with the provided sample image first

### Game Not Responding
- Check that a valid bead sequence is entered
- Ensure the sequence contains valid colors (R, Y, G, B, K, W)
- Try resetting the game state

### Performance Issues
- Close other browser tabs
- Reduce browser window size
- Ensure device has sufficient processing power

## 📄 License

This project is open source and available under the MIT License.

---

**Enjoy playing with your kangaroo rat and discovering bead sequences! 🦘🎮**
