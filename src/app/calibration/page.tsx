"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/Navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Sliders, Save, RotateCcw, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

interface CalibrationStep {
  id: number
  name: string
  description: string
  gesture: string
  completed: boolean
}

export default function CalibrationPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [detectionSpeed, setDetectionSpeed] = useState([50])
  const [accuracyThreshold, setAccuracyThreshold] = useState([75])
  const [smoothing, setSmoothing] = useState([60])

  const [steps, setSteps] = useState<CalibrationStep[]>([
    { id: 1, name: "Wave Up", description: "Raise your hand upward", gesture: "↑", completed: false },
    { id: 2, name: "Wave Down", description: "Move your hand downward", gesture: "↓", completed: false },
    { id: 3, name: "Swipe Left", description: "Move your hand to the left", gesture: "←", completed: false },
    { id: 4, name: "Swipe Right", description: "Move your hand to the right", gesture: "→", completed: false },
    { id: 5, name: "Fist", description: "Make a closed fist", gesture: "✊", completed: false },
  ])

  useEffect(() => {
    // Load saved calibration
    const saved = localStorage.getItem("calibration-settings")
    if (saved) {
      const settings = JSON.parse(saved)
      setDetectionSpeed([settings.detectionSpeed || 50])
      setAccuracyThreshold([settings.accuracyThreshold || 75])
      setSmoothing([settings.smoothing || 60])
    }
  }, [])

  const startCalibration = () => {
    setIsCalibrating(true)
    setCurrentStep(0)
    setProgress(0)
    setSteps(steps.map(s => ({ ...s, completed: false })))
    
    // Simulate calibration process
    simulateCalibrationStep(0)
  }

  const simulateCalibrationStep = (stepIndex: number) => {
    if (stepIndex >= steps.length) {
      setIsCalibrating(false)
      setProgress(100)
      toast.success("Calibration complete!", {
        description: "All gestures have been calibrated successfully.",
      })
      return
    }

    let localProgress = 0
    const interval = setInterval(() => {
      localProgress += 2
      setProgress((stepIndex / steps.length) * 100 + (localProgress / steps.length))
      
      if (localProgress >= 100) {
        clearInterval(interval)
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, completed: true } : s
        ))
        
        setTimeout(() => {
          setCurrentStep(stepIndex + 1)
          simulateCalibrationStep(stepIndex + 1)
        }, 500)
      }
    }, 50)
  }

  const saveCalibration = () => {
    const settings = {
      detectionSpeed: detectionSpeed[0],
      accuracyThreshold: accuracyThreshold[0],
      smoothing: smoothing[0],
      calibrated: true,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem("calibration-settings", JSON.stringify(settings))
    toast.success("Settings saved", {
      description: "Your calibration preferences have been saved.",
    })
  }

  const resetCalibration = () => {
    setDetectionSpeed([50])
    setAccuracyThreshold([75])
    setSmoothing([60])
    setSteps(steps.map(s => ({ ...s, completed: false })))
    setProgress(0)
    setCurrentStep(0)
    localStorage.removeItem("calibration-settings")
    toast.info("Settings reset", {
      description: "Calibration has been reset to defaults.",
    })
  }

  const allStepsCompleted = steps.every(s => s.completed)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Toaster />
      
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-glow">Calibration</h1>
          <p className="text-muted-foreground">
            Fine-tune gesture detection for optimal performance
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calibration Steps */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-glow bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-glow">Gesture Calibration</CardTitle>
                <CardDescription>
                  Follow each step to calibrate gesture recognition
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-purple-glow font-mono">{Math.round(progress)}%</span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden bg-secondary">
                    <div
                      className="absolute inset-y-0 left-0 gradient-purple animate-pulse-glow transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Calibration Steps */}
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        index === currentStep && isCalibrating
                          ? "border-purple-glow bg-secondary/70 scale-105 animate-pulse-glow"
                          : step.completed
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-border/50 bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-3xl">{step.gesture}</div>
                          <div>
                            <h4 className="font-medium">{step.name}</h4>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                        {step.completed && (
                          <CheckCircle2 className="w-6 h-6 text-green-500 animate-in zoom-in duration-300" />
                        )}
                        {index === currentStep && isCalibrating && (
                          <div className="w-6 h-6 border-2 border-purple-glow border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Control Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={startCalibration}
                    disabled={isCalibrating}
                    className="flex-1 gradient-purple hover-glow"
                    size="lg"
                  >
                    {isCalibrating ? "Calibrating..." : allStepsCompleted ? "Recalibrate" : "Start Calibration"}
                  </Button>
                  <Button
                    onClick={resetCalibration}
                    variant="outline"
                    className="border-purple-glow/50 hover-glow"
                    size="lg"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-6">
            <Card className="border-glow bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-glow">
                  <Sliders className="w-5 h-5 mr-2" />
                  Advanced Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Detection Speed */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Detection Speed</label>
                    <span className="text-sm text-purple-glow font-mono">{detectionSpeed[0]}%</span>
                  </div>
                  <Slider
                    value={detectionSpeed}
                    onValueChange={setDetectionSpeed}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    How quickly gestures are detected
                  </p>
                </div>

                {/* Accuracy Threshold */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Accuracy Threshold</label>
                    <span className="text-sm text-purple-glow font-mono">{accuracyThreshold[0]}%</span>
                  </div>
                  <Slider
                    value={accuracyThreshold}
                    onValueChange={setAccuracyThreshold}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum confidence for gesture recognition
                  </p>
                </div>

                {/* Smoothing */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Smoothing</label>
                    <span className="text-sm text-purple-glow font-mono">{smoothing[0]}%</span>
                  </div>
                  <Slider
                    value={smoothing}
                    onValueChange={setSmoothing}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Reduce jitter in gesture tracking
                  </p>
                </div>

                <Button
                  onClick={saveCalibration}
                  className="w-full gradient-purple hover-glow"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>

            {/* Status Card */}
            {allStepsCompleted && (
              <Card className="border-glow bg-green-500/10 backdrop-blur-sm animate-in fade-in duration-500">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                    <h3 className="font-medium text-green-500">Calibration Complete!</h3>
                    <p className="text-sm text-muted-foreground">
                      All gestures are calibrated and ready to use
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
