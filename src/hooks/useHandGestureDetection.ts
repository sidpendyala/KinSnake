import { useEffect, useRef } from 'react'

// -------------------- Settings --------------------
const MIRROR_VIEW = true          // selfie-style preview
const INVERT_HORIZONTAL = true    // fixes L/R when MIRROR_VIEW is true
const EMA_ALPHA = 0.35            // smoothing factor (0..1)
const COOLDOWN_S = 0.18           // min seconds between direction emits
const DEADZONE_SCALE = 0.55       // vector must exceed this * hand_size to count
// --------------------------------------------------

type DetectedDirection = "UP" | "DOWN" | "LEFT" | "RIGHT" | "CENTER"

interface UseHandGestureDetectionProps {
  videoElement: HTMLVideoElement | null
  onDirectionDetected: (direction: DetectedDirection) => void
  isActive: boolean
  cooldown?: number
  handedness?: "left" | "right"
  onHandLandmarks?: (landmarks: any) => void
}

/**
 * Quantize smoothed vector (dx, dy) to one of 4 directions using angles.
 * Note: image coords → +x right, +y down
 */
function quantizeDirection(dx: number, dy: number): DetectedDirection {
  const ang = Math.atan2(dy, dx) * (180 / Math.PI) // Convert to degrees (-180, 180]
  
  if (ang >= -45 && ang <= 45) {
    return "RIGHT"
  } else if (ang > 45 && ang <= 135) {
    return "DOWN"
  } else if (ang > 135 || ang <= -135) {
    return "LEFT"
  } else {
    return "UP"
  }
}

export const useHandGestureDetection = ({
  videoElement,
  onDirectionDetected,
  isActive,
  cooldown = COOLDOWN_S,
  handedness = "right",
  onHandLandmarks
}: UseHandGestureDetectionProps) => {
  const handsRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const lastEmitTimeRef = useRef(0)
  const lastDirectionRef = useRef<DetectedDirection>("CENTER")
  const emaRef = useRef({ dx: 0, dy: 0 }) // Exponential moving average state

  useEffect(() => {
    if (!isActive || !videoElement) return

    let animationFrameId: number

    const initializeHandDetection = async () => {
      try {
        // Dynamically load MediaPipe Hands from CDN
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
        script.async = true
        
        await new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })

        // @ts-ignore - MediaPipe Hands loaded from CDN
        const Hands = window.Hands
        
        if (!Hands) {
          console.error('MediaPipe Hands not loaded')
          return
        }

        // @ts-ignore
        handsRef.current = new Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          }
        })

        handsRef.current.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55
        })

        handsRef.current.onResults((results: any) => {
          if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            // Reset EMA when hand is lost
            emaRef.current = { dx: 0, dy: 0 }
            return
          }

          const landmarks = results.multiHandLandmarks[0]
          const handLabel = results.multiHandedness?.[0]?.label?.toLowerCase()

          // Filter by selected hand
          if (handedness === "right" && handLabel !== "right") return
          if (handedness === "left" && handLabel !== "left") return

          // Pass landmarks for visualization
          if (onHandLandmarks) {
            onHandLandmarks(landmarks)
          }

          const w = videoElement.videoWidth
          const h = videoElement.videoHeight

          // Wrist (0), Index tip (8)
          const wrist = landmarks[0]
          const indexTip = landmarks[8]
          
          const x0 = wrist.x * w
          const y0 = wrist.y * h
          const x8 = indexTip.x * w
          const y8 = indexTip.y * h

          let dx_raw = x8 - x0
          let dy_raw = y8 - y0

          // Fix L/R flip due to mirrored preview
          if (MIRROR_VIEW && INVERT_HORIZONTAL) {
            dx_raw = -dx_raw
          }

          // Exponential moving average (smoothing)
          emaRef.current.dx = EMA_ALPHA * dx_raw + (1 - EMA_ALPHA) * emaRef.current.dx
          emaRef.current.dy = EMA_ALPHA * dy_raw + (1 - EMA_ALPHA) * emaRef.current.dy

          const ema_dx = emaRef.current.dx
          const ema_dy = emaRef.current.dy

          // Dead-zone scales with hand size (index MCP vs middle MCP)
          const indexMCP = landmarks[5]  // Index finger MCP
          const middleMCP = landmarks[9] // Middle finger MCP
          
          const x5 = indexMCP.x * w
          const y5 = indexMCP.y * h
          const x9 = middleMCP.x * w
          const y9 = middleMCP.y * h
          
          const handSize = Math.hypot(x5 - x9, y5 - y9) + 1e-6
          const deadZone = DEADZONE_SCALE * handSize

          // Only emit if motion is strong enough
          const motionMagnitude = Math.hypot(ema_dx, ema_dy)
          
          if (motionMagnitude >= deadZone) {
            const candidate = quantizeDirection(ema_dx, ema_dy)
            const controlDir = candidate

            // Cooldown & change filter
            const now = performance.now() / 1000
            const timeSinceLastEmit = now - lastEmitTimeRef.current

            if (
              (controlDir !== lastDirectionRef.current && timeSinceLastEmit >= cooldown) ||
              lastDirectionRef.current === "CENTER"
            ) {
              onDirectionDetected(controlDir)
              lastDirectionRef.current = controlDir
              lastEmitTimeRef.current = now
              console.log(`Hand Gesture Detected: ${controlDir}`)
            }
          }
        })

        // Start processing video
        const processFrame = async () => {
          if (videoElement && handsRef.current && isActive) {
            await handsRef.current.send({ image: videoElement })
          }
          if (isActive) {
            animationFrameId = requestAnimationFrame(processFrame)
          }
        }

        processFrame()

      } catch (error) {
        console.error('Failed to initialize hand detection:', error)
      }
    }

    initializeHandDetection()

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      if (handsRef.current) {
        handsRef.current.close()
      }
      // Reset state on cleanup
      lastDirectionRef.current = "CENTER"
      emaRef.current = { dx: 0, dy: 0 }
    }
  }, [isActive, videoElement, onDirectionDetected, cooldown, handedness, onHandLandmarks])
}