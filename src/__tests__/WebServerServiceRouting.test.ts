import { WebServerService } from '../services/WebServerService';
import { webControlBridge } from '../services/WebControlBridge';
import { webSocketManager } from '../services/WebSocketManager';

// Mock dependencies
jest.mock('../services/WebControlBridge');
jest.mock('../services/WebSocketManager');
jest.mock('react-native-tcp-socket');

describe('WebServerService HTTP Routing', () => {
  let webServerService: WebServerService;
  let mockSocket: any;

  beforeEach(() => {
    webServerService = new WebServerService();
    mockSocket = {
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('parseHttpRequest', () => {
    it('should parse GET request correctly', () => {
      const request = 'GET /api/state HTTP/1.1\r\nHost: localhost:8080\r\nAuthorization: Basic YWRtaW46MTIzNDU2\r\n\r\n';
      
      // Access private method for testing
      const parseHttpRequest = (webServerService as any).parseHttpRequest.bind(webServerService);
      const parsed = parseHttpRequest(request);

      expect(parsed).toEqual({
        method: 'GET',
        path: '/api/state',
        version: 'HTTP/1.1',
        headers: {
          'host': 'localhost:8080',
          'authorization': 'Basic YWRtaW46MTIzNDU2',
        },
        body: '',
      });
    });

    it('should parse POST request with body correctly', () => {
      const request = 'POST /api/enroll HTTP/1.1\r\nHost: localhost:8080\r\nContent-Type: application/json\r\nAuthorization: Basic YWRtaW46MTIzNDU2\r\n\r\n{"config":{"url":"https://api.example.com"}}';
      
      const parseHttpRequest = (webServerService as any).parseHttpRequest.bind(webServerService);
      const parsed = parseHttpRequest(request);

      expect(parsed).toEqual({
        method: 'POST',
        path: '/api/enroll',
        version: 'HTTP/1.1',
        headers: {
          'host': 'localhost:8080',
          'content-type': 'application/json',
          'authorization': 'Basic YWRtaW46MTIzNDU2',
        },
        body: '{"config":{"url":"https://api.example.com"}}',
      });
    });
  });

  describe('routeRequest', () => {
    beforeEach(() => {
      // Mock authentication to pass
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: true,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '',
      });
    });

    it('should route GET / to web interface handler', async () => {
      const request = {
        method: 'GET',
        path: '/',
        version: 'HTTP/1.1',
        headers: {},
        body: '',
      };

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('text/html')
      );
    });

    it('should route POST /api/enroll to enrollment handler', async () => {
      const request = {
        method: 'POST',
        path: '/api/enroll',
        version: 'HTTP/1.1',
        headers: {},
        body: '{"config":{"url":"https://api.example.com"}}',
      };

      // Mock WebControlBridge
      const mockResult = {
        success: true,
        message: 'Enrollment completed',
        data: { publicKey: 'test-key' },
        timestamp: new Date(),
      };
      (webControlBridge.executeEnrollment as jest.Mock).mockResolvedValue(mockResult);

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(webControlBridge.executeEnrollment).toHaveBeenCalledWith({
        url: 'https://api.example.com',
      });
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('application/json')
      );
    });

    it('should route POST /api/validate to validation handler', async () => {
      const request = {
        method: 'POST',
        path: '/api/validate',
        version: 'HTTP/1.1',
        headers: {},
        body: '{"config":{"url":"https://api.example.com"}}',
      };

      const mockResult = {
        success: true,
        message: 'Validation completed',
        data: { signature: 'test-signature' },
        timestamp: new Date(),
      };
      (webControlBridge.executeValidation as jest.Mock).mockResolvedValue(mockResult);

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(webControlBridge.executeValidation).toHaveBeenCalledWith({
        url: 'https://api.example.com',
      });
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );
    });

    it('should route POST /api/delete-keys to delete keys handler', async () => {
      const request = {
        method: 'POST',
        path: '/api/delete-keys',
        version: 'HTTP/1.1',
        headers: {},
        body: '',
      };

      const mockResult = {
        success: true,
        message: 'Keys deleted',
        data: {},
        timestamp: new Date(),
      };
      (webControlBridge.deleteKeys as jest.Mock).mockResolvedValue(mockResult);

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(webControlBridge.deleteKeys).toHaveBeenCalled();
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );
    });

    it('should route GET /api/state to state handler', async () => {
      const request = {
        method: 'GET',
        path: '/api/state',
        version: 'HTTP/1.1',
        headers: {},
        body: '',
      };

      const mockState = {
        biometricStatus: { available: true, biometryType: 'TouchID' },
        keysExist: false,
        enrollEndpoint: { url: '', method: 'POST' },
        validateEndpoint: { url: '', method: 'POST' },
        operationStatus: null,
        logs: [],
        isLoading: false,
      };
      (webControlBridge.getAppState as jest.Mock).mockReturnValue(mockState);

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(webControlBridge.getAppState).toHaveBeenCalled();
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );
    });

    it('should route POST /api/config to config update handler', async () => {
      const request = {
        method: 'POST',
        path: '/api/config',
        version: 'HTTP/1.1',
        headers: {},
        body: '{"type":"enroll","config":{"url":"https://api.example.com"}}',
      };

      (webControlBridge.updateConfiguration as jest.Mock).mockResolvedValue(undefined);

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(webControlBridge.updateConfiguration).toHaveBeenCalledWith(
        'enroll',
        { url: 'https://api.example.com' }
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 200 OK')
      );
    });

    it('should return 404 for unknown routes', async () => {
      const request = {
        method: 'GET',
        path: '/unknown',
        version: 'HTTP/1.1',
        headers: {},
        body: '',
      };

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 404 Not Found')
      );
    });

    it('should handle WebSocket upgrade requests', async () => {
      const request = {
        method: 'GET',
        path: '/ws',
        version: 'HTTP/1.1',
        headers: {
          'upgrade': 'websocket',
          'sec-websocket-key': 'test-key',
        },
        body: '',
      };

      (webSocketManager.handleUpgrade as jest.Mock).mockResolvedValue(undefined);

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(webSocketManager.handleUpgrade).toHaveBeenCalledWith(mockSocket, request);
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      const request = {
        method: 'POST',
        path: '/api/enroll',
        version: 'HTTP/1.1',
        headers: {},
        body: 'invalid json',
      };

      // Mock authentication to pass
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: true,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '',
      });

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 500 Internal Server Error')
      );
    });

    it('should handle bridge operation errors', async () => {
      const request = {
        method: 'POST',
        path: '/api/enroll',
        version: 'HTTP/1.1',
        headers: {},
        body: '{"config":{"url":"https://api.example.com"}}',
      };

      // Mock authentication to pass
      const authMiddleware = (webServerService as any).authMiddleware;
      authMiddleware.validateRequest = jest.fn().mockReturnValue({
        isValid: true,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '',
      });

      // Mock WebControlBridge to throw error
      (webControlBridge.executeEnrollment as jest.Mock).mockRejectedValue(
        new Error('Biometric operation failed')
      );

      const routeRequest = (webServerService as any).routeRequest.bind(webServerService);
      await routeRequest(mockSocket, request);

      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 500 Internal Server Error')
      );
    });
  });
});