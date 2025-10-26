import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Hand } from "lucide-react"

interface HandSelectionDialogProps {
  open: boolean
  onSelect: (hand: "left" | "right") => void
  onClose?: () => void
}

export function HandSelectionDialog({ open, onSelect, onClose }: HandSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose ? () => onClose() : undefined}>
      <DialogContent className="sm:max-w-md border-glow bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-purple-glow flex items-center gap-2">
            <Hand className="w-5 h-5" />
            Select Your Hand
          </DialogTitle>
          <DialogDescription>
            Which hand do you want to use for gesture controls?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 mt-4">
          <Button
            onClick={() => onSelect("left")}
            className="flex-1 gradient-purple hover-glow shadow-glow-purple h-20 text-lg"
          >
            <Hand className="w-6 h-6 mr-2" />
            Left Hand
          </Button>
          <Button
            onClick={() => onSelect("right")}
            className="flex-1 gradient-purple hover-glow shadow-glow-purple h-20 text-lg"
          >
            <Hand className="w-6 h-6 mr-2 scale-x-[-1]" />
            Right Hand
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          Move your selected hand in different directions to control the snake
        </p>
      </DialogContent>
    </Dialog>
  )
}
