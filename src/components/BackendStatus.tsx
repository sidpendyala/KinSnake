"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Settings } from "lucide-react"

interface BackendStatusProps {
  connected: boolean
  controllerRunning: boolean
}

export function BackendStatus({ connected, controllerRunning }: BackendStatusProps) {
  return (
    <Card className="border-glow bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-sm text-purple-glow">Backend Status</CardTitle>
        <CardDescription className="text-xs">
          Python + C Controller
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connected ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm">Server</span>
          </div>
          <Badge variant={connected ? "default" : "destructive"} className="text-xs">
            {connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className={`w-4 h-4 ${controllerRunning ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <span className="text-sm">C Controller</span>
          </div>
          <Badge variant={controllerRunning ? "default" : "secondary"} className="text-xs">
            {controllerRunning ? "Running" : "Stopped"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

