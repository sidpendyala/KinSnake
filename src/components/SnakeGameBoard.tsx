"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"

const GRID_SIZE = 20
const CELL_SIZE = 28
const INITIAL_SNAKE = [{ x: 10, y: 10 }]
const INITIAL_DIRECTION = { x: 1, y: 0 }

export type Direction = { x: number; y: number }
export type Position = { x: number; y: number }

interface SnakeGameBoardProps {
  isRunning: boolean
  sensitivity: number
  onAppleEaten: () => void
  onGameOver: () => void
  direction: Direction
  recentDirections: string[]
}

export const SnakeGameBoard = ({
  isRunning,
  sensitivity,
  onAppleEaten,
  onGameOver,
  direction: externalDirection,
  recentDirections
}: SnakeGameBoardProps) => {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE)
  const [apple, setApple] = useState<Position>({ x: 15, y: 10 })
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION)
  const [applePulse, setApplePulse] = useState(false)
  const lastDirectionRef = useRef<Direction>(INITIAL_DIRECTION)
  const directionRef = useRef<Direction>(INITIAL_DIRECTION)  // Use ref for instant updates
  
  // Use refs to avoid stale closures in game loop
  const appleRef = useRef(apple)
  const onAppleEatenRef = useRef(onAppleEaten)
  const onGameOverRef = useRef(onGameOver)

  // Keep refs in sync with latest values
  useEffect(() => {
    appleRef.current = apple
  }, [apple])

  useEffect(() => {
    onAppleEatenRef.current = onAppleEaten
  }, [onAppleEaten])

  useEffect(() => {
    onGameOverRef.current = onGameOver
  }, [onGameOver])

  // Generate random apple position
  const generateApple = useCallback((currentSnake: Position[]) => {
    let newApple: Position
    do {
      newApple = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }
    } while (
      currentSnake.some(segment => segment.x === newApple.x && segment.y === newApple.y)
    )
    return newApple
  }, [])

  // Update direction from external input (gestures/keyboard) - INSTANT with ref
  useEffect(() => {
    if (!isRunning) return

    const newDir = externalDirection

    // No need to block 180° reversals here - already handled in main page
    if (newDir.x !== 0 || newDir.y !== 0) {
      setDirection(newDir)
      directionRef.current = newDir  // INSTANT update via ref
      lastDirectionRef.current = newDir
    }
  }, [externalDirection, isRunning])

  // Keep direction ref in sync
  useEffect(() => {
    directionRef.current = direction
  }, [direction])

  // Game loop with ref-based direction for instant response
  useEffect(() => {
    if (!isRunning) return

    // Calculate tick speed based on sensitivity (per percentage point)
    // Higher sensitivity = faster snake = lower tick speed
    // Lower sensitivity = slower snake = higher tick speed
    // Each percentage point changes the speed by 2ms for more granular control
    const baseSpeed = 200  // Slowest speed at 0% sensitivity
    const tickSpeed = Math.max(100, Math.min(300, baseSpeed - (sensitivity * 2)))

    const interval = setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0]
        // Use ref for INSTANT direction - no state lag!
        const currentDirection = directionRef.current
        const newHead: Position = {
          x: (head.x + currentDirection.x + GRID_SIZE) % GRID_SIZE,
          y: (head.y + currentDirection.y + GRID_SIZE) % GRID_SIZE
        }

        // Check self collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          onGameOverRef.current()
          return prevSnake
        }

        const newSnake = [newHead, ...prevSnake]

        // Check apple collision using ref to get latest position
        const currentApple = appleRef.current
        if (newHead.x === currentApple.x && newHead.y === currentApple.y) {
          const newApplePosition = generateApple(newSnake)
          setApple(newApplePosition)
          onAppleEatenRef.current()
          setApplePulse(true)
          setTimeout(() => setApplePulse(false), 200)
          return newSnake
        }

        // Remove tail if no apple eaten
        newSnake.pop()
        return newSnake
      })
    }, tickSpeed)

    return () => clearInterval(interval)
  }, [isRunning, sensitivity, generateApple])  // Removed direction dependency - using ref now

  // Reset game
  useEffect(() => {
    if (!isRunning) {
      setSnake(INITIAL_SNAKE)
      setDirection(INITIAL_DIRECTION)
      directionRef.current = INITIAL_DIRECTION
      lastDirectionRef.current = INITIAL_DIRECTION
      setApple(generateApple(INITIAL_SNAKE))
    }
  }, [isRunning, generateApple])

  // Render direction arrows
  const getDirectionIcon = (dir: string) => {
    switch (dir) {
      case "Up": return <ArrowUp className="w-3 h-3" />
      case "Down": return <ArrowDown className="w-3 h-3" />
      case "Left": return <ArrowLeft className="w-3 h-3" />
      case "Right": return <ArrowRight className="w-3 h-3" />
      default: return null
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Direction History */}
      <div className="flex items-center gap-2 h-8">
        {recentDirections.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">Recent:</span>
            {recentDirections.slice(0, 3).map((dir, i) => (
              <div
                key={i}
                className="flex items-center justify-center w-6 h-6 rounded bg-purple-glow/20 text-purple-soft"
                style={{ opacity: 1 - i * 0.3 }}
              >
                {getDirectionIcon(dir)}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Game Board */}
      <div
        className="relative border-2 border-purple-glow/50 rounded-lg bg-black/40 backdrop-blur-sm shadow-glow-purple"
        style={{
          width: GRID_SIZE * CELL_SIZE,
          height: GRID_SIZE * CELL_SIZE
        }}
      >
        {/* Grid Lines */}
        <svg
          className="absolute inset-0 pointer-events-none opacity-20"
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
        >
          {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => (
            <g key={i}>
              <line
                x1={i * CELL_SIZE}
                y1={0}
                x2={i * CELL_SIZE}
                y2={GRID_SIZE * CELL_SIZE}
                stroke="var(--color-purple-glow)"
                strokeWidth="0.5"
              />
              <line
                x1={0}
                y1={i * CELL_SIZE}
                x2={GRID_SIZE * CELL_SIZE}
                y2={i * CELL_SIZE}
                stroke="var(--color-purple-glow)"
                strokeWidth="0.5"
              />
            </g>
          ))}
        </svg>

        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className="absolute rounded-sm transition-all duration-50"
            style={{
              left: segment.x * CELL_SIZE + 2,
              top: segment.y * CELL_SIZE + 2,
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
              backgroundColor: index === 0 ? "var(--color-purple-neon)" : "var(--color-purple-glow)",
              boxShadow: index === 0
                ? "0 0 10px var(--color-purple-neon), 0 0 20px var(--color-purple-neon)"
                : "0 0 5px var(--color-purple-glow)",
              zIndex: snake.length - index,
              transform: 'translateZ(0)',  // GPU acceleration
              willChange: 'left, top'  // Optimize for movement
            }}
          />
        ))}

        {/* Apple */}
        <div
          className={`absolute rounded-full transition-all ${
            applePulse ? "scale-125" : "scale-100"
          }`}
          style={{
            left: apple.x * CELL_SIZE + 4,
            top: apple.y * CELL_SIZE + 4,
            width: CELL_SIZE - 8,
            height: CELL_SIZE - 8,
            backgroundColor: "#ef4444",
            boxShadow: "0 0 15px #ef4444, 0 0 30px #ef4444",
            animation: "pulse-glow 2s ease-in-out infinite",
            zIndex: 1000
          }}
        />
      </div>
    </div>
  )
}

export const resetSnakeGame = () => {
  // This will be called from parent to reset
}