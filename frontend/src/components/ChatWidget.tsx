import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useChat } from '../hooks/useChat'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { MessageCircle, X, Send, RefreshCw, Trash2, Minus, Lock, Loader2, MoreHorizontal } from 'lucide-react'
import { ToolCard, ThinkingCard } from './ToolCard'
import type { ToolCall, ToolResult } from '@/lib/storage'

interface ChatMessageData {
  type: string
  sender: 'user' | 'emily' | 'system' | 'error'
  content: string
  timestamp: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  thinking?: string
}

interface MessageBubbleProps {
  message: ChatMessageData
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (message.sender === 'system') {
    return (
      <div className="text-center py-2">
        <p className="text-muted-foreground text-xs italic">{message.content}</p>
      </div>
    )
  }

  if (message.sender === 'error') {
    return (
      <div className="text-center py-2">
        <p className="text-destructive text-xs">{message.content}</p>
      </div>
    )
  }

  const isUser = message.sender === 'user'

  return (
    <div className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarFallback className="bg-muted text-xs">🥖</AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        'max-w-[85%] rounded-2xl px-3 py-2 overflow-hidden',
        isUser 
          ? 'bg-primary text-primary-foreground rounded-br-md' 
          : 'bg-muted rounded-bl-md'
      )}>
        {message.thinking && (
          <ThinkingCard thinking={message.thinking} />
        )}
        
        {message.toolCalls && message.toolCalls.map((tool, idx) => (
          <ToolCard 
            key={`call-${idx}`}
            kind="call" 
            name={tool.name} 
            args={tool.args} 
          />
        ))}
        
        {message.toolResults && message.toolResults.map((tool, idx) => (
          <ToolCard 
            key={`result-${idx}`}
            kind="result" 
            name={tool.name} 
            output={tool.output}
            success={tool.success}
          />
        ))}
        
        {message.content && (
          <div className="text-sm break-words overflow-hidden">
            <ReactMarkdown className="break-words">{message.content}</ReactMarkdown>
          </div>
        )}
        
        {message.timestamp && (
          <p className={cn('text-[10px] mt-1', isUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {formatTime(message.timestamp)}
          </p>
        )}
      </div>
    </div>
  )
}

