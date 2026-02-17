# Chat Widget Development Documentation

## Cashflow Manager Web App - Emily AI Integration

**Date:** February 2026  
**Technologies:** React, WebSocket, OpenClaw Gateway  
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technical Architecture](#technical-architecture)
3. [Key Technical Decisions](#key-technical-decisions)
4. [Implementation Details](#implementation-details)
5. [OpenClaw Integration](#openclaw-integration)
6. [Mobile Optimization](#mobile-optimization)
7. [Security Considerations](#security-considerations)
8. [Lessons Learned](#lessons-learned)
9. [Future Enhancements](#future-enhancements)
10. [References](#references)

---

## Executive Summary

### What We Built

A real-time chat interface that allows users to communicate with Emily (AI assistant) directly within the Cashflow Manager web application, in addition to Telegram.

### Business Value

- **Unified Experience**: Users can chat with Emily without leaving the web app
- **Cross-Device Sync**: Messages sync between desktop and mobile automatically
- **Data Integration**: Emily can execute commands (add expenses, manage tasks) directly in the web app
- **Cost Efficiency**: Leverages existing OpenClaw infrastructure

### Key Features Delivered

- ✅ Floating chat widget (lower right corner)
- ✅ Mobile-responsive design
- ✅ Real-time messaging via WebSocket
- ✅ Cross-device synchronization
- ✅ Command execution (add expense, add task, etc.)
- ✅ Session-based conversation history
- ✅ Auto-refresh and manual sync capabilities

---

## Technical Architecture

### System Architecture Diagram

```
┌─────────────────┐      WebSocket      ┌──────────────────┐      WebSocket      ┌─────────────────┐
│   Browser       │ ◄──────────────────► │  Express Backend │ ◄──────────────────► │  OpenClaw       │
│   (React App)   │   (Port 3001)       │   (Node.js)      │   (Port 18789)     │   Gateway       │
│                 │                      │                  │                      │                 │
│  ┌───────────┐  │                      │  ┌────────────┐  │                      │  ┌───────────┐  │
│  │ Chat      │  │                      │  │ Gateway    │  │                      │  │ Emily AI  │  │
│  │ Widget    │  │                      │  │ Client     │  │                      │  │ Agent     │  │
│  └───────────┘  │                      │  └────────────┘  │                      │  └───────────┘  │
└─────────────────┘                      └──────────────────┘                      └─────────────────┘
        │                                          │
        │        HTTP/WebSocket                    │
        └──────────────────────────────────────────┘
                      │
               ┌─────────────┐
               │   Nginx     │
               │  (Port 443) │
               └─────────────┘
```

### Communication Flow

**1. User Sends Message:**
```
Browser → Backend WebSocket → OpenClaw Gateway → Emily AI
```

**2. Emily Responds:**
```
Emily AI → OpenClaw Gateway → Backend → Broadcast to all connected clients → Browser
```

**3. Command Execution (e.g., "Add expense 500 PHP"):**
```
User Message → Emily AI → Backend Command Handler → Database → Confirmation to User
```

---

## Key Technical Decisions

### 3.1 Why WebSocket?

**Reference:** [OpenClaw Gateway Protocol Documentation](https://docs.openclaw.ai/gateway/protocol)

**Decision:** Use WebSocket for real-time bidirectional communication.

**Reasoning:**
- **Low Latency**: Instant message delivery
- **Persistent Connection**: Unlike HTTP polling, WebSocket maintains connection
- **Server Push**: Backend can push messages to client without request
- **OpenClaw Native**: OpenClaw gateway uses WebSocket protocol

**Alternative Considered:** HTTP REST API with polling
- **Rejected**: Higher latency, more server load, not real-time

### 3.2 Why Proxy Through Backend?

**Decision:** Browser connects to backend (port 3001), which proxies to OpenClaw gateway (port 18789).

**Reasoning:**

1. **Authentication**: Backend can verify web app password before allowing chat access
2. **CORS Handling**: Avoids cross-origin issues between browser and gateway
3. **Session Management**: Backend manages session state and broadcasting
4. **Command Execution**: Backend can intercept commands and execute local operations

**Reference:** [OpenClaw Gateway Security](https://docs.openclaw.ai/gateway/security)

### 3.3 Session Management Strategy

**Decision:** Use consistent session IDs based on `userId + date`.

**Format:** `web:web-user:2026-02-16`

**Reasoning:**
- Desktop and mobile share same session for same user on same day
- Isolates conversations by day (clean slate daily)
- Compatible with OpenClaw's session-based architecture

---

## Implementation Details

### 4.1 Frontend Components

**File Structure:**
```
frontend/src/
├── components/
│   ├── ChatWidget.jsx      # Main chat container
│   └── ChatMessage.jsx     # Individual message component
├── hooks/
│   └── useChat.js          # WebSocket logic & state management
└── styles/
    └── chat.css            # Responsive styling
```

**Key Technologies:**
- **React Hooks**: `useState`, `useEffect`, `useCallback`, `useRef`
- **WebSocket API**: Native browser WebSocket
- **BroadcastChannel API**: Cross-tab synchronization
- **CSS Media Queries**: Mobile-responsive design

### 4.2 State Management

**useChat Hook Responsibilities:**

1. **WebSocket Connection**: Connect/disconnect handling
2. **Message State**: Store and update message history
3. **Session Management**: Generate and persist session ID
4. **Cross-Tab Sync**: BroadcastChannel for multi-tab support
5. **Auto-Refresh**: Periodic history fetching (every 2 minutes)
6. **Error Handling**: Reconnection logic

**Code Pattern:**
```javascript
// Custom hook pattern for reusable chat logic
export function useChat(userId = 'web-user') {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  // ... other state
  
  const connect = useCallback(() => {
    // WebSocket connection logic
  }, [dependencies]);
  
  const sendMessage = useCallback((content) => {
    // Send message logic
  }, [dependencies]);
  
  // Return state and functions for component use
  return { messages, isConnected, sendMessage, ... };
}
```

### 4.3 Backend Integration

**Express WebSocket Server:**
```javascript
// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ 
  server,
  path: '/api/chat',
  verifyClient: (info, cb) => {
    // Verify password from query params
    const password = url.searchParams.get('password');
    cb(password === WEB_PASSWORD);
  }
});
```

**OpenClaw Gateway Client:**
- Maintains persistent connection to OpenClaw gateway
- Proxies messages between web clients and Emily
- Handles authentication with gateway token

**Reference:** [OpenClaw Gateway Client Configuration](https://docs.openclaw.ai/gateway/configuration)

---

## OpenClaw Integration

### 5.1 Gateway Connection

**Protocol:** OpenClaw WebSocket Protocol v3

**Authentication:**
```javascript
const connectFrame = {
  type: 'req',
  id: 'msg-1',
  method: 'connect',
  params: {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: 'webchat',
      displayName: 'Cashflow Web Chat',
      version: '1.0.0',
      platform: 'node',
      mode: 'webchat'
    },
    auth: {
      token: 'a0cec356b67499e2a19027d920f838ae617315b1d08cb30c'
    }
  }
};
```

**Reference:** [OpenClaw Gateway Authentication](https://docs.openclaw.ai/gateway/authentication)

### 5.2 Session Management

**OpenClaw Sessions:**
- Each conversation is a "session" in OpenClaw
- Format: `agent:main:webchat:web-user:2026-02-16`
- Sessions persist on OpenClaw server
- Can fetch history using `chat.history` method

**Chat Send:**
```javascript
const chatFrame = {
  type: 'req',
  id: 'msg-2',
  method: 'chat.send',
  params: {
    sessionKey: 'agent:main:webchat:web-user:2026-02-16',
    message: 'Hello Emily!'
  }
};
```

**Reference:** [OpenClaw Chat Methods](https://docs.openclaw.ai/web/webchat)

### 5.3 Message Format

**Incoming from OpenClaw:**
```json
{
  "type": "event",
  "event": "chat",
  "payload": {
    "sessionKey": "agent:main:webchat:web-user:2026-02-16",
    "state": "final",
    "message": {
      "role": "assistant",
      "content": [
        { "type": "text", "text": "Hello! How can I help?" }
      ]
    }
  }
}
```

---

## Mobile Optimization

### 6.1 Responsive Design

**Strategy:** CSS Media Queries for mobile adaptation

```css
/* Desktop */
.chat-window {
  width: 380px;
  height: 500px;
  border-radius: 12px;
}

/* Mobile */
@media (max-width: 768px) {
  .chat-window {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
}
```

**Mobile-Specific Features:**
- Full-screen chat window
- Larger touch targets (44px minimum)
- Safe area insets for notched devices
- Touch action optimizations

### 6.2 Touch Event Handling

**Challenge:** Mobile browsers have 300ms delay on click events

**Solution:**
```javascript
<button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSend();
  }}
  onTouchEnd={handleSend}  // Faster than onClick
>
```

---

## Security Considerations

### 7.1 Authentication

- **Web App Password**: Required to connect to chat WebSocket
- **Gateway Token**: Stored only on backend, never exposed to frontend
- **Session Validation**: Each session tied to authenticated user

### 7.2 Data Privacy

- **Message Storage**: Conversations stored in OpenClaw, not local database
- **Session Isolation**: Users can only access their own sessions
- **Encrypted Transport**: WSS (WebSocket Secure) for all communications

**Reference:** [OpenClaw Security Best Practices](https://docs.openclaw.ai/gateway/security)

---

## Lessons Learned

### 8.1 What Worked Well

1. **WebSocket Proxy Pattern**: Clean separation of concerns
2. **Custom Hook Pattern**: Reusable, testable chat logic
3. **Gateway as Source of Truth**: Eliminates sync issues
4. **Session-Based Architecture**: Natural conversation boundaries

### 8.2 Challenges Overcome

1. **Duplicate Messages**: Solved by filtering `state === 'final'` only
2. **Cross-Device Sync**: Solved by consistent session IDs
3. **Mobile Button Issues**: Solved by adding `type="button"` and touch handlers
4. **History Loading**: Solved by implementing `get_history` command

### 8.3 Recommended Patterns

1. **Always Use Dependency Arrays**: Prevents stale closures in React
2. **Gateway Events**: Handle `chat` events with `state === 'final'` only
3. **Session Consistency**: Use deterministic session IDs for cross-device sync
4. **Error Boundaries**: Always handle WebSocket errors with reconnection logic

---

## Future Enhancements

**Potential Improvements:**

1. **Typing Indicators**: Real-time "Emily is typing..." status
2. **File Attachments**: Support for images/documents in chat
3. **Voice Messages**: Audio recording and playback
4. **Command Autocomplete**: Suggest commands as user types
5. **Message Search**: Search through conversation history

---

## References

### OpenClaw Documentation

- [Gateway Protocol](https://docs.openclaw.ai/gateway/protocol)
- [WebChat Integration](https://docs.openclaw.ai/web/webchat)
- [Authentication & Security](https://docs.openclaw.ai/gateway/authentication)
- [Gateway Configuration](https://docs.openclaw.ai/gateway/configuration)

### Web Technologies

- [WebSocket API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Hooks - React Docs](https://react.dev/reference/react)
- [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)

### Best Practices

- [Custom React Hooks Patterns](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [WebSocket Reconnection Strategies](https://www.npmjs.com/package/reconnecting-websocket)
- [Mobile Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

---

## Conclusion

The chat widget implementation leverages OpenClaw's robust WebSocket infrastructure while adding a user-friendly web interface. The architecture ensures real-time synchronization, cross-device compatibility, and seamless integration with the existing Cashflow Manager application.

**Total Development Time:** ~8-12 hours  
**Lines of Code:** ~500 (frontend) + ~300 (backend modifications)  
**Key Dependencies:** React, WebSocket (native), OpenClaw Gateway

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Production Ready
