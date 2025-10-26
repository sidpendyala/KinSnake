"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, Shield, Eye, Lock } from "lucide-react"

interface CameraConsentModalProps {
  open: boolean
  onConsent: () => void
  onClose?: () => void
}

export const CameraConsentModal = ({ open, onConsent, onClose }: CameraConsentModalProps) => {
  const [showPrivacy, setShowPrivacy] = useState(false)

  if (showPrivacy) {
    return (
      <Dialog open={open} onOpenChange={onClose ? () => onClose() : undefined}>
        <DialogContent className="sm:max-w-[500px] border-glow bg-card/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-purple-glow flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Privacy Policy
            </DialogTitle>
            <DialogDescription className="text-base">
              Your privacy and data security
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-soft flex items-center gap-2">
                <Eye className="w-4 h-4" />
                What We Capture
              </h3>
              <p className="text-sm text-muted-foreground">
                KinSnake uses your device camera to detect hand gestures and movements in real-time. 
                The camera feed is used exclusively for motion detection to control the Snake game.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-purple-soft flex items-center gap-2">
                <Lock className="w-4 h-4" />
                On-Device Processing
              </h3>
              <p className="text-sm text-muted-foreground">
                All gesture detection and video processing happens locally on your device. 
                No video frames, images, or personal data are uploaded to any server or stored remotely.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-purple-soft flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Data Storage
              </h3>
              <p className="text-sm text-muted-foreground">
                We do not record, store, or save any camera footage. Game scores and settings are stored 
                locally in your browser using localStorage and can be cleared at any time.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-purple-soft">How to Revoke Access</h3>
              <p className="text-sm text-muted-foreground">
                You can revoke camera permissions at any time through:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                <li>Your browser's site settings (usually via the lock icon in the address bar)</li>
                <li>The "End Session" button visible when the camera is active</li>
                <li>Closing or refreshing the browser tab</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowPrivacy(false)}
              variant="outline"
              className="border-purple-glow/50 hover:bg-purple-glow/10"
            >
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose ? () => onClose() : undefined}>
      <DialogContent className="sm:max-w-[500px] border-glow bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-purple-glow flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Camera Access Required
          </DialogTitle>
          <DialogDescription className="text-base">
            KinSnake needs camera access to detect your gestures
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-purple-dark/20 border border-purple-glow/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-purple-glow mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">What's Captured</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time video feed for hand gesture and motion detection to control the Snake game
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-glow mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">On-Device Processing</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  All processing happens locally on your device. No video data is uploaded or stored remotely
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-purple-glow mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">How to Revoke</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  End access anytime via browser settings or the "End Session" button when active
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setShowPrivacy(true)}
            variant="ghost"
            className="text-purple-soft hover:text-purple-glow hover:bg-purple-glow/10"
          >
            Learn More (Privacy)
          </Button>
          <Button
            onClick={onConsent}
            className="gradient-purple hover-glow shadow-glow-purple flex-1"
            size="lg"
          >
            <Camera className="w-4 h-4 mr-2" />
            Allow Camera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
