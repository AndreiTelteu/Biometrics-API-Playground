/**
 * Web Control End-to-End Integration Tests
 * Tests complete workflows from HTTP request to WebSocket response
 */

import { WebServerService } from '../src/services/WebServerService';
import { WebSocketManager } from '../src/services/WebSocketManager';
import { WebControlBridge } from '../src/services/WebControlBridge';
import { AuthenticationMiddleware } from '../src/services/AuthenticationMiddleware';
import { EndpointConfig } from '../src/types';

// Mock external dependencies
jest.mock('../src/services/BiometricService');
jest.mock('../src/services/BiometricAPIService');
jest.mock('../src/utils/ErrorHandler');
jest.mock('../src/utils/NetworkResilience');

describe('Web Control End-to-End Integration', () => {
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
    jest.useFakeTimers();
  });

  afterEach(async () => {
    try {
      await webServerService.stopServer();
      webSocketManager.shutdown();
    } catch (error) {
      // Ignore cleanup errors
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  class MockWebSocketClient {
    private handlers: { [event: string]: Function[] } = {};
    public readyState = 1;
    public sentMessages: string[] = [];
    public receivedMessages: any[] = [];

    on(event: string, handler: Function) {
      if (!this.handlers[event]) {
        this.handlers[event] = [];
      }
      this.handlers[event].push(handler);
    }

    send(data: string) {
      this.sentMessages.push(data);
    }

    close() {
      this.readyState = 3;
      this.emit('close');
    }

    ping() {
      setTimeout(() => this.emit('pong'), 10);
    }

    setTimeout(timeout: number, callback: Function) {
      setTimeout(callback, timeout);
    }

    emit(event: string, data?: any) {
      if (this.handlers[event]) {
        this.handlers[event].forEach(handler => handler(data));
      }
    }

    receiveMessage(message: any) {
      this.receivedMessages.push(message);
      this.emit('message', JSON.stringify(message));
    }

    getLastMessage() {
      if (this.sentMessages.length === 0) return null;
      return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
    }

    getAllMessages() {
      return this.sentMessages.map(msg => JSON.parse(msg));
    }

    getMessagesByType(type: string) {
      return this.getAllMessages().filter(msg => msg.type === type);
    }
  }

  describe('Complete Web Control Workflow', () => {
    test('should handle complete enrollment workflow with real-time updates', async () => {
      // Setup all services
      await webServerService.startServer();
      webSocketManager.initialize();
      
      const credentials = webServerService.getAuthCredentials();
      authMiddleware.setCredentials(credentials!);

      // Setup WebSocket client
      const wsClient = new MockWebSocketClient();
      const connectionId = webSocketManager.handleConnection(wsClient);

      // Setup bridge listeners for real-time updates
      webControlBridge.onOperationStatus((status) => {
        webSocketManager.broadcast('operation-status', status);
      });

      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', log);
      });

      webControlBridge.onStateChange((state) => {
        webSocketManager.broadcast('state-sync', {
          biometricStatus: state.biometricStatus,
          keysExist: state.keysExist,
          isLoading: state.isLoading,
        });
      });

      // Mock successful biometric services
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      const mockBiometricAPIService = require('../src/services/BiometricAPIService').biometricAPIService;
      const mockNetworkResilience = require('../src/utils/NetworkResilience').networkResilience;
      
      mockNetworkResilience.executeWithRetry = jest.fn().mockImplementation((fn) => fn());
      
      mockBiometricService.checkBiometricAvailability = jest.fn().mockResolvedValue({
        available: true,
        biometryType: 'TouchID',
      });
      
      mockBiometricService.checkKeysExist = jest.fn().mockResolvedValue(false);
      
      mockBiometricService.createKeys = jest.fn().mockResolvedValue({
        success: true,
        data: { publicKey: 'mock-public-key-12345' },
      });

      mockBiometricAPIService.enrollPublicKey = jest.fn().mockResolvedValue({
        success: true,
        data: { userId: 'user-123', enrolled: true },
      });

      // Initialize bridge
      await webControlBridge.initialize();

      // Simulate HTTP enrollment request
      const enrollConfig: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' },
      };

      // Execute enrollment
      const enrollmentResult = await webControlBridge.executeEnrollment(enrollConfig);

      // Verify enrollment success
      expect(enrollmentResult.success).toBe(true);
      expect(enrollmentResult.data.publicKey).toBe('mock-public-key-12345');
      expect(enrollmentResult.data.backendResponse.userId).toBe('user-123');

      // Verify WebSocket messages were sent
      const allMessages = wsClient.getAllMessages();
      expect(allMessages.length).toBeGreaterThan(0);

      // Check for specific message types
      const operationStatusMessages = wsClient.getMessagesByType('operation-status');
      const logUpdateMessages = wsClient.getMessagesByType('log-update');
      const stateSyncMessages = wsClient.getMessagesByType('state-sync');

      expect(operationStatusMessages.length).toBeGreaterThan(0);
      expect(logUpdateMessages.length).toBeGreaterThan(0);
      expect(stateSyncMessages.length).toBeGreaterThan(0);

      // Verify operation status progression
      const startMessage = operationStatusMessages.find(msg => 
        msg.data.data?.status === 'started'
      );
      const completeMessage = operationStatusMessages.find(msg => 
        msg.data.data?.status === 'completed'
      );

      expect(startMessage).toBeDefined();
      expect(completeMessage).toBeDefined();
      expect(completeMessage.data.success).toBe(true);

      // Verify state synchronization
      const finalStateSync = stateSyncMessages[stateSyncMessages.length - 1];
      expect(finalStateSync.data.keysExist).toBe(true);
      expect(finalStateSync.data.isLoading).toBe(false);
    });

    test('should handle validation workflow with error scenarios', async () => {
      // Setup services
      await webServerService.startServer();
      webSocketManager.initialize();

      const wsClient = new MockWebSocketClient();
      webSocketManager.handleConnection(wsClient);

      // Setup bridge listeners
      webControlBridge.onOperationStatus((status) => {
        webSocketManager.broadcast('operation-status', status);
      });

      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', log);
      });

      // Mock validation failure scenario (no keys exist)
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      const mockNetworkResilience = require('../src/utils/NetworkResilience').networkResilience;
      
      mockNetworkResilience.executeWithRetry = jest.fn().mockImplementation((fn) => fn());
      
      // Set bridge state to simulate no keys available
      webControlBridge['state'].biometricStatus = { available: true, biometryType: 'TouchID' };
      webControlBridge['state'].keysExist = false;

      const validateConfig: EndpointConfig = {
        url: 'https://api.example.com/validate',
        method: 'POST',
      };

      // Execute validation (should fail)
      const validationResult = await webControlBridge.executeValidation(validateConfig);

      // Verify validation failure
      expect(validationResult.success).toBe(false);
      expect(validationResult.message).toContain('No biometric keys found');

      // Verify error was broadcast via WebSocket
      const operationStatusMessages = wsClient.getMessagesByType('operation-status');
      const logUpdateMessages = wsClient.getMessagesByType('log-update');

      expect(operationStatusMessages.length).toBeGreaterThan(0);
      expect(logUpdateMessages.length).toBeGreaterThan(0);

      // Check for error messages
      const errorLogs = logUpdateMessages.filter(msg => 
        msg.data.status === 'error'
      );
      expect(errorLogs.length).toBeGreaterThan(0);

      const failedOperation = operationStatusMessages.find(msg => 
        msg.data.success === false
      );
      expect(failedOperation).toBeDefined();
    });

    test('should handle HTTP API requests with authentication', async () => {
      // Start server
      await webServerService.startServer();
      const credentials = webServerService.getAuthCredentials();

      // Test API state endpoint
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
      };

      // Create authenticated request
      const stateRequest = createAuthenticatedHttpRequest(
        'GET',
        '/api/state',
        credentials!
      );

      // Process request through server
      const handleHttpRequest = (webServerService as any).handleHttpRequest;
      handleHttpRequest(mockSocket, stateRequest);

      // Verify response
      expect(mockSocket.write).toHaveBeenCalled();
      const response = mockSocket.write.mock.calls[0][0];
      expect(response).toContain('HTTP/1.1 200 OK');
      expect(response).toContain('application/json');
    });

    test('should handle WebSocket upgrade and bidirectional communication', async () => {
      // Start services
      await webServerService.startServer();
      webSocketManager.initialize();
      const credentials = webServerService.getAuthCredentials();

      // Create WebSocket upgrade request with authentication
      const upgradeRequest = createAuthenticatedWebSocketUpgrade(credentials!);
      
      // Verify authentication would pass
      authMiddleware.setCredentials(credentials!);
      const authResult = authMiddleware.validateRequest(upgradeRequest.httpRequest);
      expect(authResult.isValid).toBe(true);

      // Handle WebSocket upgrade
      const mockSocket = {
        write: jest.fn(),
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      await webSocketManager.handleUpgrade(mockSocket, upgradeRequest.wsRequest);
      const connectionId = webSocketManager.handleConnection(mockSocket);

      // Verify WebSocket handshake
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 101 Switching Protocols')
      );

      // Test bidirectional communication
      const pingMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        data: { clientId: 'test-client' },
      };

      // Simulate client sending ping
      mockSocket.emit('message', JSON.stringify(pingMessage));

      // Should receive pong response
      expect(mockSocket.send).toHaveBeenCalled();
      const sentMessages = mockSocket.send.mock.calls.map(call => JSON.parse(call[0]));
      const pongMessage = sentMessages.find(msg => msg.type === 'pong');
      expect(pongMessage).toBeDefined();
    });

    test('should handle concurrent operations and maintain consistency', async () => {
      // Setup services
      await webServerService.startServer();
      webSocketManager.initialize();

      // Create multiple WebSocket clients
      const clients = [];
      for (let i = 0; i < 5; i++) {
        const client = new MockWebSocketClient();
        webSocketManager.handleConnection(client);
        clients.push(client);
      }

      // Setup bridge listeners
      webControlBridge.onOperationStatus((status) => {
        webSocketManager.broadcast('operation-status', status);
      });

      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', log);
      });

      webControlBridge.onStateChange((state) => {
        webSocketManager.broadcast('state-sync', state);
      });

      // Mock services
      const mockBiometricService = require('../src/services/BiometricService').biometricService;
      const mockNetworkResilience = require('../src/utils/NetworkResilience').networkResilience;
      
      mockNetworkResilience.executeWithRetry = jest.fn().mockImplementation((fn) => fn());
      mockBiometricService.deleteKeys = jest.fn().mockResolvedValue({
        success: true,
        data: { message: 'Keys deleted' },
      });

      // Execute multiple concurrent operations
      const operations = [];
      for (let i = 0; i < 3; i++) {
        operations.push(webControlBridge.deleteKeys());
      }

      const results = await Promise.all(operations);

      // All operations should complete
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // All clients should receive updates
      clients.forEach(client => {
        const messages = client.getAllMessages();
        expect(messages.length).toBeGreaterThan(0);
        
        const operationMessages = client.getMessagesByType('operation-status');
        expect(operationMessages.length).toBeGreaterThan(0);
      });

      // Verify message consistency across clients
      const firstClientMessages = clients[0].getAllMessages();
      clients.slice(1).forEach(client => {
        const clientMessages = client.getAllMessages();
        expect(clientMessages.length).toBe(firstClientMessages.length);
      });
    });

    test('should handle server shutdown gracefully', async () => {
      // Start services
      await webServerService.startServer();
      webSocketManager.initialize();

      // Create WebSocket connections
      const clients = [];
      for (let i = 0; i < 3; i++) {
        const client = new MockWebSocketClient();
        webSocketManager.handleConnection(client);
        clients.push(client);
      }

      expect(webSocketManager.getActiveConnectionCount()).toBe(3);

      // Shutdown services
      webSocketManager.shutdown();
      await webServerService.stopServer();

      // Verify cleanup
      expect(webSocketManager.getState().isActive).toBe(false);
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
      expect(webServerService.getServerStatus().isRunning).toBe(false);
      expect(webServerService.getAuthCredentials()).toBeNull();
    });

    test('should handle network resilience scenarios', async () => {
      // Setup services
      await webServerService.startServer();
      webSocketManager.initialize();

      const client = new MockWebSocketClient();
      const connectionId = webSocketManager.handleConnection(client);

      expect(webSocketManager.getActiveConnectionCount()).toBe(1);

      // Simulate network disconnection
      const handleNetworkDisconnection = (webSocketManager as any).handleNetworkDisconnection;
      handleNetworkDisconnection();

      // Connection should be marked as potentially lost
      const state = webSocketManager.getState();
      const connection = state.connections.get(connectionId);
      expect(connection?.isAlive).toBe(false);

      // Should broadcast network status
      const networkMessages = client.getMessagesByType('state-sync');
      const disconnectionMessage = networkMessages.find(msg => 
        msg.data.type === 'network-disconnected'
      );
      expect(disconnectionMessage).toBeDefined();

      // Simulate network reconnection
      const handleNetworkReconnection = (webSocketManager as any).handleNetworkReconnection;
      handleNetworkReconnection();

      // Should attempt to restore connection and broadcast reconnection
      const reconnectionMessages = client.getMessagesByType('state-sync');
      const reconnectionMessage = reconnectionMessages.find(msg => 
        msg.data.type === 'network-reconnected'
      );
      expect(reconnectionMessage).toBeDefined();
    });
  });

  describe('Performance and Scalability End-to-End', () => {
    test('should handle high-frequency operations efficiently', async () => {
      // Setup services
      await webServerService.startServer();
      webSocketManager.initialize();

      const client = new MockWebSocketClient();
      webSocketManager.handleConnection(client);

      // Setup listeners
      webControlBridge.onLogUpdate((log) => {
        webSocketManager.broadcast('log-update', log);
      });

      const startTime = Date.now();

      // Perform many rapid configuration updates
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          webControlBridge.updateConfiguration('enroll', {
            url: `https://api-${i}.example.com/enroll`,
            method: 'POST',
          })
        );
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete efficiently
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 100 operations

      // All updates should be broadcast
      const logMessages = client.getMessagesByType('log-update');
      expect(logMessages.length).toBe(100);

      // Messages should be in order
      for (let i = 0; i < 100; i++) {
        const message = logMessages[i];
        expect(message.data.message).toContain(`api-${i}.example.com`);
      }
    });

    test('should handle memory usage efficiently with many connections', async () => {
      // Setup services
      await webServerService.startServer();
      webSocketManager.initialize();

      const clients = [];
      const maxClients = 50;

      // Create many connections
      for (let i = 0; i < maxClients; i++) {
        const client = new MockWebSocketClient();
        webSocketManager.handleConnection(client);
        clients.push(client);
      }

      expect(webSocketManager.getActiveConnectionCount()).toBe(maxClients);

      // Broadcast messages to all connections
      for (let i = 0; i < 10; i++) {
        webSocketManager.broadcast('performance-test', {
          index: i,
          timestamp: new Date().toISOString(),
        });
      }

      // All clients should receive all messages
      clients.forEach(client => {
        const messages = client.getMessagesByType('performance-test');
        expect(messages.length).toBe(10);
      });

      // Cleanup connections
      clients.forEach(client => client.close());
      
      // Wait for cleanup
      jest.advanceTimersByTime(1000);
      
      expect(webSocketManager.getActiveConnectionCount()).toBe(0);
    });
  });
});

