"use client"

import { useEffect, useRef } from "react"

interface TrailSegment {
  x: number
  y: number
  opacity: number
}

export function SnakeTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trailRef = useRef<TrailSegment[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", handleMouseMove)

    // Autonomous snake movement with subtle gesture reaction
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let currentX = targetX
    let currentY = targetY
    let angle = 0

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Create smooth autonomous movement with slight mouse influence
      angle += 0.02
      const autonomousX = canvas.width / 2 + Math.cos(angle) * 200
      const autonomousY = canvas.height / 2 + Math.sin(angle * 0.7) * 150

      // Blend autonomous movement with mouse influence (70% autonomous, 30% mouse)
      targetX = autonomousX * 0.7 + mouseRef.current.x * 0.3
      targetY = autonomousY * 0.7 + mouseRef.current.y * 0.3

      // Smooth interpolation
      currentX += (targetX - currentX) * 0.05
      currentY += (targetY - currentY) * 0.05

      // Add new segment
      trailRef.current.unshift({
        x: currentX,
        y: currentY,
        opacity: 1,
      })

      // Limit trail length
      if (trailRef.current.length > 60) {
        trailRef.current.pop()
      }

      // Draw trail
      trailRef.current.forEach((segment, index) => {
        const progress = index / trailRef.current.length
        const size = 20 - progress * 15
        const opacity = (1 - progress) * 0.6

        // Create gradient for each segment
        const gradient = ctx.createRadialGradient(
          segment.x,
          segment.y,
          0,
          segment.x,
          segment.y,
          size
        )

        // Purple gradient colors
        gradient.addColorStop(0, `rgba(168, 85, 247, ${opacity})`)
        gradient.addColorStop(0.5, `rgba(147, 51, 234, ${opacity * 0.6})`)
        gradient.addColorStop(1, `rgba(126, 34, 206, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(segment.x, segment.y, size, 0, Math.PI * 2)
        ctx.fill()

        // Add glow effect
        ctx.shadowBlur = 20
        ctx.shadowColor = "rgba(168, 85, 247, 0.5)"
      })

      // Draw connecting lines between segments for snake-like appearance
      if (trailRef.current.length > 1) {
        for (let i = 0; i < trailRef.current.length - 1; i++) {
          const current = trailRef.current[i]
          const next = trailRef.current[i + 1]
          const progress = i / trailRef.current.length
          const opacity = (1 - progress) * 0.3

          ctx.strokeStyle = `rgba(168, 85, 247, ${opacity})`
          ctx.lineWidth = 3 - progress * 2
          ctx.beginPath()
          ctx.moveTo(current.x, current.y)
          ctx.lineTo(next.x, next.y)
          ctx.stroke()
        }
      }

      ctx.shadowBlur = 0

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMouseMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-40"
      style={{ mixBlendMode: "screen" }}
    />
  )
}
