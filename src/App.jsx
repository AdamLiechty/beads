import { useState, useRef, useEffect } from 'react'
import './App.css'

// Global OpenCV loading state to prevent duplicate loading
let opencvLoadingPromise = null
let opencvLoaded = false

function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const imageRef = useRef(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [detectedBeads, setDetectedBeads] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [testImage, setTestImage] = useState(null)
  const [isTestMode, setIsTestMode] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')
  const [opencvReady, setOpencvReady] = useState(false)

  // Load OpenCV for browser (prevent duplicate loading)
  useEffect(() => {
    const loadOpenCV = async () => {
      try {
        // Check if OpenCV is already loaded
        if (window.cv && window.cv.Mat) {
          opencvLoaded = true
          setOpencvReady(true)
          console.log('OpenCV already loaded')
          return
        }

        // If already loading, wait for that promise
        if (opencvLoadingPromise) {
          await opencvLoadingPromise
          setOpencvReady(true)
          return
        }

        // Create loading promise
        opencvLoadingPromise = new Promise((resolve, reject) => {
          // Check if script is already in the document
          const existingScript = document.querySelector('script[src*="opencv.js"]')
          if (existingScript) {
            // Script already exists, just wait for it to load
            const checkOpenCV = () => {
              if (window.cv && window.cv.Mat) {
                opencvLoaded = true
                resolve()
              } else {
                setTimeout(checkOpenCV, 100)
              }
            }
            checkOpenCV()
            return
          }

          // Load OpenCV.js from CDN
          const script = document.createElement('script')
          script.src = 'https://docs.opencv.org/4.8.0/opencv.js'
          script.async = true
          script.onload = () => {
            // Wait for OpenCV to be fully initialized
            const checkOpenCV = () => {
              if (window.cv && window.cv.Mat) {
                opencvLoaded = true
                resolve()
              } else {
                setTimeout(checkOpenCV, 100)
              }
            }
            checkOpenCV()
          }
          script.onerror = () => {
            console.error('Failed to load OpenCV from CDN')
            reject(new Error('Failed to load OpenCV'))
          }
          document.head.appendChild(script)
        })

        await opencvLoadingPromise
        setOpencvReady(true)
        console.log('OpenCV loaded successfully')
        
      } catch (error) {
        console.error('Error loading OpenCV:', error)
        opencvLoadingPromise = null // Reset on error
      }
    }

    loadOpenCV()
  }, [])

  // Check for test image in query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const testParam = urlParams.get('test')
    
    if (testParam) {
      setTestImage(`/${testParam}`)
      setIsTestMode(true)
    }
  }, [])

  // Initialize camera
  const startCamera = async () => {
    if (isTestMode) {
      setIsCameraActive(true)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'environment' // Use back camera if available
        } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please ensure camera permissions are granted.')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (isTestMode) {
      setIsCameraActive(false)
      setDetectedBeads([])
      setDebugInfo('')
      clearOverlay()
      return
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      setIsCameraActive(false)
      setDetectedBeads([])
      setDebugInfo('')
      clearOverlay()
    }
  }

  // Clear overlay canvas
  const clearOverlay = () => {
    const overlayCanvas = overlayCanvasRef.current
    if (overlayCanvas) {
      const ctx = overlayCanvas.getContext('2d')
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
    }
  }

  // Draw bead markers on overlay
  const drawBeadMarkers = (beads, imageWidth, imageHeight) => {
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) return

    // Get the actual displayed image element
    const imageElement = isTestMode ? imageRef.current : videoRef.current
    if (!imageElement) return

    // Get the actual displayed dimensions
    const displayRect = imageElement.getBoundingClientRect()
    const containerRect = overlayCanvas.parentElement.getBoundingClientRect()
    
    // Calculate the scale factors
    const scaleX = displayRect.width / imageWidth
    const scaleY = displayRect.height / imageHeight
    
    // Set canvas size to match the displayed image size
    overlayCanvas.width = displayRect.width
    overlayCanvas.height = displayRect.height

    const ctx = overlayCanvas.getContext('2d')
    ctx.clearRect(0, 0, displayRect.width, displayRect.height)

    beads.forEach((bead, index) => {
      // Scale the coordinates to match the displayed image
      const x = bead.centerX * scaleX
      const y = bead.centerY * scaleY
      const radius = bead.radius * Math.min(scaleX, scaleY) // Use the smaller scale to maintain circularity

      // Draw circle around bead
      ctx.strokeStyle = '#FF6B6B'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.stroke()

      // Draw filled circle for number background
      ctx.fillStyle = '#FF6B6B'
      ctx.beginPath()
      ctx.arc(x, y - radius - 15, 15, 0, 2 * Math.PI)
      ctx.fill()

      // Draw number
      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText((index + 1).toString(), x, y - radius - 15)

      // Draw color indicator
      ctx.fillStyle = bead.hex
      ctx.beginPath()
      ctx.arc(x, y + radius + 15, 10, 0, 2 * Math.PI)
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }

  // Convert RGB to Hex
  const rgbToHex = (r, g, b) => {
    const toHex = (n) => {
      const hex = Math.round(n).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  // OpenCV-based bead detection
  const detectBeadsWithOpenCV = (data, width, height) => {
    if (!window.cv || !opencvLoaded) {
      console.log('OpenCV not loaded yet')
      return []
    }

    try {
      const cv = window.cv
      
      // Create OpenCV Mat from image data
      const src = cv.matFromImageData({ data, width, height })
      const gray = new cv.Mat()
      const circles = new cv.Mat()
      
      // Convert to grayscale
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
      
      // Apply Gaussian blur to reduce noise
      const blurred = new cv.Mat()
      cv.GaussianBlur(gray, blurred, new cv.Size(9, 9), 2, 2)
      
      // Detect circles using Hough Circle Transform
      cv.HoughCircles(
        blurred,
        circles,
        cv.HOUGH_GRADIENT,
        1, // dp
        blurred.rows / 8, // minDist
        100, // param1 (edge detection threshold)
        30, // param2 (accumulator threshold)
        Math.min(width, height) * 0.02, // minRadius (2% of smaller dimension)
        Math.min(width, height) * 0.06  // maxRadius (6% of smaller dimension)
      )
      
      const beads = []
      
      // Process detected circles
      for (let i = 0; i < circles.cols; i++) {
        const x = circles.data32F[i * 3]
        const y = circles.data32F[i * 3 + 1]
        const radius = circles.data32F[i * 3 + 2]
        
        // Extract color from the center of the circle
        const centerX = Math.round(x)
        const centerY = Math.round(y)
        
        if (centerX >= 0 && centerX < width && centerY >= 0 && centerY < height) {
          const idx = (centerY * width + centerX) * 4
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          
          // Get average color from the circle region
          let totalR = 0, totalG = 0, totalB = 0, count = 0
          const sampleRadius = Math.min(radius * 0.7, 20) // Sample 70% of radius, max 20px
          
          for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
            for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
              const nx = centerX + dx
              const ny = centerY + dy
              const dist = Math.sqrt(dx * dx + dy * dy)
              
              if (dist <= sampleRadius && nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const pixelIdx = (ny * width + nx) * 4
                totalR += data[pixelIdx]
                totalG += data[pixelIdx + 1]
                totalB += data[pixelIdx + 2]
                count++
              }
            }
          }
          
          if (count > 0) {
            const avgR = Math.round(totalR / count)
            const avgG = Math.round(totalG / count)
            const avgB = Math.round(totalB / count)
            
            beads.push({
              centerX: x,
              centerY: y,
              radius: radius,
              color: [avgR, avgG, avgB],
              hex: rgbToHex(avgR, avgG, avgB),
              region: Math.PI * radius * radius,
              circularity: 1.0 // Perfect circle from Hough transform
            })
          }
        }
      }
      
      // Clean up OpenCV objects
      src.delete()
      gray.delete()
      circles.delete()
      blurred.delete()
      
      console.log(`OpenCV detected ${beads.length} circles`)
      return beads
      
    } catch (error) {
      console.error('Error in OpenCV detection:', error)
      return []
    }
  }

  // Detect circular beads using OpenCV
  const detectBeads = () => {
    if (!isCameraActive || !opencvReady) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (isTestMode && imageRef.current) {
      // Use test image
      canvas.width = imageRef.current.naturalWidth
      canvas.height = imageRef.current.naturalHeight
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)
    } else if (videoRef.current) {
      // Use camera feed
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    } else {
      return
    }

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = canvas.width
    const height = canvas.height

    console.log(`Processing image: ${width}x${height}`)

    // Use OpenCV-based detection
    const detectedBeads = detectBeadsWithOpenCV(data, width, height)
    console.log(`Beads found: ${detectedBeads.length}`)

    // Sort beads by position (left to right, top to bottom for bracelet order)
    detectedBeads.sort((a, b) => {
      // Primary sort by Y position (horizontal bracelet)
      if (Math.abs(a.centerY - b.centerY) > 50) {
        return a.centerY - b.centerY
      }
      // Secondary sort by X position
      return a.centerX - b.centerX
    })

    // Remove overlapping beads - keep the larger ones
    const uniqueBeads = []
    for (const bead of detectedBeads) {
      const isOverlapping = uniqueBeads.some(existing => {
        const dist = Math.sqrt((bead.centerX - existing.centerX) ** 2 + (bead.centerY - existing.centerY) ** 2)
        const combinedRadius = bead.radius + existing.radius
        return dist < combinedRadius * 0.8 // 80% overlap threshold
      })
      
      if (!isOverlapping) {
        uniqueBeads.push(bead)
      } else {
        // If overlapping, keep the larger one
        const overlappingBead = uniqueBeads.find(existing => {
          const dist = Math.sqrt((bead.centerX - existing.centerX) ** 2 + (bead.centerY - existing.centerY) ** 2)
          const combinedRadius = bead.radius + existing.radius
          return dist < combinedRadius * 0.8
        })
        
        if (overlappingBead && bead.radius > overlappingBead.radius) {
          // Replace the smaller bead
          const index = uniqueBeads.indexOf(overlappingBead)
          uniqueBeads[index] = bead
        }
      }
    }

    console.log(`Final beads detected: ${uniqueBeads.length}`)
    
    // Update debug info
    const debugText = `Image: ${width}x${height}, OpenCV circles: ${detectedBeads.length}, Final beads: ${uniqueBeads.length}`
    setDebugInfo(debugText)

    setDetectedBeads(uniqueBeads)
    
    // Draw markers on overlay
    drawBeadMarkers(uniqueBeads, width, height)
  }

  // Continuous detection
  useEffect(() => {
    let interval
    if (isCameraActive && !isProcessing && opencvReady) {
      interval = setInterval(() => {
        setIsProcessing(true)
        detectBeads()
        setTimeout(() => setIsProcessing(false), 100)
      }, 500) // Detect every 500ms
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isCameraActive, isProcessing, isTestMode, opencvReady])

  return (
    <div className="App">
      <header className="app-header">
        <h1>Bead Color Detector</h1>
        <div className="camera-controls">
          {!isCameraActive ? (
            <button onClick={startCamera} className="start-btn">
              {isTestMode ? 'Start Detection' : 'Start Camera'}
            </button>
          ) : (
            <button onClick={stopCamera} className="stop-btn">
              {isTestMode ? 'Stop Detection' : 'Stop Camera'}
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="camera-section">
          <div className="image-container">
            {isTestMode ? (
              <img
                ref={imageRef}
                src={testImage}
                alt="Test beads"
                className="test-image"
                style={{ display: isCameraActive ? 'block' : 'none' }}
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-feed"
              />
            )}
            <canvas
              ref={overlayCanvasRef}
              className="overlay-canvas"
              style={{ display: isCameraActive && detectedBeads.length > 0 ? 'block' : 'none' }}
            />
          </div>
          <canvas
            ref={canvasRef}
            className="processing-canvas"
            style={{ display: 'none' }}
          />
          {isTestMode && !isCameraActive && (
            <div className="test-image-placeholder">
              <p>Test image loaded: {testImage}</p>
              <p>Click "Start Detection" to analyze beads</p>
              {!opencvReady && <p>Loading OpenCV...</p>}
            </div>
          )}
        </div>

        <div className="results-section">
          <h2>Detected Beads</h2>
          {debugInfo && (
            <div className="debug-info">
              <p>{debugInfo}</p>
              {!opencvReady && <p>OpenCV loading...</p>}
            </div>
          )}
          {detectedBeads.length > 0 ? (
            <div className="beads-container">
              <div className="beads-sequence">
                {detectedBeads.map((bead, index) => (
                  <div key={index} className="bead-item">
                    <div className="bead-number">{index + 1}</div>
                    <div 
                      className="bead-swatch"
                      style={{ backgroundColor: bead.hex }}
                    />
                    <div className="bead-info">
                      <span className="hex-value">{bead.hex}</span>
                      <span className="rgb-value">
                        RGB({bead.color.join(', ')})
                      </span>
                      <span className="debug-details">
                        Radius: {bead.radius.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="beads-summary">
                <p>Total beads detected: {detectedBeads.length}</p>
                <p>Colors in order: {detectedBeads.map(bead => bead.hex).join(' → ')}</p>
              </div>
            </div>
          ) : (
            <p className="no-beads">
              {!opencvReady 
                ? "Loading OpenCV..."
                : isCameraActive 
                  ? (isTestMode ? "Analyzing test image for beads..." : "Point camera at beads to detect colors...")
                  : (isTestMode ? "Click 'Start Detection' to analyze the test image" : "Start camera to begin detection")
              }
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
