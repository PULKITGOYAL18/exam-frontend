// src/hooks/useWebSocket.ts

import { useEffect, useState, useCallback, useRef } from 'react'
import { examSocket, WSMessage } from '@/services/websocket/examSocket'

export function useWebSocket() {
  // All hooks must be called at the top level, before any conditional returns
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const [messages, setMessages] = useState<WSMessage[]>([])
  const isMounted = useRef(true)
  const connectionId = useRef(Math.random().toString(36).substring(7))

  useEffect(() => {
    isMounted.current = true
    
    // Check initial connection status
    setIsConnected(examSocket.isConnected())

    // Connect if not already connected
    if (!examSocket.isConnected()) {
      console.log(`🔌 [${connectionId.current}] useWebSocket: Connecting...`)
      examSocket.connect()
    }

    // Handle incoming messages
    const handleMessage = (msg: WSMessage) => {
      if (!isMounted.current) return
      
      console.log(`📨 [${connectionId.current}] Received:`, msg.type)
      setLastMessage(msg)
      setMessages(prev => {
        const newMessages = [...prev, msg]
        return newMessages.length > 100 ? newMessages.slice(-100) : newMessages
      })
      setIsConnected(true)
    }

    const unsubscribe = examSocket.onMessage(handleMessage)

    // Update connection status periodically
    const statusInterval = setInterval(() => {
      if (isMounted.current) {
        const connected = examSocket.isConnected()
        setIsConnected(connected)
        if (!connected) {
          console.log(`🔄 [${connectionId.current}] Auto-reconnecting...`)
          examSocket.connect()
        }
      }
    }, 5000)

    return () => {
      console.log(`🧹 [${connectionId.current}] Cleaning up`)
      isMounted.current = false
      clearInterval(statusInterval)
      unsubscribe()
      // Don't disconnect here - let the singleton manage the connection
    }
  }, []) // Empty dependency array

  const send = useCallback((data: any) => {
    return examSocket.send(data)
  }, [])

  const disconnect = useCallback(() => {
    examSocket.disconnect()
    setIsConnected(false)
  }, [])

  const reconnect = useCallback(() => {
    examSocket.reset()
    examSocket.connect()
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    isConnected,
    lastMessage,
    messages,
    send,
    disconnect,
    reconnect,
    clearMessages,
    connectionId: connectionId.current,
  }
}