// Helper functions

function createAuthenticatedHttpRequest(
  method: string,
  path: string,
  credentials: { username: string; password: string },
  body?: string
): string {
  const authString = `${credentials.username}:${credentials.password}`;
  const encodedAuth = Buffer.from(authString).toString('base64');
  
  const headers = [
    `${method} ${path} HTTP/1.1`,
    'Host: localhost:8080',
    `Authorization: Basic ${encodedAuth}`,
    'Content-Type: application/json',
  ];

  if (body) {
    headers.push(`Content-Length: ${body.length}`);
  }

  headers.push('', body || '');
  
  return headers.join('\r\n');
}

function createAuthenticatedWebSocketUpgrade(credentials: { username: string; password: string }) {
  const authString = `${credentials.username}:${credentials.password}`;
  const encodedAuth = Buffer.from(authString).toString('base64');
  
  const httpRequest = [
    'GET /ws HTTP/1.1',
    'Host: localhost:8080',
    `Authorization: Basic ${encodedAuth}`,
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
    'Sec-WebSocket-Version: 13',
    '',
    '',
  ].join('\r\n');

  const wsRequest = {
    headers: {
      'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'upgrade': 'websocket',
      'connection': 'upgrade',
      'sec-websocket-version': '13',
    },
  };

  return { httpRequest, wsRequest };
}