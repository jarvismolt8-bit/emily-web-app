import React from 'react';

/**
 * ChatMessage Component
 * Renders individual chat messages with different styles based on sender
 */
function ChatMessage({ message }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMessageClass = () => {
    switch (message.sender) {
      case 'user':
        return 'chat-message chat-message-user';
      case 'emily':
        return 'chat-message chat-message-emily';
      case 'system':
        return 'chat-message chat-message-system';
      case 'error':
        return 'chat-message chat-message-error';
      default:
        return 'chat-message chat-message-system';
    }
  };

  // Render message content with markdown-like formatting
  const renderContent = (content) => {
    if (!content) return null;
    
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: message.sender === 'user' ? '#c7d2fe' : '#93c5fd', textDecoration: 'underline' }}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={getMessageClass()}>
      <div className="chat-message-content">
        {renderContent(message.content)}
      </div>
      {message.timestamp && (
        <div className="chat-message-time">
          {formatTime(message.timestamp)}
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
