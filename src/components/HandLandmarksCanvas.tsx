"use client"

import { useEffect, useRef } from "react"

interface HandLandmarksCanvasProps {
  videoElement: HTMLVideoElement | null
  landmarksData: any
  isActive: boolean
}

export function HandLandmarksCanvas({ videoElement, landmarksData, isActive }: HandLandmarksCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !videoElement || !isActive || !landmarksData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Match canvas size to video
    canvas.width = videoElement.videoWidth || 640
    canvas.height = videoElement.videoHeight || 480

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw hand landmarks and connections
    if (landmarksData.multiHandLandmarks) {
      for (const landmarks of landmarksData.multiHandLandmarks) {
        // Draw connections between landmarks
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [0, 9], [9, 10], [10, 11], [11, 12], // Middle
          [0, 13], [13, 14], [14, 15], [15, 16], // Ring
          [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
          [5, 9], [9, 13], [13, 17] // Palm
        ]

        // Draw connections with gradient effect
        ctx.strokeStyle = "#9f8ee0"
        ctx.lineWidth = 3
        ctx.shadowColor = "#9f8ee0"
        ctx.shadowBlur = 5
        for (const [start, end] of connections) {
          const startPoint = landmarks[start]
          const endPoint = landmarks[end]
          
          ctx.beginPath()
          ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height)
          ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height)
          ctx.stroke()
        }
        ctx.shadowBlur = 0

        // Draw ALL landmark points with enhanced visibility
        for (let i = 0; i < landmarks.length; i++) {
          const landmark = landmarks[i]
          const x = landmark.x * canvas.width
          const y = landmark.y * canvas.height

          // Enhanced highlighting for wrist (0) and index tip (8) - primary tracking points
          if (i === 0 || i === 8) {
            // Outer glow
            ctx.shadowColor = "#b3abf0"
            ctx.shadowBlur = 15
            ctx.fillStyle = "#b3abf0"
            ctx.beginPath()
            ctx.arc(x, y, 8, 0, 2 * Math.PI)
            ctx.fill()
            
            // Inner bright core
            ctx.shadowBlur = 20
            ctx.fillStyle = "#ffffff"
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, 2 * Math.PI)
            ctx.fill()
            ctx.shadowBlur = 0
          } 
          // Finger tips (4, 8, 12, 16, 20) - medium prominence
          else if (i === 4 || i === 12 || i === 16 || i === 20) {
            // Outer glow
            ctx.shadowColor = "#a98ee8"
            ctx.shadowBlur = 10
            ctx.fillStyle = "#a98ee8"
            ctx.beginPath()
            ctx.arc(x, y, 6, 0, 2 * Math.PI)
            ctx.fill()
            
            // Inner core
            ctx.shadowBlur = 0
            ctx.fillStyle = "#d1c9f5"
            ctx.beginPath()
            ctx.arc(x, y, 3, 0, 2 * Math.PI)
            ctx.fill()
          }
          // All other joint points - visible with glow
          else {
            // Outer glow
            ctx.shadowColor = "#9f8ee0"
            ctx.shadowBlur = 8
            ctx.fillStyle = "#9f8ee0"
            ctx.beginPath()
            ctx.arc(x, y, 5, 0, 2 * Math.PI)
            ctx.fill()
            
            // Inner core
            ctx.shadowBlur = 0
            ctx.fillStyle = "#c5bbf0"
            ctx.beginPath()
            ctx.arc(x, y, 2.5, 0, 2 * Math.PI)
            ctx.fill()
          }
        }
        ctx.shadowBlur = 0
      }
    }
  }, [videoElement, landmarksData, isActive])

  if (!isActive) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  )
}