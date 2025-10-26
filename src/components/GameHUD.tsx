"use client"

import { useEffect, useState } from "react"
import { Apple, Clock, Gauge, Target, Trophy } from "lucide-react"

interface GameHUDProps {
  apples: number
  timeRemaining: number
  bestScore: number
  isRunning: boolean
}

export const GameHUD = ({ apples, timeRemaining, bestScore, isRunning }: GameHUDProps) => {
  const [fps, setFps] = useState(60)
  const [confidence, setConfidence] = useState(95)

  // Simulate FPS and Confidence values
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setFps(Math.floor(58 + Math.random() * 4)) // 58-62
      setConfidence(Math.floor(85 + Math.random() * 15)) // 85-100
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Get color based on confidence
  const getConfidenceColor = (value: number) => {
    if (value >= 90) return "text-green-500"
    if (value >= 75) return "text-yellow-500"
    return "text-red-500"
  }

  // Get color based on FPS
  const getFpsColor = (value: number) => {
    if (value >= 55) return "text-green-500"
    if (value >= 40) return "text-yellow-500"
    return "text-red-500"
  }

  const stats = [
    {
      icon: Apple,
      label: "Apples",
      value: apples,
      color: "text-red-500",
      shimmer: apples > 0
    },
    {
      icon: Clock,
      label: "Time",
      value: formatTime(timeRemaining),
      color: timeRemaining <= 10 ? "text-red-500" : "text-purple-glow",
      shimmer: false
    },
    {
      icon: Gauge,
      label: "FPS",
      value: fps,
      color: getFpsColor(fps),
      shimmer: true
    },
    {
      icon: Target,
      label: "Confidence",
      value: `${confidence}%`,
      color: getConfidenceColor(confidence),
      shimmer: true
    },
    {
      icon: Trophy,
      label: "Best Score",
      value: bestScore,
      color: "text-yellow-500",
      shimmer: false
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`relative overflow-hidden rounded-lg bg-card/50 backdrop-blur-sm border border-purple-glow/30 p-3 hover:border-purple-glow/50 transition-all duration-300 ${
            stat.shimmer ? "animate-in fade-in duration-1000" : ""
          }`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="relative z-10 flex items-center gap-2 mb-1">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${stat.color}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  )
}