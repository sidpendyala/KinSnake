import { useEffect, useRef, useState, useCallback } from 'react'

interface BackendStatus {
  connected: boolean
  voiceEnabled: boolean
  controllerRunning: boolean
}

interface UseBackendConnectionProps {
  onGestureDetected?: (direction: string) => void
  onCameraFrame?: (frameData: string) => void
  enabled?: boolean
}

export const useBackendConnection = ({
  onGestureDetected,
  onCameraFrame,
  enabled = true
}: UseBackendConnectionProps) => {
  const [status, setStatus] = useState<BackendStatus>({
    connected: false,
    voiceEnabled: false,
    controllerRunning: false
  })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    if (!enabled) return
    
    // Don't reconnect if already connecting/connected
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log('[Backend] Already connected, skipping reconnect')
      return
    }

    try {
      const ws = new WebSocket('ws://localhost:8000/ws')
      
      ws.onopen = () => {
        console.log('[Backend] Connected to server')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'connected':
              setStatus({
                connected: true,
                voiceEnabled: data.voice_enabled || false,
                controllerRunning: data.controller_running || false
              })
              console.log('[Backend] Server status:', {
                voice: data.voice_enabled,
                controller: data.controller_running
              })
              break
            
            case 'gesture':
              if (onGestureDetected) {
                onGestureDetected(data.direction)
              }
              break
            
            case 'camera_frame':
              // Handle camera frame from backend
              if (onCameraFrame && data.frame) {
                onCameraFrame(data.frame)
              }
              break
            
            case 'frame_result':
              // Handle frame processing result if needed
              break
          }
        } catch (error) {
          console.error('[Backend] Message parsing error:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[Backend] WebSocket error:', error)
      }

      ws.onclose = (event) => {
        console.log('[Backend] Disconnected from server, code:', event.code, 'clean:', event.wasClean)
        
        // Clear the ref
        if (wsRef.current === ws) {
          wsRef.current = null
        }
        
        setStatus({
          connected: false,
          voiceEnabled: false,
          controllerRunning: false
        })
        
        // Only reconnect if it was an unexpected close (not user-initiated)
        if (enabled && !event.wasClean) {
          console.log('[Backend] Unexpected disconnect, will reconnect in 3s...')
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[Backend] Attempting to reconnect...')
            connect()
          }, 3000)
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('[Backend] Connection error:', error)
    }
  }, [enabled, onGestureDetected])

  const sendCommand = useCallback((gesture: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        gesture
      }))
    }
  }, [])

  const sendFrame = useCallback((frameData: string, handedness: string = 'right') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'frame',
        frame: frameData,
        handedness
      }))
    }
  }, [])

  const startCamera = useCallback((handedness: string = 'right') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start_camera',
        handedness
      }))
      console.log('[Backend] Starting camera stream')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_camera'
      }))
      console.log('[Backend] Stopping camera stream')
    }
  }, [])

  const setGameRunning = useCallback((running: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'game_state',
        running
      }))
      console.log('[Backend] Setting game running:', running)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return {
    status,
    sendCommand,
    sendFrame,
    startCamera,
    stopCamera,
    setGameRunning,
    reconnect: connect
  }
}

