import {
  WebSocketMessage,
  WebSocketConnection,
  WebSocketManagerState,
  WebSocketMessageType,
} from '../types';

/**
 * WebSocketManager handles real-time bidirectional communication between
 * the web interface and the mobile app. Manages connection lifecycle,
 * message broadcasting, and connection cleanup.
 */
export class WebSocketManager {
  private state: WebSocketManagerState = {
    isActive: false,
    connections: new Map(),
    messageQueue: [],
    stats: {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
    },
  };

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds
  private readonly MAX_MESSAGE_QUEUE_SIZE = 100;

  /**
   * Initializes the WebSocket manager
   */
  initialize(): void {
    if (this.state.isActive) {
      return;
    }

    this.state.isActive = true;
    this.startHeartbeat();
    console.log('WebSocketManager initialized');
  }

  /**
   * Shuts down the WebSocket manager and cleans up all connections
   */
  shutdown(): void {
    if (!this.state.isActive) {
      return;
    }

    this.state.isActive = false;
    this.stopHeartbeat();
    this.disconnectAllClients();
    this.clearMessageQueue();

    console.log('WebSocketManager shut down');
  }

  /**
   * Handles WebSocket upgrade request from HTTP
   * @param socket The TCP socket to upgrade
   * @param request The HTTP request containing WebSocket headers
   */
  async handleUpgrade(socket: any, request: any): Promise<void> {
    try {
      // Extract WebSocket key from headers
      const webSocketKey = request.headers['sec-websocket-key'];
      if (!webSocketKey) {
        throw new Error('Missing Sec-WebSocket-Key header');
      }

      // Generate WebSocket accept key
      const acceptKey = this.generateWebSocketAcceptKey(webSocketKey);

      // Send WebSocket handshake response
      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '',
        '',
      ].join('\r\n');

      socket.write(responseHeaders);

      // Handle the connection as WebSocket
      this.handleConnection(socket);
    } catch (error) {
      console.error('WebSocket upgrade failed:', error);
      throw error;
    }
  }

  /**
   * Handles a new WebSocket connection
   * @param socket The WebSocket connection
   * @param clientId Optional client identifier
   */
  handleConnection(socket: any, clientId?: string): string {
    const connectionId = clientId || this.generateConnectionId();

    const connection: WebSocketConnection = {
      id: connectionId,
      socket,
      isAlive: true,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    // Set up socket event handlers
    this.setupSocketHandlers(connection);

    // Add to connections map
    this.state.connections.set(connectionId, connection);
    this.state.stats.totalConnections++;
    this.state.stats.activeConnections++;

    // Send connection established message
    this.sendToClient(connectionId, {
      type: 'connection-established',
      timestamp: new Date().toISOString(),
      data: {
        clientId: connectionId,
        serverTime: new Date().toISOString(),
      },
    });

    console.log(`WebSocket client connected: ${connectionId}`);
    return connectionId;
  }

  /**
   * Broadcasts a message to all connected clients
   * @param event The event type
   * @param data The data to broadcast
   * @param operationId Optional operation identifier
   */
  broadcast(
    event: WebSocketMessageType,
    data: any,
    operationId?: string,
  ): void {
    const message: WebSocketMessage = {
      type: event,
      timestamp: new Date().toISOString(),
      data,
      operationId,
    };

    this.sendToAll(message);
  }

  /**
   * Sends a message to all connected clients
   * @param message The message to send
   */
  sendToAll(message: WebSocketMessage): void {
    if (!this.state.isActive) {
      this.queueMessage(message);
      return;
    }

    const activeConnections = Array.from(
      this.state.connections.values(),
    ).filter(conn => conn.isAlive);

    if (activeConnections.length === 0) {
      this.queueMessage(message);
      return;
    }

    activeConnections.forEach(connection => {
      this.sendToConnection(connection, message);
    });

    this.state.stats.messagesSent += activeConnections.length;
  }

  /**
   * Sends a message to a specific client
   * @param clientId The client identifier
   * @param message The message to send
   */
  sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const connection = this.state.connections.get(clientId);

    if (!connection || !connection.isAlive) {
      return false;
    }

    this.sendToConnection(connection, message);
    this.state.stats.messagesSent++;
    return true;
  }

  /**
   * Gets the current manager state
   */
  getState(): WebSocketManagerState {
    return {
      ...this.state,
      connections: new Map(this.state.connections),
      messageQueue: [...this.state.messageQueue],
      stats: { ...this.state.stats },
    };
  }

  /**
   * Gets the number of active connections
   */
  getActiveConnectionCount(): number {
    return this.state.stats.activeConnections;
  }

  /**
   * Checks if there are any active connections
   */
  hasActiveConnections(): boolean {
    return this.state.stats.activeConnections > 0;
  }

  /**
   * Disconnects a specific client
   * @param clientId The client identifier
   */
  disconnectClient(clientId: string): boolean {
    const connection = this.state.connections.get(clientId);

    if (!connection) {
      return false;
    }

    this.closeConnection(connection);
    return true;
  }

  /**
   * Sets up event handlers for a WebSocket connection
   */
  private setupSocketHandlers(connection: WebSocketConnection): void {
    const { socket } = connection;

    // Handle incoming messages
    socket.on('message', (data: any) => {
      try {
        const message = this.parseMessage(data);
        this.handleIncomingMessage(connection, message);
      } catch (error) {
        console.error(
          `Error parsing WebSocket message from ${connection.id}:`,
          error,
        );
      }
    });

    // Handle connection close
    socket.on('close', () => {
      this.handleConnectionClose(connection);
    });

    // Handle connection errors
    socket.on('error', (error: any) => {
      console.error(`WebSocket error for client ${connection.id}:`, error);
      this.handleConnectionError(connection, error);
    });

    // Handle pong responses for heartbeat
    socket.on('pong', () => {
      connection.isAlive = true;
      connection.lastActivity = new Date();
    });
  }

  /**
   * Handles incoming messages from clients
   */
  private handleIncomingMessage(
    connection: WebSocketConnection,
    message: WebSocketMessage,
  ): void {
    connection.lastActivity = new Date();
    this.state.stats.messagesReceived++;

    // Handle ping messages
    if (message.type === 'ping') {
      this.sendToConnection(connection, {
        type: 'pong',
        timestamp: new Date().toISOString(),
        data: { clientId: connection.id },
      });
      return;
    }

    // Log received message for debugging
    console.log(
      `Received WebSocket message from ${connection.id}:`,
      message.type,
    );
  }

  /**
   * Handles connection close events
   */
  private handleConnectionClose(connection: WebSocketConnection): void {
    this.removeConnection(connection.id);
    console.log(`WebSocket client disconnected: ${connection.id}`);
  }

  /**
   * Handles connection error events
   */
  private handleConnectionError(
    connection: WebSocketConnection,
    error: any,
  ): void {
    console.error(`WebSocket connection error for ${connection.id}:`, error);
    this.removeConnection(connection.id);
  }

  /**
   * Sends a message to a specific connection
   */
  private sendToConnection(
    connection: WebSocketConnection,
    message: WebSocketMessage,
  ): void {
    try {
      const messageString = JSON.stringify(message);
      connection.socket.send(messageString);
      connection.lastActivity = new Date();
    } catch (error) {
      console.error(`Error sending message to client ${connection.id}:`, error);
      this.handleConnectionError(connection, error);
    }
  }

  /**
   * Parses incoming message data
   */
  private parseMessage(data: any): WebSocketMessage {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }

    // Handle Buffer-like objects (React Native may use different buffer implementations)
    if (data && typeof data.toString === 'function') {
      return JSON.parse(data.toString());
    }

    throw new Error('Invalid message format');
  }

  /**
   * Removes a connection from the manager
   */
  private removeConnection(connectionId: string): void {
    const connection = this.state.connections.get(connectionId);

    if (connection) {
      connection.isAlive = false;
      this.state.connections.delete(connectionId);
      this.state.stats.activeConnections--;
    }
  }

  /**
   * Closes a connection and cleans up resources
   */
  private closeConnection(connection: WebSocketConnection): void {
    try {
      connection.socket.close();
    } catch (error) {
      console.error(`Error closing connection ${connection.id}:`, error);
    }

    this.removeConnection(connection.id);
  }

  /**
   * Disconnects all clients
   */
  private disconnectAllClients(): void {
    const connections = Array.from(this.state.connections.values());

    connections.forEach(connection => {
      this.closeConnection(connection);
    });

    this.state.connections.clear();
    this.state.stats.activeConnections = 0;
  }

  /**
   * Starts the heartbeat mechanism to detect dead connections
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stops the heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Performs heartbeat check on all connections
   */
  private performHeartbeat(): void {
    const now = new Date();
    const connectionsToRemove: string[] = [];

    this.state.connections.forEach((connection, connectionId) => {
      const timeSinceLastActivity =
        now.getTime() - connection.lastActivity.getTime();

      if (timeSinceLastActivity > this.CONNECTION_TIMEOUT) {
        connectionsToRemove.push(connectionId);
        return;
      }

      // Send ping to check if connection is alive
      try {
        connection.socket.ping();
        connection.isAlive = false; // Will be set to true when pong is received
      } catch (error) {
        connectionsToRemove.push(connectionId);
      }
    });

    // Remove dead connections
    connectionsToRemove.forEach(connectionId => {
      const connection = this.state.connections.get(connectionId);
      if (connection) {
        console.log(`Removing dead connection: ${connectionId}`);
        this.closeConnection(connection);
      }
    });
  }

  /**
   * Queues a message when no active connections are available
   */
  private queueMessage(message: WebSocketMessage): void {
    if (this.state.messageQueue.length >= this.MAX_MESSAGE_QUEUE_SIZE) {
      this.state.messageQueue.shift(); // Remove oldest message
    }

    this.state.messageQueue.push(message);
  }

  /**
   * Clears the message queue
   */
  private clearMessageQueue(): void {
    this.state.messageQueue = [];
  }

  /**
   * Generates a unique connection identifier
   */
  private generateConnectionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ws_${timestamp}_${random}`;
  }

  /**
   * Generates WebSocket accept key for handshake
   * React Native compatible implementation without Node.js crypto
   */
  private generateWebSocketAcceptKey(webSocketKey: string): string {
    const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    const concatenated = webSocketKey + WEBSOCKET_MAGIC_STRING;
    
    // Simple SHA-1 implementation for React Native
    const sha1Hash = this.sha1(concatenated);
    return this.base64Encode(sha1Hash);
  }

  /**
   * Simple SHA-1 implementation for React Native compatibility
   */
  private sha1(str: string): number[] {
    // Convert string to UTF-8 bytes
    const utf8Bytes = this.stringToUtf8Bytes(str);
    
    // Pad the message
    const paddedBytes = this.padMessage(utf8Bytes);
    
    // Initialize hash values (SHA-1 initial values)
    let h0 = 0x67452301;
    let h1 = 0xEFCDAB89;
    let h2 = 0x98BADCFE;
    let h3 = 0x10325476;
    let h4 = 0xC3D2E1F0;
    
    // Process message in 512-bit (64-byte) chunks
    for (let i = 0; i < paddedBytes.length; i += 64) {
      const chunk = paddedBytes.slice(i, i + 64);
      const w = new Array(80);
      
      // Break chunk into sixteen 32-bit big-endian words
      for (let j = 0; j < 16; j++) {
        w[j] = (chunk[j * 4] << 24) | (chunk[j * 4 + 1] << 16) | 
               (chunk[j * 4 + 2] << 8) | chunk[j * 4 + 3];
        // Ensure 32-bit unsigned
        w[j] = w[j] >>> 0;
      }
      
      // Extend the sixteen 32-bit words into eighty 32-bit words
      for (let j = 16; j < 80; j++) {
        w[j] = this.leftRotate(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      }
      
      // Initialize hash value for this chunk
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      
      // Main loop
      for (let j = 0; j < 80; j++) {
        let f, k;
        if (j < 20) {
          f = (b & c) | ((~b) & d);
          k = 0x5A827999;
        } else if (j < 40) {
          f = b ^ c ^ d;
          k = 0x6ED9EBA1;
        } else if (j < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8F1BBCDC;
        } else {
          f = b ^ c ^ d;
          k = 0xCA62C1D6;
        }
        
        // Ensure all operations are 32-bit unsigned
        f = f >>> 0;
        const temp = (this.leftRotate(a, 5) + f + e + k + w[j]) >>> 0;
        e = d;
        d = c;
        c = this.leftRotate(b, 30);
        b = a;
        a = temp;
      }
      
      // Add this chunk's hash to result so far (32-bit unsigned arithmetic)
      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
    }
    
    // Convert hash values to bytes (big-endian)
    const result = [];
    [h0, h1, h2, h3, h4].forEach(h => {
      result.push((h >>> 24) & 0xFF);
      result.push((h >>> 16) & 0xFF);
      result.push((h >>> 8) & 0xFF);
      result.push(h & 0xFF);
    });
    
    return result;
  }

  /**
   * Convert string to UTF-8 bytes
   */
  private stringToUtf8Bytes(str: string): number[] {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xC0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3F));
      } else if (code < 0x10000) {
        bytes.push(0xE0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3F));
        bytes.push(0x80 | (code & 0x3F));
      } else {
        bytes.push(0xF0 | (code >> 18));
        bytes.push(0x80 | ((code >> 12) & 0x3F));
        bytes.push(0x80 | ((code >> 6) & 0x3F));
        bytes.push(0x80 | (code & 0x3F));
      }
    }
    return bytes;
  }

  /**
   * Pad message according to SHA-1 specification
   */
  private padMessage(bytes: number[]): number[] {
    const originalLength = bytes.length;
    const bitLength = originalLength * 8;
    
    // Make a copy to avoid modifying the original
    const paddedBytes = [...bytes];
    
    // Append the '1' bit (plus zero padding to make it a byte)
    paddedBytes.push(0x80);
    
    // Append zeros until message length ≡ 448 (mod 512) bits, or 56 (mod 64) bytes
    while ((paddedBytes.length % 64) !== 56) {
      paddedBytes.push(0);
    }
    
    // Append original length as 64-bit big-endian integer
    // JavaScript numbers are limited to 53 bits, so we handle this carefully
    const high32 = Math.floor(bitLength / 0x100000000);
    const low32 = bitLength & 0xFFFFFFFF;
    
    // High 32 bits (big-endian)
    paddedBytes.push((high32 >>> 24) & 0xFF);
    paddedBytes.push((high32 >>> 16) & 0xFF);
    paddedBytes.push((high32 >>> 8) & 0xFF);
    paddedBytes.push(high32 & 0xFF);
    
    // Low 32 bits (big-endian)
    paddedBytes.push((low32 >>> 24) & 0xFF);
    paddedBytes.push((low32 >>> 16) & 0xFF);
    paddedBytes.push((low32 >>> 8) & 0xFF);
    paddedBytes.push(low32 & 0xFF);
    
    return paddedBytes;
  }

  /**
   * Left rotate operation for SHA-1 (32-bit)
   */
  private leftRotate(value: number, amount: number): number {
    return ((value << amount) | (value >>> (32 - amount))) >>> 0;
  }

  /**
   * Base64 encode bytes array
   */
  private base64Encode(bytes: number[]): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i];
      const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i + 1 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i + 2 < bytes.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  }

  /**
   * Sends queued messages to newly connected clients
   */
  private sendQueuedMessages(connection: WebSocketConnection): void {
    if (this.state.messageQueue.length === 0) {
      return;
    }

    // Send recent messages to the new connection
    const recentMessages = this.state.messageQueue.slice(-10); // Last 10 messages

    recentMessages.forEach(message => {
      this.sendToConnection(connection, message);
    });
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();
