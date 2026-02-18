import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'emily_chat_session'
const PASSWORD_KEY = 'emily_chat_password'
const DEFAULT_PASSWORD = '10716255'

interface ChatMessage {
  type: string
  sender: 'user' | 'emily' | 'system' | 'error'
  content: string
  timestamp: string
  clientId?: string
  isLocal?: boolean
  isStreaming?: boolean
}

interface BroadcastEventData {
  type: string
  data: ChatMessage | { isTyping: boolean } | Record<string, unknown>
}

export function useChat(userId = 'web-user') {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bcRef = useRef<BroadcastChannel | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const getWebSocketUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3001/api/chat'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/chat`
  }, [])

  const getSessionId = useCallback(() => {
    if (sessionIdRef.current) return sessionIdRef.current
    
    const stored = sessionStorage.getItem(`${STORAGE_KEY}_id`)
    if (stored) {
      sessionIdRef.current = stored
    } else {
      const date = new Date().toISOString().split('T')[0]
      sessionIdRef.current = `web:${userId}:${date}`
      sessionStorage.setItem(`${STORAGE_KEY}_id`, sessionIdRef.current)
    }
    return sessionIdRef.current
  }, [userId])

  const getPassword = useCallback(() => {
    return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD
  }, [])

  const setPassword = useCallback((password: string) => {
    localStorage.setItem(PASSWORD_KEY, password)
    setNeedsPassword(false)
    setTimeout(() => connect(), 100)
  }, [])

  const hasPassword = useCallback(() => {
    return !!localStorage.getItem(PASSWORD_KEY)
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setMessages(parsed.messages || [])
      } catch (e) {
        console.error('Failed to parse stored messages:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (!getPassword()) {
      setNeedsPassword(true)
    }
  }, [getPassword])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages,
      lastActive: new Date().toISOString()
    }))
  }, [messages])

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      bcRef.current = new BroadcastChannel('emily_chat_channel')
      
      bcRef.current.onmessage = (event: MessageEvent<BroadcastEventData>) => {
        const { type, data } = event.data
        
        if (type === 'message' || type === 'system') {
          const msgData = data as ChatMessage
          setMessages(prev => {
            if (prev.some(m => m.timestamp === msgData.timestamp && m.content === msgData.content)) {
              return prev
            }
            return [...prev, msgData]
          })
          
          if (!isExpanded) {
            setHasNewMessage(true)
          }
        } else if (type === 'typing') {
          const typingData = data as { isTyping: boolean }
          setIsTyping(typingData.isTyping)
        } else if (type === 'clear') {
          setMessages([])
        } else if (type === 'auth_required') {
          setNeedsPassword(true)
        }
      }
    }

    return () => {
      if (bcRef.current) {
        bcRef.current.close()
      }
    }
  }, [isExpanded])

  const broadcast = useCallback((type: string, data: ChatMessage | { isTyping: boolean } | Record<string, unknown>) => {
    if (bcRef.current) {
      bcRef.current.postMessage({ type, data })
    }
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const password = getPassword()
    if (!password) {
      console.log('[Chat] No password, requesting password')
      setNeedsPassword(true)
      return
    }

    if (wsRef.current) {
      wsRef.current.close()
    }

    const sessionId = getSessionId()
    const wsUrl = `${getWebSocketUrl()}?password=${encodeURIComponent(password)}&session=${sessionId}&userId=${userId}`
    
    console.log('[Chat] Connecting to backend...')
    
    try {
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('[Chat] Connected to backend')
        setIsConnected(true)
        reconnectAttempts.current = 0
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleBackendMessage(message)
        } catch (error) {
          console.error('[Chat] Error parsing message:', error)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('[Chat] Disconnected:', event.code, event.reason)
        setIsConnected(false)
        
        if (event.code === 1008) {
          setNeedsPassword(true)
          broadcast('auth_required', {})
        } else {
          attemptReconnect()
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('[Chat] WebSocket error:', error)
      }

    } catch (error) {
      console.error('[Chat] Connection error:', error)
      attemptReconnect()
    }
  }, [getPassword, getSessionId, getWebSocketUrl, userId, broadcast])

  const handleBackendMessage = useCallback((message: { type: string; [key: string]: unknown }) => {
    switch (message.type) {
      case 'message':
        const msgWithSender = message as unknown as ChatMessage & { clientId?: string }
        const currentSessionId = getSessionId()
        
        if (msgWithSender.clientId === currentSessionId && msgWithSender.sender === 'user') {
          return
        }
        
        const isDuplicate = messages.some(m => 
          m.timestamp === msgWithSender.timestamp && 
          m.content === msgWithSender.content &&
          m.sender === msgWithSender.sender
        )
        
        if (isDuplicate) return

        setMessages(prev => [...prev, msgWithSender])
  
        if (msgWithSender.sender === 'emily' && !isExpanded) {
          setHasNewMessage(true)
        }
        break
        
      case 'system':
        const sysMessage = message as unknown as ChatMessage
        setMessages(prev => [...prev, sysMessage])
        broadcast('message', sysMessage)
        break
        
      case 'typing':
        setIsTyping(true)
        broadcast('typing', { isTyping: true })
        
        setTimeout(() => {
          setIsTyping(false)
          broadcast('typing', { isTyping: false })
        }, 3000)
        break
        
      case 'stream':
        const streamMsg = message as { chunk?: string; timestamp?: string }
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.sender === 'emily' && lastMessage.isStreaming) {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + (streamMsg.chunk || ''),
              timestamp: streamMsg.timestamp || new Date().toISOString()
            }
            return updated
          }
          return [...prev, {
            type: 'message',
            sender: 'emily',
            content: streamMsg.chunk || '',
            timestamp: streamMsg.timestamp || new Date().toISOString(),
            isStreaming: true
          }]
        })
        break
        
      case 'error':
        const errorMsg = message as { content?: string; timestamp?: string }
        setMessages(prev => [...prev, {
          type: 'error',
          sender: 'system',
          content: errorMsg.content || 'An error occurred',
          timestamp: errorMsg.timestamp || new Date().toISOString()
        }])
        setIsTyping(false)
        break
        
      case 'history':
        const historyMsg = message as { messages?: Array<{ role: string; content: string | unknown[]; timestamp?: string }> }
        if (historyMsg.messages && historyMsg.messages.length > 0) {
          const formattedMessages: ChatMessage[] = historyMsg.messages.map(msg => ({
            type: 'message',
            sender: msg.role === 'assistant' ? 'emily' : 'user',
            content: typeof msg.content === 'string' ? msg.content : 
                     (Array.isArray(msg.content) ? msg.content.map(c => typeof c === 'object' && c && 'text' in c ? (c as { text: string }).text : '').join('') : '') || '',
            timestamp: msg.timestamp || new Date().toISOString()
          }))
          
          setMessages(formattedMessages)
        }
        break
        
      default:
        console.log('[Chat] Unknown message type:', message.type)
    }
  }, [broadcast, isExpanded, messages, getSessionId])

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('[Chat] Max reconnection attempts reached')
      return
    }

    reconnectAttempts.current++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
    
    console.log(`[Chat] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, delay)
  }, [connect])

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setMessages(prev => [...prev, {
        type: 'error',
        sender: 'system',
        content: 'Not connected. Please enter your password.',
        timestamp: new Date().toISOString()
      }])
      return false
    }

    const sessionId = getSessionId()
    const timestamp = new Date().toISOString()
    
    const userMessage: ChatMessage = {
      type: 'message',
      sender: 'user',
      content,
      timestamp,
      clientId: sessionId,
      isLocal: true
    }
    
    setMessages(prev => [...prev, userMessage])
    broadcast('message', userMessage)

    wsRef.current.send(JSON.stringify({
      type: 'message',
      content,
      timestamp,
      clientId: sessionId
    }))
    return true
  }, [broadcast, getSessionId])

  const clearChat = useCallback(() => {
    setMessages([])
    broadcast('clear', {})
  }, [broadcast])

  const fetchHistory = useCallback(() => {
    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('[Chat] Cannot fetch history - not connected')
      return false
    }

    console.log('[Chat] Fetching history...')
    wsRef.current.send(JSON.stringify({
      type: 'command',
      command: 'get_history',
      data: { limit: 50 }
    }))
    return true
  }, [isConnected])

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => {
      const newState = !prev
      if (newState) {
        setHasNewMessage(false)
      }
      return newState
    })
  }, [])

  useEffect(() => {
    if (getPassword() && !needsPassword) {
      connect()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (isConnected) {
      const timeoutId = setTimeout(() => {
        fetchHistory()
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [isConnected, fetchHistory])

  useEffect(() => {
    if (!isConnected || !isExpanded) return
    
    const intervalId = setInterval(() => {
      console.log('[Chat] Auto-refreshing history...')
      fetchHistory()
    }, 120000)
    
    return () => clearInterval(intervalId)
  }, [isConnected, isExpanded, fetchHistory])

  return {
    messages,
    isConnected,
    isTyping,
    isExpanded,
    hasNewMessage,
    needsPassword,
    sendMessage,
    clearChat,
    toggleExpanded,
    setIsExpanded,
    setPassword,
    hasPassword,
    fetchHistory
  }
}
