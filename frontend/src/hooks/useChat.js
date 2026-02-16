import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'emily_chat_session';
const PASSWORD_KEY = 'emily_chat_password';

// Default web app password (same as useAuth)
const DEFAULT_PASSWORD = '10716255';

/**
 * useChat Hook
 * Manages WebSocket connection to backend which proxies to OpenClaw Gateway
 */
export function useChat(userId = 'web-user') {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef(null);
  const bcRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Get WebSocket URL (connect to backend which proxies to gateway)
  const getWebSocketUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3001/api/chat';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/chat`;
  }, []);

  // Get or create session ID - consistent across devices for same user
  const getSessionId = useCallback(() => {
    if (sessionIdRef.current) return sessionIdRef.current;
    
    const stored = sessionStorage.getItem(`${STORAGE_KEY}_id`);
    if (stored) {
      sessionIdRef.current = stored;
    } else {
      // Use consistent session ID based on user + current date
      // This ensures desktop and mobile share the same session
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      sessionIdRef.current = `web:${userId}:${date}`;
      sessionStorage.setItem(`${STORAGE_KEY}_id`, sessionIdRef.current);
    }
    return sessionIdRef.current;
  }, [userId]);

  // Get password from storage
  const getPassword = useCallback(() => {
    return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
  }, []);

  // Set password in storage
  const setPassword = useCallback((password) => {
    localStorage.setItem(PASSWORD_KEY, password);
    setNeedsPassword(false);
    // After setting password, try to connect
    setTimeout(() => connect(), 100);
  }, []);

  // Check if password exists
  const hasPassword = useCallback(() => {
    return !!localStorage.getItem(PASSWORD_KEY);
  }, []);

  // Load messages from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed.messages || []);
      } catch (e) {
        console.error('Failed to parse stored messages:', e);
      }
    }
  }, []);

  // Check for password on mount
  useEffect(() => {
    if (!getPassword()) {
      setNeedsPassword(true);
    }
  }, [getPassword]);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages,
      lastActive: new Date().toISOString()
    }));
  }, [messages]);

  // Initialize BroadcastChannel for cross-tab sync
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      bcRef.current = new BroadcastChannel('emily_chat_channel');
      
      bcRef.current.onmessage = (event) => {
        const { type, data } = event.data;
        
        if (type === 'message' || type === 'system') {
          setMessages(prev => {
            if (prev.some(m => m.timestamp === data.timestamp && m.content === data.content)) {
              return prev;
            }
            return [...prev, data];
          });
          
          if (!isExpanded) {
            setHasNewMessage(true);
          }
        } else if (type === 'typing') {
          setIsTyping(data.isTyping);
        } else if (type === 'clear') {
          setMessages([]);
        } else if (type === 'auth_required') {
          setNeedsPassword(true);
        }
      };
    }

    return () => {
      if (bcRef.current) {
        bcRef.current.close();
      }
    };
  }, [isExpanded]);

  // Broadcast to other tabs
  const broadcast = useCallback((type, data) => {
    if (bcRef.current) {
      bcRef.current.postMessage({ type, data });
    }
  }, []);

  // Connect to backend WebSocket (which proxies to gateway)
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const password = getPassword();
    if (!password) {
      console.log('[Chat] No password, requesting password');
      setNeedsPassword(true);
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const sessionId = getSessionId();
    const wsUrl = `${getWebSocketUrl()}?password=${encodeURIComponent(password)}&session=${sessionId}&userId=${userId}`;
    
    console.log('[Chat] Connecting to backend...');
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[Chat] Connected to backend');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleBackendMessage(message);
        } catch (error) {
          console.error('[Chat] Error parsing message:', error);
        }
      };

      wsRef.current.onclose = (code, reason) => {
        console.log('[Chat] Disconnected:', code, reason);
        setIsConnected(false);
        
        if (code === 1008) {
          setNeedsPassword(true);
          broadcast('auth_required', {});
        } else {
          attemptReconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[Chat] WebSocket error:', error);
      };

    } catch (error) {
      console.error('[Chat] Connection error:', error);
      attemptReconnect();
    }
  }, [getPassword, getSessionId, getWebSocketUrl, userId, broadcast]);

  // Handle messages from backend
  const handleBackendMessage = useCallback((message) => {
    switch (message.type) {
      case 'message':
        // Get current session ID to filter own messages
        const currentSessionId = getSessionId();
        
        // Skip if this message was sent by this client (already shown locally)
        if (message.clientId === currentSessionId && message.sender === 'user') {
          return;
        }
        
        // Check if message already exists (prevent duplicates from other sources)
        const isDuplicate = messages.some(m => 
          m.timestamp === message.timestamp && 
          m.content === message.content &&
          m.sender === message.sender
        );
        
        if (isDuplicate) {
          return; // Skip duplicate
        }

        setMessages(prev => [...prev, message]);
  
        // Show notification if from Emily and chat is minimized
        if (message.sender === 'emily' && !isExpanded) {
          setHasNewMessage(true);
        }
        
        break;
        
      case 'system':
        setMessages(prev => [...prev, message]);
        broadcast('message', message);
        break;
        
      case 'typing':
        setIsTyping(true);
        broadcast('typing', { isTyping: true });
        
        setTimeout(() => {
          setIsTyping(false);
          broadcast('typing', { isTyping: false });
        }, 3000);
        break;
        
      case 'stream':
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.sender === 'emily' && lastMessage.isStreaming) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + (message.chunk || ''),
              timestamp: message.timestamp || new Date().toISOString()
            };
            return updated;
          }
          return [...prev, {
            type: 'message',
            sender: 'emily',
            content: message.chunk || '',
            timestamp: message.timestamp || new Date().toISOString(),
            isStreaming: true
          }];
        });
        break;
        
      case 'error':
        setMessages(prev => [...prev, {
          type: 'error',
          sender: 'system',
          content: message.content || 'An error occurred',
          timestamp: message.timestamp || new Date().toISOString()
        }]);
        setIsTyping(false);
        break;
        
      default:
        console.log('[Chat] Unknown message type:', message.type);
    }
  }, [broadcast, isExpanded, messages]);

  // Attempt to reconnect
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('[Chat] Max reconnection attempts reached');
      return;
    }

    reconnectAttempts.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    
    console.log(`[Chat] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  // Send message to Emily
  const sendMessage = useCallback((content) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setMessages(prev => [...prev, {
        type: 'error',
        sender: 'system',
        content: 'Not connected. Please enter your password.',
        timestamp: new Date().toISOString()
      }]);
      return false;
    }

    const sessionId = getSessionId();
    const timestamp = new Date().toISOString();
    
    const userMessage = {
      type: 'message',
      sender: 'user',
      content,
      timestamp,
      clientId: sessionId,
      isLocal: true
    };
    
    // Add to local state immediately (for responsiveness)
    setMessages(prev => [...prev, userMessage]);
    broadcast('message', userMessage);

    // Send to backend with clientId for cross-device sync
    wsRef.current.send(JSON.stringify({
      type: 'message',
      content,
      timestamp,
      clientId: sessionId
    }));
    return true;
  }, [broadcast, getSessionId]);

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([]);
    broadcast('clear', {});
  }, [broadcast]);

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => {
      const newState = !prev;
      if (newState) {
        setHasNewMessage(false);
      }
      return newState;
    });
  }, []);

  // Connect on mount if password exists
  useEffect(() => {
    if (getPassword() && !needsPassword) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

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
    hasPassword
  };
}
