/**
 * Unit tests for biometric enrollment service functionality
 * Tests the enrollment flow logic without UI dependencies
 */

import { biometricService, biometricAPIService } from '../src/services';
import type { EndpointConfig } from '../src/types';

// Mock react-native-biometrics
jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn(),
    biometricKeysExist: jest.fn(),
    createKeys: jest.fn(),
    deleteKeys: jest.fn(),
    createSignature: jest.fn(),
    simplePrompt: jest.fn(),
  })),
  BiometryTypes: {
    TouchID: 'TouchID',
    FaceID: 'FaceID',
    Biometrics: 'Biometrics',
  },
}));

describe('Enrollment Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch globally
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('BiometricService Enrollment', () => {
    it('should create biometric keys successfully', async () => {
      const mockPublicKey = 'mock-public-key-12345';
      
      // Mock the react-native-biometrics createKeys method
      const mockCreateKeys = jest.fn().mockResolvedValue({
        publicKey: mockPublicKey,
      });

      // Access the mocked constructor and set up the mock
      const ReactNativeBiometrics = require('react-native-biometrics').default;
      ReactNativeBiometrics.mockImplementation(() => ({
        createKeys: mockCreateKeys,
      }));

      const result = await biometricService.createKeys('Test enrollment');

      expect(result.success).toBe(true);
      expect(result.data.publicKey).toBe(mockPublicKey);
      expect(result.message).toBe('Biometric keys created successfully');
      expect(mockCreateKeys).toHaveBeenCalled();
    });

    it('should handle biometric key creation failure', async () => {
      const mockError = new Error('User cancelled authentication');
      
      const mockCreateKeys = jest.fn().mockRejectedValue(mockError);

      const ReactNativeBiometrics = require('react-native-biometrics').default;
      ReactNativeBiometrics.mockImplementation(() => ({
        createKeys: mockCreateKeys,
      }));

      const result = await biometricService.createKeys('Test enrollment');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create biometric keys');
    });

    it('should check biometric availability correctly', async () => {
      const mockAvailabilityResult = {
        available: true,
        biometryType: 'TouchID',
      };
      
      const mockIsSensorAvailable = jest.fn().mockResolvedValue(mockAvailabilityResult);

      const ReactNativeBiometrics = require('react-native-biometrics').default;
      ReactNativeBiometrics.mockImplementation(() => ({
        isSensorAvailable: mockIsSensorAvailable,
      }));

      const result = await biometricService.checkBiometricAvailability();

      expect(result.available).toBe(true);
      expect(result.biometryType).toBe('TouchID');
      expect(mockIsSensorAvailable).toHaveBeenCalled();
    });

    it('should check if keys exist', async () => {
      const mockKeysExist = jest.fn().mockResolvedValue({ keysExist: true });

      const ReactNativeBiometrics = require('react-native-biometrics').default;
      ReactNativeBiometrics.mockImplementation(() => ({
        biometricKeysExist: mockKeysExist,
      }));

      const result = await biometricService.checkKeysExist();

      expect(result).toBe(true);
      expect(mockKeysExist).toHaveBeenCalled();
    });
  });

  describe('BiometricAPIService Enrollment', () => {
    const mockEndpointConfig: EndpointConfig = {
      url: 'https://api.example.com/enroll',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
      },
    };

    it('should enroll public key successfully', async () => {
      const mockPublicKey = 'mock-public-key-api-test';
      const mockResponse = {
        success: true,
        userId: 'user-123',
        enrolled: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await biometricAPIService.enrollPublicKey(
        mockEndpointConfig,
        mockPublicKey
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Enrollment successful');
      expect(result.data).toEqual(mockResponse);

      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpointConfig.url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
          body: expect.stringContaining(mockPublicKey),
        })
      );
    });

    it('should handle enrollment API failure', async () => {
      const mockPublicKey = 'mock-public-key-fail';
      const mockErrorResponse = {
        error: 'Invalid public key format',
        code: 'INVALID_KEY',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue(mockErrorResponse),
      });

      const result = await biometricAPIService.enrollPublicKey(
        mockEndpointConfig,
        mockPublicKey
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid public key format');
    });

    it('should handle network timeout', async () => {
      const mockPublicKey = 'mock-public-key-timeout';

      (global.fetch as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Request timeout'), { name: 'AbortError' })
      );

      const result = await biometricAPIService.enrollPublicKey(
        mockEndpointConfig,
        mockPublicKey
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Request timeout');
    });

    it('should validate endpoint configuration', async () => {
      const invalidConfig: EndpointConfig = {
        url: 'invalid-url',
        method: 'INVALID' as any,
      };

      const result = await biometricAPIService.enrollPublicKey(
        invalidConfig,
        'test-key'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid endpoint configuration');
    });

    it('should handle different HTTP methods', async () => {
      const putConfig: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'PUT',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const result = await biometricAPIService.enrollPublicKey(
        putConfig,
        'test-key'
      );

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        putConfig.url,
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should handle GET method without body', async () => {
      const getConfig: EndpointConfig = {
        url: 'https://api.example.com/enroll?key=test-key',
        method: 'GET',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const result = await biometricAPIService.enrollPublicKey(
        getConfig,
        'test-key'
      );

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        getConfig.url,
        expect.objectContaining({
          method: 'GET',
        })
      );

      // Verify no body was sent for GET request
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.body).toBeUndefined();
    });
  });

  describe('End-to-End Enrollment Flow', () => {
    it('should complete full enrollment flow successfully', async () => {
      const mockPublicKey = 'mock-public-key-e2e';
      const mockEndpointConfig: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      // Mock biometric service
      const mockCreateKeys = jest.fn().mockResolvedValue({
        publicKey: mockPublicKey,
      });

      const ReactNativeBiometrics = require('react-native-biometrics').default;
      ReactNativeBiometrics.mockImplementation(() => ({
        createKeys: mockCreateKeys,
      }));

      // Mock API service
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, userId: 'user-123' }),
      });

      // Execute enrollment flow
      const keyResult = await biometricService.createKeys('Test enrollment');
      expect(keyResult.success).toBe(true);

      const enrollResult = await biometricAPIService.enrollPublicKey(
        mockEndpointConfig,
        keyResult.data.publicKey
      );
      expect(enrollResult.success).toBe(true);

      // Verify the complete flow
      expect(mockCreateKeys).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpointConfig.url,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(mockPublicKey),
        })
      );
    });

    it('should handle partial failure in enrollment flow', async () => {
      const mockPublicKey = 'mock-public-key-partial-fail';
      const mockEndpointConfig: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      // Mock successful key creation
      const mockCreateKeys = jest.fn().mockResolvedValue({
        publicKey: mockPublicKey,
      });

      const ReactNativeBiometrics = require('react-native-biometrics').default;
      ReactNativeBiometrics.mockImplementation(() => ({
        createKeys: mockCreateKeys,
      }));

      // Mock API failure
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ error: 'Server error' }),
      });

      // Execute enrollment flow
      const keyResult = await biometricService.createKeys('Test enrollment');
      expect(keyResult.success).toBe(true);

      const enrollResult = await biometricAPIService.enrollPublicKey(
        mockEndpointConfig,
        keyResult.data.publicKey
      );
      expect(enrollResult.success).toBe(false);
      expect(enrollResult.message).toBe('Server error');
    });
  });
});