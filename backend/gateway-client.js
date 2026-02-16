const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

/**
 * OpenClaw Gateway Client
 * Manages WebSocket connection to OpenClaw gateway and proxies messages
 */
class GatewayClient {
  constructor() {
    this.gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
    this.gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    this.ws = null;
    this.connected = false;
    this.authenticated = false;
    this.messageHandlers = new Map();
    this.pendingResponses = new Map();
    this.sessionClients = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageId = 0;
    this.challengeNonce = null;
    this.connectResolve = null;
  }

  getNextMessageId() {
    this.messageId++;
    return `msg-${this.messageId}`;
  }

  async connect() {
    if (this.connected && this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`[Gateway] Connecting to ${this.gatewayUrl}...`);
        this.connectResolve = resolve;
        
        this.ws = new WebSocket(this.gatewayUrl, [], {
          headers: {
            'Origin': 'http://127.0.0.1:3001'
          }
        });

        this.ws.on('open', () => {
          console.log('[Gateway] WebSocket connected, waiting for challenge...');
          this.connected = true;
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleGatewayMessage(message);
          } catch (error) {
            console.error('[Gateway] Error parsing message:', error);
          }
        });

        this.ws.on('error', (error) => {
          console.error('[Gateway] WebSocket error:', error.message);
          if (this.connectResolve) {
            this.connectResolve = null;
            reject(error);
          }
        });

