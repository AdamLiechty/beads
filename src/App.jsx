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
  const [braceletCurve, setBraceletCurve] = useState(null)

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
      setBraceletCurve(null)
      clearOverlay()
      return
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      setIsCameraActive(false)
      setDetectedBeads([])
      setDebugInfo('')
      setBraceletCurve(null)
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

  // Draw bead markers and bracelet curve on overlay
  const drawBeadMarkers = (beads, imageWidth, imageHeight, braceletCurve = null) => {
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

    // Draw a test line to verify canvas is working
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(10, 10)
    ctx.lineTo(100, 100)
    ctx.stroke()

    // Draw bracelet curve if available
    if (braceletCurve && braceletCurve.length > 0) {
      console.log(`Drawing bracelet curve with ${braceletCurve.length} points`)
      console.log(`Scale factors: scaleX=${scaleX}, scaleY=${scaleY}`)
      console.log(`Display dimensions: ${displayRect.width}x${displayRect.height}`)
      console.log(`Image dimensions: ${imageWidth}x${imageHeight}`)
      
      // Log first few points to debug
      for (let i = 0; i < Math.min(5, braceletCurve.length); i++) {
        const point = braceletCurve[i]
        console.log(`Point ${i}: (${point.x}, ${point.y}) -> (${point.x * scaleX}, ${point.y * scaleY})`)
        console.log(`Point ${i} types: x=${typeof point.x}, y=${typeof point.y}`)
        console.log(`Point ${i} valid: x=${!isNaN(point.x)}, y=${!isNaN(point.y)}`)
      }
      
      ctx.strokeStyle = '#4CAF50'
      ctx.lineWidth = 3 // Make it thicker
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      
      for (let i = 0; i < braceletCurve.length; i++) {
        const point = braceletCurve[i]
        const x = point.x * scaleX
        const y = point.y * scaleY
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      // Close the curve
      if (braceletCurve.length > 0) {
        const firstPoint = braceletCurve[0]
        const x = firstPoint.x * scaleX
        const y = firstPoint.y * scaleY
        ctx.lineTo(x, y)
      }
      
      ctx.stroke()
      ctx.setLineDash([]) // Reset line dash
      
      // Draw circles at each point to debug positioning
      ctx.fillStyle = '#00FF00'
      for (let i = 0; i < braceletCurve.length; i++) {
        const point = braceletCurve[i]
        const x = point.x * scaleX
        const y = point.y * scaleY
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      console.log('Bracelet curve drawn')
    } else {
      console.log('No bracelet curve to draw')
    }

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

  // OpenCV-based bead string detection with curve fitting
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
      let binary = new cv.Mat()
      
      // Convert to grayscale
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
      
      // Apply Gaussian blur to reduce noise
      const blurred = new cv.Mat()
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
      
      // Use improved edge density approach
      const imageCenterX = width / 2
      const imageCenterY = height / 2
      let bestBraceletContour = null
      let bestScore = 0
      let bestDensityThreshold = 0
      
      // Use Canny edge detection to find edges
      const edges = new cv.Mat()
      cv.Canny(blurred, edges, 30, 100) // Lower thresholds for more edges
      
      // Apply aggressive morphological operations to connect edge fragments
      const largeKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(25, 25))
      const connectedEdges = new cv.Mat()
      cv.morphologyEx(edges, connectedEdges, cv.MORPH_CLOSE, largeKernel)
      
      // Apply another pass with even larger kernel
      const hugeKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(35, 35))
      cv.morphologyEx(connectedEdges, connectedEdges, cv.MORPH_CLOSE, hugeKernel)
      
      // Try different density thresholds to find a valid bracelet loop
      for (let densityThreshold = 10; densityThreshold <= 100; densityThreshold += 10) {
        // Debug: save density map for key thresholds
        if (densityThreshold === 10 || densityThreshold === 20 || densityThreshold === 30) {
          const debugDensityMap = new cv.Mat()
          // Use connected edges for density map
          cv.GaussianBlur(connectedEdges, debugDensityMap, new cv.Size(21, 21), 0)
          
          const debugCanvas = document.createElement('canvas')
          debugCanvas.width = width
          debugCanvas.height = height
          const debugCtx = debugCanvas.getContext('2d')
          const debugImageData = debugCtx.createImageData(width, height)
          
          // Convert OpenCV Mat to ImageData
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4
              const densityValue = debugDensityMap.ucharPtr(y, x)[0]
              debugImageData.data[idx] = densityValue
              debugImageData.data[idx + 1] = densityValue
              debugImageData.data[idx + 2] = densityValue
              debugImageData.data[idx + 3] = 255
            }
          }
          
          debugCtx.putImageData(debugImageData, 0, 0)
          console.log(`Density map (threshold ${densityThreshold}):`, debugCanvas.toDataURL())
          
          debugDensityMap.delete()
        }
        // Create a density map from connected edges
        const densityMap = new cv.Mat()
        cv.GaussianBlur(connectedEdges, densityMap, new cv.Size(21, 21), 0)
        
        // Threshold the density map
        const densityMask = new cv.Mat()
        cv.threshold(densityMap, densityMask, densityThreshold, 255, cv.THRESH_BINARY)
        
        // Use morphological operations to connect nearby high-density areas
        const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(11, 11))
        const morph = new cv.Mat()
        cv.morphologyEx(densityMask, morph, cv.MORPH_CLOSE, kernel)
        
        // Find contours for this density threshold
        const testContours = new cv.MatVector()
        const testHierarchy = new cv.Mat()
        cv.findContours(
          morph,
          testContours,
          testHierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE
        )
        
        // Evaluate contours for this density threshold
        for (let i = 0; i < testContours.size(); i++) {
          const contour = testContours.get(i)
          const area = cv.contourArea(contour)
          
          // Filter by size
          const minArea = Math.min(width, height) * 0.08
          const maxArea = Math.min(width, height) * 0.9
          
          if (area < minArea || area > maxArea) {
            continue
          }
          
          // Check if the contour encircles the center
          const centerInside = cv.pointPolygonTest(contour, new cv.Point(imageCenterX, imageCenterY), false) >= 0
          
          if (!centerInside) {
            continue
          }
          
          // Calculate scoring
          const boundingRect = cv.boundingRect(contour)
          const aspectRatio = boundingRect.width / boundingRect.height
          const perimeter = cv.arcLength(contour, true)
          const circularity = (4 * Math.PI * area) / (perimeter * perimeter)
          
          const areaScore = Math.min(area / (Math.min(width, height) * 0.4), 1)
          const circularityScore = circularity
          const aspectRatioScore = 1 - Math.abs(1 - aspectRatio)
          
          const totalScore = areaScore * 0.5 + circularityScore * 0.3 + aspectRatioScore * 0.2
          
          if (totalScore > bestScore) {
            bestScore = totalScore
            bestBraceletContour = contour.clone()
            bestDensityThreshold = densityThreshold
            console.log(`Better contour found: density=${densityThreshold}, score=${totalScore.toFixed(3)}, area=${area.toFixed(0)}`)
          }
        }
        
        // Clean up test objects
        densityMap.delete()
        densityMask.delete()
        morph.delete()
        kernel.delete()
        testContours.delete()
        testHierarchy.delete()
      }
      
      console.log(`Best density threshold found: ${bestDensityThreshold} with score: ${bestScore.toFixed(3)}`)
      
      if (!bestBraceletContour) {
        console.log('No suitable bracelet contour found with any density threshold')
        return []
      }
      
      // Use the best density threshold result for the final processing
      const finalDensityMap = new cv.Mat()
      cv.GaussianBlur(connectedEdges, finalDensityMap, new cv.Size(21, 21), 0)
      
      const finalDensityMask = new cv.Mat()
      cv.threshold(finalDensityMap, finalDensityMask, bestDensityThreshold, 255, cv.THRESH_BINARY)
      
      const finalKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(11, 11))
      const finalMorph = new cv.Mat()
      cv.morphologyEx(finalDensityMask, finalMorph, cv.MORPH_CLOSE, finalKernel)
      
      // Debug: save final results
      const finalCanvas = document.createElement('canvas')
      finalCanvas.width = width
      finalCanvas.height = height
      const finalCtx = finalCanvas.getContext('2d')
      const finalImageData = finalCtx.createImageData(width, height)
      
      // Convert final morph result to ImageData
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4
          const morphValue = finalMorph.ucharPtr(y, x)[0]
          finalImageData.data[idx] = morphValue
          finalImageData.data[idx + 1] = morphValue
          finalImageData.data[idx + 2] = morphValue
          finalImageData.data[idx + 3] = 255
        }
      }
      
      finalCtx.putImageData(finalImageData, 0, 0)
      console.log(`Final result (threshold ${bestDensityThreshold}):`, finalCanvas.toDataURL())
      
      binary = finalMorph.clone()
      
      // Use the best bracelet contour found from dynamic color thresholding
      
      // Debug: save color segmentation result to canvas for visualization
      const segCanvas = document.createElement('canvas')
      segCanvas.width = width
      segCanvas.height = height
      const segCtx = segCanvas.getContext('2d')
      const segImageData = segCtx.createImageData(width, height)
      
      // Convert OpenCV Mat to ImageData
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4
          const segValue = cleanedMask.ucharPtr(y, x)[0]
          segImageData.data[idx] = segValue
          segImageData.data[idx + 1] = segValue
          segImageData.data[idx + 2] = segValue
          segImageData.data[idx + 3] = 255
        }
      }
      
      segCtx.putImageData(segImageData, 0, 0)
      console.log('Color segmentation result:', segCanvas.toDataURL())
      
      // Find contours
      const contours = new cv.MatVector()
      const hierarchy = new cv.Mat()
      cv.findContours(
        binary,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      )
      
      console.log(`Found ${contours.size()} total contours`)
      
      // Debug: log all contours with their areas
      for (let i = 0; i < Math.min(20, contours.size()); i++) {
        const contour = contours.get(i)
        const area = cv.contourArea(contour)
        const boundingRect = cv.boundingRect(contour)
        console.log(`Contour ${i}: area=${area.toFixed(0)}, bounds=(${boundingRect.x},${boundingRect.y},${boundingRect.width}x${boundingRect.height})`)
      }
      
      // Use the best bracelet contour found from dynamic thresholding
      if (!bestBraceletContour) {
        console.log('No suitable bracelet contour found')
        return []
      }
      
      console.log(`Best bracelet contour score: ${bestScore.toFixed(3)}`)
      
      // Create a mask for the bracelet area
      const braceletMask = new cv.Mat.zeros(height, width, cv.CV_8UC1)
      const braceletContourVector = new cv.MatVector()
      braceletContourVector.push_back(bestBraceletContour)
      cv.drawContours(braceletMask, braceletContourVector, 0, new cv.Scalar(255), -1)
      
      // Find the bracelet curve path
      const braceletCurve = extractBraceletCurve(bestBraceletContour, width, height)
      console.log(`Bracelet curve extracted: ${braceletCurve ? braceletCurve.length : 0} points`)
      
      // Find beads along the bracelet curve
      const beads = findBeadsAlongCurve(data, width, height, braceletMask, braceletCurve)
      
      // Store bracelet curve for visualization
      setBraceletCurve(braceletCurve)
      console.log(`Bracelet curve stored for visualization: ${braceletCurve ? braceletCurve.length : 0} points`)
      
      // Clean up OpenCV objects
      src.delete()
      gray.delete()
      binary.delete()
      blurred.delete()
      edges.delete()
      largeKernel.delete()
      hugeKernel.delete()
      connectedEdges.delete()
      finalDensityMap.delete()
      finalDensityMask.delete()
      finalMorph.delete()
      finalKernel.delete()
      contours.delete()
      hierarchy.delete()
      braceletMask.delete()
      braceletContourVector.delete()
      
      console.log(`Found ${beads.length} beads along the bracelet curve`)
      return beads
      
    } catch (error) {
      console.error('Error in OpenCV detection:', error)
      return []
    }
  }

  // Extract the bracelet curve path
  const extractBraceletCurve = (contour, width, height) => {
    const cv = window.cv
    
    // Get contour points - OpenCV contours are stored as 32-bit integers
    const points = []
    for (let i = 0; i < contour.rows; i++) {
      const x = contour.data32S[i * 2]
      const y = contour.data32S[i * 2 + 1]
      points.push({ x, y })
    }
    
    console.log(`Extracted ${points.length} points from contour`)
    
    // Sort points by angle from center to create a continuous curve
    const centerX = width / 2
    const centerY = height / 2
    
    points.sort((a, b) => {
      const angleA = Math.atan2(a.y - centerY, a.x - centerX)
      const angleB = Math.atan2(b.y - centerY, b.x - centerX)
      return angleA - angleB
    })
    
    // Remove duplicate points and smooth the curve
    const uniquePoints = []
    for (let i = 0; i < points.length; i++) {
      if (i === 0 || 
          Math.abs(points[i].x - points[i-1].x) > 2 || 
          Math.abs(points[i].y - points[i-1].y) > 2) {
        uniquePoints.push(points[i])
      }
    }
    
    console.log(`Curve has ${uniquePoints.length} unique points`)
    return uniquePoints
  }

  // Find beads along the bracelet curve
  const findBeadsAlongCurve = (data, width, height, braceletMask, curvePoints) => {
    const cv = window.cv
    const beads = []
    
    // Create a binary image for bead detection
    const gray = new cv.Mat(height, width, cv.CV_8UC1)
    const binary = new cv.Mat()
    
    // Convert RGBA to grayscale
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        gray.ucharPtr(y, x)[0] = grayValue
      }
    }
    
    // Apply Gaussian blur
    const blurred = new cv.Mat()
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    
    // Use adaptive thresholding
    cv.adaptiveThreshold(
      blurred,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      11,
      2
    )
    
    // Find contours within the bracelet area
    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(
      binary,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    )
    
    console.log(`Found ${contours.size()} potential bead contours`)
    
    // Process each potential bead contour
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      
      // Calculate contour properties
      const area = cv.contourArea(contour)
      const perimeter = cv.arcLength(contour, true)
      
      // Filter by size - use actual pixel areas
      const minArea = 20  // Minimum 20 pixels
      const maxArea = 1000 // Maximum 1000 pixels
      
      if (area < minArea || area > maxArea) {
        console.log(`Contour ${i} rejected by size: area=${area.toFixed(0)}, min=${minArea.toFixed(0)}, max=${maxArea.toFixed(0)}`)
        continue
      }
      
      // Calculate circularity
      const circularity = (4 * Math.PI * area) / (perimeter * perimeter)
      if (circularity < 0.1) { // More permissive circularity
        console.log(`Contour ${i} rejected by circularity: ${circularity.toFixed(3)}`)
        continue
      }
      
      // Get center
      const moments = cv.moments(contour)
      if (moments.m00 === 0) continue
      
      const centerX = moments.m10 / moments.m00
      const centerY = moments.m01 / moments.m00
      
      if (isNaN(centerX) || isNaN(centerY)) continue
      
      // Check if center is within bracelet mask
      const centerPixelX = Math.round(centerX)
      const centerPixelY = Math.round(centerY)
      
      if (centerPixelX < 0 || centerPixelX >= width || centerPixelY < 0 || centerPixelY >= height) {
        continue
      }
      
      const maskValue = braceletMask.ucharPtr(centerPixelY, centerPixelX)[0]
      if (maskValue === 0) {
        continue
      }
      
      // Check if bead is close to the bracelet curve
      const distanceToCurve = getDistanceToCurve(centerX, centerY, curvePoints)
      const maxDistance = Math.min(width, height) * 0.1 // 10% of smaller dimension (more permissive)
      
      if (distanceToCurve > maxDistance) {
        console.log(`Contour ${i} rejected by distance to curve: ${distanceToCurve.toFixed(1)} > ${maxDistance.toFixed(1)}`)
        continue
      }
      
      // Calculate radius
      const radius = Math.sqrt(area / Math.PI)
      
      // Sample color from bead center
      const color = sampleBeadColor(data, width, height, centerX, centerY, radius)
      if (!color) {
        console.log(`Contour ${i} rejected by color sampling`)
        continue
      }
      
      console.log(`Bead found at (${centerX.toFixed(1)}, ${centerY.toFixed(1)}) with color (${color[0]}, ${color[1]}, ${color[2]})`)
      
      beads.push({
        centerX: centerX,
        centerY: centerY,
        radius: radius,
        color: color,
        hex: rgbToHex(color[0], color[1], color[2]),
        distanceToCurve: distanceToCurve,
        circularity: circularity
      })
    }
    
    // Clean up
    gray.delete()
    binary.delete()
    blurred.delete()
    contours.delete()
    hierarchy.delete()
    
    return beads
  }

  // Calculate distance from point to curve
  const getDistanceToCurve = (x, y, curvePoints) => {
    let minDistance = Infinity
    
    for (const point of curvePoints) {
      const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2))
      if (distance < minDistance) {
        minDistance = distance
      }
    }
    
    return minDistance
  }

  // Sample color from bead center
  const sampleBeadColor = (data, width, height, centerX, centerY, radius) => {
    let totalR = 0, totalG = 0, totalB = 0, count = 0
    const sampleRadius = Math.max(Math.min(radius * 0.6, 10), 2)
    
    for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
      for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
        const nx = Math.round(centerX + dx)
        const ny = Math.round(centerY + dy)
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist <= sampleRadius && nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const pixelIdx = (ny * width + nx) * 4
          
          if (pixelIdx >= 0 && pixelIdx + 2 < data.length) {
            const r = data[pixelIdx]
            const g = data[pixelIdx + 1]
            const b = data[pixelIdx + 2]
            
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
              totalR += r
              totalG += g
              totalB += b
              count++
            }
          }
        }
      }
    }
    
    if (count === 0) return null
    
    const avgR = Math.round(totalR / count)
    const avgG = Math.round(totalG / count)
    const avgB = Math.round(totalB / count)
    
    return [avgR, avgG, avgB]
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

    // Sort beads along the bracelet curve path
    const imageCenterX = width / 2
    const imageCenterY = height / 2
    
    detectedBeads.sort((a, b) => {
      // Calculate angle from center for each bead
      const angleA = Math.atan2(a.centerY - imageCenterY, a.centerX - imageCenterX)
      const angleB = Math.atan2(b.centerY - imageCenterY, b.centerX - imageCenterX)
      
      // Normalize angles to 0-2π range
      const normalizedAngleA = angleA < 0 ? angleA + 2 * Math.PI : angleA
      const normalizedAngleB = angleB < 0 ? angleB + 2 * Math.PI : angleB
      
      return normalizedAngleA - normalizedAngleB
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
    const debugText = `Image: ${width}x${height}, Bracelet curve: ${braceletCurve ? braceletCurve.length : 0} points, Beads found: ${uniqueBeads.length}`
    setDebugInfo(debugText)

    setDetectedBeads(uniqueBeads)
    
    // Draw markers on overlay
    drawBeadMarkers(uniqueBeads, width, height, braceletCurve)
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
