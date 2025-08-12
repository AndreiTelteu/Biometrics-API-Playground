/**
 * Unit tests for BiometricService
 * Tests all biometric operations with mocked react-native-biometrics
 */

import { BiometricService } from '../services/BiometricService';
import ReactNativeBiometrics from 'react-native-biometrics';

// Mock react-native-biometrics
jest.mock('react-native-biometrics', () => {
  return jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn(),
    biometricKeysExist: jest.fn(),
    createKeys: jest.fn(),
    deleteKeys: jest.fn(),
    createSignature: jest.fn(),
    simplePrompt: jest.fn(),
  }));
});

describe('BiometricService', () => {
  let biometricService: BiometricService;
  let mockRNBiometrics: jest.Mocked<ReactNativeBiometrics>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create new service instance
    biometricService = new BiometricService();
    
    // Get the mocked instance
    mockRNBiometrics = (biometricService as any).rnBiometrics;
  });

  describe('checkBiometricAvailability', () => {
    it('should return available status when biometrics are available', async () => {
      // Arrange
      const mockResult = {
        available: true,
        biometryType: 'TouchID',
        error: undefined,
      };
      mockRNBiometrics.isSensorAvailable.mockResolvedValue(mockResult);

      // Act
      const result = await biometricService.checkBiometricAvailability();

      // Assert
      expect(result).toEqual({
        available: true,
        biometryType: 'TouchID',
        error: undefined,
      });
      expect(mockRNBiometrics.isSensorAvailable).toHaveBeenCalledTimes(1);
    });

    it('should return unavailable status when biometrics are not available', async () => {
      // Arrange
      const mockResult = {
        available: false,
        biometryType: undefined,
        error: 'Biometrics not available',
      };
      mockRNBiometrics.isSensorAvailable.mockResolvedValue(mockResult);

      // Act
      const result = await biometricService.checkBiometricAvailability();

      // Assert
      expect(result).toEqual({
        available: false,
        biometryType: undefined,
        error: 'Biometrics not available',
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Sensor check failed');
      mockRNBiometrics.isSensorAvailable.mockRejectedValue(mockError);

      // Act
      const result = await biometricService.checkBiometricAvailability();

      // Assert
      expect(result).toEqual({
        available: false,
        biometryType: undefined,
        error: 'Sensor check failed',
      });
    });
  });

  describe('checkKeysExist', () => {
    it('should return true when keys exist', async () => {
      // Arrange
      mockRNBiometrics.biometricKeysExist.mockResolvedValue({ keysExist: true });

      // Act
      const result = await biometricService.checkKeysExist();

      // Assert
      expect(result).toBe(true);
      expect(mockRNBiometrics.biometricKeysExist).toHaveBeenCalledTimes(1);
    });

    it('should return false when keys do not exist', async () => {
      // Arrange
      mockRNBiometrics.biometricKeysExist.mockResolvedValue({ keysExist: false });

      // Act
      const result = await biometricService.checkKeysExist();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when an error occurs', async () => {
      // Arrange
      mockRNBiometrics.biometricKeysExist.mockRejectedValue(new Error('Keys check failed'));

      // Act
      const result = await biometricService.checkKeysExist();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createKeys', () => {
    it('should successfully create keys and return public key', async () => {
      // Arrange
      const mockPublicKey = 'mock-public-key-123';
      mockRNBiometrics.createKeys.mockResolvedValue({ publicKey: mockPublicKey });

      // Act
      const result = await biometricService.createKeys('Test prompt');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Biometric keys created successfully');
      expect(result.data).toEqual({ publicKey: mockPublicKey });
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockRNBiometrics.createKeys).toHaveBeenCalledTimes(1);
    });

    it('should handle key creation errors', async () => {
      // Arrange
      const mockError = new Error('Key creation failed');
      mockRNBiometrics.createKeys.mockRejectedValue(mockError);

      // Act
      const result = await biometricService.createKeys();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Key creation failed');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('deleteKeys', () => {
    it('should successfully delete keys', async () => {
      // Arrange
      mockRNBiometrics.deleteKeys.mockResolvedValue({ keysDeleted: true });

      // Act
      const result = await biometricService.deleteKeys();

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Biometric keys deleted successfully');
      expect(result.data).toEqual({ keysDeleted: true });
      expect(mockRNBiometrics.deleteKeys).toHaveBeenCalledTimes(1);
    });

    it('should handle case when no keys exist to delete', async () => {
      // Arrange
      mockRNBiometrics.deleteKeys.mockResolvedValue({ keysDeleted: false });

      // Act
      const result = await biometricService.deleteKeys();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('No keys found to delete');
      expect(result.data).toEqual({ keysDeleted: false });
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const mockError = new Error('Deletion failed');
      mockRNBiometrics.deleteKeys.mockRejectedValue(mockError);

      // Act
      const result = await biometricService.deleteKeys();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Deletion failed');
    });
  });

  describe('createSignature', () => {
    it('should successfully create signature', async () => {
      // Arrange
      const mockSignature = 'mock-signature-123';
      const payload = 'test-payload';
      const options = {
        promptMessage: 'Sign this payload',
        payload,
        cancelButtonText: 'Cancel',
      };
      
      mockRNBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: mockSignature,
      });

      // Act
      const result = await biometricService.createSignature(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Signature created successfully');
      expect(result.data).toEqual({
        signature: mockSignature,
        payload,
      });
      expect(mockRNBiometrics.createSignature).toHaveBeenCalledWith({
        promptMessage: options.promptMessage,
        payload: options.payload,
        cancelButtonText: 'Cancel',
      });
    });

    it('should handle signature creation failure', async () => {
      // Arrange
      const options = {
        promptMessage: 'Sign this payload',
        payload: 'test-payload',
      };
      
      mockRNBiometrics.createSignature.mockResolvedValue({
        success: false,
        error: 'User cancelled',
      });

      // Act
      const result = await biometricService.createSignature(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('User cancelled');
    });

    it('should handle signature creation errors', async () => {
      // Arrange
      const options = {
        promptMessage: 'Sign this payload',
        payload: 'test-payload',
      };
      
      mockRNBiometrics.createSignature.mockRejectedValue(new Error('Signature failed'));

      // Act
      const result = await biometricService.createSignature(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Signature failed');
    });
  });

  describe('simplePrompt', () => {
    it('should successfully authenticate with simple prompt', async () => {
      // Arrange
      const options = {
        promptMessage: 'Authenticate',
        fallbackPromptMessage: 'Use passcode',
        cancelButtonText: 'Cancel',
      };
      
      mockRNBiometrics.simplePrompt.mockResolvedValue({ success: true });

      // Act
      const result = await biometricService.simplePrompt(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Authentication successful');
      expect(mockRNBiometrics.simplePrompt).toHaveBeenCalledWith({
        promptMessage: options.promptMessage,
        fallbackPromptMessage: options.fallbackPromptMessage,
        cancelButtonText: 'Cancel',
      });
    });

    it('should handle authentication failure', async () => {
      // Arrange
      const options = { promptMessage: 'Authenticate' };
      
      mockRNBiometrics.simplePrompt.mockResolvedValue({
        success: false,
        error: 'Authentication failed',
      });

      // Act
      const result = await biometricService.simplePrompt(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Authentication failed');
    });

    it('should handle prompt errors', async () => {
      // Arrange
      const options = { promptMessage: 'Authenticate' };
      
      mockRNBiometrics.simplePrompt.mockRejectedValue(new Error('Prompt error'));

      // Act
      const result = await biometricService.simplePrompt(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Prompt error');
    });
  });

  describe('getPublicKey', () => {
    it('should return public key when keys exist', async () => {
      // Arrange
      const mockPublicKey = 'existing-public-key';
      mockRNBiometrics.biometricKeysExist.mockResolvedValue({ keysExist: true });
      mockRNBiometrics.createKeys.mockResolvedValue({ publicKey: mockPublicKey });

      // Act
      const result = await biometricService.getPublicKey();

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Public key retrieved successfully');
      expect(result.data).toEqual({ publicKey: mockPublicKey });
    });

    it('should return error when no keys exist', async () => {
      // Arrange
      mockRNBiometrics.biometricKeysExist.mockResolvedValue({ keysExist: false });

      // Act
      const result = await biometricService.getPublicKey();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('No biometric keys found. Please enroll first.');
    });

    it('should handle errors when retrieving public key', async () => {
      // Arrange
      mockRNBiometrics.biometricKeysExist.mockResolvedValue({ keysExist: true });
      mockRNBiometrics.createKeys.mockRejectedValue(new Error('Key retrieval failed'));

      // Act
      const result = await biometricService.getPublicKey();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Key retrieval failed');
    });
  });

  describe('generateTimestampPayload', () => {
    it('should generate ISO timestamp string', () => {
      // Act
      const timestamp = biometricService.generateTimestampPayload();

      // Assert
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('generatePayload', () => {
    it('should return custom payload when provided without template variables', () => {
      // Arrange
      const customPayload = 'my custom payload for signing';

      // Act
      const result = biometricService.generatePayload(customPayload);

      // Assert
      expect(result).toBe(customPayload);
    });

    it('should process template variables in custom payload', () => {
      // Arrange
      const customPayload = 'user_action_{date}';

      // Act
      const result = biometricService.generatePayload(customPayload);

      // Assert
      expect(result).toMatch(/^user_action_\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result).not.toBe(customPayload); // Should be different from template
    });

    it('should replace multiple {date} occurrences in template', () => {
      // Arrange
      const customPayload = 'start_{date}_middle_{date}_end';

      // Act
      const result = biometricService.generatePayload(customPayload);

      // Assert
      expect(result).toMatch(/^start_\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z_middle_\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z_end$/);
      expect(result).not.toContain('{date}'); // All templates should be replaced
    });

    it('should handle {date} template as the entire payload', () => {
      // Arrange
      const customPayload = '{date}';

      // Act
      const result = biometricService.generatePayload(customPayload);

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result)).toBeInstanceOf(Date);
    });

    it('should return timestamp when no custom payload provided', () => {
      // Act
      const result = biometricService.generatePayload();

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result)).toBeInstanceOf(Date);
    });

    it('should return timestamp when custom payload is empty string', () => {
      // Act
      const result = biometricService.generatePayload('');

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result)).toBeInstanceOf(Date);
    });

    it('should return timestamp when custom payload is undefined', () => {
      // Act
      const result = biometricService.generatePayload(undefined);

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result)).toBeInstanceOf(Date);
    });
  });

  describe('validateConfiguration', () => {
    it('should return success when biometrics are available', async () => {
      // Arrange
      const mockStatus = {
        available: true,
        biometryType: 'FaceID' as const,
        error: undefined,
      };
      mockRNBiometrics.isSensorAvailable.mockResolvedValue(mockStatus);

      // Act
      const result = await biometricService.validateConfiguration();

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Biometrics available: FaceID');
      expect(result.data).toEqual(mockStatus);
    });

    it('should return failure when biometrics are not available', async () => {
      // Arrange
      const mockStatus = {
        available: false,
        biometryType: undefined,
        error: 'Hardware not available',
      };
      mockRNBiometrics.isSensorAvailable.mockResolvedValue(mockStatus);

      // Act
      const result = await biometricService.validateConfiguration();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Biometrics not available: Hardware not available');
      expect(result.data).toEqual(mockStatus);
    });

    it('should handle validation errors', async () => {
      // Arrange
      mockRNBiometrics.isSensorAvailable.mockRejectedValue(new Error('Validation error'));

      // Act
      const result = await biometricService.validateConfiguration();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Biometrics not available: Validation error');
    });
  });
});