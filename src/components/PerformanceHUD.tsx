"use client"

import { useState, useEffect } from "react"
import { Activity, Gauge, Target } from "lucide-react"

interface PerformanceMetrics {
  fps: number
  latency: number
  confidence: number
}

export function PerformanceHUD() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    latency: 0,
    confidence: 0
  })

  useEffect(() => {
    // Simulate real-time performance metrics
    const interval = setInterval(() => {
      setMetrics({
        fps: Math.floor(Math.random() * 5) + 58, // 58-62 FPS
        latency: Math.floor(Math.random() * 10) + 15, // 15-25ms
        confidence: Math.floor(Math.random() * 15) + 85 // 85-100%
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-400"
    if (confidence >= 70) return "text-yellow-400"
    return "text-red-400"
  }

  const getLatencyColor = (latency: number) => {
    if (latency <= 20) return "text-green-400"
    if (latency <= 50) return "text-yellow-400"
    return "text-red-400"
  }

  return (
    <div className="flex gap-3">
      {/* FPS Metric */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/60 border border-purple-glow/30 backdrop-blur-md shadow-glow-soft">
        <Activity className="w-4 h-4 text-purple-glow" />
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">FPS</span>
          <span className="text-lg font-bold font-mono text-purple-glow leading-none">
            {metrics.fps}
          </span>
        </div>
      </div>

      {/* Latency Metric */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/60 border border-purple-glow/30 backdrop-blur-md shadow-glow-soft">
        <Gauge className="w-4 h-4 text-purple-glow" />
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Latency</span>
          <span className={`text-lg font-bold font-mono leading-none ${getLatencyColor(metrics.latency)}`}>
            {metrics.latency}ms
          </span>
        </div>
      </div>

      {/* Confidence Metric */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/60 border border-purple-glow/30 backdrop-blur-md shadow-glow-soft">
        <Target className="w-4 h-4 text-purple-glow" />
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</span>
          <span className={`text-lg font-bold font-mono leading-none ${getConfidenceColor(metrics.confidence)}`}>
            {metrics.confidence}%
          </span>
        </div>
      </div>
    </div>
  )
}
