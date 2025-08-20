/**
 * Web Control Integration Tests
 * Tests the integration between WebServerService, WebSocketManager, and WebControlBridge
 */

import { WebServerService } from '../src/services/WebServerService';
import { WebSocketManager } from '../src/services/WebSocketManager';
import { WebControlBridge } from '../src/services/WebControlBridge';
import { AuthenticationMiddleware } from '../src/services/AuthenticationMiddleware';
import { EndpointConfig } from '../src/types';

// Mock external dependencies but allow internal integration
jest.mock('../src/services/BiometricService');
jest.mock('../src/services/BiometricAPIService');
jest.mock('../src/utils/ErrorHandler');
jest.mock('../src/utils/NetworkResilience');

describe('Web Control Integration', () => {
  let webServerService: WebServerService;
  let webSocketManager: WebSocketManager;
  let webControlBridge: WebControlBridge;
  let authMiddleware: AuthenticationMiddleware;

  beforeEach(() => {
    webServerService = new WebServerService();
    webSocketManager = new WebSocketManager();
    webControlBridge = new WebControlBridge();
    authMiddleware = new AuthenticationMiddleware();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await webServerService.stopServer();
      webSocketManager.shutdown();
    } catch (error) {
      // Ignore cleanup errors
    }
    // Clear any remaining timers
    jest.clearAllTimers();
  });

  describe('Server and WebSocket Integration', () => {
    test('should start server and initialize WebSocket manager together', async () => {
      const serverInfo = await webServerService.startServer();
      webSocketManager.initialize();

      expect(serverInfo.isRunning).toBe(true);
      expect(webSocketManager.getState().isActive).toBe(true);

      // Both should be running
      expect(webServerService.getServerStatus().isRunning).toBe(true);
      expect(webSocketManager.hasActiveConnections()).toBe(false); // No connections yet
    });

    test('should handle WebSocket connections through server', async () => {
      await webServerService.startServer();
      webSocketManager.initialize();

      // Mock WebSocket connection
      const mockSocket = {
        on: jest.fn(),
        write: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      // Simulate WebSocket upgrade request
      const mockRequest = {
        headers: {
          'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'upgrade': 'websocket',
          'connection': 'upgrade',
        },
      };

      await webSocketManager.handleUpgrade(mockSocket, mockRequest);
      const connectionId = webSocketManager.handleConnection(mockSocket);

      expect(connectionId).toBeDefined();
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 101 Switching Protocols')
      );
    });

    test('should broadcast messages to WebSocket clients', async () => {
      await webServerService.startServer();
      webSocketManager.initialize();

      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);

      // Broadcast a message
      webSocketManager.broadcast('operation-start', {
        operation: 'enroll',
        timestamp: new Date().toISOString(),
      });

      expect(mockSocket.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockSocket.send.mock.calls[1][0]); // Skip connection-established
      expect(sentMessage.type).toBe('operation-start');
      expect(sentMessage.data.operation).toBe('enroll');
    });

    test('should handle server shutdown and WebSocket cleanup', async () => {
      await webServerService.startServer();
      webSocketManager.initialize();

      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);

      // Shutdown both services
      await webServerService.stopServer();
      webSocketManager.shutdown();

      expect(webServerService.getServerStatus().isRunning).toBe(false);
      expect(webSocketManager.getState().isActive).toBe(false);
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });
  });

  describe('Authentication Integration', () => {
    test('should integrate authentication with server requests', async () => {
      const serverInfo = await webServerService.startServer();
      const credentials = webServerService.getAuthCredentials();

      expect(credentials).not.toBeNull();
      expect(credentials!.password).toBe(serverInfo.password);

      // Test authentication middleware directly
      authMiddleware.setCredentials(credentials!);

      const validRequest = createHttpRequestWithAuth(
        credentials!.username,
        credentials!.password
      );

      const authResult = authMiddleware.validateRequest(validRequest);
      expect(authResult.isValid).toBe(true);
      expect(authResult.statusCode).toBe(200);
    });

    test('should reject requests with invalid authentication', async () => {
      await webServerService.startServer();
      const credentials = webServerService.getAuthCredentials();

      authMiddleware.setCredentials(credentials!);

      const invalidRequest = createHttpRequestWithAuth('admin', 'wrongpassword');
      const authResult = authMiddleware.validateRequest(invalidRequest);

      expect(authResult.isValid).toBe(false);
      expect(authResult.statusCode).toBe(401);
      expect(authResult.body).toBe('Invalid credentials');
    });

    test('should handle authentication across server restart', async () => {
      // Start server first time
      const serverInfo1 = await webServerService.startServer();
      const credentials1 = webServerService.getAuthCredentials();

      // Stop and restart server
      await webServerService.stopServer();
      const serverInfo2 = await webServerService.startServer();
      const credentials2 = webServerService.getAuthCredentials();

      // Credentials should be different
      expect(credentials1!.password).not.toBe(credentials2!.password);
      expect(serverInfo1.password).not.toBe(serverInfo2.password);

      // Old credentials should not work with new server
      authMiddleware.setCredentials(credentials2!);
      const oldAuthRequest = createHttpRequestWithAuth(
        credentials1!.username,
        credentials1!.password
      );

      const authResult = authMiddleware.validateRequest(oldAuthRequest);
      expect(authResult.isValid).toBe(false);
    });
  });

  describe('Bridge and WebSocket Integration', () => {
    test('should broadcast operation status through WebSocket', async () => {
      webSocketManager.initialize();
      
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);

      // Set up bridge to broadcast operation updates
      const operationStatuses: any[] = [];
      webControlBridge.onOperationStatus((status) => {
        operationStatuses.push(status);
        // Simulate broadcasting to WebSocket clients
        webSocketManager.broadcast('operation-status', status);
      });

      // Mock successful operation
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      mockBiometricService.deleteKeys = jest.fn().mockResolvedValue({
        success: true,
        data: { message: 'Keys deleted' },
      });

      await webControlBridge.deleteKeys();

      expect(operationStatuses.length).toBeGreaterThan(0);
      expect(mockSocket.send).toHaveBeenCalled();

      // Check that operation status was broadcast
      const broadcastCalls = mockSocket.send.mock.calls;
      const operationStatusCall = broadcastCalls.find(call => {
        const message = JSON.parse(call[0]);
        return message.type === 'operation-status';
      });

      expect(operationStatusCall).toBeDefined();
    });

    test('should sync bridge state changes to WebSocket clients', () => {
      webSocketManager.initialize();
      
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);

      // Set up bridge state change listener
      webControlBridge.onStateChange((state) => {
        webSocketManager.broadcast('state-sync', {
          biometricStatus: state.biometricStatus,
          keysExist: state.keysExist,
          isLoading: state.isLoading,
        });
      });

      // Trigger state change
      webControlBridge.syncFromMobileApp({
        biometricStatus: { available: true, biometryType: 'FaceID' },
        keysExist: true,
      });

      expect(mockSocket.send).toHaveBeenCalled();

      const broadcastCalls = mockSocket.send.mock.calls;
      const stateSyncCall = broadcastCalls.find(call => {
        const message = JSON.parse(call[0]);
        return message.type === 'state-sync';
      });

      expect(stateSyncCall).toBeDefined();
      const syncMessage = JSON.parse(stateSyncCall![0]);
      expect(syncMessage.data.biometricStatus.available).toBe(true);
      expect(syncMessage.data.keysExist).toBe(true);
    });

    test('should broadcast log updates to WebSocket clients', async () => {
      webSocketManager.initialize();
      
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);

      // Set up bridge log listener
      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', log);
      });

      // Trigger log update
      await webControlBridge.updateConfiguration('enroll', {
        url: 'https://test.com',
        method: 'POST',
      });

      expect(mockSocket.send).toHaveBeenCalled();

      const broadcastCalls = mockSocket.send.mock.calls;
      const logUpdateCall = broadcastCalls.find(call => {
        const message = JSON.parse(call[0]);
        return message.type === 'log-update';
      });

      expect(logUpdateCall).toBeDefined();
      const logMessage = JSON.parse(logUpdateCall![0]);
      expect(logMessage.data.message).toContain('enroll endpoint configuration updated');
    });
  });

  describe('End-to-End Operation Flow', () => {
    test('should handle complete enrollment flow with WebSocket updates', async () => {
      // Start all services
      await webServerService.startServer();
      webSocketManager.initialize();

      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);

      // Set up bridge listeners to broadcast updates
      webControlBridge.onOperationStatus((status) => {
        webSocketManager.broadcast('operation-status', status);
      });

      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', log);
      });

      // Mock successful enrollment
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      const mockNetworkResilience = require('../src/utils/NetworkResilience').networkResilience;
      
      mockNetworkResilience.executeWithRetry = jest.fn().mockImplementation((fn) => fn());
      mockBiometricService.checkBiometricAvailability = jest.fn().mockResolvedValue({
        available: true,
        biometryType: 'TouchID',
      });
      mockBiometricService.checkKeysExist = jest.fn().mockResolvedValue(false);
      mockBiometricService.createKeys = jest.fn().mockResolvedValue({
        success: true,
        data: { publicKey: 'mock-public-key' },
      });

      // Initialize bridge
      await webControlBridge.initialize();

      // Execute enrollment
      const config: EndpointConfig = {
        url: '', // Local only
        method: 'POST',
      };

      const result = await webControlBridge.executeEnrollment(config);

      expect(result.success).toBe(true);
      expect(mockSocket.send).toHaveBeenCalled();

      // Verify WebSocket messages were sent
      const sendCalls = mockSocket.send.mock.calls;
      const messageTypes = sendCalls.map(call => {
        const message = JSON.parse(call[0]);
        return message.type;
      });

      expect(messageTypes).toContain('operation-status');
      expect(messageTypes).toContain('log-update');
    });

    test('should handle complete validation flow with error handling', async () => {
      // Start all services
      await webServerService.startServer();
      webSocketManager.initialize();

      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);

      // Set up bridge listeners
      webControlBridge.onOperationStatus((status) => {
        webSocketManager.broadcast('operation-status', status);
      });

      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', log);
      });

      // Mock validation failure (no keys)
      webControlBridge['state'].biometricStatus = { available: true, biometryType: 'TouchID' };
      webControlBridge['state'].keysExist = false; // No keys available

      const config: EndpointConfig = {
        url: 'https://api.example.com/validate',
        method: 'POST',
      };

      const result = await webControlBridge.executeValidation(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No biometric keys found');

      // Verify error was broadcast
      const sendCalls = mockSocket.send.mock.calls;
      const errorMessages = sendCalls.filter(call => {
        const message = JSON.parse(call[0]);
        return message.type === 'log-update' && message.data.status === 'error';
      });

      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle server errors and notify WebSocket clients', async () => {
      await webServerService.startServer();
      webSocketManager.initialize();

      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);

      // Simulate server error
      const server = (webServerService as any).server;
      server.emit('error', new Error('Network error'));

      // WebSocket should still be active
      expect(webSocketManager.getState().isActive).toBe(true);

      // Should be able to broadcast error information
      webSocketManager.broadcast('server-error', {
        message: 'Server encountered an error',
        timestamp: new Date().toISOString(),
      });

      expect(mockSocket.send).toHaveBeenCalled();
    });

    test('should handle WebSocket connection errors gracefully', async () => {
      await webServerService.startServer();
      webSocketManager.initialize();

      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      const connectionId = webSocketManager.handleConnection(mockSocket);
      expect(webSocketManager.getActiveConnectionCount()).toBe(1);

      // Simulate connection error
      mockSocket.emit('error', new Error('Connection lost'));

      expect(webSocketManager.getActiveConnectionCount()).toBe(0);

      // Server should still be running
      expect(webServerService.getServerStatus().isRunning).toBe(true);
    });

    test('should handle bridge operation errors and broadcast them', async () => {
      webSocketManager.initialize();

      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);

      // Set up error broadcasting
      webControlBridge.onOperationStatus((status) => {
        webSocketManager.broadcast('operation-status', status);
      });

      webControlBridge.onLogUpdate((log) => {
        if (log.status === 'error') {
          webSocketManager.broadcast('error-log', log);
        }
      });

      // Mock operation that will fail
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      mockBiometricService.deleteKeys = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      const result = await webControlBridge.deleteKeys();

      expect(result.success).toBe(false);
      expect(mockSocket.send).toHaveBeenCalled();

      // Check for error broadcasts
      const sendCalls = mockSocket.send.mock.calls;
      const errorBroadcasts = sendCalls.filter(call => {
        const message = JSON.parse(call[0]);
        return message.type === 'error-log' || 
               (message.type === 'operation-status' && !message.data.success);
      });

      expect(errorBroadcasts.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple WebSocket connections efficiently', async () => {
      await webServerService.startServer();
      webSocketManager.initialize();

      const mockSockets = [];
      const connectionIds = [];

      // Create multiple connections
      for (let i = 0; i < 10; i++) {
        const mockSocket = {
          on: jest.fn(),
          send: jest.fn(),
          close: jest.fn(),
          readyState: 1,
        };

        mockSockets.push(mockSocket);
        const connectionId = webSocketManager.handleConnection(mockSocket);
        connectionIds.push(connectionId);
      }

      expect(webSocketManager.getActiveConnectionCount()).toBe(10);

      // Broadcast message to all connections
      webSocketManager.broadcast('test-message', { data: 'test' });

      // All sockets should receive the message
      mockSockets.forEach(socket => {
        expect(socket.send).toHaveBeenCalled();
      });

      // Close half the connections
      for (let i = 0; i < 5; i++) {
        mockSockets[i].emit('close');
      }

      expect(webSocketManager.getActiveConnectionCount()).toBe(5);
    });

    test('should handle rapid message broadcasting', async () => {
      webSocketManager.initialize();

      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      webSocketManager.handleConnection(mockSocket);

      // Send many messages rapidly
      for (let i = 0; i < 100; i++) {
        webSocketManager.broadcast('rapid-message', { index: i });
      }

      expect(mockSocket.send).toHaveBeenCalledTimes(101); // 100 + connection-established
    });

    test('should handle message queue overflow gracefully', () => {
      webSocketManager.initialize();

      // Send messages without any connections (should queue)
      const maxQueueSize = (webSocketManager as any).MAX_MESSAGE_QUEUE_SIZE;
      
      for (let i = 0; i < maxQueueSize + 50; i++) {
        webSocketManager.broadcast('queued-message', { index: i });
      }

      const state = webSocketManager.getState();
      expect(state.messageQueue.length).toBe(maxQueueSize);

      // Should contain the most recent messages
      const lastMessage = state.messageQueue[state.messageQueue.length - 1];
      expect(lastMessage.data.index).toBe(maxQueueSize + 49);
    });
  });
});

// Helper function to create HTTP request with authentication
function createHttpRequestWithAuth(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  const encoded = Buffer.from(credentials).toString('base64');
  
  return [
    'GET / HTTP/1.1',
    'Host: localhost:8080',
    `Authorization: Basic ${encoded}`,
    '',
    '',
  ].join('\r\n');
}