function ChatWidget() {
  const {
    messages,
    connectionStatus,
    isTyping,
    isExpanded,
    hasNewMessage,
    needsPassword,
    sendMessage,
    clearChat,
    toggleExpanded,
    setIsExpanded,
    setPassword,
    fetchHistory
  } = useChat('web-user')

  const [inputValue, setInputValue] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [verboseLevel, setVerboseLevel] = useState<'on' | 'off'>('off')
  const [thinkLevel, setThinkLevel] = useState<'high' | 'medium' | 'low'>('medium')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, isExpanded])

  useEffect(() => {
    if (isExpanded) {
      if (needsPassword && passwordInputRef.current) {
        setTimeout(() => passwordInputRef.current?.focus(), 100)
      } else if (textareaRef.current) {
        setTimeout(() => textareaRef.current?.focus(), 100)
      }
    }
  }, [isExpanded, needsPassword])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordInput.trim()) {
      setPassword(passwordInput.trim())
      setPasswordInput('')
    }
  }

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim())
      setInputValue('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  const handleQuickAction = (text: string) => {
    if (needsPassword) return
    setInputValue(text)
    textareaRef.current?.focus()
  }

  const handleClearChat = () => {
    if (window.confirm('Clear all chat messages?')) {
      clearChat()
    }
  }

  const handleMinimize = () => setIsExpanded(false)

  const getConnectionIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Online</span>
          </>
        )
      case 'connecting':
        return (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
            <span className="text-xs text-muted-foreground">Connecting...</span>
          </>
        )
      case 'disconnected':
        return (
          <>
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Offline</span>
          </>
        )
    }
  }

  const renderPasswordScreen = () => (
    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
      <div className="text-center max-w-sm">
        <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Password Required</h3>
        <p className="text-muted-foreground text-sm mb-2">
          To chat with Emily, enter your web app password.
        </p>
        <p className="text-muted-foreground text-xs mb-4">
          Default: <code className="bg-muted px-1 rounded">10716255</code>
        </p>
        <form onSubmit={handlePasswordSubmit} className="flex gap-2">
          <Input
            ref={passwordInputRef}
            type="password"
            placeholder="Enter password..."
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="flex-1 text-base h-10"
          />
          <Button type="submit" disabled={!passwordInput.trim()} className="h-10">Connect</Button>
        </form>
      </div>
    </div>
  )

  const renderHeader = () => (
    <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted text-sm">🥖</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">Emily</p>
          <div className="flex items-center gap-1.5">
            {getConnectionIndicator()}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 relative">
        <Button 
          variant="ghost" 
          size="icon" 
          title="Quick Actions" 
          type="button"
          onClick={() => setShowQuickActions(!showQuickActions)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {showQuickActions && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-[100] py-1">
            <button
              onClick={() => { sendMessage('/model'); setShowQuickActions(false) }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span className="font-mono">/model</span>
              <span className="text-muted-foreground text-xs">Switch model</span>
            </button>
            <button
              onClick={() => { sendMessage('/models'); setShowQuickActions(false) }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span className="font-mono">/models</span>
              <span className="text-muted-foreground text-xs">List models</span>
            </button>
            <button
              onClick={() => { sendMessage('/help'); setShowQuickActions(false) }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span className="font-mono">/help</span>
              <span className="text-muted-foreground text-xs">Show help</span>
            </button>
            <button
              onClick={() => { sendMessage('/commands'); setShowQuickActions(false) }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span className="font-mono">/commands</span>
              <span className="text-muted-foreground text-xs">List commands</span>
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { 
                const newLevel = verboseLevel === 'on' ? 'off' : 'on'
                setVerboseLevel(newLevel)
                sendMessage(`/verbose ${newLevel}`)
                setShowQuickActions(false) 
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span className="font-mono">/verbose</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{verboseLevel}</span>
            </button>
            <button
              onClick={() => { 
                const levels: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low']
                const currentIndex = levels.indexOf(thinkLevel)
                const nextIndex = (currentIndex + 1) % levels.length
                const newLevel = levels[nextIndex]
                setThinkLevel(newLevel)
                sendMessage(`/think ${newLevel}`)
                setShowQuickActions(false) 
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span className="font-mono">/think</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{thinkLevel}</span>
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { sendMessage('/code_agent'); setShowQuickActions(false) }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span className="font-mono">/code_agent</span>
              <span className="text-muted-foreground text-xs">Code mode</span>
            </button>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={fetchHistory} 
          title="Sync"
          disabled={connectionStatus !== 'connected'}
        >
          <RefreshCw className={cn("h-4 w-4", connectionStatus === 'connecting' && "animate-spin")} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleClearChat} title="Clear">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleMinimize} title="Minimize">
          {isMobile ? <X className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )

  const renderMessages = () => (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 scrollbar-hide"
    >
      {messages.length === 0 && !needsPassword && (
        <div className="text-center text-muted-foreground text-sm py-8">
          <p className="font-medium mb-2">Start a conversation with Emily!</p>
          <p className="text-xs">You can ask me to:</p>
          <ul className="text-xs mt-1 space-y-0.5">
            <li>• Add expenses or income</li>
            <li>• Manage your tasks</li>
            <li>• Check your summary</li>
          </ul>
        </div>
      )}
      {messages.map((message, index) => (
        <MessageBubble key={index} message={message} />
      ))}
      {isTyping && (
        <div className="flex items-center gap-2 px-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-muted text-xs">🥖</AvatarFallback>
          </Avatar>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )

  const renderInputArea = () => (
    <div className="flex gap-2 p-3 border-t flex-shrink-0">
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none bg-muted rounded-md px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring min-h-[40px] max-h-[120px] placeholder:text-muted-foreground"
        placeholder={connectionStatus === 'connected' ? 'Type a message...' : 'Connecting...'}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          handleInput(e)
        }}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={connectionStatus !== 'connected'}
      />
      <Button 
        size="icon" 
        onClick={handleSend} 
        disabled={!inputValue.trim() || connectionStatus !== 'connected'} 
        className="flex-shrink-0 h-10 w-10"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  )

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90" 
          onClick={toggleExpanded}
        >
          <MessageCircle className="h-6 w-6" />
          {hasNewMessage && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">!</span>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn(
      'fixed z-50 flex flex-col',
      isMobile 
        ? 'inset-0' 
        : 'bottom-4 right-4 w-[420px] h-[700px] rounded-lg shadow-xl'
    )}>
      <Card className="h-full flex flex-col gap-0 py-0">
        {needsPassword ? (
          <>
            <div className="flex items-center gap-2 p-3 border-b flex-shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-sm">🥖</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm">Emily</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">Password Required</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleMinimize}>
                {isMobile ? <X className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              </Button>
            </div>
            {renderPasswordScreen()}
          </>
        ) : (
          <>
            {renderHeader()}
            {renderMessages()}
            {renderInputArea()}
          </>
        )}
      </Card>
    </div>
  )
}

export default ChatWidget