        this.ws.on('close', (code, reason) => {
          console.log(`[Gateway] Connection closed (code: ${code}, reason: ${reason})`);
          this.connected = false;
          this.authenticated = false;
          this.challengeNonce = null;
          this.connectResolve = null;
          this.attemptReconnect();
        });

      } catch (error) {
        console.error('[Gateway] Connection error:', error);
        reject(error);
      }
    });
  }

  handleGatewayMessage(message) {
    // Handle challenge
    if (message.type === 'event' && message.event === 'connect.challenge') {
      console.log('[Gateway] Received challenge');
      this.challengeNonce = message.payload?.nonce;
      this.sendConnectRequest();
      return;
    }

    // Handle successful authentication
    if (message.type === 'res' && message.ok === true && message.payload?.type === 'hello-ok') {
      console.log('[Gateway] Successfully authenticated');
      this.authenticated = true;
      this.reconnectAttempts = 0;
      if (this.connectResolve) {
        this.connectResolve(true);
        this.connectResolve = null;
      }
      return;
    }

    // Handle authentication error
    if (message.type === 'res' && message.ok === false) {
      console.error('[Gateway] Authentication failed:', message.error);
      this.ws?.close();
      return;
    }
    
    // Handle chat messages - broadcast to ALL connected web clients
    if (message.type === 'event' && message.event === 'chat') {
      // Only broadcast final messages, not delta (streaming) updates
      if (message.payload?.state !== 'final') {
        return;
      }

      // Extract text from the message structure
      // Format: { message: { content: [{ type: "text", text: "..." }] } }
      let text = null;
      const msg = message.payload?.message;
      
      if (msg && msg.content) {
        // Handle array of content blocks
        if (Array.isArray(msg.content)) {
          text = msg.content
            .filter(block => block.type === 'text' && block.text)
            .map(block => block.text)
            .join('');
        } else if (typeof msg.content === 'string') {
          text = msg.content;
        }
      }
      
      console.log('[Gateway] Extracted chat text:', text?.substring(0, 100));
      
      // Broadcast to all clients
      if (text) {
        this.broadcastToAll({
          type: 'message',
          sender: 'emily',
          content: text,
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    // Handle chat stream - broadcast to ALL connected web clients
    // if (message.type === 'event' && message.event === 'chat.stream') {
    //   // Handle stream chunks - same structure
    //   const msg = message.payload?.message;
    //   let chunk = null;
      
    //   if (msg && msg.content) {
    //     if (Array.isArray(msg.content)) {
    //       chunk = msg.content
    //         .filter(block => block.type === 'text' && block.text)
    //         .map(block => block.text)
    //         .join('');
    //     } else if (typeof msg.content === 'string') {
    //       chunk = msg.content;
    //     }
    //   }
      
    //   if (chunk) {
    //     this.broadcastToAll({
    //       type: 'stream',
    //       sender: 'emily',
    //       chunk: chunk,
    //       timestamp: new Date().toISOString()
    //     });
    //   }
    //   return;
    // }

    // Handle ping
    if (message.type === 'event' && message.event === 'ping') {
      this.ws.send(JSON.stringify({
        type: 'req',
        id: this.getNextMessageId(),
        method: 'ping',
        params: {}
      }));
      return;
    }

    // Handle responses to pending requests
    if (message.id && this.pendingResponses.has(message.id)) {
      const { resolve, reject } = this.pendingResponses.get(message.id);
      this.pendingResponses.delete(message.id);
      
      if (message.ok === false) {
        reject(new Error(message.error?.message || 'Request failed'));
      } else {
        resolve(message.payload);
      }
    }
  }

  sendConnectRequest() {
    const connectFrame = {
      type: 'req',
      id: this.getNextMessageId(),
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
        role: 'operator',
        scopes: ['operator.admin'],
        auth: {
          token: this.gatewayToken
        }
      }
    };

    console.log('[Gateway] Sending connect request...');
    this.ws.send(JSON.stringify(connectFrame));
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Gateway] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[Gateway] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        // Error handled in connect method
      });
    }, delay);
  }

  registerClient(sessionKey, clientWs) {
    if (!this.sessionClients.has(sessionKey)) {
      this.sessionClients.set(sessionKey, new Set());
    }
    this.sessionClients.get(sessionKey).add(clientWs);
  }

  unregisterClient(sessionKey, clientWs) {
    if (this.sessionClients.has(sessionKey)) {
      this.sessionClients.get(sessionKey).delete(clientWs);
      
      if (this.sessionClients.get(sessionKey).size === 0) {
        this.sessionClients.delete(sessionKey);
      }
    }
  }

  broadcastToSession(sessionKey, message) {
    const clients = this.sessionClients.get(sessionKey);
    if (clients) {
      const messageStr = JSON.stringify(message);
      clients.forEach(clientWs => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(messageStr);
        }
      });
    }
  }

  // Broadcast to ALL connected clients (not session-specific)
  broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    this.sessionClients.forEach((clients) => {
      clients.forEach(clientWs => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(messageStr);
        }
      });
    });
    console.log('[Gateway] Broadcast to all clients:', message.content?.substring(0, 50));
  }

  async sendChatMessage(sessionKey, message, clientWs) {
    await this.connect();

    const messageId = this.getNextMessageId();
    
    const chatFrame = {
      type: 'req',
      id: messageId,
      method: 'chat.send',
      params: {
        sessionKey: sessionKey,
        message: message,
        idempotencyKey: uuidv4()
      }
    };

    return new Promise((resolve, reject) => {
      this.pendingResponses.set(messageId, { resolve, reject });
      
      setTimeout(() => {
        if (this.pendingResponses.has(messageId)) {
          this.pendingResponses.delete(messageId);
          reject(new Error('Gateway response timeout'));
        }
      }, 30000);

      this.ws.send(JSON.stringify(chatFrame));
      resolve({ messageId });
    });
  }

  async getChatHistory(sessionKey, limit = 50) {
    await this.connect();

    const messageId = this.getNextMessageId();
    
    const historyFrame = {
      type: 'req',
      id: messageId,
      method: 'chat.history',
      params: {
        sessionKey: sessionKey,
        limit: limit
      }
    };

    return new Promise((resolve, reject) => {
      this.pendingResponses.set(messageId, { resolve, reject });
      
      setTimeout(() => {
        if (this.pendingResponses.has(messageId)) {
          this.pendingResponses.delete(messageId);
          reject(new Error('Gateway response timeout'));
        }
      }, 10000);

      this.ws.send(JSON.stringify(historyFrame));
    });
  }

  isConnected() {
    return this.connected && this.authenticated && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
      this.authenticated = false;
    }
  }
}

module.exports = new GatewayClient();
