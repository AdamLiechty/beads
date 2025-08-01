# Bead Color Detector

A React single-page application that uses your device's camera to detect individual beads and extract their colors in the order they appear on a string or bracelet.

## Features

- 📹 **Real-time Camera Feed**: Live camera stream in the top-left section
- 🎯 **Individual Bead Detection**: Identifies each bead as a separate circular object
- 🔢 **Ordered Color Sequence**: Displays colors in the exact order they appear on the string/bracelet
- 🎨 **Hex & RGB Values**: Shows both hexadecimal and RGB color values for each bead
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🧠 **Smart Computer Vision**: Uses contour detection and circularity analysis
- ⚡ **Fast Processing**: Updates bead detection every 500ms
- 🧪 **Test Mode**: Use static images for testing without camera access

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- A modern web browser with camera access (for live detection)
- Camera permissions enabled (for live detection)

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

3. Click "Start Camera" to begin detection

## How to Use

### Live Camera Detection
1. **Start Camera**: Click the green "Start Camera" button to activate your device's camera
2. **Point at Beads**: Hold your camera steady and point it at a string or bracelet of beads
3. **View Results**: The detected beads will appear in order with:
   - Numbered bead sequence (1, 2, 3, etc.)
   - Circular color swatches
   - Hexadecimal values (e.g., #FF5733)
   - RGB values (e.g., RGB(255, 87, 51))
   - Summary showing total beads and color sequence
4. **Stop Camera**: Click the red "Stop Camera" button when finished

### Test Mode with Static Images
You can test the bead detection with static images without needing camera access:

1. **Add Test Images**: Place your test images in the `public/` directory
2. **Use Query Parameter**: Add `?test=yourimage.jpg` to the URL
   - Example: `http://localhost:5173?test=testbeads.jpg`
3. **Start Detection**: Click "Start Detection" to analyze the image
4. **View Results**: Beads will be detected and displayed in order as with live camera

**Available Test Images:**
- `testbeads.jpg` - Sample beads image for testing

## Technical Details

### Bead Detection Algorithm

The app uses advanced computer vision techniques:

1. **Image Preprocessing**: Converts image to binary mask using brightness thresholds
2. **Connected Component Analysis**: Finds connected regions of similar pixels
3. **Circularity Detection**: Analyzes shape properties to identify circular beads
4. **Color Extraction**: Determines dominant color for each detected bead
5. **Position Sorting**: Orders beads by their spatial position (left-to-right, top-to-bottom)
6. **Duplicate Removal**: Eliminates overlapping or duplicate detections

### Detection Parameters

- **Minimum Bead Size**: 50 pixels (filters out noise)
- **Maximum Bead Size**: 5000 pixels (filters out large objects)
- **Circularity Threshold**: >3 (ensures roughly circular shapes)
- **Brightness Range**: 30-220 (excludes very dark/light pixels)
- **Duplicate Distance**: <30 pixels (removes overlapping detections)

### Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

**Note**: Camera access requires HTTPS in production environments.

## Development

### Project Structure

```
src/
├── App.jsx          # Main application component
├── App.css          # Application styles
├── index.css        # Global styles
└── main.jsx         # Application entry point
public/
├── testbeads.jpg    # Sample test image
└── vite.svg         # Vite logo
```

### Key Technologies

- **React 18**: UI framework
- **Vite**: Build tool and development server
- **Canvas API**: Image processing and analysis
- **MediaDevices API**: Camera access
- **Computer Vision**: Contour detection and shape analysis
- **CSS Grid & Flexbox**: Responsive layout

## Troubleshooting

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

### Incorrect Bead Order
- Ensure beads are arranged in a clear sequence
- Avoid overlapping beads
- Try different camera angles
- Check that beads are roughly the same size

### Performance Issues
- Close other browser tabs
- Reduce browser window size
- Ensure device has sufficient processing power
- The algorithm processes every 500ms for real-time detection

### Test Mode Issues
- Ensure the image file exists in the `public/` directory
- Check that the filename in the URL parameter matches exactly
- Use common image formats (JPG, PNG, GIF)
- Ensure test images have clear, separated beads

## License

This project is open source and available under the MIT License.
