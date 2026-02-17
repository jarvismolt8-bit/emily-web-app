import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from './ChatMessage';
import '../styles/chat.css';

/**
 * ChatWidget Component
 * 
 * Desktop Mode: Side-by-side layout (always visible, no floating button)
 * Mobile Mode: Floating button in lower right corner
 * 
 * @param {boolean} desktopMode - When true, renders as sidebar; when false, as floating widget
 */
function ChatWidget({ desktopMode = false }) {
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
    hasPassword,
    fetchHistory
  } = useChat('web-user');

  const [inputValue, setInputValue] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if ((desktopMode || isExpanded) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isExpanded, desktopMode]);

  // Focus input when expanded or in desktop mode
  useEffect(() => {
    if (desktopMode || isExpanded) {
      if (needsPassword && passwordInputRef.current) {
        setTimeout(() => passwordInputRef.current?.focus(), 100);
      } else if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isExpanded, needsPassword, desktopMode]);

  // Handle password submission
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput.trim()) {
      setPassword(passwordInput.trim());
      setPasswordInput('');
    }
  };

  // Handle send message
  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Handle enter key (send on Enter, new line on Shift+Enter)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle password input enter
  const handlePasswordKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePasswordSubmit(e);
    }
  };

  // Auto-resize textarea
  const handleInput = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // Quick action handlers
  const quickActions = [
    { label: '+ Expense', action: () => handleQuickAction('Add expense ') },
    { label: '+ Task', action: () => handleQuickAction('Add task ') },
    { label: '📊 Summary', action: () => handleQuickAction('Show me today\'s summary') },
    { label: '📋 Tasks', action: () => handleQuickAction('List my tasks') },
    { label: '❓ Help', action: () => handleQuickAction('What can you do?') }
  ];

  const handleQuickAction = (text) => {
    if (needsPassword) {
      return;
    }
    setInputValue(text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Clear chat with confirmation
  const handleClearChat = () => {
    if (window.confirm('Clear all chat messages?')) {
      clearChat();
    }
  };

  // Minimize chat
  const handleMinimize = () => {
    setIsExpanded(false);
  };

  // DESKTOP MODE: Always expanded sidebar
  if (desktopMode) {
    return (
      <div className="chat-widget-desktop">
        {needsPassword ? (
          // Desktop: Password input screen
          <div className="chat-window-desktop">
            {/* Header */}
            <div className="chat-header-desktop">
              <div className="chat-header-title">
                <div className="chat-header-avatar">🥖</div>
                <div>
                  <div>Emily</div>
                  <div className="chat-status">
                    <span className="chat-status-dot disconnected"></span>
                    <span>Password Required</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="chat-messages-desktop">
              <div className="chat-token-required">
                <div className="chat-token-icon">🔐</div>
                <h3>Password Required</h3>
                <p>To chat with Emily, you need to enter your web app password.</p>
                <p className="chat-token-hint">
                  Default password: <code>10716255</code>
                </p>
                <form onSubmit={handlePasswordSubmit} className="chat-token-form">
                  <input
                    ref={passwordInputRef}
                    type="password"
                    className="chat-token-input"
                    placeholder="Enter your password..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={handlePasswordKeyDown}
                  />
                  <button
                    type="submit"
                    className="chat-token-submit"
                    disabled={!passwordInput.trim()}
                  >
                    Connect
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          // Desktop: Full chat interface
          <div className="chat-window-desktop">
            {/* Header */}
            <div className="chat-header-desktop">
              <div className="chat-header-title">
                <div className="chat-header-avatar">🥖</div>
                <div>
                  <div>Emily</div>
                  <div className="chat-status">
                    <span className={`chat-status-dot ${isConnected ? '' : 'disconnected'}`}></span>
                    <span>{isConnected ? 'Online' : 'Connecting...'}</span>
                  </div>
                </div>
              </div>
              <div className="chat-header-actions">
                <button
                  className="chat-header-btn"
                  onClick={fetchHistory}
                  title="Sync messages"
                  aria-label="Sync messages"
                >
                  🔄
                </button>
                <button
                  className="chat-header-btn"
                  onClick={handleClearChat}
                  title="Clear chat"
                  aria-label="Clear chat"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages-desktop">
              {messages.length === 0 && (
                <div className="chat-message chat-message-system">
                  Start a conversation with Emily! You can ask me to:
                  <br />• Add expenses or income
                  <br />• Manage your tasks
                  <br />• Check your summary
                  <br />• And much more!
                </div>
              )}
              
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              
              {isTyping && (
                <div className="chat-typing">
                  <div className="chat-typing-dot"></div>
                  <div className="chat-typing-dot"></div>
                  <div className="chat-typing-dot"></div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="chat-quick-actions-desktop">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="chat-quick-action-btn"
                  onClick={action.action}
                  disabled={!isConnected}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="chat-input-area-desktop">
              <textarea
                ref={(el) => {
                  textareaRef.current = el;
                  inputRef.current = el;
                }}
                className="chat-input"
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                rows={1}
                disabled={!isConnected}
              />
              <button
                type="button"
                className="chat-send-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSend();
                }}
                disabled={!inputValue.trim() || !isConnected}
                aria-label="Send message"
              >
                🚀
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // MOBILE MODE: Floating button (original behavior)
  // Render collapsed button
  if (!isExpanded) {
    return (
      <div className="chat-widget">
        <button
          className="chat-button"
          onClick={toggleExpanded}
          aria-label="Open chat with Emily"
        >
          <span>💬</span>
          {hasNewMessage && <span className="chat-badge">!</span>}
        </button>
      </div>
    );
  }

  // Render password input screen
  if (needsPassword) {
    return (
      <div className={`chat-widget ${isExpanded ? 'chat-expanded' : ''}`}>
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-title">
              <div className="chat-header-avatar">🥖</div>
              <div>
                <div>Emily</div>
                <div className="chat-status">
                  <span className="chat-status-dot disconnected"></span>
                  <span>Password Required</span>
                </div>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                className="chat-header-btn"
                onClick={handleMinimize}
                title="Minimize"
                aria-label="Minimize chat"
              >
                {isMobile ? '✕' : '—'}
              </button>
            </div>
          </div>

          {/* Password Input */}
          <div className="chat-messages">
            <div className="chat-token-required">
              <div className="chat-token-icon">🔐</div>
              <h3>Password Required</h3>
              <p>To chat with Emily, you need to enter your web app password.</p>
              <p className="chat-token-hint">
                Default password: <code>10716255</code>
              </p>
              <form onSubmit={handlePasswordSubmit} className="chat-token-form">
                <input
                  ref={passwordInputRef}
                  type="password"
                  className="chat-token-input"
                  placeholder="Enter your password..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                />
                <button
                  type="submit"
                  className="chat-token-submit"
                  disabled={!passwordInput.trim()}
                >
                  Connect
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-widget ${isExpanded ? 'chat-expanded' : ''}`}>
      <div className="chat-window">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-title">
            <div className="chat-header-avatar">🥖</div>
            <div>
              <div>Emily</div>
              <div className="chat-status">
                <span className={`chat-status-dot ${isConnected ? '' : 'disconnected'}`}></span>
                <span>{isConnected ? 'Online' : 'Connecting...'}</span>
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              className="chat-header-btn"
              onClick={fetchHistory}
              title="Sync messages"
              aria-label="Sync messages"
            >
              🔄
            </button>
            <button
              className="chat-header-btn"
              onClick={handleClearChat}
              title="Clear chat"
              aria-label="Clear chat"
            >
              🗑️
            </button>
            <button
              className="chat-header-btn"
              onClick={handleMinimize}
              title="Minimize"
              aria-label="Minimize chat"
            >
              {isMobile ? '✕' : '—'}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && !needsPassword && (
            <div className="chat-message chat-message-system">
              Start a conversation with Emily! You can ask me to:
              <br />• Add expenses or income
              <br />• Manage your tasks
              <br />• Check your summary
              <br />• And much more!
            </div>
          )}
          
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          
          {isTyping && (
            <div className="chat-typing">
              <div className="chat-typing-dot"></div>
              <div className="chat-typing-dot"></div>
              <div className="chat-typing-dot"></div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="chat-quick-actions">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="chat-quick-action-btn"
              onClick={action.action}
              disabled={needsPassword}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <textarea
            ref={(el) => {
              textareaRef.current = el;
              inputRef.current = el;
            }}
            className="chat-input"
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            rows={1}
            disabled={!isConnected}
          />
          <button
            type="button"
            className="chat-send-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSend();
            }}
            disabled={!inputValue.trim() || !isConnected}
            aria-label="Send message"
          >
            🚀
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWidget;
