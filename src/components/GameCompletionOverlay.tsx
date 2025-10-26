"use client"

import { Button } from "@/components/ui/button"
import { Trophy, RotateCcw, Sparkles } from "lucide-react"

interface GameCompletionOverlayProps {
  score: number
  isNewBest: boolean
  onRestart: () => void
}

export const GameCompletionOverlay = ({
  score,
  isNewBest,
  onRestart
}: GameCompletionOverlayProps) => {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-500">
      <div className="bg-card/95 border-2 border-purple-glow rounded-lg p-8 max-w-md w-full mx-4 shadow-glow-purple animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-glow/20 mb-4 animate-pulse-glow">
            <Trophy className="w-8 h-8 text-purple-glow" />
          </div>
          <h2 className="text-3xl font-bold text-glow mb-2">Challenge Complete!</h2>
          <p className="text-muted-foreground">Time's up! Here's your score</p>
        </div>

        {/* Score Display */}
        <div className="bg-black/40 rounded-lg p-6 mb-6 border border-purple-glow/30">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Apples Collected</p>
            <div className={`text-5xl font-bold font-mono text-purple-glow ${
              isNewBest ? "animate-pulse-glow" : ""
            }`}>
              {score}
            </div>
            
            {/* New Best Badge */}
            {isNewBest && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/50 animate-in zoom-in-95 duration-500 delay-300">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-yellow-500">New Best Score!</span>
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onRestart}
            className="w-full gradient-purple hover-glow shadow-glow-purple"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Play Again
          </Button>
        </div>
      </div>
    </div>
  )
}
