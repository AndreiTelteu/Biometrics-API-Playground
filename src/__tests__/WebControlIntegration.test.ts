import { WebServerService } from '../services/WebServerService';
import { webControlBridge } from '../services/WebControlBridge';
import { webSocketManager } from '../services/WebSocketManager';

// Mock dependencies
jest.mock('../services/WebControlBridge');
jest.mock('../services/WebSocketManager');
jest.mock('react-native-tcp-socket');

describe('Web Control Integration', () => {
  let webServerService: WebServerService;

  beforeEach(() => {
    webServerService = new WebServerService();
    jest.clearAllMocks();
  });

  describe('HTTP API Integration', () => {
    it('should handle complete enrollment flow through HTTP API', async () => {
      // Mock authentication
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: true,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '',
      });

      // Mock WebControlBridge enrollment
      const mockEnrollResult = {
        success: true,
        message: 'Enrollment completed successfully',
        data: {
          publicKey: 'mock-public-key-12345',
          backendResponse: { userId: 'user123', enrolled: true },
          endpoint: 'https://api.example.com/enroll',
          method: 'POST',
        },
        timestamp: new Date(),
      };
      (webControlBridge.executeEnrollment as jest.Mock).mockResolvedValue(mockEnrollResult);

      // Create mock socket
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };

      // Simulate HTTP POST request to /api/enroll
      const request = {
        method: 'POST',
        path: '/api/enroll',
        version: 'HTTP/1.1',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          config: {
            url: 'https://api.example.com/enroll',
            method: 'POST',
            headers: { 'Authorization': 'Bearer token123' },
          },
        }),
      };

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      // Verify WebControlBridge was called with correct config
      expect(webControlBridge.executeEnrollment).toHaveBeenCalledWith({
        url: 'https://api.example.com/enroll',
        method: 'POST',
        headers: { 'Authorization': 'Bearer token123' },
      });

      // Verify HTTP response was sent
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('application/json')
      );

      // Verify response contains enrollment result
      const responseCall = mockSocket.write.mock.calls.find(call =>
        call[0].includes('mock-public-key-12345')
      );
      expect(responseCall).toBeDefined();
    });

    it('should handle complete validation flow through HTTP API', async () => {
      // Mock authentication
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: true,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '',
      });

      // Mock WebControlBridge validation
      const mockValidateResult = {
        success: true,
        message: 'Validation completed successfully',
        data: {
          signature: 'mock-signature-abcdef',
          payload: 'timestamp-payload-123',
          backendResponse: { valid: true, score: 0.95 },
          endpoint: 'https://api.example.com/validate',
          method: 'POST',
          validationTimestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };
      (webControlBridge.executeValidation as jest.Mock).mockResolvedValue(mockValidateResult);

      // Create mock socket
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };

      // Simulate HTTP POST request to /api/validate
      const request = {
        method: 'POST',
        path: '/api/validate',
        version: 'HTTP/1.1',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          config: {
            url: 'https://api.example.com/validate',
            method: 'POST',
            customPayload: 'custom-validation-data',
          },
        }),
      };

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      // Verify WebControlBridge was called with correct config
      expect(webControlBridge.executeValidation).toHaveBeenCalledWith({
        url: 'https://api.example.com/validate',
        method: 'POST',
        customPayload: 'custom-validation-data',
      });

      // Verify HTTP response was sent
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );

      // Verify response contains validation result
      const responseCall = mockSocket.write.mock.calls.find(call =>
        call[0].includes('mock-signature-abcdef')
      );
      expect(responseCall).toBeDefined();
    });

    it('should handle state retrieval through HTTP API', async () => {
      // Mock authentication
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: true,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '',
      });

      // Mock WebControlBridge state
      const mockState = {
        biometricStatus: { available: true, biometryType: 'TouchID' },
        keysExist: true,
        enrollEndpoint: { url: 'https://api.example.com/enroll', method: 'POST' },
        validateEndpoint: { url: 'https://api.example.com/validate', method: 'POST' },
        operationStatus: null,
        logs: [
          {
            id: 'log1',
            timestamp: new Date(),
            operation: 'enroll',
            status: 'success',
            message: 'Enrollment completed',
          },
        ],
        isLoading: false,
      };
      (webControlBridge.getAppState as jest.Mock).mockReturnValue(mockState);

      // Create mock socket
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };

      // Simulate HTTP GET request to /api/state
      const request = {
        method: 'GET',
        path: '/api/state',
        version: 'HTTP/1.1',
        headers: {},
        body: '',
      };

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      // Verify WebControlBridge was called
      expect(webControlBridge.getAppState).toHaveBeenCalled();

      // Verify HTTP response was sent
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );

      // Verify response contains state data
      const responseCall = mockSocket.write.mock.calls.find(call =>
        call[0].includes('TouchID') && call[0].includes('Enrollment completed')
      );
      expect(responseCall).toBeDefined();
    });

    it('should handle configuration updates through HTTP API', async () => {
      // Mock authentication
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: true,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '',
      });

      // Mock WebControlBridge configuration update
      (webControlBridge.updateConfiguration as jest.Mock).mockResolvedValue(undefined);

      // Create mock socket
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };

      // Simulate HTTP POST request to /api/config
      const request = {
        method: 'POST',
        path: '/api/config',
        version: 'HTTP/1.1',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'validate',
          config: {
            url: 'https://api.example.com/validate-v2',
            method: 'PUT',
            headers: { 'X-API-Version': '2.0' },
          },
        }),
      };

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      // Verify WebControlBridge was called with correct parameters
      expect(webControlBridge.updateConfiguration).toHaveBeenCalledWith(
        'validate',
        {
          url: 'https://api.example.com/validate-v2',
          method: 'PUT',
          headers: { 'X-API-Version': '2.0' },
        }
      );

      // Verify HTTP response was sent
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );
    });
  });

  describe('WebSocket Integration', () => {
    it('should handle WebSocket upgrade requests', async () => {
      // Mock authentication
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: true,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '',
      });

      // Mock WebSocketManager upgrade
      (webSocketManager.handleUpgrade as jest.Mock).mockResolvedValue(undefined);

      // Create mock socket
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };

      // Simulate WebSocket upgrade request
      const request = {
        method: 'GET',
        path: '/ws',
        version: 'HTTP/1.1',
        headers: {
          'upgrade': 'websocket',
          'connection': 'Upgrade',
          'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'sec-websocket-version': '13',
        },
        body: '',
      };

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      // Verify WebSocketManager was called for upgrade
      expect(webSocketManager.handleUpgrade).toHaveBeenCalledWith(mockSocket, request);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle authentication failures across all endpoints', async () => {
      // Mock authentication failure
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: false,
        statusCode: 401,
        statusText: 'Unauthorized',
        headers: { 'WWW-Authenticate': 'Basic realm="Web Control"' },
        body: 'Authentication required',
      });

      // Create mock socket
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };

      // Test various endpoints with authentication failure
      const endpoints = [
        { method: 'GET', path: '/' },
        { method: 'POST', path: '/api/enroll' },
        { method: 'POST', path: '/api/validate' },
        { method: 'POST', path: '/api/delete-keys' },
        { method: 'GET', path: '/api/state' },
        { method: 'POST', path: '/api/config' },
      ];

      for (const endpoint of endpoints) {
        mockSocket.write.mockClear();

        const request = {
          method: endpoint.method,
          path: endpoint.path,
          version: 'HTTP/1.1',
          headers: {},
          body: '',
        };

        const handleHttpRequest = (webServerService as any).handleHttpRequest.bind(webServerService);
        handleHttpRequest(mockSocket, `${endpoint.method} ${endpoint.path} HTTP/1.1\r\n\r\n`);

        // Verify 401 response was sent
        expect(mockSocket.write).toHaveBeenCalledWith(
          expect.stringContaining('HTTP/1.1 401 Unauthorized')
        );
        expect(mockSocket.write).toHaveBeenCalledWith(
          expect.stringContaining('WWW-Authenticate: Basic realm="Web Control"')
        );
      }
    });

    it('should handle bridge operation failures gracefully', async () => {
      // Mock authentication success
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: true,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '',
      });

      // Mock WebControlBridge failure
      (webControlBridge.executeEnrollment as jest.Mock).mockRejectedValue(
        new Error('Biometric sensor not available')
      );

      // Create mock socket
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };

      // Simulate enrollment request that fails
      const request = {
        method: 'POST',
        path: '/api/enroll',
        version: 'HTTP/1.1',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config: { url: 'https://api.example.com' } }),
      };

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      // Verify error response was sent
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 500 Internal Server Error')
      );

      // Verify error details are included in response
      const errorResponseCall = mockSocket.write.mock.calls.find(call =>
        call[0].includes('Biometric sensor not available')
      );
      expect(errorResponseCall).toBeDefined();
    });
  });
});