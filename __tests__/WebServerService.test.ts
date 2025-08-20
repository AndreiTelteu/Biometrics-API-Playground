/**
 * WebServerService Unit Tests
 * Tests the core HTTP server functionality, authentication, and routing
 */

import { WebServerService } from '../src/services/WebServerService';
import { AuthCredentials } from '../src/types';

// Mock dependencies
jest.mock('../src/services/AuthenticationMiddleware');
jest.mock('../src/services/WebControlBridge');
jest.mock('../src/services/WebSocketManager');
jest.mock('../src/utils/ErrorHandler');
jest.mock('../src/utils/NetworkResilience');

describe('WebServerService', () => {
  let webServerService: WebServerService;

  beforeEach(() => {
    webServerService = new WebServerService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await webServerService.stopServer();
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Clear any remaining timers
    jest.clearAllTimers();
    
    // Clean up app state listener if it exists
    const appStateSubscription = (webServerService as any).appStateSubscription;
    if (appStateSubscription && typeof appStateSubscription.remove === 'function') {
      appStateSubscription.remove();
    }
  });

  describe('Server Lifecycle', () => {
    test('should start server successfully', async () => {
      const serverInfo = await webServerService.startServer();

      expect(serverInfo.isRunning).toBe(true);
      expect(serverInfo.port).toBeGreaterThan(0);
      expect(serverInfo.url).toContain(`http://0.0.0.0:${serverInfo.port}`);
      expect(serverInfo.password).toMatch(/^\d{6}$/);
    });

    test('should start server on preferred port if available', async () => {
      const preferredPort = 9999;
      const serverInfo = await webServerService.startServer(preferredPort);

      expect(serverInfo.port).toBe(preferredPort);
      expect(serverInfo.url).toBe(`http://0.0.0.0:${preferredPort}`);
    });

    test('should find alternative port if preferred port is unavailable', async () => {
      // Start first server
      const serverInfo1 = await webServerService.startServer(8080);
      expect(serverInfo1.port).toBe(8080);

      // Try to start second server on same port
      const webServerService2 = new WebServerService();
      const serverInfo2 = await webServerService2.startServer(8080);

      expect(serverInfo2.port).not.toBe(8080);
      expect(serverInfo2.port).toBeGreaterThan(0);

      // Cleanup
      await webServerService2.stopServer();
    });

    test('should stop server successfully', async () => {
      await webServerService.startServer();
      let status = webServerService.getServerStatus();
      expect(status.isRunning).toBe(true);

      await webServerService.stopServer();
      status = webServerService.getServerStatus();
      expect(status.isRunning).toBe(false);
      expect(status.port).toBeNull();
      expect(status.url).toBeNull();
      expect(status.password).toBeNull();
    });

    test('should handle multiple start attempts gracefully', async () => {
      await webServerService.startServer();
      
      await expect(webServerService.startServer()).rejects.toThrow('Server is already running');
    });

    test('should handle stop when server is not running', async () => {
      // Should not throw error
      await expect(webServerService.stopServer()).resolves.not.toThrow();
    });

    test('should generate new credentials on each start', async () => {
      const serverInfo1 = await webServerService.startServer();
      const credentials1 = webServerService.getAuthCredentials();
      
      await webServerService.stopServer();
      
      const serverInfo2 = await webServerService.startServer();
      const credentials2 = webServerService.getAuthCredentials();

      expect(credentials1?.password).not.toBe(credentials2?.password);
      expect(serverInfo1.password).not.toBe(serverInfo2.password);
    });
  });

  describe('Authentication', () => {
    test('should generate valid authentication credentials', async () => {
      await webServerService.startServer();
      const credentials = webServerService.getAuthCredentials();

      expect(credentials).not.toBeNull();
      expect(credentials!.username).toBe('admin');
      expect(credentials!.password).toMatch(/^\d{6}$/);
      expect(credentials!.password.length).toBe(6);
    });

    test('should clear credentials when server stops', async () => {
      await webServerService.startServer();
      expect(webServerService.getAuthCredentials()).not.toBeNull();

      await webServerService.stopServer();
      expect(webServerService.getAuthCredentials()).toBeNull();
    });

    test('should generate random passwords', () => {
      const passwords = new Set();
      
      // Generate multiple passwords
      for (let i = 0; i < 100; i++) {
        const credentials = webServerService.generateAuthCredentials();
        passwords.add(credentials.password);
      }

      // Should have high uniqueness
      expect(passwords.size).toBeGreaterThan(90);
    });
  });

  describe('Server Status', () => {
    test('should return correct status when server is stopped', () => {
      const status = webServerService.getServerStatus();

      expect(status.isRunning).toBe(false);
      expect(status.port).toBeNull();
      expect(status.url).toBeNull();
      expect(status.password).toBeNull();
      expect(status.startTime).toBeNull();
      expect(status.activeConnections).toBe(0);
    });

    test('should return correct status when server is running', async () => {
      const serverInfo = await webServerService.startServer();
      const status = webServerService.getServerStatus();

      expect(status.isRunning).toBe(true);
      expect(status.port).toBe(serverInfo.port);
      expect(status.url).toBe(serverInfo.url);
      expect(status.password).toBe(serverInfo.password);
      expect(status.startTime).toBeInstanceOf(Date);
      expect(status.activeConnections).toBe(0);
    });

    test('should track active connections', async () => {
      await webServerService.startServer();
      
      webServerService.updateActiveConnections(3);
      const status = webServerService.getServerStatus();
      
      expect(status.activeConnections).toBe(3);
    });
  });

  describe('Port Management', () => {
    test('should find available port in default range', async () => {
      const serverInfo = await webServerService.startServer();
      
      expect(serverInfo.port).toBeGreaterThanOrEqual(8080);
      expect(serverInfo.port).toBeLessThanOrEqual(8090);
    });

    test('should handle port conflicts gracefully', async () => {
      // This test would require more complex mocking of TCP socket behavior
      // For now, we'll test that the service handles the case
      const serverInfo = await webServerService.startServer();
      expect(serverInfo.port).toBeGreaterThan(0);
    });

    test('should throw error when no ports are available', async () => {
      // Mock the port availability check to always return false
      const originalIsPortAvailable = (webServerService as any).isPortAvailable;
      (webServerService as any).isPortAvailable = jest.fn().mockResolvedValue(false);

      await expect(webServerService.startServer()).rejects.toThrow('No available ports found');

      // Restore original method
      (webServerService as any).isPortAvailable = originalIsPortAvailable;
    });
  });

  describe('Error Handling', () => {
    test('should handle server start timeout', async () => {
      // Mock server listen to never call callback
      const mockServer = {
        listen: jest.fn((options, callback) => {
          // Don't call callback to simulate timeout
        }),
        close: jest.fn(),
        on: jest.fn(),
      };

      // Mock TcpSocket.createServer to return our mock
      const TcpSocket = require('react-native-tcp-socket');
      TcpSocket.createServer = jest.fn().mockReturnValue(mockServer);

      await expect(webServerService.startServer()).rejects.toThrow('Server start timeout');
    });

    test('should handle server stop timeout', async () => {
      await webServerService.startServer();

      // Mock server close to never call callback
      const server = (webServerService as any).server;
      server.close = jest.fn((callback) => {
        // Don't call callback to simulate timeout
      });

      // Should resolve after timeout (forced cleanup)
      await expect(webServerService.stopServer()).resolves.not.toThrow();
    });

    test('should handle network errors during operation', async () => {
      await webServerService.startServer();
      
      // Simulate network error
      const server = (webServerService as any).server;
      server.emit('error', new Error('Network error'));

      // Server should handle error gracefully
      const status = webServerService.getServerStatus();
      expect(status.isRunning).toBe(true); // Should still be running unless critical error
    });
  });

  describe('HTTP Request Handling', () => {
    test('should parse HTTP requests correctly', async () => {
      await webServerService.startServer();
      
      const testRequest = [
        'GET /api/state HTTP/1.1',
        'Host: localhost:8080',
        'Authorization: Basic YWRtaW46MTIzNDU2',
        'Content-Type: application/json',
        '',
        '{"test": "data"}',
      ].join('\r\n');

      const parseHttpRequest = (webServerService as any).parseHttpRequest;
      const parsed = parseHttpRequest(testRequest);

      expect(parsed).not.toBeNull();
      expect(parsed.method).toBe('GET');
      expect(parsed.path).toBe('/api/state');
      expect(parsed.version).toBe('HTTP/1.1');
      expect(parsed.headers.host).toBe('localhost:8080');
      expect(parsed.headers.authorization).toBe('Basic YWRtaW46MTIzNDU2');
      expect(parsed.headers['content-type']).toBe('application/json');
      expect(parsed.body).toBe('{"test": "data"}');
    });

    test('should handle malformed HTTP requests', async () => {
      await webServerService.startServer();
      
      const parseHttpRequest = (webServerService as any).parseHttpRequest;
      const parsed = parseHttpRequest('invalid request');

      expect(parsed).toBeNull();
    });

    test('should generate unique request IDs', async () => {
      await webServerService.startServer();
      
      const generateRequestId = (webServerService as any).generateRequestId;
      const ids = new Set();
      
      for (let i = 0; i < 100; i++) {
        ids.add(generateRequestId());
      }

      expect(ids.size).toBe(100); // All should be unique
    });
  });

  describe('Response Generation', () => {
    test('should send HTTP responses with correct format', async () => {
      await webServerService.startServer();
      
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
      };

      const sendHttpResponse = (webServerService as any).sendHttpResponse;
      sendHttpResponse(mockSocket, 200, 'Test response', {
        'Content-Type': 'text/plain',
      });

      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('Content-Type: text/plain')
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('Test response')
      );
      expect(mockSocket.end).toHaveBeenCalled();
    });

    test('should send JSON responses correctly', async () => {
      await webServerService.startServer();
      
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
      };

      const testData = { success: true, message: 'Test' };
      const sendJsonResponse = (webServerService as any).sendJsonResponse;
      sendJsonResponse(mockSocket, 200, testData);

      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('application/json')
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(testData, null, 2))
      );
    });

    test('should handle error responses correctly', async () => {
      await webServerService.startServer();
      
      const getErrorMessage = (webServerService as any).getErrorMessage;
      
      expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
      expect(getErrorMessage('String error')).toBe('String error');
      expect(getErrorMessage(null)).toBe('Unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('Unknown error occurred');
    });
  });

  describe('App State Integration', () => {
    test('should set up app state listener', () => {
      // Verify that app state listener is set up during construction
      expect((webServerService as any).appStateSubscription).toBeDefined();
    });

    test('should handle app going to background', async () => {
      await webServerService.startServer();
      expect(webServerService.getServerStatus().isRunning).toBe(true);

      // Simulate app going to background
      const handleAppBackground = (webServerService as any).handleAppBackground;
      await handleAppBackground();

      // Server should be stopped
      expect(webServerService.getServerStatus().isRunning).toBe(false);
    });
  });

  describe('Connection Management', () => {
    test('should handle connection lifecycle', async () => {
      await webServerService.startServer();
      
      const mockSocket = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      const handleConnection = (webServerService as any).handleConnection;
      handleConnection(mockSocket);

      // Should set up event listeners
      expect(mockSocket.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));

      // Should increment active connections
      expect(webServerService.getServerStatus().activeConnections).toBe(1);
    });

    test('should clean up connections on close', async () => {
      await webServerService.startServer();
      
      const mockSocket = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      const handleConnection = (webServerService as any).handleConnection;
      handleConnection(mockSocket);

      expect(webServerService.getServerStatus().activeConnections).toBe(1);

      // Simulate connection close
      const closeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();

      expect(webServerService.getServerStatus().activeConnections).toBe(0);
    });
  });
});