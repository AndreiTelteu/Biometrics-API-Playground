/**
 * End-to-end tests for validation flow with signature verification
 * Tests the complete validation workflow logic and backend integration
 */

import { biometricService, biometricAPIService } from '../src/services';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock react-native-biometrics
jest.mock('react-native-biometrics', () => {
  const mockInstance = {
    isSensorAvailable: jest.fn(),
    biometricKeysExist: jest.fn(),
    createSignature: jest.fn(),
    createKeys: jest.fn(),
    deleteKeys: jest.fn(),
  };
  
  return jest.fn().mockImplementation(() => mockInstance);
});

import ReactNativeBiometrics from 'react-native-biometrics';

describe('Validation Flow End-to-End Tests', () => {
  let mockRNBiometrics: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked instance
    mockRNBiometrics = new (ReactNativeBiometrics as any)();
    
    // Default successful biometric setup
    mockRNBiometrics.isSensorAvailable.mockResolvedValue({
      available: true,
      biometryType: 'FaceID',
    });
    
    mockRNBiometrics.biometricKeysExist.mockResolvedValue({
      keysExist: true,
    });
  });

  describe('Successful Validation Flow', () => {
    it('should complete full validation flow with backend verification', async () => {
      // Mock successful signature creation
      const mockSignature = 'mock-signature-12345';
      
      mockRNBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: mockSignature,
      });

      // Mock successful backend validation
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve({
          valid: true,
          message: 'Signature validated successfully',
        }),
      });

      // Test the validation flow directly through services
      const payload = biometricService.generateTimestampPayload();
      expect(payload).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Test signature creation
      const signatureResult = await biometricService.createSignature({
        promptMessage: 'Authenticate to create signature for validation',
        payload,
        cancelButtonText: 'Cancel Validation',
      });

      expect(signatureResult.success).toBe(true);
      expect(signatureResult.data.signature).toBe(mockSignature);

      // Test backend validation
      const validationResult = await biometricAPIService.validateSignature(
        {
          url: 'https://api.example.com/validate',
          method: 'POST',
        },
        mockSignature,
        payload
      );

      expect(validationResult.success).toBe(true);
      expect(validationResult.data.valid).toBe(true);

      // Verify signature creation was called with correct parameters
      expect(mockRNBiometrics.createSignature).toHaveBeenCalledWith({
        promptMessage: 'Authenticate to create signature for validation',
        payload,
        cancelButtonText: 'Cancel Validation',
      });

      // Verify backend API was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/validate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining(mockSignature),
        })
      );
    });

    it('should handle validation without backend endpoint configured', async () => {
      const mockSignature = 'mock-signature-local-only';
      mockRNBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: mockSignature,
      });

      // Test the validation flow directly through services
      const payload = biometricService.generateTimestampPayload();

      // Test signature creation
      const signatureResult = await biometricService.createSignature({
        promptMessage: 'Authenticate to create signature for validation',
        payload,
        cancelButtonText: 'Cancel Validation',
      });

      expect(signatureResult.success).toBe(true);
      expect(signatureResult.data.signature).toBe(mockSignature);
      expect(signatureResult.data.payload).toBe(payload);

      // Verify no backend call was made
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling in Validation Flow', () => {
    it('should handle biometric sensors not available', async () => {
      mockRNBiometrics.isSensorAvailable.mockResolvedValue({
        available: false,
        error: 'No biometric sensors found',
      });

      const status = await biometricService.checkBiometricAvailability();
      expect(status.available).toBe(false);
      expect(status.error).toBe('No biometric sensors found');
    });

    it('should handle no biometric keys enrolled', async () => {
      mockRNBiometrics.biometricKeysExist.mockResolvedValue({
        keysExist: false,
      });

      const keysExist = await biometricService.checkKeysExist();
      expect(keysExist).toBe(false);
    });

    it('should handle signature creation failure', async () => {
      mockRNBiometrics.createSignature.mockResolvedValue({
        success: false,
        error: 'User cancelled authentication',
      });

      const payload = biometricService.generateTimestampPayload();
      const signatureResult = await biometricService.createSignature({
        promptMessage: 'Authenticate to create signature for validation',
        payload,
        cancelButtonText: 'Cancel Validation',
      });

      expect(signatureResult.success).toBe(false);
      expect(signatureResult.message).toBe('User cancelled authentication');
    });

    it('should handle backend validation failure', async () => {
      const mockSignature = 'mock-signature-invalid';
      mockRNBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: mockSignature,
      });

      // Mock backend validation failure
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve({
          error: 'Invalid signature format',
        }),
      });

      const payload = biometricService.generateTimestampPayload();
      const validationResult = await biometricAPIService.validateSignature(
        {
          url: 'https://api.example.com/validate',
          method: 'POST',
        },
        mockSignature,
        payload
      );

      expect(validationResult.success).toBe(false);
      expect(validationResult.message).toBe('Invalid signature format');
    });

    it('should handle network timeout during validation', async () => {
      const mockSignature = 'mock-signature-timeout';
      mockRNBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: mockSignature,
      });

      // Mock network timeout
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Request timeout'));

      const payload = biometricService.generateTimestampPayload();
      const validationResult = await biometricAPIService.validateSignature(
        {
          url: 'https://api.example.com/validate',
          method: 'POST',
        },
        mockSignature,
        payload
      );

      expect(validationResult.success).toBe(false);
      expect(validationResult.message).toContain('Request timeout');
    });
  });

  describe('Validation Flow Service Integration', () => {
    it('should generate valid timestamp payload', () => {
      const payload = biometricService.generateTimestampPayload();
      expect(payload).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify it's a recent timestamp (within last minute)
      const payloadTime = new Date(payload);
      const now = new Date();
      const timeDiff = now.getTime() - payloadTime.getTime();
      expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
    });

    it('should validate biometric availability check', async () => {
      mockRNBiometrics.isSensorAvailable.mockResolvedValue({
        available: true,
        biometryType: 'FaceID',
      });

      const status = await biometricService.checkBiometricAvailability();
      expect(status.available).toBe(true);
      expect(status.biometryType).toBe('FaceID');
    });
  });

  describe('Validation Response Handling', () => {
    it('should handle detailed validation response information', async () => {
      const mockValidationResponse = {
        valid: true,
        message: 'Signature validated successfully',
        userId: 'user123',
        timestamp: '2024-01-15T10:30:00.000Z',
      };

      const mockSignature = 'mock-signature-detailed';
      mockRNBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: mockSignature,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve(mockValidationResponse),
      });

      const payload = biometricService.generateTimestampPayload();
      const validationResult = await biometricAPIService.validateSignature(
        {
          url: 'https://api.example.com/validate',
          method: 'POST',
        },
        mockSignature,
        payload
      );

      expect(validationResult.success).toBe(true);
      expect(validationResult.data).toEqual(mockValidationResponse);
    });

    it('should handle different HTTP response formats', async () => {
      const mockSignature = 'mock-signature-text-response';
      mockRNBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: mockSignature,
      });

      // Mock text response instead of JSON
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: () => 'text/plain',
        },
        text: () => Promise.resolve('Validation successful'),
      });

      const payload = biometricService.generateTimestampPayload();
      const validationResult = await biometricAPIService.validateSignature(
        {
          url: 'https://api.example.com/validate',
          method: 'POST',
        },
        mockSignature,
        payload
      );

      expect(validationResult.success).toBe(true);
      expect(validationResult.data).toBe('Validation successful');
    });
  });
});