import { useState, useRef, useEffect } from 'react'
import { useChat } from '../hooks/useChat'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { MessageCircle, X, Send, RefreshCw, Trash2, Minus, Lock } from 'lucide-react'

interface ChatMessageData {
  type: string
  sender: 'user' | 'emily' | 'system' | 'error'
  content: string
  timestamp: string
  isStreaming?: boolean
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

  const renderContent = (content: string) => {
    if (!content) return null
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = content.split(urlRegex)
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline">
            {part}
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  if (message.sender === 'system') {
    return (
      <div className="text-center py-2">
        <p className="text-muted-foreground text-xs italic">{renderContent(message.content)}</p>
      </div>
    )
  }

  if (message.sender === 'error') {
    return (
      <div className="text-center py-2">
        <p className="text-destructive text-xs">{renderContent(message.content)}</p>
      </div>
    )
  }

  const isUser = message.sender === 'user'

  return (
    <div className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-muted text-sm">🥖</AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        'max-w-[75%] rounded-2xl px-3 py-2',
        isUser 
          ? 'bg-primary text-primary-foreground rounded-br-md' 
          : 'bg-muted rounded-bl-md'
      )}>
        <p className="text-sm whitespace-pre-wrap break-words">{renderContent(message.content)}</p>
        {message.timestamp && (
          <p className={cn('text-[10px] mt-1', isUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {formatTime(message.timestamp)}
          </p>
        )}
      </div>
    </div>
  )
}

function ChatWidget({ desktopMode = false }: { desktopMode?: boolean }) {
  const {
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
    fetchHistory
  } = useChat('web-user')

  const [inputValue, setInputValue] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if ((desktopMode || isExpanded) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, isExpanded, desktopMode])

  useEffect(() => {
    if (desktopMode || isExpanded) {
      if (needsPassword && passwordInputRef.current) {
        setTimeout(() => passwordInputRef.current?.focus(), 100)
      } else if (textareaRef.current) {
        setTimeout(() => textareaRef.current?.focus(), 100)
      }
    }
  }, [isExpanded, needsPassword, desktopMode])

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

  const quickActions = [
    { label: '+ Expense', action: () => handleQuickAction('Add expense ') },
    { label: '+ Task', action: () => handleQuickAction('Add task ') },
    { label: '📊 Summary', action: () => handleQuickAction("Show me today's summary") },
    { label: '📋 Tasks', action: () => handleQuickAction('List my tasks') },
    { label: '❓ Help', action: () => handleQuickAction('What can you do?') }
  ]

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
            className="flex-1"
          />
          <Button type="submit" disabled={!passwordInput.trim()}>Connect</Button>
        </form>
      </div>
    </div>
  )

  const renderHeader = (showMinimize: boolean) => (
    <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-muted">🥖</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">Emily</p>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500')} />
            <span className="text-xs text-muted-foreground">{isConnected ? 'Online' : 'Connecting...'}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={fetchHistory} title="Sync">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleClearChat} title="Clear">
          <Trash2 className="h-4 w-4" />
        </Button>
        {showMinimize && (
          <Button variant="ghost" size="icon" onClick={handleMinimize} title="Minimize">
            {isMobile ? <X className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )

  const renderMessages = () => (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3"
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

  const renderQuickActions = () => (
    <div className="flex gap-1.5 overflow-x-auto p-3 border-t flex-shrink-0">
      {quickActions.map((action, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={action.action}
          disabled={!isConnected}
          className="whitespace-nowrap text-xs h-7"
        >
          {action.label}
        </Button>
      ))}
    </div>
  )

  const renderInputArea = () => (
    <div className="flex gap-2 p-3 border-t flex-shrink-0">
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-h-[36px] max-h-[120px] placeholder:text-muted-foreground"
        placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          handleInput(e)
        }}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={!isConnected}
      />
      <Button size="icon" onClick={handleSend} disabled={!inputValue.trim() || !isConnected} className="flex-shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )

  if (desktopMode) {
    return (
      <Card className="h-screen rounded-none border-0 flex flex-col overflow-hidden">
        {needsPassword ? (
          <>
            <div className="flex items-center gap-2 p-3 border-b flex-shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-muted">🥖</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">Emily</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">Password Required</span>
                </div>
              </div>
            </div>
            {renderPasswordScreen()}
          </>
        ) : (
          <>
            {renderHeader(false)}
            {renderMessages()}
            {renderQuickActions()}
            {renderInputArea()}
          </>
        )}
      </Card>
    )
  }

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={toggleExpanded}>
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
      isMobile ? 'inset-0' : 'bottom-4 right-4 w-96 h-[650px] rounded-lg shadow-xl'
    )}>
      <Card className="h-full flex flex-col overflow-hidden">
        {needsPassword ? (
          <>
            <div className="flex items-center gap-2 p-3 border-b flex-shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-muted">🥖</AvatarFallback>
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
            {renderHeader(true)}
            {renderMessages()}
            {renderQuickActions()}
            {renderInputArea()}
          </>
        )}
      </Card>
    </div>
  )
}

export default ChatWidget
