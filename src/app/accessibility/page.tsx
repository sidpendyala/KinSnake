"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/Navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Volume2, Type, Contrast, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"

export default function AccessibilityPage() {
  const [highContrast, setHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState([16])
  const [captions, setCaptions] = useState(true)
  const [voiceFeedback, setVoiceFeedback] = useState(false)
  const [voiceSpeed, setVoiceSpeed] = useState([1])
  const [colorScheme, setColorScheme] = useState("default")

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem("accessibility-preferences")
    if (saved) {
      const prefs = JSON.parse(saved)
      setHighContrast(prefs.highContrast || false)
      setFontSize([prefs.fontSize || 16])
      setCaptions(prefs.captions !== false)
      setVoiceFeedback(prefs.voiceFeedback || false)
      setVoiceSpeed([prefs.voiceSpeed || 1])
      setColorScheme(prefs.colorScheme || "default")
    }
  }, [])

  const savePreferences = () => {
    const prefs = {
      highContrast,
      fontSize: fontSize[0],
      captions,
      voiceFeedback,
      voiceSpeed: voiceSpeed[0],
      colorScheme,
    }
    localStorage.setItem("accessibility-preferences", JSON.stringify(prefs))
    toast.success("Preferences saved successfully", {
      description: "Your accessibility settings have been saved.",
    })
  }

  const testVoiceFeedback = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Voice feedback is working correctly")
      utterance.rate = voiceSpeed[0]
      window.speechSynthesis.speak(utterance)
    } else {
      toast.error("Voice feedback not supported", {
        description: "Your browser doesn't support speech synthesis.",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Toaster />
      
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-glow">Accessibility</h1>
          <p className="text-muted-foreground">
            Customize your experience for better usability and comfort
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Visual Settings */}
          <Card className="border-glow bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-glow">
                <Eye className="w-5 h-5 mr-2" />
                Visual Settings
              </CardTitle>
              <CardDescription>Adjust display and color preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* High Contrast Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50 hover:border-purple-glow/50 transition-all duration-300">
                <div className="space-y-1">
                  <Label htmlFor="high-contrast" className="text-base font-medium">
                    High Contrast Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Increase contrast for better visibility
                  </p>
                </div>
                <Switch
                  id="high-contrast"
                  checked={highContrast}
                  onCheckedChange={setHighContrast}
                  className="data-[state=checked]:bg-purple-glow"
                />
              </div>

              {/* Color Scheme */}
              <div className="space-y-3">
                <Label className="flex items-center text-base font-medium">
                  <Contrast className="w-4 h-4 mr-2" />
                  Color Scheme
                </Label>
                <Select value={colorScheme} onValueChange={setColorScheme}>
                  <SelectTrigger className="border-glow bg-secondary hover-glow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Black & Purple)</SelectItem>
                    <SelectItem value="lavender">Soft Lavender</SelectItem>
                    <SelectItem value="blue">Blue Tones</SelectItem>
                    <SelectItem value="green">Green Accents</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center text-base font-medium">
                    <Type className="w-4 h-4 mr-2" />
                    Font Size
                  </Label>
                  <span className="text-sm text-purple-glow font-mono">{fontSize[0]}px</span>
                </div>
                <Slider
                  value={fontSize}
                  onValueChange={setFontSize}
                  min={12}
                  max={24}
                  step={1}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Small (12px)</span>
                  <span>Medium (16px)</span>
                  <span>Large (24px)</span>
                </div>
              </div>

              {/* Preview Text */}
              <div 
                className="p-4 rounded-lg bg-secondary/30 border border-purple-glow/30"
                style={{ fontSize: `${fontSize[0]}px` }}
              >
                <p className={highContrast ? "font-bold" : ""}>
                  Preview: The quick brown fox jumps over the lazy dog
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Audio Settings */}
          <Card className="border-glow bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-glow">
                <Volume2 className="w-5 h-5 mr-2" />
                Audio & Feedback
              </CardTitle>
              <CardDescription>Configure sound and voice options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Captions Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50 hover:border-purple-glow/50 transition-all duration-300">
                <div className="space-y-1">
                  <Label htmlFor="captions" className="text-base font-medium">
                    Show Captions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display text captions for audio cues
                  </p>
                </div>
                <Switch
                  id="captions"
                  checked={captions}
                  onCheckedChange={setCaptions}
                  className="data-[state=checked]:bg-purple-glow"
                />
              </div>

              {/* Voice Feedback Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50 hover:border-purple-glow/50 transition-all duration-300">
                <div className="space-y-1">
                  <Label htmlFor="voice-feedback" className="text-base font-medium">
                    Voice Feedback
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Hear spoken confirmations of actions
                  </p>
                </div>
                <Switch
                  id="voice-feedback"
                  checked={voiceFeedback}
                  onCheckedChange={setVoiceFeedback}
                  className="data-[state=checked]:bg-purple-glow"
                />
              </div>

              {/* Voice Speed */}
              {voiceFeedback && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-medium">Voice Speed</Label>
                    <span className="text-sm text-purple-glow font-mono">{voiceSpeed[0].toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={voiceSpeed}
                    onValueChange={setVoiceSpeed}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Slow (0.5x)</span>
                    <span>Normal (1.0x)</span>
                    <span>Fast (2.0x)</span>
                  </div>
                  
                  <Button
                    onClick={testVoiceFeedback}
                    variant="outline"
                    className="w-full border-purple-glow/50 hover-glow"
                  >
                    Test Voice Feedback
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Features */}
          <Card className="border-glow bg-card/50 backdrop-blur-sm md:col-span-2">
            <CardHeader>
              <CardTitle className="text-purple-glow">Additional Features</CardTitle>
              <CardDescription>More accessibility options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 hover:border-purple-glow/50 transition-all duration-300 hover-glow">
                  <h4 className="font-medium mb-2">Reduced Motion</h4>
                  <p className="text-sm text-muted-foreground">
                    Minimize animations for sensitive users
                  </p>
                  <Switch className="mt-3 data-[state=checked]:bg-purple-glow" />
                </div>

                <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 hover:border-purple-glow/50 transition-all duration-300 hover-glow">
                  <h4 className="font-medium mb-2">Focus Indicators</h4>
                  <p className="text-sm text-muted-foreground">
                    Enhanced keyboard navigation highlights
                  </p>
                  <Switch className="mt-3 data-[state=checked]:bg-purple-glow" defaultChecked />
                </div>

                <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 hover:border-purple-glow/50 transition-all duration-300 hover-glow">
                  <h4 className="font-medium mb-2">Screen Reader</h4>
                  <p className="text-sm text-muted-foreground">
                    Optimized for assistive technologies
                  </p>
                  <Switch className="mt-3 data-[state=checked]:bg-purple-glow" defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={savePreferences}
            className="gradient-purple hover-glow"
            size="lg"
          >
            <Save className="w-5 h-5 mr-2" />
            Save Preferences
          </Button>
        </div>
      </main>
    </div>
  )
}
