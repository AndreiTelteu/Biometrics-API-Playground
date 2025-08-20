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
