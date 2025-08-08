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
  const hasRunTestDetectionRef = useRef(false)
  const [showDetectButton, setShowDetectButton] = useState(false)

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
        setShowDetectButton(true) // Show detect button when camera is active
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
      hasRunTestDetectionRef.current = false // Reset test detection flag
      clearOverlay()
      return
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      setIsCameraActive(false)
      setShowDetectButton(false) // Hide detect button when camera is stopped
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

  // Handle detect beads button click
  const handleDetectBeads = () => {
    if (!isProcessing && opencvReady) {
      setIsProcessing(true)
      detectBeads()
      setTimeout(() => setIsProcessing(false), 100)
    }
  }

  // Draw bead markers and bracelet curve on overlay
  const drawBeadMarkers = (beads, imageWidth, imageHeight, braceletCurve = null, densityMask = null, edges = null, colorSamples = null) => {
    console.log(`Drawing overlay for processed image: ${imageWidth}x${imageHeight}`)
    
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) return

    // Get the actual displayed image element
    const imageElement = isTestMode ? imageRef.current : videoRef.current
    if (!imageElement) return

    // Get the actual displayed dimensions
    const displayRect = imageElement.getBoundingClientRect()
    const containerRect = overlayCanvas.parentElement.getBoundingClientRect()
    
    console.log(`Display dimensions: ${displayRect.width.toFixed(0)}x${displayRect.height.toFixed(0)}`)
    
    // Calculate the scale factors
    const scaleX = displayRect.width / imageWidth
    const scaleY = displayRect.height / imageHeight
    
    console.log(`Scale factors: scaleX=${scaleX.toFixed(3)}, scaleY=${scaleY.toFixed(3)}`)
    
    // Use uniform scaling to prevent stretching
    const uniformScale = Math.min(scaleX, scaleY)
    console.log(`Using uniform scale: ${uniformScale.toFixed(3)}`)
    
    // Calculate the centered position for the overlay
    const overlayWidth = imageWidth * uniformScale
    const overlayHeight = imageHeight * uniformScale
    const offsetX = (displayRect.width - overlayWidth) / 2
    const offsetY = (displayRect.height - overlayHeight) / 2
    
    console.log(`Overlay dimensions: ${overlayWidth.toFixed(0)}x${overlayHeight.toFixed(0)}, offset: (${offsetX.toFixed(0)}, ${offsetY.toFixed(0)})`)
    
    // Set canvas size to match the displayed image size
    overlayCanvas.width = displayRect.width
    overlayCanvas.height = displayRect.height

    const ctx = overlayCanvas.getContext('2d')
    ctx.clearRect(0, 0, displayRect.width, displayRect.height)

    // Draw density overlay (heat map)
    if (densityMask) {
      console.log('Drawing density mask overlay')
      const densityImageData = ctx.createImageData(displayRect.width, displayRect.height)
      
      for (let y = 0; y < displayRect.height; y++) {
        for (let x = 0; x < displayRect.width; x++) {
          const idx = (y * displayRect.width + x) * 4
          
          // Map display coordinates back to original image coordinates
          const origX = Math.floor((x - offsetX) / uniformScale)
          const origY = Math.floor((y - offsetY) / uniformScale)
          
          if (origX >= 0 && origX < imageWidth && origY >= 0 && origY < imageHeight) {
            const densityValue = densityMask.ucharPtr(origY, origX)[0]
            
            // Create overlay: black with alpha based on density (higher density = lower alpha)
            const normalizedDensity = densityValue / 255 // Convert to 0-1 range
            const alpha = Math.round((1 - normalizedDensity) * 255) // Invert so higher density = lower alpha
            
            densityImageData.data[idx] = 0      // Black
            densityImageData.data[idx + 1] = 0  // Black
            densityImageData.data[idx + 2] = 0  // Black
            densityImageData.data[idx + 3] = alpha
          } else {
            densityImageData.data[idx] = 0
            densityImageData.data[idx + 1] = 0
            densityImageData.data[idx + 2] = 0
            densityImageData.data[idx + 3] = 0
          }
        }
      }
      
      ctx.putImageData(densityImageData, 0, 0)
    }

    // Draw grouped beads as circles (first, so they appear behind the sample dots)
    if (beads && beads.length > 0) {
      console.log(`Drawing ${beads.length} grouped beads`)
      
      for (let i = 0; i < beads.length; i++) {
        const bead = beads[i]
        const x = bead.centerX * uniformScale + offsetX
        const y = bead.centerY * uniformScale + offsetY
        const radius = (bead.radius || 10) * uniformScale
        
        // Draw bead circle with color
        ctx.fillStyle = bead.hex
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        // Draw bead number
        ctx.fillStyle = 'white'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText((i + 1).toString(), x, y)
      }
      
      console.log('Grouped beads drawn')
    }

    // Draw color samples as small black dots (on top of bead circles)
    if (colorSamples && colorSamples.length > 0) {
      console.log(`Drawing ${colorSamples.length} color samples`)
      
      // Draw small black dots for all samples
      ctx.fillStyle = 'black'
      
      for (let i = 0; i < colorSamples.length; i++) {
        const sample = colorSamples[i]
        const x = sample.centerX * uniformScale + offsetX
        const y = sample.centerY * uniformScale + offsetY
        
        // Draw a small black dot at the sample position
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, 2 * Math.PI) // 2px diameter (1px radius)
        ctx.fill()
      }
    }

    // Draw edge detection lines on top of everything
    if (edges) {
      console.log('Drawing edge detection lines on top')
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)'
      ctx.lineWidth = 1
      
      // Draw edges as lines
      for (let y = 0; y < imageHeight; y += 2) { // Sample every 2 pixels for performance
        for (let x = 0; x < imageWidth; x += 2) {
          const edgeValue = edges.ucharPtr(y, x)[0]
          if (edgeValue > 0) {
            const screenX = x * uniformScale + offsetX
            const screenY = y * uniformScale + offsetY
            
            ctx.beginPath()
            ctx.arc(screenX, screenY, 0.5, 0, 2 * Math.PI)
            ctx.stroke()
          }
        }
      }
    }
    
    console.log('Overlay drawing complete')
    // Bead circle markers removed to avoid clutter - only showing colored ellipse
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
      for (let densityThreshold = 1; densityThreshold <= 50; densityThreshold += 2) {
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
        const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(15, 15))
        const morph = new cv.Mat()
        cv.morphologyEx(densityMask, morph, cv.MORPH_CLOSE, kernel)
        
        // Apply Gaussian blur to smooth the density map
        const smoothed = new cv.Mat()
        cv.GaussianBlur(morph, smoothed, new cv.Size(21, 21), 0, 0, cv.BORDER_DEFAULT)
        
        // Threshold again to get a cleaner binary mask
        const cleanedMask = new cv.Mat()
        cv.threshold(smoothed, cleanedMask, 127, 255, cv.THRESH_BINARY)
        
        // Find contours for this density threshold
        const testContours = new cv.MatVector()
        const testHierarchy = new cv.Mat()
        cv.findContours(
          cleanedMask,
          testContours,
          testHierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE
        )
        
        // Debug: log contour count for this threshold
        if (testContours.size() > 0) {
          console.log(`Threshold ${densityThreshold}: found ${testContours.size()} contours`)
        }
        
        // Evaluate contours for this density threshold
        for (let i = 0; i < testContours.size(); i++) {
          const contour = testContours.get(i)
          const area = cv.contourArea(contour)
          
                            // Filter by size
          const minArea = 100 // Minimum reasonable area for a bracelet contour
          const maxArea = width * height * 0.8 // Use total image area, not min dimension
          
          if (area < minArea || area > maxArea) {
            console.log(`Contour ${i} rejected by size: area=${area.toFixed(0)}, min=${minArea.toFixed(0)}, max=${maxArea.toFixed(0)}`)
            continue
          }
          
          // Check if the contour encircles the center
          const centerInside = cv.pointPolygonTest(contour, new cv.Point(imageCenterX, imageCenterY), false) >= 0
          
          if (!centerInside) {
            console.log(`Contour ${i} rejected: center not inside`)
            continue
          }
          
          // Simplify the contour to reduce noise and twists
          const epsilon = 0.02 * cv.arcLength(contour, true) // 2% of perimeter
          const simplifiedContour = new cv.Mat()
          cv.approxPolyDP(contour, simplifiedContour, epsilon, true)
          
          // Calculate scoring using simplified contour
          const boundingRect = cv.boundingRect(simplifiedContour)
          const aspectRatio = boundingRect.width / boundingRect.height
          const perimeter = cv.arcLength(simplifiedContour, true)
          const simplifiedArea = cv.contourArea(simplifiedContour)
          const circularity = (4 * Math.PI * simplifiedArea) / (perimeter * perimeter)
          
                      const areaScore = Math.min(simplifiedArea / (Math.min(width, height) * 0.4), 1)
          const circularityScore = circularity
          const aspectRatioScore = 1 - Math.abs(1 - aspectRatio)
          
          const totalScore = areaScore * 0.5 + circularityScore * 0.3 + aspectRatioScore * 0.2
          
          if (totalScore > bestScore) {
            bestScore = totalScore
            bestBraceletContour = simplifiedContour.clone()
            bestDensityThreshold = densityThreshold
            console.log(`Better contour found: density=${densityThreshold}, score=${totalScore.toFixed(3)}, area=${simplifiedArea.toFixed(0)}`)
          }
        }
        
        // Clean up test objects
        densityMap.delete()
        densityMask.delete()
        morph.delete()
        smoothed.delete()
        cleanedMask.delete()
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
      
      // Fill in small holes in the density map
      const holeSize = Math.min(width, height) * 0.1 // 10% of image dimensions
      const holeKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(holeSize, holeSize))
      const filledDensityMap = new cv.Mat()
      cv.morphologyEx(finalDensityMap, filledDensityMap, cv.MORPH_CLOSE, holeKernel)
      
      const finalDensityMask = new cv.Mat()
      cv.threshold(filledDensityMap, finalDensityMask, bestDensityThreshold, 255, cv.THRESH_BINARY)
      
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
          const segValue = binary.ucharPtr(y, x)[0]
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
        return { beads: [], densityMask: null, edges: null, colorSamples: [] }
      }
      
      // Create a mask from the best contour for bead detection
      const contourMask = new cv.Mat.zeros(height, width, cv.CV_8UC1)
      const contourVector = new cv.MatVector()
      contourVector.push_back(bestBraceletContour)
      cv.drawContours(contourMask, contourVector, 0, new cv.Scalar(255), -1)
      
      console.log('Contour mask created for bead detection')
      
      console.log(`Best bracelet contour score: ${bestScore.toFixed(3)}`)
      
      // Create a mask for the bracelet area
      const braceletMask = new cv.Mat.zeros(height, width, cv.CV_8UC1)
      const braceletContourVector = new cv.MatVector()
      braceletContourVector.push_back(bestBraceletContour)
      cv.drawContours(braceletMask, braceletContourVector, 0, new cv.Scalar(255), -1)
      
      // Find the bracelet curve path
      const braceletCurveData = extractBraceletCurve(bestBraceletContour, width, height, finalDensityMap)
      const braceletCurve = braceletCurveData.points
      console.log(`Bracelet curve extracted: ${braceletCurve ? braceletCurve.length : 0} points`)
      
        // Sample colors along the ellipse and group into beads
  const colorSamples = findBeadsAlongEllipse(data, width, height, filledDensityMap, braceletCurveData)
  const beads = groupSamplesIntoBeads(colorSamples, edges, width, height)
      
      // Store bracelet curve for visualization
      setBraceletCurve(braceletCurve)
      console.log(`Bracelet curve stored for visualization: ${braceletCurve ? braceletCurve.length : 0} points`)
      
      // Clone the filled density map and edges before cleanup
      const densityMapClone = filledDensityMap.clone()
      const edgesClone = edges.clone()
      
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
      filledDensityMap.delete()
      holeKernel.delete()
      finalDensityMask.delete()
      finalMorph.delete()
      finalKernel.delete()
      contours.delete()
      hierarchy.delete()
      braceletMask.delete()
      braceletContourVector.delete()
      
      console.log(`Found ${beads.length} beads along the bracelet curve`)
      return { beads, densityMask: densityMapClone, edges: edgesClone, colorSamples }
      
    } catch (error) {
      console.error('Error in OpenCV detection:', error)
      return { beads: [], densityMask: null, edges: null, colorSamples: [] }
    }
  }

  // Extract the bracelet curve path using global ellipse search
  const extractBraceletCurve = (contour, width, height, densityMask) => {
    const cv = window.cv
    const NUM_SAMPLES = 200 // Single constant to control both ellipse and sampling
    
    console.log('Starting global ellipse search...')
    
    // Function to evaluate ellipse boundary density sum
    const evaluateEllipseDensity = (centerX, centerY, radius) => {
      // Check if circle is within image bounds
      if (centerX - radius < 0 || centerX + radius >= width || 
          centerY - radius < 0 || centerY + radius >= height) {
        return 0 // Circle outside bounds
      }
      
      // Sample points ON the circle boundary
      const numPoints = 200 // More points for better coverage
      let totalDensity = 0
      let totalPoints = 0
      
      for (let i = 0; i < numPoints; i++) {
        const t = (2 * Math.PI * i) / numPoints
        const x = centerX + radius * Math.cos(t)
        const y = centerY + radius * Math.sin(t)
        
        const xInt = Math.round(x)
        const yInt = Math.round(y)
        
        if (xInt >= 0 && xInt < width && yInt >= 0 && yInt < height) {
          totalPoints++
          const pixelValue = densityMask.ucharPtr(yInt, xInt)[0]
          totalDensity += pixelValue / 255 // Normalize to 0-1 range
        }
      }
      
      return totalPoints > 0 ? totalDensity / totalPoints : 0 // Return average density
    }
    
    // Find high-density regions to use as starting points
    const highDensityPoints = []
    const step = 10 // Sample every 10 pixels
    
    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const pixelValue = densityMask.ucharPtr(y, x)[0]
        const normalizedDensity = pixelValue / 255 // Convert to 0-1 range
        if (normalizedDensity > 0.3) { // Threshold for "high density" regions
          highDensityPoints.push({ x, y, density: normalizedDensity })
        }
      }
    }
    
    console.log(`Found ${highDensityPoints.length} high-density points`)
    
    // Sort by density and take top candidates
    highDensityPoints.sort((a, b) => b.density - a.density)
    const candidateCenters = highDensityPoints.slice(0, 20) // Top 20 density points
    
    let bestCenter = { x: width / 2, y: height / 2 }
    let bestRadius = Math.min(width, height) * 0.2
    let bestCoverage = 0
    
    console.log('Searching for best circle...')
    
    // Try different centers from high-density regions
    for (const candidate of candidateCenters) {
      // Try different radii for this center
      const minRadius = Math.min(width, height) * 0.1
      const maxRadius = Math.min(width, height) * 0.4
      const radiusStep = Math.min(width, height) * 0.01
      
      for (let radius = minRadius; radius <= maxRadius; radius += radiusStep) {
        const density = evaluateEllipseDensity(candidate.x, candidate.y, radius)
        if (density > bestCoverage) {
          bestCoverage = density
          bestCenter = { x: candidate.x, y: candidate.y }
          bestRadius = radius
        }
      }
    }
    
    // Also try a grid search across the entire image
    const gridStep = Math.min(width, height) * 0.02
    for (let y = gridStep; y < height - gridStep; y += gridStep) {
      for (let x = gridStep; x < width - gridStep; x += gridStep) {
        const minRadius = Math.min(width, height) * 0.1
        const maxRadius = Math.min(width, height) * 0.4
        const radiusStep = Math.min(width, height) * 0.01
        
        for (let radius = minRadius; radius <= maxRadius; radius += radiusStep) {
          const density = evaluateEllipseDensity(x, y, radius)
          if (density > bestCoverage) {
            bestCoverage = density
            bestCenter = { x, y }
            bestRadius = radius
          }
        }
      }
    }
    
    console.log(`Best circle found: center=(${bestCenter.x.toFixed(1)}, ${bestCenter.y.toFixed(1)}), radius=${bestRadius.toFixed(1)}, average density: ${(bestCoverage * 100).toFixed(1)}%`)
    
    // Generate points along the best circle
    const points = []
    
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = (2 * Math.PI * i) / NUM_SAMPLES
      const x = bestCenter.x + bestRadius * Math.cos(t)
      const y = bestCenter.y + bestRadius * Math.sin(t)
      
      points.push({
        x: Math.round(x),
        y: Math.round(y)
      })
    }
    
    console.log(`Generated ${points.length} points along best circle`)
    return {
      points: points,
      center: bestCenter,
      radius: bestRadius,
      numSamples: NUM_SAMPLES
    }
  }

  // Find beads along the ellipse using perpendicular sampling
  const findBeadsAlongEllipse = (data, width, height, densityMap, curveData) => {
    const cv = window.cv
    const beads = []
    
    const { points, center, radius, numSamples } = curveData
    const maxPerpendicularDistance = radius * 0.3 // 30% of radius
    
    console.log(`Sampling ${numSamples} points along ellipse with radius ${radius.toFixed(1)}`)
    
    for (let i = 0; i < numSamples; i++) {
      const t = (2 * Math.PI * i) / numSamples
      const ellipseX = center.x + radius * Math.cos(t)
      const ellipseY = center.y + radius * Math.sin(t)
      
      // Calculate perpendicular direction (tangent is (-sin(t), cos(t)), so perpendicular is (cos(t), sin(t)))
      // For a circle, the perpendicular direction is the same as the radial direction
      const perpX = Math.cos(t)
      const perpY = Math.sin(t)
      
      let bestColor = null
      let bestVibrancy = 0
      let bestDistance = 0
      
      // Sample along perpendicular line segment
      const numPerpSamples = 20
      for (let j = 0; j < numPerpSamples; j++) {
        const perpDistance = (j - numPerpSamples / 2) * (maxPerpendicularDistance * 2) / numPerpSamples
        const sampleX = ellipseX + perpDistance * perpX
        const sampleY = ellipseY + perpDistance * perpY
        
        const xInt = Math.round(sampleX)
        const yInt = Math.round(sampleY)
        
        if (xInt >= 0 && xInt < width && yInt >= 0 && yInt < height) {
          // Check if point is above density threshold
          const densityValue = densityMap.ucharPtr(yInt, xInt)[0]
          if (densityValue > 50) { // Lower threshold to catch more colors
            // Sample color at this point
            const idx = (yInt * width + xInt) * 4
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            
            // Calculate color vibrancy (saturation + brightness)
            const max = Math.max(r, g, b)
            const min = Math.min(r, g, b)
            const saturation = max === 0 ? 0 : (max - min) / max
            const brightness = max / 255
            const vibrancy = saturation * brightness
            
            if (vibrancy > bestVibrancy) {
              bestVibrancy = vibrancy
              bestColor = [r, g, b]
              bestDistance = perpDistance
            }
          }
        }
      }
      
      if (bestColor) {
        beads.push({
          centerX: ellipseX + bestDistance * perpX,
          centerY: ellipseY + bestDistance * perpY,
          color: bestColor,
          hex: rgbToHex(bestColor[0], bestColor[1], bestColor[2]),
          radius: 5, // Small radius for visualization
          vibrancy: bestVibrancy,
          angle: t,
          perpDistance: bestDistance
        })
      } else {
        // Debug: log when no color is found
        console.log(`No color found at angle ${(t * 180 / Math.PI).toFixed(1)}°, density threshold may be too high`)
      }
    }
    
    console.log(`Found ${beads.length} samples along ellipse`)
    
    // Debug: log some sample colors
    for (let i = 0; i < Math.min(10, beads.length); i++) {
      const bead = beads[i]
      console.log(`Bead ${i}: ${bead.hex} (RGB: ${bead.color.join(',')}) vibrancy: ${bead.vibrancy.toFixed(3)}`)
    }
    
    return beads
  }

  // Group color samples into individual beads
  const groupSamplesIntoBeads = (colorSamples, edges, width, height) => {
    if (!colorSamples || colorSamples.length === 0) return []
    
    console.log(`Grouping ${colorSamples.length} color samples into beads`)
    
    // Function to calculate color distance with brightness normalization
    const colorDistance = (color1, color2) => {
      // Helper function to convert RGB to HSV
      const rgbToHsv = (r, g, b) => {
        r /= 255
        g /= 255
        b /= 255
        
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const diff = max - min
        
        let h = 0
        if (diff !== 0) {
          if (max === r) h = ((g - b) / diff) % 6
          else if (max === g) h = (b - r) / diff + 2
          else h = (r - g) / diff + 4
        }
        h = Math.round(h * 60)
        if (h < 0) h += 360
        
        const s = max === 0 ? 0 : diff / max
        const v = max
        
        return [h, s, v]
      }
      
      // Helper function to convert HSV to RGB
      const hsvToRgb = (h, s, v) => {
        const c = v * s
        const x = c * (1 - Math.abs((h / 60) % 2 - 1))
        const m = v - c
        
        let r = 0, g = 0, b = 0
        if (h >= 0 && h < 60) { r = c; g = x; b = 0 }
        else if (h >= 60 && h < 120) { r = x; g = c; b = 0 }
        else if (h >= 120 && h < 180) { r = 0; g = c; b = x }
        else if (h >= 180 && h < 240) { r = 0; g = x; b = c }
        else if (h >= 240 && h < 300) { r = x; g = 0; b = c }
        else if (h >= 300 && h < 360) { r = c; g = 0; b = x }
        
        return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
      }
      
      // Convert both colors to HSV
      const hsv1 = rgbToHsv(color1[0], color1[1], color1[2])
      const hsv2 = rgbToHsv(color2[0], color2[1], color2[2])
      
      // Normalize brightness to a common value (0.8) while preserving hue and saturation
      const normalizedBrightness = 0.8
      const normalizedHsv1 = [hsv1[0], hsv1[1], normalizedBrightness]
      const normalizedHsv2 = [hsv2[0], hsv2[1], normalizedBrightness]
      
      // Convert back to RGB
      const normalizedRgb1 = hsvToRgb(normalizedHsv1[0], normalizedHsv1[1], normalizedHsv1[2])
      const normalizedRgb2 = hsvToRgb(normalizedHsv2[0], normalizedHsv2[1], normalizedHsv2[2])
      
      // Calculate distance using normalized colors
      const dr = normalizedRgb1[0] - normalizedRgb2[0]
      const dg = normalizedRgb1[1] - normalizedRgb2[1]
      const db = normalizedRgb1[2] - normalizedRgb2[2]
      return Math.sqrt(dr * dr + dg * dg + db * db)
    }
    
    // Function to check if there's an edge between two points
    const hasEdgeBetween = (point1, point2) => {
      if (!edges) return false
      
      const dx = point2.centerX - point1.centerX
      const dy = point2.centerY - point1.centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const steps = Math.ceil(distance)
      
      if (steps === 0) return false
      
      const stepX = dx / steps
      const stepY = dy / steps
      
      for (let i = 0; i <= steps; i++) {
        const x = Math.round(point1.centerX + i * stepX)
        const y = Math.round(point1.centerY + i * stepY)
        
                  if (x >= 0 && x < width && y >= 0 && y < height) {
            const edgeValue = edges.ucharPtr(y, x)[0]
            if (edgeValue > 80) { // Slightly lower threshold to be more lenient with specular highlights
              return true
            }
          }
      }
      return false
    }
    
    // Group samples into beads by comparing each sample with the next one
    const groups = []
    let currentGroup = [0] // Start with the first sample
    
    for (let i = 0; i < colorSamples.length - 1; i++) {
      const sample1 = colorSamples[i]
      const sample2 = colorSamples[i + 1]
      
      // Check color similarity
      const colorDiff = colorDistance(sample1.color, sample2.color)
      console.log(`Color diff ${i} ${i+1}: ${colorDiff}, %c${sample1.hex}, %c${sample2.hex}`, `color: #000; background: ${sample1.hex}`, `color: #000; background: ${sample2.hex}`)
      
      if (colorDiff < 40) { // Color similarity threshold
        // Check if there's an edge between them (but be more lenient for specular highlights)
        const hasEdge = hasEdgeBetween(sample1, sample2)
        if (!hasEdge) {
          // Add the next sample to the current group
          currentGroup.push(i + 1)
        } else {
          // For specular highlights, we might want to be more lenient
          // If the edge is weak or the colors are very similar, continue grouping
          const colorDiffThresholdDespiteEdge = 20 * (8 / (currentGroup.length + 1))
          if (colorDiff < colorDiffThresholdDespiteEdge) { // Very similar colors
            console.log(`Continuing grouping despite edge - colors very similar (diff: ${colorDiff.toFixed(1)}) (threshold: ${colorDiffThresholdDespiteEdge.toFixed(1)})`)
            currentGroup.push(i + 1)
          } else {
            console.log(`Edge detected and colors not similar enough, start a new group (diff: ${colorDiff.toFixed(1)})  (threshold: ${colorDiffThresholdDespiteEdge.toFixed(1)})`)
            groups.push(currentGroup)
            currentGroup = [i + 1]
          }
        }
      } else {
        console.log(`Color too different, start a new group (diff: ${colorDiff.toFixed(1)})`)
        groups.push(currentGroup)
        currentGroup = [i + 1]
      }
    }
    
    // Don't forget to add the last group
    groups.push(currentGroup)
    
    console.log(`Grouped ${colorSamples.length} samples into ${groups.length} potential beads`)
    
    // Create bead objects from groups
    const beads = []
    
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex]
      
      if (group.length >= 3) { // Minimum 3 samples to form a bead
        // Calculate average position and color
        let avgX = 0, avgY = 0
        let avgR = 0, avgG = 0, avgB = 0
        let totalVibrancy = 0
        
        for (const sampleIndex of group) {
          const sample = colorSamples[sampleIndex]
          avgX += sample.centerX
          avgY += sample.centerY
          avgR += sample.color[0]
          avgG += sample.color[1]
          avgB += sample.color[2]
          totalVibrancy += sample.vibrancy
        }
        
        avgX /= group.length
        avgY /= group.length
        avgR /= group.length
        avgG /= group.length
        avgB /= group.length
        const avgVibrancy = totalVibrancy / group.length
        
        const avgColor = [Math.round(avgR), Math.round(avgG), Math.round(avgB)]
        
        beads.push({
          centerX: avgX,
          centerY: avgY,
          color: avgColor,
          hex: rgbToHex(avgColor[0], avgColor[1], avgColor[2]),
          radius: group.length * 2, // Size based on number of samples
          vibrancy: avgVibrancy,
          sampleCount: group.length
        })
      }
    }
    
    console.log(`Created ${beads.length} beads from groups`)
    return beads
  }

  // Find beads along the bracelet curve (old method - disabled)
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

    // Target processing resolution
    const targetWidth = 640
    const targetHeight = 480

    if (isTestMode && imageRef.current) {
      // Use test image
      const originalWidth = imageRef.current.naturalWidth
      const originalHeight = imageRef.current.naturalHeight
      
      // Check if downscaling is needed
      if (originalWidth > targetWidth || originalHeight > targetHeight) {
        // Calculate scale to fit within target dimensions while maintaining aspect ratio
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const scale = Math.min(scaleX, scaleY)
        
        canvas.width = Math.round(originalWidth * scale)
        canvas.height = Math.round(originalHeight * scale)
        console.log(`Downscaling test image from ${originalWidth}x${originalHeight} to ${canvas.width}x${canvas.height}`)
      } else {
        canvas.width = originalWidth
        canvas.height = originalHeight
      }
      
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)
    } else if (videoRef.current) {
      // Use camera feed
      const video = videoRef.current
      const originalWidth = video.videoWidth
      const originalHeight = video.videoHeight
      
      // Check if downscaling is needed
      if (originalWidth > targetWidth || originalHeight > targetHeight) {
        // Calculate scale to fit within target dimensions while maintaining aspect ratio
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const scale = Math.min(scaleX, scaleY)
        
        canvas.width = Math.round(originalWidth * scale)
        canvas.height = Math.round(originalHeight * scale)
        console.log(`Downscaling camera feed from ${originalWidth}x${originalHeight} to ${canvas.width}x${canvas.height}`)
      } else {
        canvas.width = originalWidth
        canvas.height = originalHeight
      }
      
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
    const result = detectBeadsWithOpenCV(data, width, height)
    const detectedBeads = result.beads
    const densityMask = result.densityMask
    const edges = result.edges
    const colorSamples = result.colorSamples
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
    
    // Draw markers on overlay (pass both color samples and grouped beads)
    // Use the actual processed canvas dimensions for the overlay
    const processedWidth = canvas.width
    const processedHeight = canvas.height
    drawBeadMarkers(uniqueBeads, processedWidth, processedHeight, braceletCurve, densityMask, edges, colorSamples)
    
    // Clean up the density mask and edges after drawing
    if (densityMask) {
      densityMask.delete()
    }
    if (edges) {
      edges.delete()
    }
  }

  // Single detection run in test mode
  useEffect(() => {
    if (isCameraActive && opencvReady && isTestMode) {
      // In test mode, run detection only once
      if (!hasRunTestDetectionRef.current) {
        hasRunTestDetectionRef.current = true
        setIsProcessing(true)
        detectBeads()
        setTimeout(() => setIsProcessing(false), 100)
      }
    }
  }, [isCameraActive, isTestMode, opencvReady])

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
            <div className="camera-buttons">
              <button onClick={stopCamera} className="stop-btn">
                {isTestMode ? 'Stop Detection' : 'Stop Camera'}
              </button>
              {!isTestMode && showDetectButton && (
                <button 
                  onClick={handleDetectBeads} 
                  className="detect-btn"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Detecting...' : 'Detect Beads'}
                </button>
              )}
            </div>
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
              style={{ display: isCameraActive ? 'block' : 'none' }}
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
