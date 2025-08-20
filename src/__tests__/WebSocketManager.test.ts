import { WebSocketManager } from '../services/WebSocketManager';
import { WebSocketMessage, WebSocketMessageType } from '../types';

// Mock WebSocket implementation for testing
class MockWebSocket {
  private handlers: { [event: string]: Function[] } = {};
  public readyState = 1; // OPEN

  on(event: string, handler: Function) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  send(data: string) {
    // Mock send implementation
    console.log('Mock WebSocket send:', data);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }

  ping() {
    // Mock ping implementation
    setTimeout(() => this.emit('pong'), 10);
  }

  emit(event: string, data?: any) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => handler(data));
    }
  }
}

describe('WebSocketManager', () => {
  let webSocketManager: WebSocketManager;
  let mockSocket: MockWebSocket;

  beforeEach(() => {
    webSocketManager = new WebSocketManager();
    mockSocket = new MockWebSocket();
    jest.clearAllMocks();
  });

  afterEach(() => {
    webSocketManager.shutdown();
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
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should handle new connections', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      
      expect(connectionId).toBeDefined();
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
      const sentMessage = JSON.parse(sendSpy.mock.calls[1][0]); // Skip connection-established message
      expect(sentMessage.type).toBe('operation-start');
      expect(sentMessage.data.operation).toBe('test');
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
      expect(sendSpy).toHaveBeenCalledTimes(2); // connection-established + our message
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
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should handle ping messages with pong response', () => {
      const sendSpy = jest.spyOn(mockSocket, 'send');
      webSocketManager.handleConnection(mockSocket);
      
      const pingMessage: WebSocketMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        data: {},
      };
      
      mockSocket.emit('message', JSON.stringify(pingMessage));
      
      expect(sendSpy).toHaveBeenCalledTimes(2); // connection-established + pong
      const pongMessage = JSON.parse(sendSpy.mock.calls[1][0]);
      expect(pongMessage.type).toBe('pong');
    });

    test('should update message statistics', () => {
      webSocketManager.handleConnection(mockSocket);
      const initialStats = webSocketManager.getState().stats;
      
      webSocketManager.broadcast('state-sync', { state: 'updated' });
      
      const updatedStats = webSocketManager.getState().stats;
      expect(updatedStats.messagesSent).toBeGreaterThan(initialStats.messagesSent);
    });
  });

  describe('State Management', () => {
    test('should return current state', () => {
      const state = webSocketManager.getState();
      
      expect(state).toHaveProperty('isActive');
      expect(state).toHaveProperty('connections');
      expect(state).toHaveProperty('messageQueue');
      expect(state).toHaveProperty('stats');
    });

    test('should check for active connections', () => {
      webSocketManager.initialize();
      
      expect(webSocketManager.hasActiveConnections()).toBe(false);
      
      webSocketManager.handleConnection(mockSocket);
      
      expect(webSocketManager.hasActiveConnections()).toBe(true);
    });

    test('should track connection statistics', () => {
      webSocketManager.initialize();
      const initialStats = webSocketManager.getState().stats;
      
      expect(initialStats.totalConnections).toBe(0);
      expect(initialStats.activeConnections).toBe(0);
      
      webSocketManager.handleConnection(mockSocket);
      const updatedStats = webSocketManager.getState().stats;
      
      expect(updatedStats.totalConnections).toBe(1);
      expect(updatedStats.activeConnections).toBe(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      webSocketManager.initialize();
    });

    test('should handle connection errors', () => {
      const connectionId = webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      
      mockSocket.emit('error', new Error('Connection error'));
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });

    test('should handle invalid message format', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      webSocketManager.handleConnection(mockSocket);
      
      mockSocket.emit('message', 'invalid-json');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});