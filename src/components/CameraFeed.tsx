"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Video, VideoOff, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface GestureArrow {
  id: number
  x: number
  y: number
  direction: "up" | "down" | "left" | "right"
  opacity: number
}

export function CameraFeed() {
  const [isActive, setIsActive] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gestureArrows, setGestureArrows] = useState<GestureArrow[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsActive(true)
        setHasPermission(true)
        
        // Simulate gesture detection with animated arrows
        simulateGestures()
      }
    } catch (err) {
      setError("Camera access denied. Please grant permission to use this feature.")
      setHasPermission(false)
      console.error("Camera error:", err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
    setGestureArrows([])
  }

  const simulateGestures = () => {
    const directions: Array<"up" | "down" | "left" | "right"> = ["up", "down", "left", "right"]
    
    setInterval(() => {
      if (Math.random() > 0.7) {
        const newArrow: GestureArrow = {
          id: Date.now(),
          x: Math.random() * 80 + 10,
          y: Math.random() * 80 + 10,
          direction: directions[Math.floor(Math.random() * directions.length)],
          opacity: 1
        }
        
        setGestureArrows(prev => [...prev, newArrow])
        
        setTimeout(() => {
          setGestureArrows(prev => prev.filter(arrow => arrow.id !== newArrow.id))
        }, 2000)
      }
    }, 1500)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const getArrowRotation = (direction: string) => {
    switch (direction) {
      case "up": return "rotate-0"
      case "down": return "rotate-180"
      case "left": return "-rotate-90"
      case "right": return "rotate-90"
      default: return "rotate-0"
    }
  }

  return (
    <div className="space-y-4">
      {/* Camera Permission Alert */}
      {hasPermission === false && error && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Video Container */}
      <div className="relative aspect-video rounded-lg overflow-hidden border-glow bg-secondary/50">
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-4">
              <VideoOff className="w-16 h-16 mx-auto text-purple-glow animate-pulse" />
              <p className="text-muted-foreground">Camera is not active</p>
              <Button 
                onClick={startCamera}
                className="gradient-purple hover-glow shadow-glow-purple"
              >
                <Video className="w-4 h-4 mr-2" />
                Grant Camera Access
              </Button>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Purple Overlay */}
        {isActive && (
          <div className="absolute inset-0 bg-purple-glow/5 pointer-events-none mix-blend-overlay" />
        )}

        {/* Gesture Overlay Arrows */}
        {isActive && gestureArrows.map((arrow) => (
          <div
            key={arrow.id}
            className="absolute pointer-events-none animate-fade-out"
            style={{
              left: `${arrow.x}%`,
              top: `${arrow.y}%`,
            }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              className={`${getArrowRotation(arrow.direction)} drop-shadow-2xl`}
              style={{
                filter: "drop-shadow(0 0 10px rgb(168, 85, 247)) drop-shadow(0 0 20px rgb(168, 85, 247))"
              }}
            >
              <path
                d="M12 2L12 22M12 2L6 8M12 2L18 8"
                stroke="rgb(168, 85, 247)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}