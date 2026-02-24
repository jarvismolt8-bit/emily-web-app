import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  getCachedMessages, 
  setCachedMessages, 
  clearCachedMessages,
  type CachedMessage,
  type ToolCall,
  type ToolResult 
} from '@/lib/storage'

const PASSWORD_KEY = 'emily_chat_password'
const DEFAULT_PASSWORD = '10716255'
const DISCONNECT_DELAY = 30000

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface ChatMessage extends CachedMessage {
  clientId?: string
  isLocal?: boolean
}

interface BroadcastEventData {
  type: string
  data: ChatMessage | { isTyping: boolean } | Record<string, unknown>
}

export function useChat(userId = 'web-user') {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [isTyping, setIsTyping] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bcRef = useRef<BroadcastChannel | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const pendingMessagesRef = useRef<string[]>([])

  const getWebSocketUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3001/api/chat'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/chat`
  }, [])

  const getSessionId = useCallback(() => {
    if (sessionIdRef.current) return sessionIdRef.current
    
    const stored = sessionStorage.getItem('emily_chat_session_id')
    if (stored) {
      sessionIdRef.current = stored
    } else {
      const date = new Date().toISOString().split('T')[0]
      sessionIdRef.current = `web:${userId}:${date}`
      sessionStorage.setItem('emily_chat_session_id', sessionIdRef.current)
    }
    return sessionIdRef.current
  }, [userId])

  const getPassword = useCallback(() => {
    return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD
  }, [])

  const setPassword = useCallback((password: string) => {
    localStorage.setItem(PASSWORD_KEY, password)
    setNeedsPassword(false)
  }, [])

  const hasPassword = useCallback(() => {
    return !!localStorage.getItem(PASSWORD_KEY)
  }, [])

  useEffect(() => {
    if (!getPassword()) {
      setNeedsPassword(true)
    }
  }, [getPassword])

  useEffect(() => {
    const cached = getCachedMessages()
    if (cached.length > 0) {
      setMessages(cached)
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      setCachedMessages(messages)
    }
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
          clearCachedMessages()
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

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      console.log('[Chat] Disconnecting...')
      wsRef.current.close()
      wsRef.current = null
    }
    setConnectionStatus('disconnected')
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
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
    setConnectionStatus('connecting')
    
    try {
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('[Chat] Connected to backend')
        setConnectionStatus('connected')
        reconnectAttempts.current = 0
        
        if (pendingMessagesRef.current.length > 0) {
          console.log(`[Chat] Sending ${pendingMessagesRef.current.length} pending messages`)
          pendingMessagesRef.current.forEach(msg => {
            wsRef.current?.send(msg)
          })
          pendingMessagesRef.current = []
        }
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
        setConnectionStatus('disconnected')
        
        if (event.code === 1008) {
          setNeedsPassword(true)
          broadcast('auth_required', {})
        } else if (isExpanded) {
          attemptReconnect()
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('[Chat] WebSocket error:', error)
      }

    } catch (error) {
      console.error('[Chat] Connection error:', error)
      setConnectionStatus('disconnected')
      if (isExpanded) {
        attemptReconnect()
      }
    }
  }, [getPassword, getSessionId, getWebSocketUrl, userId, broadcast, isExpanded])

  const extractToolInfo = (content: unknown): { 
    text: string; 
    toolCalls?: ToolCall[]; 
    toolResults?: ToolResult[];
    thinking?: string;
  } => {
    const result = { text: '', toolCalls: [] as ToolCall[], toolResults: [] as ToolResult[], thinking: '' }
    
    if (typeof content === 'string') {
      result.text = content
      return result
    }
    
    if (!Array.isArray(content)) {
      return result
    }
    
    const textParts: string[] = []
    
    for (const block of content) {
      if (!block || typeof block !== 'object') continue
      
      const item = block as Record<string, unknown>
      const blockType = typeof item.type === 'string' ? item.type.toLowerCase() : ''
      
      if (blockType === 'text' && typeof item.text === 'string') {
        textParts.push(item.text)
      } else if (blockType === 'thinking' && typeof item.thinking === 'string') {
        result.thinking = item.thinking
      } else if (['toolcall', 'tool_call', 'tooluse', 'tool_use'].includes(blockType)) {
        result.toolCalls.push({
          name: typeof item.name === 'string' ? item.name : 'tool',
          args: typeof item.arguments === 'object' ? item.arguments as Record<string, unknown> : 
                typeof item.args === 'object' ? item.args as Record<string, unknown> : undefined
        })
      } else if (['toolresult', 'tool_result'].includes(blockType)) {
        result.toolResults.push({
          name: typeof item.name === 'string' ? item.name : 'tool',
          output: typeof item.text === 'string' ? item.text : 
                  typeof item.content === 'string' ? item.content : undefined,
          success: item.success !== false
        })
      }
    }
    
    result.text = textParts.join('')
    return result
  }

  const handleBackendMessage = useCallback((message: { type: string; [key: string]: unknown }) => {
    switch (message.type) {
      case 'message':
        const msgWithSender = message as unknown as ChatMessage & { 
          clientId?: string;
          content?: string | unknown[];
        }
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

        const toolInfo = extractToolInfo(msgWithSender.content)
        
        const chatMessage: ChatMessage = {
          type: msgWithSender.type,
          sender: msgWithSender.sender,
          content: toolInfo.text || (typeof msgWithSender.content === 'string' ? msgWithSender.content : ''),
          timestamp: msgWithSender.timestamp,
          toolCalls: toolInfo.toolCalls.length > 0 ? toolInfo.toolCalls : undefined,
          toolResults: toolInfo.toolResults.length > 0 ? toolInfo.toolResults : undefined,
          thinking: toolInfo.thinking || undefined
        }
        
        setMessages(prev => [...prev, chatMessage])
  
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
        const historyMsg = message as { messages?: Array<{ 
          role: string; 
          content: string | unknown[]; 
          timestamp?: string 
        }> }
        if (historyMsg.messages && historyMsg.messages.length > 0) {
          const formattedMessages: ChatMessage[] = historyMsg.messages.map(msg => {
            const toolInfo = extractToolInfo(msg.content)
            return {
              type: 'message',
              sender: msg.role === 'assistant' ? 'emily' : 'user',
              content: toolInfo.text || (typeof msg.content === 'string' ? msg.content : ''),
              timestamp: msg.timestamp || new Date().toISOString(),
              toolCalls: toolInfo.toolCalls.length > 0 ? toolInfo.toolCalls : undefined,
              toolResults: toolInfo.toolResults.length > 0 ? toolInfo.toolResults : undefined,
              thinking: toolInfo.thinking || undefined
            }
          })
          
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

    const messagePayload = JSON.stringify({
      type: 'message',
      content,
      timestamp,
      clientId: sessionId
    })

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(messagePayload)
    } else if (connectionStatus === 'disconnected') {
      pendingMessagesRef.current.push(messagePayload)
      connect()
    } else {
      pendingMessagesRef.current.push(messagePayload)
    }
    
    return true
  }, [broadcast, getSessionId, connectionStatus, connect])

  const clearChat = useCallback(() => {
    setMessages([])
    clearCachedMessages()
    broadcast('clear', {})
  }, [broadcast])

  const fetchHistory = useCallback(() => {
    if (connectionStatus !== 'connected' || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
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
  }, [connectionStatus])

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  useEffect(() => {
    if (isExpanded) {
      setHasNewMessage(false)
      
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current)
        disconnectTimeoutRef.current = null
      }
      
      if (connectionStatus === 'disconnected' && getPassword() && !needsPassword) {
        console.log('[Chat] Chat expanded, connecting...')
        connect()
      }
    } else {
      if (connectionStatus === 'connected') {
        console.log(`[Chat] Chat minimized, will disconnect in ${DISCONNECT_DELAY/1000}s`)
        disconnectTimeoutRef.current = setTimeout(() => {
          if (!isExpanded) {
            console.log('[Chat] Disconnecting due to inactivity')
            disconnect()
          }
        }, DISCONNECT_DELAY)
      }
    }

    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current)
      }
    }
  }, [isExpanded, connectionStatus, connect, disconnect, getPassword, needsPassword])

  useEffect(() => {
    if (connectionStatus === 'connected') {
      const timeoutId = setTimeout(() => {
        fetchHistory()
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [connectionStatus, fetchHistory])

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return {
    messages,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
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
    fetchHistory,
    connect,
    disconnect
  }
}
