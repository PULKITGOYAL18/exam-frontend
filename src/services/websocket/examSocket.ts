// src/services/websocket/examSocket.ts

export type WSMessage = {
  type: 'progress' | 'status' | 'complete' | 'error' | 'connected' | 'ping' | 'pong'
  data?: any
  step?: string
  progress?: number
  message?: string
  timestamp?: string
}

export class ExamSocket {
  private static instance: ExamSocket | null = null
  private socket: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private messageHandlers: ((msg: WSMessage) => void)[] = []
  private reconnectTimeout: NodeJS.Timeout | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private isConnecting = false
  private isDisconnecting = false

  private constructor() {
    // Use same host as API
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname || 'localhost'
    const port = '8000' // FastAPI port
    this.url = `${protocol}//${host}:${port}/ws/exam`
  }

  public static getInstance(): ExamSocket {
    if (!ExamSocket.instance) {
      ExamSocket.instance = new ExamSocket()
    }
    return ExamSocket.instance
  }

  connect() {
    // Don't try to connect if already connected or connecting
    if (this.isConnected() || this.isConnecting || this.isDisconnecting) {
      console.log('ℹ️ WebSocket already connected or connecting')
      return
    }

    // Don't reconnect if we've exceeded max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached')
      return
    }

    this.isConnecting = true
    console.log(`🔌 Connecting WebSocket (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`)

    try {
      this.socket = new WebSocket(this.url)
      
      this.socket.onopen = () => {
        console.log('✅ WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startPingInterval()
        
        // Send initial message
        this.send({
          type: 'subscribe',
          session_id: localStorage.getItem('examSessionId') || 'default'
        })
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 WS Message:', data)
          
          // Handle pong responses
          if (data.type === 'pong') {
            console.log('💓 Pong received')
            return
          }
          
          this.messageHandlers.forEach(handler => handler(data))
        } catch (e) {
          console.error('Failed to parse WS message:', e)
        }
      }

      this.socket.onclose = (event) => {
        console.log(`❌ WebSocket disconnected (code: ${event.code})`)
        this.isConnecting = false
        this.stopPingInterval()
        
        // Don't reconnect if closed intentionally (code 1000)
        if (event.code !== 1000 && !this.isDisconnecting) {
          this.reconnect()
        }
      }

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
      }
    } catch (e) {
      console.error('Failed to connect WebSocket:', e)
      this.isConnecting = false
      this.reconnect()
    }
  }

  private reconnect() {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.reconnectAttempts++
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached, giving up')
      return
    }

    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000)
    console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startPingInterval() {
    this.stopPingInterval()
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' })
        console.log('💓 Ping sent')
      } else {
        // If not connected, stop pinging
        this.stopPingInterval()
      }
    }, 30000) // Send ping every 30 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  send(message: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
      return true
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent:', message.type || 'unknown')
      return false
    }
  }

  onMessage(handler: (msg: WSMessage) => void) {
    this.messageHandlers.push(handler)
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler)
    }
  }

  disconnect() {
    console.log('🔌 Disconnecting WebSocket...')
    this.isDisconnecting = true
    this.stopPingInterval()
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.socket) {
      this.socket.close(1000, 'Disconnected by user')
      this.socket = null
    }

    this.isConnecting = false
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN
  }

  // Reset connection state (useful for logout/login)
  reset() {
    this.disconnect()
    this.isDisconnecting = false
    this.reconnectAttempts = 0
    this.messageHandlers = []
  }
}

// Export singleton instance
export const examSocket = ExamSocket.getInstance()