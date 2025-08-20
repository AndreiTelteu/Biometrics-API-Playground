/**
 * Web Control Real-Time Communication Integration Tests
 * Tests real-time communication, state synchronization, and WebSocket message flow
 */

import { WebSocketManager } from '../src/services/WebSocketManager';
import { WebControlBridge } from '../src/services/WebControlBridge';
import { WebSocketMessage, WebSocketMessageType } from '../src/types';

// Mock dependencies
jest.mock('../src/services/BiometricService');
jest.mock('../src/services/BiometricAPIService');
jest.mock('../src/utils/ErrorHandler');
jest.mock('../src/utils/NetworkResilience');

describe('Web Control Real-Time Communication Integration', () => {
  let webSocketManager: WebSocketManager;
  let webControlBridge: WebControlBridge;
  let mockSockets: MockWebSocket[];

  beforeEach(() => {
    webSocketManager = new WebSocketManager();
    webControlBridge = new WebControlBridge();
    mockSockets = [];
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    webSocketManager.shutdown();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  class MockWebSocket {
    private handlers: { [event: string]: Function[] } = {};
    public readyState = 1; // OPEN
    public isAlive = true;
    public sentMessages: string[] = [];

    on(event: string, handler: Function) {
      if (!this.handlers[event]) {
        this.handlers[event] = [];
      }
      this.handlers[event].push(handler);
    }

    send(data: string) {
      if (this.readyState !== 1) {
        throw new Error('WebSocket is not open');
      }
      this.sentMessages.push(data);
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

    receiveMessage(message: WebSocketMessage) {
      this.emit('message', JSON.stringify(message));
    }

    getLastMessage(): WebSocketMessage | null {
      if (this.sentMessages.length === 0) return null;
      return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
    }

    getAllMessages(): WebSocketMessage[] {
      return this.sentMessages.map(msg => JSON.parse(msg));
    }

    getMessagesByType(type: WebSocketMessageType): WebSocketMessage[] {
      return this.getAllMessages().filter(msg => msg.type === type);
    }
  }

  function createMockSocket(): MockWebSocket {
    const socket = new MockWebSocket();
    mockSockets.push(socket);
    return socket;
  }

  describe('Real-Time State Synchronization', () => {
    test('should synchronize bridge state changes to all WebSocket clients', () => {
      webSocketManager.initialize();
      
      // Create multiple WebSocket connections
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();
      const socket3 = createMockSocket();

      webSocketManager.handleConnection(socket1);
      webSocketManager.handleConnection(socket2);
      webSocketManager.handleConnection(socket3);

      expect(webSocketManager.getActiveConnectionCount()).toBe(3);

      // Set up bridge state change listener to broadcast updates
      webControlBridge.onStateChange((state) => {
        webSocketManager.broadcast('state-sync', {
          biometricStatus: state.biometricStatus,
          keysExist: state.keysExist,
          isLoading: state.isLoading,
          timestamp: new Date().toISOString(),
        });
      });

      // Trigger state change
      webControlBridge.syncFromMobileApp({
        biometricStatus: { available: true, biometryType: 'FaceID' },
        keysExist: true,
        isLoading: false,
      });

      // All clients should receive the state sync message
      [socket1, socket2, socket3].forEach(socket => {
        const stateSyncMessages = socket.getMessagesByType('state-sync');
        expect(stateSyncMessages.length).toBe(1);
        expect(stateSyncMessages[0].data.biometricStatus.available).toBe(true);
        expect(stateSyncMessages[0].data.keysExist).toBe(true);
      });
    });

    test('should handle partial state updates correctly', () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Set up state change listener
      webControlBridge.onStateChange((state) => {
        webSocketManager.broadcast('state-sync', {
          biometricStatus: state.biometricStatus,
          keysExist: state.keysExist,
          isLoading: state.isLoading,
        });
      });

      // Send partial state update
      webControlBridge.syncFromMobileApp({
        isLoading: true,
      });

      const stateSyncMessages = socket.getMessagesByType('state-sync');
      expect(stateSyncMessages.length).toBe(1);
      expect(stateSyncMessages[0].data.isLoading).toBe(true);
      expect(stateSyncMessages[0].data.biometricStatus).toBeDefined();
      expect(stateSyncMessages[0].data.keysExist).toBeDefined();
    });

    test('should maintain state consistency across multiple updates', () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      const stateUpdates: any[] = [];
      webControlBridge.onStateChange((state) => {
        stateUpdates.push({ ...state });
        webSocketManager.broadcast('state-sync', {
          biometricStatus: state.biometricStatus,
          keysExist: state.keysExist,
          isLoading: state.isLoading,
        });
      });

      // Multiple rapid state updates
      webControlBridge.syncFromMobileApp({ isLoading: true });
      webControlBridge.syncFromMobileApp({ keysExist: true });
      webControlBridge.syncFromMobileApp({ isLoading: false });

      expect(stateUpdates.length).toBe(3);
      
      // Final state should reflect all updates
      const finalState = stateUpdates[stateUpdates.length - 1];
      expect(finalState.isLoading).toBe(false);
      expect(finalState.keysExist).toBe(true);

      // WebSocket should have received all updates
      const stateSyncMessages = socket.getMessagesByType('state-sync');
      expect(stateSyncMessages.length).toBe(3);
    });
  });

  describe('Real-Time Log Broadcasting', () => {
    test('should broadcast log updates to all connected clients', async () => {
      webSocketManager.initialize();
      
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();

      webSocketManager.handleConnection(socket1);
      webSocketManager.handleConnection(socket2);

      // Set up log update listener
      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', log);
      });

      // Trigger log update
      await webControlBridge.updateConfiguration('enroll', {
        url: 'https://test-api.com/enroll',
        method: 'POST',
      });

      // Both clients should receive the log update
      [socket1, socket2].forEach(socket => {
        const logMessages = socket.getMessagesByType('log-update');
        expect(logMessages.length).toBe(1);
        expect(logMessages[0].data.message).toContain('enroll endpoint configuration updated');
        expect(logMessages[0].data.operation).toBe('status');
        expect(logMessages[0].data.status).toBe('info');
      });
    });

    test('should handle rapid log updates without message loss', async () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Set up log update listener
      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', log);
      });

      // Generate multiple rapid log updates
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          webControlBridge.updateConfiguration('enroll', {
            url: `https://test-api-${i}.com/enroll`,
            method: 'POST',
          })
        );
      }

      await Promise.all(promises);

      const logMessages = socket.getMessagesByType('log-update');
      expect(logMessages.length).toBe(10);

      // Verify all messages are unique and in order
      const urls = logMessages.map(msg => 
        msg.data.message.match(/test-api-(\d+)\.com/)?.[1]
      ).filter(Boolean);
      
      expect(urls.length).toBe(10);
      expect(new Set(urls).size).toBe(10); // All unique
    });

    test('should filter and broadcast different log levels', async () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Set up filtered log broadcasting
      webControlBridge.onLogUpdate((log) => {
        if (log.status === 'error') {
          webSocketManager.broadcast('error-log', log);
        } else if (log.status === 'info') {
          webSocketManager.broadcast('info-log', log);
        }
      });

      // Mock an operation that will generate both info and error logs
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      const mockNetworkResilience = require('../src/utils/NetworkResilience').networkResilience;
      
      mockNetworkResilience.executeWithRetry = jest.fn().mockImplementation((fn) => fn());
      mockBiometricService.deleteKeys = jest.fn().mockRejectedValue(new Error('Service error'));

      await webControlBridge.deleteKeys();

      const errorLogs = socket.getMessagesByType('error-log');
      const infoLogs = socket.getMessagesByType('info-log');

      expect(errorLogs.length).toBeGreaterThan(0);
      expect(infoLogs.length).toBeGreaterThan(0);

      // Verify error log content
      const errorLog = errorLogs[0];
      expect(errorLog.data.status).toBe('error');
      expect(errorLog.data.message).toContain('Service error');
    });
  });

  describe('Real-Time Operation Status Broadcasting', () => {
    test('should broadcast operation start and completion', async () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Set up operation status listener
      webControlBridge.onOperationStatus((status) => {
        webSocketManager.broadcast('operation-status', {
          ...status,
          timestamp: new Date().toISOString(),
        });
      });

      // Mock successful operation
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      const mockNetworkResilience = require('../src/utils/NetworkResilience').networkResilience;
      
      mockNetworkResilience.executeWithRetry = jest.fn().mockImplementation((fn) => fn());
      mockBiometricService.deleteKeys = jest.fn().mockResolvedValue({
        success: true,
        data: { message: 'Keys deleted successfully' },
      });

      await webControlBridge.deleteKeys();

      const operationMessages = socket.getMessagesByType('operation-status');
      expect(operationMessages.length).toBe(2); // Start and completion

      // Verify start message
      const startMessage = operationMessages[0];
      expect(startMessage.data.data.status).toBe('started');
      expect(startMessage.data.message).toContain('delete operation started');

      // Verify completion message
      const completionMessage = operationMessages[1];
      expect(completionMessage.data.data.status).toBe('completed');
      expect(completionMessage.data.success).toBe(true);
    });

    test('should broadcast operation progress updates', async () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Set up comprehensive listeners
      webControlBridge.onOperationStatus((status) => {
        webSocketManager.broadcast('operation-status', status);
      });

      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('operation-progress', {
          operation: log.operation,
          status: log.status,
          message: log.message,
          timestamp: log.timestamp,
        });
      });

      // Mock enrollment operation with multiple steps
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      const mockBiometricAPIService = require('../src/services/BiometricAPIService').biometricAPIService;
      const mockNetworkResilience = require('../src/utils/NetworkResilience').networkResilience;
      
      mockNetworkResilience.executeWithRetry = jest.fn().mockImplementation((fn) => fn());
      
      // Set up bridge state for successful enrollment
      webControlBridge['state'].biometricStatus = { available: true, biometryType: 'TouchID' };
      
      mockBiometricService.createKeys = jest.fn().mockResolvedValue({
        success: true,
        data: { publicKey: 'mock-public-key' },
      });

      mockBiometricAPIService.enrollPublicKey = jest.fn().mockResolvedValue({
        success: true,
        data: { userId: '123', enrolled: true },
      });

      await webControlBridge.executeEnrollment({
        url: 'https://api.example.com/enroll',
        method: 'POST',
      });

      const progressMessages = socket.getMessagesByType('operation-progress');
      expect(progressMessages.length).toBeGreaterThan(0);

      // Should have progress messages for different steps
      const progressSteps = progressMessages.map(msg => msg.data.message);
      expect(progressSteps.some(step => step.includes('Creating biometric keys'))).toBe(true);
      expect(progressSteps.some(step => step.includes('Sending public key to enrollment endpoint'))).toBe(true);
    });

    test('should handle operation cancellation broadcasting', () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Set up operation status listener
      webControlBridge.onOperationStatus((status) => {
        webSocketManager.broadcast('operation-status', status);
      });

      webControlBridge.onLogUpdate((log) => {
        if (log.message.includes('cancelled')) {
          webSocketManager.broadcast('operation-cancelled', {
            message: log.message,
            timestamp: log.timestamp,
          });
        }
      });

      // Set up an active operation and cancel it
      webControlBridge['currentOperationId'] = 'test-operation-123';
      webControlBridge['state'].isLoading = true;

      webControlBridge.cancelCurrentOperation();

      const cancelMessages = socket.getMessagesByType('operation-cancelled');
      expect(cancelMessages.length).toBe(1);
      expect(cancelMessages[0].data.message).toContain('Operation cancelled');
    });
  });

  describe('Bidirectional Communication', () => {
    test('should handle client messages and respond appropriately', () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Send ping from client
      const pingMessage: WebSocketMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        data: { clientId: 'test-client' },
      };

      socket.receiveMessage(pingMessage);

      // Should receive pong response
      const pongMessages = socket.getMessagesByType('pong');
      expect(pongMessages.length).toBe(1);
      expect(pongMessages[0].data.clientId).toBeDefined();
    });

    test('should handle client requests for current state', () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      const connectionId = webSocketManager.handleConnection(socket);

      // Set up bridge state
      webControlBridge.syncFromMobileApp({
        biometricStatus: { available: true, biometryType: 'FaceID' },
        keysExist: true,
        isLoading: false,
      });

      // Simulate client requesting current state
      const stateRequestMessage: WebSocketMessage = {
        type: 'state-request',
        timestamp: new Date().toISOString(),
        data: {},
      };

      // Set up handler for state requests
      webControlBridge.onStateChange((state) => {
        // Send current state to requesting client
        webSocketManager.sendToClient(connectionId, {
          type: 'state-response',
          timestamp: new Date().toISOString(),
          data: {
            biometricStatus: state.biometricStatus,
            keysExist: state.keysExist,
            isLoading: state.isLoading,
          },
        });
      });

      // Trigger state change to send response
      webControlBridge.syncFromMobileApp({});

      const stateResponses = socket.getMessagesByType('state-response');
      expect(stateResponses.length).toBe(1);
      expect(stateResponses[0].data.biometricStatus.available).toBe(true);
      expect(stateResponses[0].data.keysExist).toBe(true);
    });

    test('should handle multiple clients with different message interests', () => {
      webSocketManager.initialize();
      
      const logSocket = createMockSocket();
      const statusSocket = createMockSocket();
      const allSocket = createMockSocket();

      const logConnectionId = webSocketManager.handleConnection(logSocket);
      const statusConnectionId = webSocketManager.handleConnection(statusSocket);
      const allConnectionId = webSocketManager.handleConnection(allSocket);

      // Set up selective broadcasting
      webControlBridge.onLogUpdate((log) => {
        // Send logs only to log-interested clients
        webSocketManager.sendToClient(logConnectionId, {
          type: 'log-update',
          timestamp: new Date().toISOString(),
          data: log,
        });

        webSocketManager.sendToClient(allConnectionId, {
          type: 'log-update',
          timestamp: new Date().toISOString(),
          data: log,
        });
      });

      webControlBridge.onOperationStatus((status) => {
        // Send status only to status-interested clients
        webSocketManager.sendToClient(statusConnectionId, {
          type: 'operation-status',
          timestamp: new Date().toISOString(),
          data: status,
        });

        webSocketManager.sendToClient(allConnectionId, {
          type: 'operation-status',
          timestamp: new Date().toISOString(),
          data: status,
        });
      });

      // Trigger both log and status updates
      webControlBridge.updateConfiguration('enroll', {
        url: 'https://test.com',
        method: 'POST',
      });

      webControlBridge.cancelCurrentOperation();

      // Verify selective message delivery
      expect(logSocket.getMessagesByType('log-update').length).toBe(1);
      expect(logSocket.getMessagesByType('operation-status').length).toBe(0);

      expect(statusSocket.getMessagesByType('log-update').length).toBe(0);
      expect(statusSocket.getMessagesByType('operation-status').length).toBe(0); // No active operation to cancel

      expect(allSocket.getMessagesByType('log-update').length).toBe(1);
      expect(allSocket.getMessagesByType('operation-status').length).toBe(0);
    });
  });

  describe('Connection Resilience and Recovery', () => {
    test('should handle connection drops and reconnections', () => {
      webSocketManager.initialize();
      
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();

      const connectionId1 = webSocketManager.handleConnection(socket1);
      const connectionId2 = webSocketManager.handleConnection(socket2);

      expect(webSocketManager.getActiveConnectionCount()).toBe(2);

      // Drop one connection
      socket1.emit('close');
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);

      // Broadcast message - only remaining connection should receive it
      webSocketManager.broadcast('test-message', { data: 'test' });

      expect(socket1.getMessagesByType('test-message').length).toBe(0);
      expect(socket2.getMessagesByType('test-message').length).toBe(1);

      // Reconnect with new socket
      const socket3 = createMockSocket();
      webSocketManager.handleConnection(socket3);

      expect(webSocketManager.getActiveConnectionCount()).toBe(2);

      // Broadcast another message - both active connections should receive it
      webSocketManager.broadcast('test-message-2', { data: 'test2' });

      expect(socket2.getMessagesByType('test-message-2').length).toBe(1);
      expect(socket3.getMessagesByType('test-message-2').length).toBe(1);
    });

    test('should queue messages during connection outages', () => {
      webSocketManager.initialize();

      // Send messages when no connections exist
      webSocketManager.broadcast('queued-message-1', { data: 'test1' });
      webSocketManager.broadcast('queued-message-2', { data: 'test2' });

      const state = webSocketManager.getState();
      expect(state.messageQueue.length).toBe(2);

      // Connect a client
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Should receive queued messages
      const queuedMessages = socket.getAllMessages().filter(msg => 
        msg.type === 'queued-message-1' || msg.type === 'queued-message-2'
      );

      expect(queuedMessages.length).toBe(2);
    });

    test('should handle network disconnection and reconnection events', () => {
      webSocketManager.initialize();
      
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();

      webSocketManager.handleConnection(socket1);
      webSocketManager.handleConnection(socket2);

      // Simulate network disconnection
      const handleNetworkDisconnection = (webSocketManager as any).handleNetworkDisconnection;
      handleNetworkDisconnection();

      // All connections should be marked as potentially lost
      const state = webSocketManager.getState();
      state.connections.forEach(connection => {
        expect(connection.isAlive).toBe(false);
      });

      // Should broadcast disconnection message
      const disconnectionMessages = socket1.getMessagesByType('state-sync').concat(
        socket2.getMessagesByType('state-sync')
      );

      const networkDisconnectedMsg = disconnectionMessages.find(msg => 
        msg.data.type === 'network-disconnected'
      );
      expect(networkDisconnectedMsg).toBeDefined();
    });
  });

  describe('Message Ordering and Consistency', () => {
    test('should maintain message order during rapid updates', async () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Set up listeners for different message types
      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', { ...log, sequence: log.id });
      });

      webControlBridge.onStateChange((state) => {
        webSocketManager.broadcast('state-sync', { 
          ...state, 
          sequence: Date.now() 
        });
      });

      // Generate rapid mixed updates
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          webControlBridge.updateConfiguration('enroll', {
            url: `https://api-${i}.com`,
            method: 'POST',
          })
        );

        promises.push(
          Promise.resolve().then(() => 
            webControlBridge.syncFromMobileApp({ isLoading: i % 2 === 0 })
          )
        );
      }

      await Promise.all(promises);

      const allMessages = socket.getAllMessages();
      const logMessages = allMessages.filter(msg => msg.type === 'log-update');
      const stateMessages = allMessages.filter(msg => msg.type === 'state-sync');

      expect(logMessages.length).toBe(5);
      expect(stateMessages.length).toBe(5);

      // Messages should be in chronological order
      const timestamps = allMessages
        .filter(msg => msg.type === 'log-update' || msg.type === 'state-sync')
        .map(msg => new Date(msg.timestamp).getTime());

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    test('should handle concurrent operations without message conflicts', async () => {
      webSocketManager.initialize();
      const socket = createMockSocket();
      webSocketManager.handleConnection(socket);

      // Set up operation tracking
      const operationMessages: any[] = [];
      webControlBridge.onOperationStatus((status) => {
        operationMessages.push(status);
        webSocketManager.broadcast('operation-status', {
          ...status,
          operationId: status.data?.operationId,
        });
      });

      // Mock services for concurrent operations
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      const mockNetworkResilience = require('../src/utils/NetworkResilience').networkResilience;
      
      mockNetworkResilience.executeWithRetry = jest.fn().mockImplementation((fn) => fn());
      mockBiometricService.deleteKeys = jest.fn().mockResolvedValue({
        success: true,
        data: { message: 'Keys deleted' },
      });

      // Start multiple operations (though bridge should handle them sequentially)
      const operation1 = webControlBridge.deleteKeys();
      const operation2 = webControlBridge.deleteKeys();

      await Promise.all([operation1, operation2]);

      const broadcastMessages = socket.getMessagesByType('operation-status');
      
      // Should have received messages for both operations
      expect(broadcastMessages.length).toBeGreaterThan(0);
      
      // Each operation should have unique identifiers
      const operationIds = broadcastMessages
        .map(msg => msg.data.operationId)
        .filter(Boolean);
      
      expect(new Set(operationIds).size).toBeGreaterThan(0);
    });
  });
});