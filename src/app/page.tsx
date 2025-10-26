"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Navigation } from "@/components/Navigation"
import { SnakeTrail } from "@/components/SnakeTrail"
import { CameraConsentModal } from "@/components/CameraConsentModal"
import { HandSelectionDialog } from "@/components/HandSelectionDialog"
import { HandLandmarksCanvas } from "@/components/HandLandmarksCanvas"
import { SnakeGameBoard, Direction } from "@/components/SnakeGameBoard"
import { GameHUD } from "@/components/GameHUD"
import { GameCompletionOverlay } from "@/components/GameCompletionOverlay"
import { BackendStatus } from "@/components/BackendStatus"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Square, RotateCcw, Video, VideoOff, Hand } from "lucide-react"
import { useHandGestureDetection } from "@/hooks/useHandGestureDetection"
import { useBackendConnection } from "@/hooks/useBackendConnection"

type GameState = "idle" | "running" | "paused" | "completed"

export default function Dashboard() {
  // Camera & Consent
  const [cameraGranted, setCameraGranted] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [showHandSelection, setShowHandSelection] = useState(false)
  const [selectedHand, setSelectedHand] = useState<"left" | "right">("right")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Game State
  const [gameState, setGameState] = useState<GameState>("idle")
  const gameStateRef = useRef<GameState>("idle")
  const [apples, setApples] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [bestScore, setBestScore] = useState(0)
  const [sensitivity, setSensitivity] = useState([60])  // Balanced default for comfortable gameplay
  const [isNewBest, setIsNewBest] = useState(false)

  // Direction & Gesture
  const [direction, setDirection] = useState<Direction>({ x: 1, y: 0 })
  const [recentDirections, setRecentDirections] = useState<string[]>([])
  const lastDirectionRef = useRef<Direction>({ x: 1, y: 0 })
  const lastGestureRef = useRef<string>("")
  const [handLandmarks, setHandLandmarks] = useState<any>(null)
  
  // Backend mode toggle
  const [useBackend, setUseBackend] = useState(true)
  const [backendCameraFrame, setBackendCameraFrame] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraStartedRef = useRef(false)

  const ariaLiveRef = useRef<HTMLDivElement>(null)

  // Hand gesture detection
  const handleGestureDetected = useCallback((detectedDirection: "UP" | "DOWN" | "LEFT" | "RIGHT" | "CENTER") => {
    if (gameState !== "running") return

    let newDirection: Direction | null = null
    let directionName = ""

    switch (detectedDirection) {
      case "UP":
        newDirection = { x: 0, y: -1 }
        directionName = "Up"
        break
      case "DOWN":
        newDirection = { x: 0, y: 1 }
        directionName = "Down"
        break
      case "LEFT":
        newDirection = { x: -1, y: 0 }
        directionName = "Left"
        break
      case "RIGHT":
        newDirection = { x: 1, y: 0 }
        directionName = "Right"
        break
      default:
        return
    }

    if (newDirection) {
      const lastDir = lastDirectionRef.current

      // Block 180° reversals
      const isOpposite = 
        (newDirection.x === -lastDir.x && newDirection.y === 0 && lastDir.y === 0) ||
        (newDirection.y === -lastDir.y && newDirection.x === 0 && lastDir.x === 0)

      if (!isOpposite) {
        setDirection(newDirection)
        lastDirectionRef.current = newDirection
        
        // Only update recent directions if it's a different gesture
        if (lastGestureRef.current !== directionName) {
          setRecentDirections(prev => [directionName, ...prev.slice(0, 2)])
          lastGestureRef.current = directionName
        }
      }
    }
  }, [gameState])

  // Handle landmarks for drawing  
  const handleLandmarks = useCallback((landmarks: any) => {
    setHandLandmarks(landmarks)
  }, [])

  // Backend gesture handler (uses ref to avoid stale closure)
  const handleBackendGesture = useCallback((direction: string) => {
    const currentGameState = gameStateRef.current
    
    let newDirection: Direction | null = null
    let directionName = ""
    
    switch (direction) {
      case "UP":
        newDirection = { x: 0, y: -1 }
        directionName = "Up"
        break
      case "DOWN":
        newDirection = { x: 0, y: 1 }
        directionName = "Down"
        break
      case "LEFT":
        newDirection = { x: -1, y: 0 }
        directionName = "Left"
        break
      case "RIGHT":
        newDirection = { x: 1, y: 0 }
        directionName = "Right"
        break
      default:
        return
    }
    
    if (newDirection && currentGameState === "running") {
      const lastDir = lastDirectionRef.current
      
      const isOpposite = 
        (newDirection.x === -lastDir.x && newDirection.y === 0 && lastDir.y === 0) ||
        (newDirection.y === -lastDir.y && newDirection.x === 0 && lastDir.x === 0)
      
      if (!isOpposite) {
        // Immediate direction update
        setDirection(newDirection)
        lastDirectionRef.current = newDirection
        
        // Only update recent directions if it's a different gesture
        if (lastGestureRef.current !== directionName) {
          setRecentDirections(prev => [directionName, ...prev.slice(0, 2)])
          lastGestureRef.current = directionName
        }
      }
    }
  }, [])

  // Handle backend camera frames
  const handleBackendCameraFrame = useCallback((frameData: string) => {
    setBackendCameraFrame(frameData)
  }, [])

  // Initialize backend connection BEFORE using backendStatus
  const { status: backendStatus, sendCommand, startCamera: startBackendCamera, stopCamera: stopBackendCamera, setGameRunning } = useBackendConnection({
    onGestureDetected: handleBackendGesture,
    onCameraFrame: handleBackendCameraFrame,
    enabled: useBackend
  })

  // Keep game state ref in sync and notify backend (AFTER setGameRunning is available)
  useEffect(() => {
    gameStateRef.current = gameState
    
    // Tell backend if game is running (for voice/detection control)
    if (useBackend && setGameRunning) {
      setGameRunning(gameState === "running")
    }
  }, [gameState, useBackend, setGameRunning])

  // Ensure camera stays active during gameplay (AFTER backendStatus is defined)
  useEffect(() => {
    if (gameState === "running" && useBackend && backendStatus.connected && !cameraActive && !cameraStartedRef.current) {
      console.log('[Frontend] Restarting camera for gameplay')
      cameraStartedRef.current = true
      startBackendCamera(selectedHand)
      setCameraActive(true)
    }
  }, [gameState, useBackend, backendStatus.connected, cameraActive, selectedHand, startBackendCamera])

  // Initialize hand gesture detection (frontend mode)
  useHandGestureDetection({
    videoElement: videoRef.current,
    onDirectionDetected: handleGestureDetected,
    isActive: cameraActive && !useBackend,
    cooldown: 0.2,
    handedness: selectedHand,
    onHandLandmarks: handleLandmarks
  })

  // Load best score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kinsnake.bestScore")
    if (saved) setBestScore(parseInt(saved, 10))
  }, [])

  // Check for existing camera permission on page load
  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        // Check if we already have camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        })
        
        // If we get here, permission is already granted
        setCameraGranted(true)
        setShowConsentModal(false)
        setShowHandSelection(true)
        
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop())
        
        announceToScreenReader("Camera permission already granted. Please select your hand.")
      } catch (error) {
        // Permission not granted, show consent modal
        setShowConsentModal(true)
      }
    }

    checkCameraPermission()
  }, [])

  // Camera consent handler
  const handleConsent = async () => {
    try {
      if (useBackend) {
        // For backend mode, we just need permission but backend handles the camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        })
        // Stop the stream immediately since backend will handle camera
        stream.getTracks().forEach(track => track.stop())
        
        setCameraGranted(true)
        setShowConsentModal(false)
        // Show hand selection dialog immediately after camera access
        setShowHandSelection(true)
        announceToScreenReader("Camera access granted. Please select your hand.")
      } else {
        // Frontend mode - use local camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraGranted(true)
        setCameraActive(true)
        setShowConsentModal(false)
        // Show hand selection dialog immediately after camera access
        setShowHandSelection(true)
        announceToScreenReader("Camera access granted. Please select your hand.")
      }
    } catch (error) {
      console.error("Camera access denied:", error)
      announceToScreenReader("Camera access denied. Please allow camera to play.")
    }
  }

  // Handle hand selection
  const handleHandSelect = (hand: "left" | "right") => {
    setSelectedHand(hand)
    setShowHandSelection(false)
    
    if (useBackend && backendStatus.connected) {
      // Start backend camera stream with selected hand
      startBackendCamera(hand)
      setCameraActive(true)
    } else if (!useBackend) {
      // For frontend mode, camera is already active, just set the hand
      setCameraActive(true)
    }
    
    announceToScreenReader(`${hand} hand selected. Ready to play.`)
  }

  // Auto-start camera when backend connects (if camera granted and hand selected)
  useEffect(() => {
    if (useBackend && backendStatus.connected && cameraGranted && !cameraActive && !cameraStartedRef.current && !showHandSelection) {
      console.log('[Frontend] Auto-starting backend camera')
      cameraStartedRef.current = true
      startBackendCamera(selectedHand)
      setCameraActive(true)
    }
  }, [useBackend, backendStatus.connected, cameraGranted, cameraActive, selectedHand, startBackendCamera, showHandSelection])

  // End camera session
  const endCameraSession = () => {
    if (useBackend) {
      stopBackendCamera()
      setBackendCameraFrame(null)
      cameraStartedRef.current = false
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
    setCameraActive(false)
    if (gameState === "running") {
      setGameState("paused")
    }
    announceToScreenReader("Camera session ended.")
  }

  // Timer countdown
  useEffect(() => {
    if (gameState !== "running") return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setGameState("completed")
          announceToScreenReader("Challenge complete!")
          return 0
        }
        // Announce every 5 seconds
        if (prev % 5 === 0) {
          announceToScreenReader(`${prev} seconds remaining`)
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState])

  // Check and save best score on completion
  useEffect(() => {
    if (gameState === "completed" && apples > bestScore) {
      setBestScore(apples)
      localStorage.setItem("kinsnake.bestScore", apples.toString())
      setIsNewBest(true)
      announceToScreenReader(`New best score: ${apples} apples!`)
    }
  }, [gameState, apples, bestScore])

  // Announce to screen reader
  const announceToScreenReader = (message: string) => {
    if (ariaLiveRef.current) {
      ariaLiveRef.current.textContent = message
    }
  }

  // Handle apple eaten with duplicate prevention
  const lastAppleTimeRef = useRef(0)
  const handleAppleEaten = useCallback(() => {
    const now = Date.now()
    // Prevent double-counting if called within 100ms
    if (now - lastAppleTimeRef.current < 100) {
      console.log('[Game] Duplicate apple eat prevented')
      return
    }
    lastAppleTimeRef.current = now
    
    setApples(prev => {
      const newCount = prev + 1
      announceToScreenReader(`Apple eaten! Total: ${newCount}`)
      return newCount
    })
  }, [])

  // Handle game over (collision)
  const handleGameOver = useCallback(() => {
    setGameState("completed")
    announceToScreenReader("Game over! Snake collision.")
  }, [])

  // Start game
  const startGame = () => {
    if (!cameraGranted) {
      setShowConsentModal(true)
      return
    }
    setGameState("running")
    setApples(0)
    setTimeRemaining(60)
    setIsNewBest(false)
    announceToScreenReader("Game started. Timer running.")
  }

  // Resume game (from paused state)
  const resumeGame = () => {
    setGameState("running")
    announceToScreenReader("Game resumed.")
  }

  // Stop/Pause game
  const stopGame = () => {
    setGameState("paused")
    announceToScreenReader("Game paused.")
  }

  // Restart game
  const restartGame = () => {
    setGameState("idle")
    setApples(0)
    setTimeRemaining(60)
    setIsNewBest(false)
    setDirection({ x: 1, y: 0 })
    lastDirectionRef.current = { x: 1, y: 0 }
    lastGestureRef.current = ""
    setRecentDirections([])
    announceToScreenReader("Game reset. Ready to start.")
    // Automatically start if we're restarting from completion
    setTimeout(() => startGame(), 100)
  }

  // Reset best score
  const resetBestScore = () => {
    setBestScore(0)
    setIsNewBest(false)
    localStorage.removeItem("kinsnake.bestScore")
    announceToScreenReader("Best score reset to 0.")
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "running") return

      const key = e.key
      let newDirection: Direction | null = null
      let directionName = ""

      switch (key) {
        case "ArrowUp":
        case "w":
        case "W":
          newDirection = { x: 0, y: -1 }
          directionName = "Up"
          break
        case "ArrowDown":
        case "s":
        case "S":
          newDirection = { x: 0, y: 1 }
          directionName = "Down"
          break
        case "ArrowLeft":
        case "a":
        case "A":
          newDirection = { x: -1, y: 0 }
          directionName = "Left"
          break
        case "ArrowRight":
        case "d":
        case "D":
          newDirection = { x: 1, y: 0 }
          directionName = "Right"
          break
        default:
          return
      }

      if (newDirection) {
        e.preventDefault()
        const lastDir = lastDirectionRef.current

        // Block 180° reversals
        const isOpposite = 
          (newDirection.x === -lastDir.x && newDirection.y === 0 && lastDir.y === 0) ||
          (newDirection.y === -lastDir.y && newDirection.x === 0 && lastDir.x === 0)

        if (!isOpposite) {
          setDirection(newDirection)
          lastDirectionRef.current = newDirection
          
          // Only update recent directions if it's a different gesture
          if (lastGestureRef.current !== directionName) {
            setRecentDirections(prev => [directionName, ...prev.slice(0, 2)])
            lastGestureRef.current = directionName
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameState])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Snake Trail Background */}
      <SnakeTrail />
      
      {/* Purple Gradient Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-glow/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-purple-neon/8 rounded-full blur-[150px] animate-pulse-slower" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-dark/15 rounded-full blur-[100px] animate-float" />
      </div>

      {/* Camera Consent Modal */}
      <CameraConsentModal 
        open={showConsentModal && !cameraGranted} 
        onConsent={handleConsent}
        onClose={() => setShowConsentModal(false)}
      />

      {/* Hand Selection Dialog - Hidden by default, can be triggered manually */}
      <HandSelectionDialog
        open={showHandSelection}
        onSelect={handleHandSelect}
        onClose={() => setShowHandSelection(false)}
      />

      {/* Blur overlay when not consented */}
      {!cameraGranted && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/50 z-[40] pointer-events-none" />
      )}

      <div className="relative z-10">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold text-glow">KinSnake</h1>
                <p className="text-muted-foreground text-lg">
                  Control the snake with gestures • 60 second challenge
                </p>
              </div>

            </div>

            {/* Game HUD */}
            <GameHUD 
              apples={apples}
              timeRemaining={timeRemaining}
              bestScore={bestScore}
              isRunning={gameState === "running"}
            />
          </div>

          {/* Game Board & Camera Preview - Side by Side */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Snake Game Board */}
            <Card className="border-glow bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-glow">Game Board</CardTitle>
                <CardDescription>
                  {gameState === "idle" && "Press Start to begin the challenge"}
                  {gameState === "running" && "Use arrow keys or gestures to control the snake"}
                  {gameState === "paused" && "Game paused"}
                  {gameState === "completed" && "Challenge completed!"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center relative">
                <SnakeGameBoard
                  isRunning={gameState === "running"}
                  sensitivity={sensitivity[0]}
                  onAppleEaten={handleAppleEaten}
                  onGameOver={handleGameOver}
                  direction={direction}
                  recentDirections={recentDirections}
                />
                
                {/* Game Completion Overlay */}
                {gameState === "completed" && (
                  <GameCompletionOverlay
                    score={apples}
                    isNewBest={isNewBest}
                    onRestart={restartGame}
                  />
                )}
              </CardContent>
            </Card>

            {/* Camera Preview */}
            <Card className="border-glow bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-purple-glow flex items-center">
                      {cameraActive && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-glow mr-3" />
                      )}
                      Camera Preview
                      {cameraGranted && (
                        <span className="ml-3 text-xs font-normal text-purple-soft border border-purple-soft/30 px-2 py-1 rounded-md">
                          <Hand className="w-3 h-3 inline mr-1" />
                          {selectedHand === "left" ? "Left" : "Right"} Hand
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {cameraActive ? "Camera On - detecting gestures" : "Camera Off"}
                    </CardDescription>
                  </div>
                  
                  {cameraGranted && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Toggle hand
                          const newHand = selectedHand === "right" ? "left" : "right"
                          setSelectedHand(newHand)
                          if (useBackend && backendStatus.connected && cameraActive) {
                            stopBackendCamera()
                            setTimeout(() => {
                              startBackendCamera(newHand)
                            }, 100)
                          }
                          announceToScreenReader(`Switched to ${newHand} hand`)
                        }}
                        className="border-purple-glow/50"
                      >
                        <Hand className="w-4 h-4 mr-2" />
                        Switch to {selectedHand === "right" ? "Left" : "Right"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={endCameraSession}
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                      >
                        <VideoOff className="w-4 h-4 mr-2" />
                        End Session
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-black/40 rounded-lg overflow-hidden border border-purple-glow/30">
                  {useBackend && backendCameraFrame ? (
                    /* Backend camera stream with hand landmarks already drawn */
                    <img
                      src={backendCameraFrame}
                      alt="Backend camera feed"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Frontend camera stream */
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ display: cameraActive && !useBackend ? 'block' : 'none' }}
                      />
                      {/* Hand Landmarks Overlay (only for frontend mode) */}
                      {!useBackend && (
                        <HandLandmarksCanvas
                          videoElement={videoRef.current}
                          landmarksData={handLandmarks}
                          isActive={cameraActive}
                        />
                      )}
                    </>
                  )}
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {cameraGranted ? "Camera stopped" : "Grant camera access to start"}
                        </p>
                        {useBackend && !backendStatus.connected && (
                          <p className="text-xs text-red-500 mt-2">
                            Backend not connected
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {cameraActive && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {useBackend 
                      ? "🎥 HD Camera (1280x720 @ 15fps) • Real-time finger tracking • Point finger to control snake"
                      : "Frontend camera • All 21 hand joints visible • Brightest dots mark wrist and index finger tip"}
                  </p>
                )}
                {gameState === "running" && cameraActive && (
                  <p className="text-xs text-green-500 mt-1 text-center font-semibold">
                    ✅ Camera active during gameplay - Point your finger to move!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Game Controls - Below */}
          <div className="flex justify-center">
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl">
            {/* Backend Status */}
            <BackendStatus
              connected={backendStatus.connected}
              controllerRunning={backendStatus.controllerRunning}
            />

            {/* Game Controls */}
            <Card className="border-glow bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-glow">Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gameState === "idle" || gameState === "completed" ? (
                  <Button
                    onClick={startGame}
                    className="w-full gradient-purple hover-glow shadow-glow-purple"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Challenge
                  </Button>
                ) : gameState === "running" ? (
                  <Button
                    onClick={stopGame}
                    className="w-full bg-destructive hover:bg-destructive/90 shadow-glow-destructive"
                    size="lg"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    onClick={resumeGame}
                    className="w-full gradient-purple hover-glow shadow-glow-purple"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Resume
                  </Button>
                )}

                <Button
                  onClick={restartGame}
                  variant="outline"
                  className="w-full border-purple-glow/50"
                  size="lg"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Restart
                </Button>

                {/* Sensitivity Slider */}
                <div className="space-y-3 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Sensitivity</label>
                    <span className="text-sm text-purple-glow font-mono">{sensitivity[0]}%</span>
                  </div>
                  <Slider
                    value={sensitivity}
                    onValueChange={setSensitivity}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                    disabled={gameState === "running"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Affects snake movement speed
                  </p>
                </div>
              </CardContent>
            </Card>


            {/* Best Score Management */}
            <Card className="border-glow bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-glow text-sm">Best Score</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={resetBestScore}
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-purple-glow"
                >
                  Reset Best Score
                </Button>
              </CardContent>
            </Card>
            </div>
          </div>
        </main>
      </div>

      {/* ARIA Live Region for Screen Reader Announcements */}
      <div
        ref={ariaLiveRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  )
}