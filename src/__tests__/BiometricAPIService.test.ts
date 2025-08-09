/**
 * Unit tests for BiometricAPIService
 */

import { BiometricAPIService } from '../services/BiometricAPIService';
import { EndpointConfig } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('BiometricAPIService', () => {
  let apiService: BiometricAPIService;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    apiService = new BiometricAPIService();
    mockFetch.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('enrollPublicKey', () => {
    const validConfig: EndpointConfig = {
      url: 'https://api.example.com/enroll',
      method: 'POST',
    };

    const publicKey = 'test-public-key-123';

    it('should successfully enroll a public key', async () => {
      const mockResponse = {
        success: true,
        enrollmentId: 'enroll-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      } as Response);

      const result = await apiService.enrollPublicKey(validConfig, publicKey);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Enrollment successful');
      expect(result.data).toEqual(mockResponse);
      expect(result.timestamp).toBeInstanceOf(Date);

      expect(mockFetch).toHaveBeenCalledWith(
        validConfig.url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
          body: expect.stringContaining(publicKey),
        })
      );
    });

    it('should handle enrollment failure from server', async () => {
      const errorResponse = {
        error: 'Invalid public key format',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse,
      } as Response);

      const result = await apiService.enrollPublicKey(validConfig, publicKey);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid public key format');
      expect(result.data).toEqual(errorResponse);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiService.enrollPublicKey(validConfig, publicKey);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Enrollment request failed: Network error');
    });

    it('should handle request timeout', async () => {
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await apiService.enrollPublicKey(validConfig, publicKey);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Request timeout');
    });

    it('should validate endpoint configuration', async () => {
      const invalidConfig: EndpointConfig = {
        url: 'invalid-url',
        method: 'POST',
      };

      const result = await apiService.enrollPublicKey(invalidConfig, publicKey);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid endpoint configuration');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle custom headers', async () => {
      const configWithHeaders: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      } as Response);

      await apiService.enrollPublicKey(configWithHeaders, publicKey);

      expect(mockFetch).toHaveBeenCalledWith(
        configWithHeaders.url,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should handle non-JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Internal Server Error',
      } as Response);

      const result = await apiService.enrollPublicKey(validConfig, publicKey);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal Server Error');
    });
  });

  describe('validateSignature', () => {
    const validConfig: EndpointConfig = {
      url: 'https://api.example.com/validate',
      method: 'POST',
    };

    const signature = 'test-signature-456';
    const payload = 'test-payload-789';

    it('should successfully validate a signature', async () => {
      const mockResponse = {
        valid: true,
        validationId: 'validate-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      } as Response);

      const result = await apiService.validateSignature(validConfig, signature, payload);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Validation successful');
      expect(result.data).toEqual(mockResponse);

      expect(mockFetch).toHaveBeenCalledWith(
        validConfig.url,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(signature),
        })
      );
    });

    it('should handle validation failure from server', async () => {
      const errorResponse = {
        error: 'Invalid signature',
        details: 'Signature verification failed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse,
      } as Response);

      const result = await apiService.validateSignature(validConfig, signature, payload);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid signature');
      expect(result.data).toEqual(errorResponse);
    });

    it('should handle GET method without body', async () => {
      const getConfig: EndpointConfig = {
        url: 'https://api.example.com/validate',
        method: 'GET',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ valid: true }),
      } as Response);

      await apiService.validateSignature(getConfig, signature, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        getConfig.url,
        expect.objectContaining({
          method: 'GET',
        })
      );
      
      // Verify body is not included for GET requests
      const fetchCall = mockFetch.mock.calls[0][1] as RequestInit;
      expect(fetchCall.body).toBeUndefined();
    });
  });

  describe('endpoint configuration validation', () => {
    it('should reject empty URL', async () => {
      const invalidConfig: EndpointConfig = {
        url: '',
        method: 'POST',
      };

      const result = await apiService.enrollPublicKey(invalidConfig, 'test-key');

      expect(result.success).toBe(false);
      expect(result.message).toContain('URL is required');
    });

    it('should reject invalid HTTP method', async () => {
      const invalidConfig = {
        url: 'https://api.example.com/test',
        method: 'INVALID' as any,
      };

      const result = await apiService.enrollPublicKey(invalidConfig, 'test-key');

      expect(result.success).toBe(false);
      expect(result.message).toContain('HTTP method must be one of');
    });

    it('should accept all valid HTTP methods', async () => {
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH'];

      for (const method of validMethods) {
        const config: EndpointConfig = {
          url: 'https://api.example.com/test',
          method: method as any,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true }),
        } as Response);

        const result = await apiService.enrollPublicKey(config, 'test-key');

        expect(result.success).toBe(true);
      }
    });
  });

  describe('error handling', () => {
    const validConfig: EndpointConfig = {
      url: 'https://api.example.com/test',
      method: 'POST',
    };

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      const result = await apiService.enrollPublicKey(validConfig, 'test-key');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to parse response');
    });

    it('should extract error messages from different response formats', async () => {
      const testCases = [
        { data: { error: 'Custom error message' }, expected: 'Custom error message' },
        { data: { message: 'Message field error' }, expected: 'Message field error' },
        { data: { errorMessage: 'ErrorMessage field' }, expected: 'ErrorMessage field' },
        { data: { detail: 'Detail field error' }, expected: 'Detail field error' },
        { data: 'Plain string error', expected: 'Plain string error' },
        { data: { unknown: 'field' }, expected: 'HTTP 400: Bad Request' },
      ];

      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => testCase.data,
        } as Response);

        const result = await apiService.enrollPublicKey(validConfig, 'test-key');

        expect(result.success).toBe(false);
        expect(result.message).toBe(testCase.expected);
      }
    });

    it('should handle unknown error types', async () => {
      mockFetch.mockRejectedValueOnce({ unknown: 'error object' });

      const result = await apiService.enrollPublicKey(validConfig, 'test-key');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown error occurred');
    });
  });

  describe('HTTP status codes', () => {
    const validConfig: EndpointConfig = {
      url: 'https://api.example.com/test',
      method: 'POST',
    };

    const statusTestCases = [
      { status: 400, expected: 'Bad Request' },
      { status: 401, expected: 'Unauthorized' },
      { status: 403, expected: 'Forbidden' },
      { status: 404, expected: 'Not Found' },
      { status: 500, expected: 'Internal Server Error' },
      { status: 502, expected: 'Bad Gateway' },
      { status: 503, expected: 'Service Unavailable' },
      { status: 999, expected: 'Unknown Error' },
    ];

    statusTestCases.forEach(({ status, expected }) => {
      it(`should handle HTTP ${status} status`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({}),
        } as Response);

        const result = await apiService.enrollPublicKey(validConfig, 'test-key');

        expect(result.success).toBe(false);
        expect(result.message).toContain(expected);
      });
    });
  });
});