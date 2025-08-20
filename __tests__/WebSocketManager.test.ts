/**
 * WebSocketManager Unit Tests
 * Tests WebSocket connection management, message broadcasting, and real-time communication
 */

import { WebSocketManager } from '../src/services/WebSocketManager';
import { WebSocketMessage, WebSocketMessageType } from '../src/types';

// Mock dependencies
jest.mock('../src/utils/ErrorHandler');
jest.mock('../src/utils/NetworkResilience');

// Mock WebSocket implementation for testing
class MockWebSocket {
  private handlers: { [event: string]: Function[] } = {};
  public readyState = 1; // OPEN
  public isAlive = true;

  on(event: string, handler: Function) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  send(data: string) {
    // Mock send implementation
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }

  ping() {
    if (this.readyState === 1 && this.isAlive) {
      setTimeout(() => this.emit('pong'), 10);
    } else {
      throw new Error('Connection is dead');
    }
  }

  setTimeout(timeout: number, callback: Function) {
    setTimeout(callback, timeout);
  }

  emit(event: string, data?: any) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => handler(data));
    }
  }

  // Helper method to simulate message reception
  receiveMessage(message: WebSocketMessage) {
    this.emit('message', JSON.stringify(message));
  }
}

describe('WebSocketManager', () => {
  let webSocketManager: WebSocketManager;
  let mockSocket: MockWebSocket;

  beforeEach(() => {
    webSocketManager = new WebSocketManager();
    mockSocket = new MockWebSocket();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Ensure proper cleanup of WebSocket manager
    if (webSocketManager.getState().isActive) {
      webSocketManager.shutdown();
    }
    
    // Clear all timers
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Clear mock socket references
    mockSocket = null as any;
  });

  describe('Initialization and Shutdown', () => {
    test('should initialize successfully', () => {
      expect(webSocketManager.getState().isActive).toBe(false);
      
      webSocketManager.initialize();
      
      expect(webSocketManager.getState().isActive).toBe(true);
    });

    test('should shutdown successfully', () => {
      webSocketManager.initialize();
      expect(webSocketManager.getState().isActive).toBe(true);
      
      webSocketManager.shutdown();
      
      expect(webSocketManager.getState().isActive).toBe(false);
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });

    test('should not initialize twice', () => {
      webSocketManager.initialize();
      const firstState = webSocketManager.getState();
      
      webSocketManager.initialize();
      const secondState = webSocketManager.getState();
      
      expect(firstState.isActive).toBe(secondState.isActive);
    });

    test('should handle shutdown when not active', () => {
      expect(() => webSocketManager.shutdown()).not.toThrow();
    });

    test('should clear all connections on shutdown', () => {
      webSocketManager.initialize();
      webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      webSocketManager.shutdown();
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
      expect(webSocketManager.getState().connections.size).toBe(0);
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should handle new connections', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      
      expect(connectionId).toBeDefined();
      expect(typeof connectionId).toBe('string');
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      const state = webSocketManager.getState();
      expect(state.stats.totalConnections).toBe(1);
      expect(state.stats.activeConnections).toBe(1);
    });

    test('should handle connection with custom client ID', () => {
      const customId = 'test-client-123';
      const connectionId = webSocketManager.handleConnection(mockSocket, customId);
      
      expect(connectionId).toBe(customId);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
    });

    test('should generate unique connection IDs', () => {
      const ids = new Set();
      
      for (let i = 0; i < 100; i++) {
        const mockSocket = new MockWebSocket();
        const id = webSocketManager.handleConnection(mockSocket);
        ids.add(id);
      }
      
      expect(ids.size).toBe(100); // All should be unique
    });

    test('should disconnect specific client', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      const result = webSocketManager.disconnectClient(connectionId);
      
      expect(result).toBe(true);
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });

    test('should return false when disconnecting non-existent client', () => {
      const result = webSocketManager.disconnectClient('non-existent-id');
      expect(result).toBe(false);
    });

    test('should handle connection close events', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      mockSocket.emit('close');
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });

    test('should handle connection error events', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      mockSocket.emit('error', new Error('Connection error'));
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });

    test('should reject connections when shutting down', () => {
      webSocketManager.initialize();
      (webSocketManager as any).isShuttingDown = true;
      
      expect(() => webSocketManager.handleConnection(mockSocket))
        .toThrow('WebSocket manager is shutting down');
    });
  });

  describe('Message Broadcasting', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should broadcast messages to all connected clients', () => {
      const sendSpy = jest.spyOn(mockSocket, 'send');
      webSocketManager.handleConnection(mockSocket);
      
      webSocketManager.broadcast('operation-start', { operation: 'test' });
      
      expect(sendSpy).toHaveBeenCalled();
      const calls = sendSpy.mock.calls;
      const broadcastCall = calls.find(call => {
        const message = JSON.parse(call[0]);
        return message.type === 'operation-start';
      });
      
      expect(broadcastCall).toBeDefined();
      const message = JSON.parse(broadcastCall![0]);
      expect(message.data.operation).toBe('test');
    });

    test('should send message to specific client', () => {
      const sendSpy = jest.spyOn(mockSocket, 'send');
      const connectionId = webSocketManager.handleConnection(mockSocket);
      
      const message: WebSocketMessage = {
        type: 'log-update',
        timestamp: new Date().toISOString(),
        data: { log: 'test log entry' },
      };
      
      const result = webSocketManager.sendToClient(connectionId, message);
      
      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(message));
    });

    test('should return false when sending to non-existent client', () => {
      const message: WebSocketMessage = {
        type: 'log-update',
        timestamp: new Date().toISOString(),
        data: { log: 'test log entry' },
      };
      
      const result = webSocketManager.sendToClient('non-existent-id', message);
      
      expect(result).toBe(false);
    });

    test('should queue messages when no active connections', () => {
      webSocketManager.broadcast('operation-complete', { result: 'success' });
      
      const state = webSocketManager.getState();
      expect(state.messageQueue.length).toBe(1);
      expect(state.messageQueue[0].type).toBe('operation-complete');
    });

    test('should send queued messages to new connections', () => {
      // Queue a message when no connections
      webSocketManager.broadcast('operation-complete', { result: 'success' });
      
      const sendSpy = jest.spyOn(mockSocket, 'send');
      webSocketManager.handleConnection(mockSocket);
      
      // Should send connection-established message and queued messages
      expect(sendSpy).toHaveBeenCalledTimes(2);
      
      const calls = sendSpy.mock.calls;
      const queuedCall = calls.find(call => {
        const message = JSON.parse(call[0]);
        return message.type === 'operation-complete';
      });
      
      expect(queuedCall).toBeDefined();
    });

    test('should limit message queue size', () => {
      const maxSize = (webSocketManager as any).MAX_MESSAGE_QUEUE_SIZE;
      
      // Send more messages than the limit
      for (let i = 0; i < maxSize + 10; i++) {
        webSocketManager.broadcast('test-message', { index: i });
      }
      
      const state = webSocketManager.getState();
      expect(state.messageQueue.length).toBe(maxSize);
      
      // Should contain the most recent messages
      const lastMessage = state.messageQueue[state.messageQueue.length - 1];
      expect(lastMessage.data.index).toBe(maxSize + 9);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should handle ping messages with pong response', () => {
      const sendSpy = jest.spyOn(mockSocket, 'send');
      const connectionId = webSocketManager.handleConnection(mockSocket);
      
      const pingMessage: WebSocketMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        data: {},
      };
      
      mockSocket.receiveMessage(pingMessage);
      
      const calls = sendSpy.mock.calls;
      const pongCall = calls.find(call => {
        const message = JSON.parse(call[0]);
        return message.type === 'pong';
      });
      
      expect(pongCall).toBeDefined();
      const pongMessage = JSON.parse(pongCall![0]);
      expect(pongMessage.data.clientId).toBe(connectionId);
    });

    test('should update message statistics', () => {
      webSocketManager.handleConnection(mockSocket);
      const initialStats = webSocketManager.getState().stats;
      
      webSocketManager.broadcast('state-sync', { state: 'updated' });
      
      const updatedStats = webSocketManager.getState().stats;
      expect(updatedStats.messagesSent).toBeGreaterThan(initialStats.messagesSent);
    });

    test('should update received message statistics', () => {
      webSocketManager.handleConnection(mockSocket);
      const initialStats = webSocketManager.getState().stats;
      
      const testMessage: WebSocketMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        data: {},
      };
      
      mockSocket.receiveMessage(testMessage);
      
      const updatedStats = webSocketManager.getState().stats;
      expect(updatedStats.messagesReceived).toBeGreaterThan(initialStats.messagesReceived);
    });

    test('should handle invalid message format gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      webSocketManager.handleConnection(mockSocket);
      
      mockSocket.emit('message', 'invalid-json');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should update connection activity on message receipt', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      const connection = webSocketManager.getState().connections.get(connectionId);
      const initialActivity = connection!.lastActivity;
      
      // Wait a bit to ensure timestamp difference
      jest.advanceTimersByTime(100);
      
      const testMessage: WebSocketMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        data: {},
      };
      
      mockSocket.receiveMessage(testMessage);
      
      const updatedConnection = webSocketManager.getState().connections.get(connectionId);
      expect(updatedConnection!.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());
    });
  });

  describe('Heartbeat and Connection Health', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should start heartbeat on initialization', () => {
      expect((webSocketManager as any).heartbeatInterval).toBeDefined();
    });

    test('should stop heartbeat on shutdown', () => {
      const heartbeatInterval = (webSocketManager as any).heartbeatInterval;
      expect(heartbeatInterval).toBeDefined();
      
      webSocketManager.shutdown();
      
      expect((webSocketManager as any).heartbeatInterval).toBeNull();
    });

    test('should perform heartbeat checks', () => {
      const pingSpy = jest.spyOn(mockSocket, 'ping');
      webSocketManager.handleConnection(mockSocket);
      
      // Advance time to trigger heartbeat
      jest.advanceTimersByTime(30000);
      
      expect(pingSpy).toHaveBeenCalled();
    });

    test('should remove dead connections during heartbeat', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      // Make connection appear dead
      mockSocket.isAlive = false;
      mockSocket.ping = jest.fn().mockImplementation(() => {
        throw new Error('Connection dead');
      });
      
      // Advance time to trigger heartbeat
      jest.advanceTimersByTime(30000);
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });

    test('should handle connection timeout', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      const connection = webSocketManager.getState().connections.get(connectionId);
      
      // Set last activity to old timestamp
      connection!.lastActivity = new Date(Date.now() - 70000); // 70 seconds ago
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      // Advance time to trigger heartbeat
      jest.advanceTimersByTime(30000);
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });
  });

  describe('WebSocket Upgrade Handling', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should handle WebSocket upgrade request', async () => {
      const mockSocket = {
        write: jest.fn(),
      };
      
      const mockRequest = {
        headers: {
          'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
        },
      };
      
      await webSocketManager.handleUpgrade(mockSocket, mockRequest);
      
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 101 Switching Protocols')
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade: websocket')
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('Sec-WebSocket-Accept:')
      );
    });

    test('should reject upgrade without WebSocket key', async () => {
      const mockSocket = {
        write: jest.fn(),
      };
      
      const mockRequest = {
        headers: {},
      };
      
      await expect(webSocketManager.handleUpgrade(mockSocket, mockRequest))
        .rejects.toThrow('Missing Sec-WebSocket-Key header');
    });

    test('should reject upgrade when shutting down', async () => {
      (webSocketManager as any).isShuttingDown = true;
      
      const mockSocket = {
        write: jest.fn(),
      };
      
      const mockRequest = {
        headers: {
          'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
        },
      };
      
      await expect(webSocketManager.handleUpgrade(mockSocket, mockRequest))
        .rejects.toThrow('WebSocket manager is shutting down');
    });
  });

  describe('State Management', () => {
    test('should return current state', () => {
      const state = webSocketManager.getState();
      
      expect(state).toHaveProperty('isActive');
      expect(state).toHaveProperty('connections');
      expect(state).toHaveProperty('messageQueue');
      expect(state).toHaveProperty('stats');
      
      expect(state.connections).toBeInstanceOf(Map);
      expect(Array.isArray(state.messageQueue)).toBe(true);
      expect(typeof state.stats).toBe('object');
    });

    test('should return immutable state copy', () => {
      webSocketManager.initialize();
      const state1 = webSocketManager.getState();
      const state2 = webSocketManager.getState();
      
      expect(state1).not.toBe(state2); // Different objects
      expect(state1.connections).not.toBe(state2.connections); // Different Map instances
      expect(state1.messageQueue).not.toBe(state2.messageQueue); // Different arrays
    });

    test('should check for active connections', () => {
      webSocketManager.initialize();
      
      expect(webSocketManager.hasActiveConnections()).toBe(false);
      
      webSocketManager.handleConnection(mockSocket);
      
      expect(webSocketManager.hasActiveConnections()).toBe(true);
    });

    test('should track connection statistics accurately', () => {
      webSocketManager.initialize();
      const initialStats = webSocketManager.getState().stats;
      
      expect(initialStats.totalConnections).toBe(0);
      expect(initialStats.activeConnections).toBe(0);
      expect(initialStats.messagesSent).toBe(0);
      expect(initialStats.messagesReceived).toBe(0);
      
      // Add connections
      webSocketManager.handleConnection(mockSocket);
      const mockSocket2 = new MockWebSocket();
      webSocketManager.handleConnection(mockSocket2);
      
      const updatedStats = webSocketManager.getState().stats;
      expect(updatedStats.totalConnections).toBe(2);
      expect(updatedStats.activeConnections).toBe(2);
      
      // Close one connection
      mockSocket.emit('close');
      
      const finalStats = webSocketManager.getState().stats;
      expect(finalStats.totalConnections).toBe(2); // Total doesn't decrease
      expect(finalStats.activeConnections).toBe(1); // Active decreases
    });
  });

  describe('Network Resilience', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should handle network disconnection', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      const connection = webSocketManager.getState().connections.get(connectionId);
      
      expect(connection!.isAlive).toBe(true);
      
      // Simulate network disconnection
      const handleNetworkDisconnection = (webSocketManager as any).handleNetworkDisconnection;
      handleNetworkDisconnection();
      
      const updatedConnection = webSocketManager.getState().connections.get(connectionId);
      expect(updatedConnection!.isAlive).toBe(false);
    });

    test('should attempt connection restoration on network reconnection', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      
      // Mark connection as dead
      const connection = webSocketManager.getState().connections.get(connectionId);
      connection!.isAlive = false;
      
      const pingSpy = jest.spyOn(mockSocket, 'ping');
      
      // Simulate network reconnection
      const handleNetworkReconnection = (webSocketManager as any).handleNetworkReconnection;
      handleNetworkReconnection();
      
      expect(pingSpy).toHaveBeenCalled();
    });

    test('should remove connections after max reconnection attempts', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      // Mark connection as dead and make ping fail
      const connection = webSocketManager.getState().connections.get(connectionId);
      connection!.isAlive = false;
      mockSocket.ping = jest.fn().mockImplementation(() => {
        throw new Error('Connection dead');
      });
      
      // Attempt restoration multiple times
      const attemptConnectionRestore = (webSocketManager as any).attemptConnectionRestore;
      for (let i = 0; i < 4; i++) { // More than MAX_RECONNECTION_ATTEMPTS (3)
        attemptConnectionRestore(connection);
      }
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should handle connection errors gracefully', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      mockSocket.emit('error', new Error('Connection error'));
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });

    test('should handle send errors gracefully', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      
      // Make send throw error
      mockSocket.send = jest.fn().mockImplementation(() => {
        throw new Error('Send failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = webSocketManager.sendToClient(connectionId, {
        type: 'test-message',
        timestamp: new Date().toISOString(),
        data: {},
      });
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      expect(webSocketManager.getActiveConnectionCount()).toBe(0); // Connection should be removed
      
      consoleSpy.mockRestore();
    });

    test('should handle ping errors during heartbeat', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      // Make ping throw error
      mockSocket.ping = jest.fn().mockImplementation(() => {
        throw new Error('Ping failed');
      });
      
      // Advance time to trigger heartbeat
      jest.advanceTimersByTime(30000);
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });
  });

  describe('WebSocket Protocol Implementation', () => {
    test('should generate correct WebSocket accept key', () => {
      const generateWebSocketAcceptKey = (webSocketManager as any).generateWebSocketAcceptKey;
      const testKey = 'dGhlIHNhbXBsZSBub25jZQ==';
      const acceptKey = generateWebSocketAcceptKey(testKey);
      
      // Expected result for the test key
      expect(acceptKey).toBe('s3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
    });

    test('should implement SHA-1 correctly', () => {
      const sha1 = (webSocketManager as any).sha1;
      const result = sha1('hello');
      
      // SHA-1 of "hello" should be specific bytes
      expect(result).toHaveLength(20); // SHA-1 produces 20 bytes
      expect(Array.isArray(result)).toBe(true);
      expect(result.every((byte: number) => byte >= 0 && byte <= 255)).toBe(true);
    });

    test('should implement base64 encoding correctly', () => {
      const base64Encode = (webSocketManager as any).base64Encode;
      const testBytes = [72, 101, 108, 108, 111]; // "Hello" in ASCII
      const result = base64Encode(testBytes);
      
      expect(result).toBe('SGVsbG8=');
    });

    test('should handle UTF-8 string conversion', () => {
      const stringToUtf8Bytes = (webSocketManager as any).stringToUtf8Bytes;
      
      // Test ASCII string
      const asciiResult = stringToUtf8Bytes('Hello');
      expect(asciiResult).toEqual([72, 101, 108, 108, 111]);
      
      // Test UTF-8 string with special characters
      const utf8Result = stringToUtf8Bytes('café');
      expect(utf8Result).toEqual([99, 97, 102, 195, 169]); // 'é' is encoded as [195, 169]
    });
  });
});