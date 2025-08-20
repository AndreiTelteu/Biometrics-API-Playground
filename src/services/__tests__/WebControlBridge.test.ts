/**
 * WebControlBridge Service Tests
 * Tests for the web control bridge service integration
 */

import { WebControlBridge } from '../WebControlBridge';
import { biometricService } from '../BiometricService';
import { biometricAPIService } from '../BiometricAPIService';
import { EndpointConfig, OperationResult, BiometricStatus } from '../../types';

// Mock the services
jest.mock('../BiometricService');
jest.mock('../BiometricAPIService');

const mockBiometricService = biometricService as jest.Mocked<typeof biometricService>;
const mockBiometricAPIService = biometricAPIService as jest.Mocked<typeof biometricAPIService>;

describe('WebControlBridge', () => {
  let bridge: WebControlBridge;
  let mockStateChangeListener: jest.Mock;
  let mockLogUpdateListener: jest.Mock;
  let mockOperationStatusListener: jest.Mock;

  beforeEach(() => {
    bridge = new WebControlBridge();
    mockStateChangeListener = jest.fn();
    mockLogUpdateListener = jest.fn();
    mockOperationStatusListener = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = bridge.getAppState();
      
      expect(state.biometricStatus.available).toBe(false);
      expect(state.keysExist).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.logs).toEqual([]);
      expect(state.operationStatus).toBeNull();
    });

    it('should initialize with provided state', () => {
      const initialState = {
        biometricStatus: { available: true, biometryType: 'FaceID' as const },
        keysExist: true,
      };

      const bridgeWithState = new WebControlBridge(initialState);
      const state = bridgeWithState.getAppState();

      expect(state.biometricStatus.available).toBe(true);
      expect(state.biometricStatus.biometryType).toBe('FaceID');
      expect(state.keysExist).toBe(true);
    });

    it('should initialize biometric status and keys on initialize()', async () => {
      const mockBiometricStatus: BiometricStatus = {
        available: true,
        biometryType: 'TouchID',
      };

      mockBiometricService.checkBiometricAvailability.mockResolvedValue(mockBiometricStatus);
      mockBiometricService.checkKeysExist.mockResolvedValue(true);

      await bridge.initialize();

      const state = bridge.getAppState();
      expect(state.biometricStatus).toEqual(mockBiometricStatus);
      expect(state.keysExist).toBe(true);
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].message).toContain('initialized successfully');
    });

    it('should handle initialization errors gracefully', async () => {
      mockBiometricService.checkBiometricAvailability.mockRejectedValue(
        new Error('Sensor not available')
      );

      await bridge.initialize();

      const state = bridge.getAppState();
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].status).toBe('error');
      expect(state.logs[0].message).toContain('Failed to initialize');
    });
  });

  describe('enrollment operations', () => {
    const mockEnrollConfig: EndpointConfig = {
      url: 'https://api.example.com/enroll',
      method: 'POST',
      headers: { 'Authorization': 'Bearer token' },
    };

    beforeEach(() => {
      // Set up successful biometric status
      bridge['state'].biometricStatus = { available: true, biometryType: 'FaceID' };
    });

    it('should execute enrollment successfully with backend', async () => {
      const mockPublicKey = 'mock-public-key-12345';
      const mockCreateKeysResult: OperationResult = {
        success: true,
        message: 'Keys created',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      };
      const mockEnrollResult: OperationResult = {
        success: true,
        message: 'Enrolled successfully',
        data: { id: 'user-123' },
        timestamp: new Date(),
      };

      mockBiometricService.createKeys.mockResolvedValue(mockCreateKeysResult);
      mockBiometricAPIService.enrollPublicKey.mockResolvedValue(mockEnrollResult);

      const result = await bridge.executeEnrollment(mockEnrollConfig);

      expect(result.success).toBe(true);
      expect(result.data.publicKey).toBe(mockPublicKey);
      expect(result.data.backendResponse).toEqual(mockEnrollResult.data);
      expect(mockBiometricService.createKeys).toHaveBeenCalledWith(
        'Authenticate to create biometric keys for enrollment'
      );
      expect(mockBiometricAPIService.enrollPublicKey).toHaveBeenCalledWith(
        mockEnrollConfig,
        mockPublicKey
      );

      const state = bridge.getAppState();
      expect(state.keysExist).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.operationStatus).toEqual(result);
    });

    it('should execute enrollment locally when no endpoint configured', async () => {
      const mockPublicKey = 'mock-public-key-12345';
      const mockCreateKeysResult: OperationResult = {
        success: true,
        message: 'Keys created',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      };

      mockBiometricService.createKeys.mockResolvedValue(mockCreateKeysResult);

      const localConfig: EndpointConfig = { url: '', method: 'POST' };
      const result = await bridge.executeEnrollment(localConfig);

      expect(result.success).toBe(true);
      expect(result.data.publicKey).toBe(mockPublicKey);
      expect(result.data.localOnly).toBe(true);
      expect(mockBiometricAPIService.enrollPublicKey).not.toHaveBeenCalled();

      const state = bridge.getAppState();
      expect(state.keysExist).toBe(true);
    });

    it('should handle biometric unavailable error', async () => {
      bridge['state'].biometricStatus = { available: false, error: 'No sensor' };

      const result = await bridge.executeEnrollment(mockEnrollConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Biometric sensors not available');
      expect(mockBiometricService.createKeys).not.toHaveBeenCalled();

      const state = bridge.getAppState();
      expect(state.isLoading).toBe(false);
    });

    it('should handle key creation failure', async () => {
      const mockCreateKeysResult: OperationResult = {
        success: false,
        message: 'User cancelled',
        timestamp: new Date(),
      };

      mockBiometricService.createKeys.mockResolvedValue(mockCreateKeysResult);

      const result = await bridge.executeEnrollment(mockEnrollConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Key creation failed');

      const state = bridge.getAppState();
      expect(state.keysExist).toBe(false);
    });

    it('should handle backend enrollment failure', async () => {
      const mockPublicKey = 'mock-public-key-12345';
      const mockCreateKeysResult: OperationResult = {
        success: true,
        message: 'Keys created',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      };
      const mockEnrollResult: OperationResult = {
        success: false,
        message: 'Server error',
        timestamp: new Date(),
      };

      mockBiometricService.createKeys.mockResolvedValue(mockCreateKeysResult);
      mockBiometricAPIService.enrollPublicKey.mockResolvedValue(mockEnrollResult);

      const result = await bridge.executeEnrollment(mockEnrollConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Backend enrollment failed');

      const state = bridge.getAppState();
      expect(state.keysExist).toBe(false); // Should reset on backend failure
    });
  });

  describe('validation operations', () => {
    const mockValidateConfig: EndpointConfig = {
      url: 'https://api.example.com/validate',
      method: 'POST',
      customPayload: 'custom-payload-{date}',
    };

    beforeEach(() => {
      // Set up successful biometric status and existing keys
      bridge['state'].biometricStatus = { available: true, biometryType: 'FaceID' };
      bridge['state'].keysExist = true;
    });

    it('should execute validation successfully with backend', async () => {
      const mockPayload = 'processed-payload-2023-01-01';
      const mockSignature = 'mock-signature-abcdef';
      const mockSignatureResult: OperationResult = {
        success: true,
        message: 'Signature created',
        data: { signature: mockSignature },
        timestamp: new Date(),
      };
      const mockValidationResult: OperationResult = {
        success: true,
        message: 'Validation successful',
        data: { valid: true },
        timestamp: new Date(),
      };

      mockBiometricService.generatePayload.mockReturnValue(mockPayload);
      mockBiometricService.createSignature.mockResolvedValue(mockSignatureResult);
      mockBiometricAPIService.validateSignature.mockResolvedValue(mockValidationResult);

      const result = await bridge.executeValidation(mockValidateConfig);

      expect(result.success).toBe(true);
      expect(result.data.signature).toBe(mockSignature);
      expect(result.data.payload).toBe(mockPayload);
      expect(result.data.backendResponse).toEqual(mockValidationResult.data);
      expect(mockBiometricService.generatePayload).toHaveBeenCalledWith(
        mockValidateConfig.customPayload
      );
      expect(mockBiometricService.createSignature).toHaveBeenCalledWith({
        promptMessage: 'Authenticate to create signature for validation',
        payload: mockPayload,
        cancelButtonText: 'Cancel Validation',
      });
      expect(mockBiometricAPIService.validateSignature).toHaveBeenCalledWith(
        mockValidateConfig,
        mockSignature,
        mockPayload
      );

      const state = bridge.getAppState();
      expect(state.isLoading).toBe(false);
      expect(state.operationStatus).toEqual(result);
    });

    it('should execute validation locally when no endpoint configured', async () => {
      const mockPayload = 'timestamp-payload';
      const mockSignature = 'mock-signature-abcdef';
      const mockSignatureResult: OperationResult = {
        success: true,
        message: 'Signature created',
        data: { signature: mockSignature },
        timestamp: new Date(),
      };

      mockBiometricService.generatePayload.mockReturnValue(mockPayload);
      mockBiometricService.createSignature.mockResolvedValue(mockSignatureResult);

      const localConfig: EndpointConfig = { url: '', method: 'POST' };
      const result = await bridge.executeValidation(localConfig);

      expect(result.success).toBe(true);
      expect(result.data.signature).toBe(mockSignature);
      expect(result.data.localOnly).toBe(true);
      expect(mockBiometricAPIService.validateSignature).not.toHaveBeenCalled();
    });

    it('should handle biometric unavailable error', async () => {
      bridge['state'].biometricStatus = { available: false, error: 'No sensor' };

      const result = await bridge.executeValidation(mockValidateConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Biometric sensors not available');
      expect(mockBiometricService.createSignature).not.toHaveBeenCalled();
    });

    it('should handle no keys exist error', async () => {
      bridge['state'].keysExist = false;

      const result = await bridge.executeValidation(mockValidateConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No biometric keys found');
      expect(mockBiometricService.createSignature).not.toHaveBeenCalled();
    });

    it('should handle signature creation failure', async () => {
      const mockPayload = 'test-payload';
      const mockSignatureResult: OperationResult = {
        success: false,
        message: 'User cancelled',
        timestamp: new Date(),
      };

      mockBiometricService.generatePayload.mockReturnValue(mockPayload);
      mockBiometricService.createSignature.mockResolvedValue(mockSignatureResult);

      const result = await bridge.executeValidation(mockValidateConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Signature creation failed');
    });

    it('should handle backend validation failure', async () => {
      const mockPayload = 'test-payload';
      const mockSignature = 'mock-signature';
      const mockSignatureResult: OperationResult = {
        success: true,
        message: 'Signature created',
        data: { signature: mockSignature },
        timestamp: new Date(),
      };
      const mockValidationResult: OperationResult = {
        success: false,
        message: 'Invalid signature',
        timestamp: new Date(),
      };

      mockBiometricService.generatePayload.mockReturnValue(mockPayload);
      mockBiometricService.createSignature.mockResolvedValue(mockSignatureResult);
      mockBiometricAPIService.validateSignature.mockResolvedValue(mockValidationResult);

      const result = await bridge.executeValidation(mockValidateConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Backend validation failed');
    });
  });

  describe('delete keys operations', () => {
    it('should delete keys successfully', async () => {
      const mockDeleteResult: OperationResult = {
        success: true,
        message: 'Keys deleted',
        data: { keysDeleted: true },
        timestamp: new Date(),
      };

      mockBiometricService.deleteKeys.mockResolvedValue(mockDeleteResult);

      const result = await bridge.deleteKeys();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDeleteResult.data);
      expect(mockBiometricService.deleteKeys).toHaveBeenCalled();

      const state = bridge.getAppState();
      expect(state.keysExist).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.operationStatus).toEqual(result);
    });

    it('should handle delete keys failure', async () => {
      const mockDeleteResult: OperationResult = {
        success: false,
        message: 'No keys to delete',
        timestamp: new Date(),
      };

      mockBiometricService.deleteKeys.mockResolvedValue(mockDeleteResult);

      const result = await bridge.deleteKeys();

      expect(result.success).toBe(false);
      expect(result.message).toBe(mockDeleteResult.message);

      const state = bridge.getAppState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('configuration management', () => {
    it('should update enroll endpoint configuration', async () => {
      const newConfig: EndpointConfig = {
        url: 'https://new-api.example.com/enroll',
        method: 'PUT',
        headers: { 'X-API-Key': 'new-key' },
      };

      await bridge.updateConfiguration('enroll', newConfig);

      const state = bridge.getAppState();
      expect(state.enrollEndpoint).toEqual(newConfig);
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].message).toContain('enroll endpoint configuration updated');
    });

    it('should update validate endpoint configuration', async () => {
      const newConfig: EndpointConfig = {
        url: 'https://new-api.example.com/validate',
        method: 'PATCH',
        customPayload: 'new-payload-{date}',
      };

      await bridge.updateConfiguration('validate', newConfig);

      const state = bridge.getAppState();
      expect(state.validateEndpoint).toEqual(newConfig);
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].message).toContain('validate endpoint configuration updated');
    });
  });

  describe('state synchronization', () => {
    it('should sync state from mobile app', () => {
      const mobileAppState = {
        biometricStatus: { available: true, biometryType: 'TouchID' as const },
        keysExist: true,
        isLoading: false,
      };

      bridge.syncFromMobileApp(mobileAppState);

      const state = bridge.getAppState();
      expect(state.biometricStatus).toEqual(mobileAppState.biometricStatus);
      expect(state.keysExist).toBe(mobileAppState.keysExist);
      expect(state.isLoading).toBe(mobileAppState.isLoading);
    });
  });

  describe('event listeners', () => {
    it('should notify state change listeners', async () => {
      const unsubscribe = bridge.onStateChange(mockStateChangeListener);

      await bridge.updateConfiguration('enroll', {
        url: 'https://test.com',
        method: 'POST',
      });

      expect(mockStateChangeListener).toHaveBeenCalled();
      const calledState = mockStateChangeListener.mock.calls[0][0];
      expect(calledState.enrollEndpoint.url).toBe('https://test.com');

      unsubscribe();
    });

    it('should notify log update listeners', async () => {
      const unsubscribe = bridge.onLogUpdate(mockLogUpdateListener);

      await bridge.updateConfiguration('enroll', {
        url: 'https://test.com',
        method: 'POST',
      });

      expect(mockLogUpdateListener).toHaveBeenCalled();
      const logEntry = mockLogUpdateListener.mock.calls[0][0];
      expect(logEntry.message).toContain('enroll endpoint configuration updated');

      unsubscribe();
    });

    it('should notify operation status listeners', async () => {
      bridge['state'].biometricStatus = { available: true, biometryType: 'FaceID' };
      
      const mockCreateKeysResult: OperationResult = {
        success: true,
        message: 'Keys created',
        data: { publicKey: 'test-key' },
        timestamp: new Date(),
      };

      mockBiometricService.createKeys.mockResolvedValue(mockCreateKeysResult);

      const unsubscribe = bridge.onOperationStatus(mockOperationStatusListener);

      await bridge.executeEnrollment({ url: '', method: 'POST' });

      expect(mockOperationStatusListener).toHaveBeenCalledTimes(2); // start and complete
      
      const startCall = mockOperationStatusListener.mock.calls[0][0];
      expect(startCall.message).toContain('enroll operation started');
      
      const completeCall = mockOperationStatusListener.mock.calls[1][0];
      expect(completeCall.data.status).toBe('completed');

      unsubscribe();
    });

    it('should remove listeners when unsubscribe is called', () => {
      const unsubscribe = bridge.onStateChange(mockStateChangeListener);
      unsubscribe();

      bridge['updateState']({ isLoading: true });

      expect(mockStateChangeListener).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should clear logs', () => {
      // Add some logs first
      bridge['addLog']({
        id: '1',
        timestamp: new Date(),
        operation: 'enroll',
        status: 'success',
        message: 'Test log',
      });

      expect(bridge.getAppState().logs).toHaveLength(1);

      bridge.clearLogs();

      const state = bridge.getAppState();
      expect(state.logs).toHaveLength(1); // Only the "Logs cleared" message
      expect(state.logs[0].message).toBe('Logs cleared');
    });

    it('should cancel current operation', () => {
      bridge['currentOperationId'] = 'test-operation-123';
      bridge['state'].isLoading = true;

      bridge.cancelCurrentOperation();

      const state = bridge.getAppState();
      expect(state.isLoading).toBe(false);
      expect(bridge['currentOperationId']).toBeNull();
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].message).toContain('Operation cancelled');
    });

    it('should not cancel when no operation is running', () => {
      bridge['currentOperationId'] = null;

      bridge.cancelCurrentOperation();

      const state = bridge.getAppState();
      expect(state.logs).toHaveLength(0);
    });
  });
});