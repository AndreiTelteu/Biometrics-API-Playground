/**
 * Error Handling Integration Tests
 * Tests the comprehensive error handling and network resilience features
 */

import { errorHandler } from '../utils/ErrorHandler';
import { networkResilience } from '../utils/NetworkResilience';

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any listeners
    errorHandler.addErrorListener(() => {})(); // Add and immediately remove to test cleanup
    networkResilience.shutdown();
  });

  describe('ErrorHandler', () => {
    test('should handle server errors correctly', () => {
      const error = new Error('Port 8080 is already in use');
      const serverError = errorHandler.handleServerError(error, 'Server startup', 8080);

      expect(serverError.code).toBe('SERVER_PORT_IN_USE');
      expect(serverError.recoverable).toBe(true);
      expect(serverError.userMessage).toContain('port is already in use');
      expect(serverError.port).toBe(8080);
    });

    test('should handle network errors correctly', () => {
      const error = { status: 500, message: 'Internal Server Error' };
      const networkError = errorHandler.handleNetworkError(error, 'API call', 'http://example.com');

      expect(networkError.code).toBe('NETWORK_SERVER_ERROR_500');
      expect(networkError.retryable).toBe(true);
      expect(networkError.statusCode).toBe(500);
      expect(networkError.endpoint).toBe('http://example.com');
    });

    test('should handle WebSocket errors correctly', () => {
      const error = new Error('Connection closed unexpectedly');
      const wsError = errorHandler.handleWebSocketError(error, 'Connection handling', 'client-123');

      expect(wsError.code).toBe('WEBSOCKET_CONNECTION_CLOSED');
      expect(wsError.recoverable).toBe(true);
      expect(wsError.context).toContain('client-123');
    });

    test('should handle application errors correctly', () => {
      const error = new Error('Biometric authentication failed');
      const appError = errorHandler.handleApplicationError(error, 'Biometric operation');

      expect(appError.code).toBe('APP_BIOMETRIC_ERROR');
      expect(appError.recoverable).toBe(false);
      expect(appError.userMessage).toContain('Biometric authentication error');
    });

    test('should create standardized error responses', () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        userMessage: 'User-friendly message',
        recoverable: true,
        timestamp: new Date(),
      };

      const response = errorHandler.createErrorResponse(error, 'req-123');

      expect(response.success).toBe(false);
      expect(response.error).toBe('User-friendly message');
      expect(response.code).toBe('TEST_ERROR');
      expect(response.requestId).toBe('req-123');
      expect(response.recoverable).toBe(true);
    });

    test('should notify error listeners', (done) => {
      const mockListener = jest.fn((error) => {
        expect(error.code).toBe('SERVER_UNKNOWN_ERROR');
        expect(error.message).toBe('Test error');
        done();
      });

      const removeListener = errorHandler.addErrorListener(mockListener);
      errorHandler.handleServerError(new Error('Test error'), 'Test context');
      
      // Clean up
      setTimeout(() => {
        removeListener();
      }, 100);
    });
  });

  describe('NetworkResilience', () => {
    test('should initialize and shutdown correctly', () => {
      networkResilience.initialize({ maxAttempts: 3 });
      expect(networkResilience.isConnected()).toBe(false);

      networkResilience.shutdown();
      expect(networkResilience.isConnected()).toBe(false);
    });

    test('should track connection state correctly', () => {
      networkResilience.initialize();

      // Mark as connected
      networkResilience.markConnected();
      expect(networkResilience.isConnected()).toBe(true);

      const state = networkResilience.getConnectionState();
      expect(state.isConnected).toBe(true);
      expect(state.reconnectAttempts).toBe(0);

      // Mark as disconnected
      networkResilience.markDisconnected(new Error('Connection lost'));
      expect(networkResilience.isConnected()).toBe(false);
    });

    test('should execute operations with retry', async () => {
      networkResilience.initialize();

      let attempts = 0;
      const mockOperation = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('Success');
      });

      const result = await networkResilience.executeWithRetry(
        mockOperation,
        'Test operation',
        3
      );

      expect(result).toBe('Success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries', async () => {
      networkResilience.initialize();

      const mockOperation = jest.fn(() => {
        throw new Error('Persistent failure');
      });

      await expect(
        networkResilience.executeWithRetry(mockOperation, 'Test operation', 2)
      ).rejects.toThrow('Persistent failure');

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    test('should notify connection listeners', (done) => {
      networkResilience.initialize();

      let connectedCalled = false;
      let disconnectedCalled = false;

      const removeListener = networkResilience.addConnectionListener({
        onConnected: () => {
          connectedCalled = true;
          if (connectedCalled && disconnectedCalled) {
            removeListener();
            done();
          }
        },
        onDisconnected: (error) => {
          disconnectedCalled = true;
          expect(error).toBeDefined();
          if (connectedCalled && disconnectedCalled) {
            removeListener();
            done();
          }
        },
      });

      // Trigger events
      networkResilience.markConnected();
      networkResilience.markDisconnected(new Error('Test disconnect'));
    });
  });

  describe('Integration', () => {
    test('should work together for comprehensive error handling', async () => {
      networkResilience.initialize();

      const errors: any[] = [];
      const removeErrorListener = errorHandler.addErrorListener((error) => {
        // Only collect the first error to avoid duplicates from retries
        if (errors.length === 0) {
          errors.push(error);
        }
      });

      // Simulate a network operation that fails and then succeeds
      let attempts = 0;
      const mockOperation = jest.fn(() => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('Network timeout');
          throw error;
        }
        return Promise.resolve('Success');
      });

      const result = await networkResilience.executeWithRetry(
        mockOperation,
        'Test operation',
        2
      );

      expect(result).toBe('Success');
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('NETWORK_TIMEOUT');

      removeErrorListener();
    });
  });
});