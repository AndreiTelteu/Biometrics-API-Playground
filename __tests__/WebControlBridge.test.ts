/**
 * WebControlBridge Unit Tests
 * Tests the bridge service that interfaces between web requests and biometric services
 */

import { WebControlBridge } from '../src/services/WebControlBridge';
import { EndpointConfig, OperationResult, BiometricStatus } from '../src/types';

// Mock dependencies
jest.mock('../src/services/BiometricService');
jest.mock('../src/services/BiometricAPIService');
jest.mock('../src/utils/ErrorHandler');
jest.mock('../src/utils/NetworkResilience');

// Mock the services
const mockBiometricService = {
  checkBiometricAvailability: jest.fn(),
  checkKeysExist: jest.fn(),
  createKeys: jest.fn(),
  createSignature: jest.fn(),
  deleteKeys: jest.fn(),
  generatePayload: jest.fn(),
};

const mockBiometricAPIService = {
  enrollPublicKey: jest.fn(),
  validateSignature: jest.fn(),
};

const mockErrorHandler = {
  handleApplicationError: jest.fn(),
  addErrorListener: jest.fn(),
};

const mockNetworkResilience = {
  executeWithRetry: jest.fn(),
  addConnectionListener: jest.fn(),
  initialize: jest.fn(),
};

// Set up mocks
jest.doMock('../src/services/BiometricService', () => ({
  biometricService: mockBiometricService,
}));

jest.doMock('../src/services/BiometricAPIService', () => ({
  biometricAPIService: mockBiometricAPIService,
}));

jest.doMock('../src/utils/ErrorHandler', () => ({
  errorHandler: mockErrorHandler,
}));

jest.doMock('../src/utils/NetworkResilience', () => ({
  networkResilience: mockNetworkResilience,
}));

describe('WebControlBridge', () => {
  let bridge: WebControlBridge;

  beforeEach(() => {
    bridge = new WebControlBridge();
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set up default mock implementations
    mockNetworkResilience.executeWithRetry.mockImplementation((fn) => fn());
    mockErrorHandler.handleApplicationError.mockImplementation((error) => ({
      message: error.message,
      userMessage: error.message,
      code: 'APP_ERROR',
    }));
  });

  afterEach(() => {
    // Clear any pending timeouts
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const state = bridge.getAppState();

      expect(state.biometricStatus.available).toBe(false);
      expect(state.keysExist).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.logs).toEqual([]);
      expect(state.operationStatus).toBeNull();
      expect(state.enrollEndpoint.url).toBe('');
      expect(state.validateEndpoint.url).toBe('');
    });

    test('should initialize with custom state', () => {
      const customState = {
        biometricStatus: { available: true, biometryType: 'FaceID' as const },
        keysExist: true,
      };

      const customBridge = new WebControlBridge(customState);
      const state = customBridge.getAppState();

      expect(state.biometricStatus.available).toBe(true);
      expect(state.biometricStatus.biometryType).toBe('FaceID');
      expect(state.keysExist).toBe(true);
    });

    test('should initialize services and check biometric availability', async () => {
      const mockBiometricStatus: BiometricStatus = {
        available: true,
        biometryType: 'TouchID',
      };

      mockBiometricService.checkBiometricAvailability.mockResolvedValue(mockBiometricStatus);
      mockBiometricService.checkKeysExist.mockResolvedValue(true);

      await bridge.initialize();

      expect(mockBiometricService.checkBiometricAvailability).toHaveBeenCalled();
      expect(mockBiometricService.checkKeysExist).toHaveBeenCalled();

      const state = bridge.getAppState();
      expect(state.biometricStatus).toEqual(mockBiometricStatus);
      expect(state.keysExist).toBe(true);
      expect(state.logs.length).toBeGreaterThan(0);
    });

    test('should handle initialization errors gracefully', async () => {
      const error = new Error('Biometric check failed');
      mockBiometricService.checkBiometricAvailability.mockRejectedValue(error);

      await expect(bridge.initialize()).rejects.toThrow('Biometric check failed');

      const state = bridge.getAppState();
      const errorLog = state.logs.find(log => log.status === 'error');
      expect(errorLog).toBeDefined();
      expect(errorLog!.message).toContain('Failed to initialize WebControlBridge');
    });
  });

  describe('Enrollment Operations', () => {
    beforeEach(async () => {
      // Set up successful biometric status
      bridge['state'].biometricStatus = { available: true, biometryType: 'TouchID' };
    });

    test('should execute enrollment successfully with endpoint', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      const mockPublicKey = 'mock-public-key-data';
      const mockBackendResponse = { success: true, userId: '123' };

      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        data: { publicKey: mockPublicKey },
      });

      mockBiometricAPIService.enrollPublicKey.mockResolvedValue({
        success: true,
        data: mockBackendResponse,
      });

      const result = await bridge.executeEnrollment(config);

      expect(result.success).toBe(true);
      expect(result.data.publicKey).toBe(mockPublicKey);
      expect(result.data.backendResponse).toEqual(mockBackendResponse);
      expect(result.data.endpoint).toBe(config.url);

      const state = bridge.getAppState();
      expect(state.keysExist).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.operationStatus).toEqual(result);
    });

    test('should execute enrollment successfully without endpoint', async () => {
      const config: EndpointConfig = {
        url: '',
        method: 'POST',
      };

      const mockPublicKey = 'mock-public-key-data';

      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        data: { publicKey: mockPublicKey },
      });

      const result = await bridge.executeEnrollment(config);

      expect(result.success).toBe(true);
      expect(result.data.publicKey).toBe(mockPublicKey);
      expect(result.data.localOnly).toBe(true);
      expect(mockBiometricAPIService.enrollPublicKey).not.toHaveBeenCalled();
    });

    test('should handle biometric unavailable error', async () => {
      bridge['state'].biometricStatus = { available: false, error: 'No biometric sensors' };

      const config: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      const result = await bridge.executeEnrollment(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Biometric sensors not available');
      expect(mockBiometricService.createKeys).not.toHaveBeenCalled();
    });

    test('should handle key creation failure', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      mockBiometricService.createKeys.mockResolvedValue({
        success: false,
        message: 'User cancelled',
      });

      const result = await bridge.executeEnrollment(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Key creation failed');

      const state = bridge.getAppState();
      expect(state.keysExist).toBe(false);
    });

    test('should handle backend enrollment failure', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        data: { publicKey: 'mock-key' },
      });

      mockBiometricAPIService.enrollPublicKey.mockResolvedValue({
        success: false,
        message: 'Server error',
      });

      const result = await bridge.executeEnrollment(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Backend enrollment failed');

      const state = bridge.getAppState();
      expect(state.keysExist).toBe(false); // Should reset on backend failure
    });

    test('should track operation status and notify listeners', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      const operationStatuses: OperationResult[] = [];
      bridge.onOperationStatus((status) => {
        operationStatuses.push(status);
      });

      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        data: { publicKey: 'mock-key' },
      });

      await bridge.executeEnrollment(config);

      expect(operationStatuses.length).toBeGreaterThan(0);
      expect(operationStatuses[0].data.status).toBe('started');
      expect(operationStatuses[operationStatuses.length - 1].data.status).toBe('completed');
    });
  });

  describe('Validation Operations', () => {
    beforeEach(() => {
      bridge['state'].biometricStatus = { available: true, biometryType: 'TouchID' };
      bridge['state'].keysExist = true;
    });

    test('should execute validation successfully with endpoint', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/validate',
        method: 'POST',
      };

      const mockPayload = 'mock-payload-data';
      const mockSignature = 'mock-signature-data';
      const mockBackendResponse = { valid: true, score: 0.95 };

      mockBiometricService.generatePayload.mockReturnValue(mockPayload);
      mockBiometricService.createSignature.mockResolvedValue({
        success: true,
        data: { signature: mockSignature },
      });
      mockBiometricAPIService.validateSignature.mockResolvedValue({
        success: true,
        data: mockBackendResponse,
      });

      const result = await bridge.executeValidation(config);

      expect(result.success).toBe(true);
      expect(result.data.signature).toBe(mockSignature);
      expect(result.data.payload).toBe(mockPayload);
      expect(result.data.backendResponse).toEqual(mockBackendResponse);
      expect(result.data.endpoint).toBe(config.url);
    });

    test('should execute validation successfully without endpoint', async () => {
      const config: EndpointConfig = {
        url: '',
        method: 'POST',
      };

      const mockPayload = 'mock-payload-data';
      const mockSignature = 'mock-signature-data';

      mockBiometricService.generatePayload.mockReturnValue(mockPayload);
      mockBiometricService.createSignature.mockResolvedValue({
        success: true,
        data: { signature: mockSignature },
      });

      const result = await bridge.executeValidation(config);

      expect(result.success).toBe(true);
      expect(result.data.signature).toBe(mockSignature);
      expect(result.data.payload).toBe(mockPayload);
      expect(result.data.localOnly).toBe(true);
      expect(mockBiometricAPIService.validateSignature).not.toHaveBeenCalled();
    });

    test('should handle no keys available error', async () => {
      bridge['state'].keysExist = false;

      const config: EndpointConfig = {
        url: 'https://api.example.com/validate',
        method: 'POST',
      };

      const result = await bridge.executeValidation(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No biometric keys found');
      expect(mockBiometricService.generatePayload).not.toHaveBeenCalled();
    });

    test('should handle signature creation failure', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/validate',
        method: 'POST',
      };

      mockBiometricService.generatePayload.mockReturnValue('mock-payload');
      mockBiometricService.createSignature.mockResolvedValue({
        success: false,
        message: 'User cancelled authentication',
      });

      const result = await bridge.executeValidation(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Signature creation failed');
    });

    test('should handle backend validation failure', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/validate',
        method: 'POST',
      };

      mockBiometricService.generatePayload.mockReturnValue('mock-payload');
      mockBiometricService.createSignature.mockResolvedValue({
        success: true,
        data: { signature: 'mock-signature' },
      });
      mockBiometricAPIService.validateSignature.mockResolvedValue({
        success: false,
        message: 'Invalid signature',
      });

      const result = await bridge.executeValidation(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Backend validation failed');
    });

    test('should handle custom payload correctly', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/validate',
        method: 'POST',
        customPayload: 'custom-{date}',
      };

      mockBiometricService.generatePayload.mockReturnValue('custom-2024-01-01');
      mockBiometricService.createSignature.mockResolvedValue({
        success: true,
        data: { signature: 'mock-signature' },
      });

      await bridge.executeValidation(config);

      expect(mockBiometricService.generatePayload).toHaveBeenCalledWith('custom-{date}');

      const state = bridge.getAppState();
      const payloadLog = state.logs.find(log => 
        log.message.includes('Generated custom payload')
      );
      expect(payloadLog).toBeDefined();
    });
  });

  describe('Delete Keys Operations', () => {
    test('should delete keys successfully', async () => {
      bridge['state'].keysExist = true;

      mockBiometricService.deleteKeys.mockResolvedValue({
        success: true,
        data: { message: 'Keys deleted' },
      });

      const result = await bridge.deleteKeys();

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Keys deleted');

      const state = bridge.getAppState();
      expect(state.keysExist).toBe(false);
      expect(state.operationStatus).toEqual(result);
    });

    test('should handle delete keys failure', async () => {
      mockBiometricService.deleteKeys.mockResolvedValue({
        success: false,
        message: 'Failed to delete keys',
      });

      const result = await bridge.deleteKeys();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to delete keys');

      const state = bridge.getAppState();
      expect(state.operationStatus).toEqual(result);
    });
  });

  describe('Configuration Management', () => {
    test('should update enroll configuration', async () => {
      const newConfig: EndpointConfig = {
        url: 'https://new-api.example.com/enroll',
        method: 'PUT',
        headers: { 'Authorization': 'Bearer token' },
      };

      await bridge.updateConfiguration('enroll', newConfig);

      const state = bridge.getAppState();
      expect(state.enrollEndpoint).toEqual(newConfig);

      const configLog = state.logs.find(log => 
        log.message.includes('enroll endpoint configuration updated')
      );
      expect(configLog).toBeDefined();
    });

    test('should update validate configuration', async () => {
      const newConfig: EndpointConfig = {
        url: 'https://new-api.example.com/validate',
        method: 'PATCH',
        customPayload: 'custom-{timestamp}',
      };

      await bridge.updateConfiguration('validate', newConfig);

      const state = bridge.getAppState();
      expect(state.validateEndpoint).toEqual(newConfig);

      const configLog = state.logs.find(log => 
        log.message.includes('validate endpoint configuration updated')
      );
      expect(configLog).toBeDefined();
    });
  });

  describe('State Synchronization', () => {
    test('should sync state from mobile app', () => {
      const stateChanges: any[] = [];
      bridge.onStateChange((state) => {
        stateChanges.push(state);
      });

      const mobileState = {
        biometricStatus: { available: true, biometryType: 'FaceID' as const },
        keysExist: true,
        isLoading: false,
      };

      bridge.syncFromMobileApp(mobileState);

      expect(stateChanges.length).toBe(1);
      expect(stateChanges[0].biometricStatus).toEqual(mobileState.biometricStatus);
      expect(stateChanges[0].keysExist).toBe(mobileState.keysExist);
      expect(stateChanges[0].isLoading).toBe(mobileState.isLoading);
    });

    test('should notify state change listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = bridge.onStateChange(listener1);
      const unsubscribe2 = bridge.onStateChange(listener2);

      bridge.syncFromMobileApp({ isLoading: true });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      // Unsubscribe one listener
      unsubscribe1();

      bridge.syncFromMobileApp({ isLoading: false });

      expect(listener1).toHaveBeenCalledTimes(1); // Still only once
      expect(listener2).toHaveBeenCalledTimes(2); // Called twice

      unsubscribe2();
    });

    test('should notify log update listeners', async () => {
      const logUpdates: any[] = [];
      bridge.onLogUpdate((log) => {
        logUpdates.push(log);
      });

      await bridge.updateConfiguration('enroll', {
        url: 'https://test.com',
        method: 'POST',
      });

      expect(logUpdates.length).toBe(1);
      expect(logUpdates[0].message).toContain('enroll endpoint configuration updated');
    });
  });

  describe('Log Management', () => {
    test('should add logs with unique IDs', async () => {
      await bridge.updateConfiguration('enroll', { url: 'https://test1.com', method: 'POST' });
      await bridge.updateConfiguration('validate', { url: 'https://test2.com', method: 'POST' });

      const state = bridge.getAppState();
      const logIds = state.logs.map(log => log.id);

      expect(logIds.length).toBe(2);
      expect(new Set(logIds).size).toBe(2); // All unique
      expect(logIds.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    });

    test('should clear logs correctly', () => {
      // Add some logs first
      bridge['addLog']({
        id: 'test-1',
        timestamp: new Date(),
        operation: 'test',
        status: 'info',
        message: 'Test log 1',
      });

      bridge['addLog']({
        id: 'test-2',
        timestamp: new Date(),
        operation: 'test',
        status: 'info',
        message: 'Test log 2',
      });

      let state = bridge.getAppState();
      expect(state.logs.length).toBe(2);

      bridge.clearLogs();

      state = bridge.getAppState();
      expect(state.logs.length).toBe(1); // Only the "Logs cleared" message
      expect(state.logs[0].message).toBe('Logs cleared');
    });
  });

  describe('Operation Management', () => {
    test('should cancel current operation', () => {
      bridge['currentOperationId'] = 'test-operation-123';
      bridge['state'].isLoading = true;

      const initialLogCount = bridge.getAppState().logs.length;

      bridge.cancelCurrentOperation();

      const state = bridge.getAppState();
      expect(state.isLoading).toBe(false);
      expect(state.logs.length).toBe(initialLogCount + 1);
      expect(state.logs[state.logs.length - 1].message).toContain('Operation cancelled');
      expect(bridge['currentOperationId']).toBeNull();
    });

    test('should handle operation timeout', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      // Mock createKeys to never resolve
      mockBiometricService.createKeys.mockImplementation(() => new Promise(() => {}));

      const operationPromise = bridge.executeEnrollment(config);

      // Advance time to trigger timeout
      jest.advanceTimersByTime(60000);

      const result = await operationPromise;

      expect(result.success).toBe(false);
      expect(result.message).toContain('Operation timed out');

      const state = bridge.getAppState();
      expect(state.isLoading).toBe(false);
    });

    test('should set and clear operation timeouts', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        data: { publicKey: 'mock-key' },
      });

      const operationPromise = bridge.executeEnrollment(config);
      
      // Check that timeout is set
      expect((bridge as any).operationTimeouts.size).toBe(1);

      await operationPromise;

      // Check that timeout is cleared
      expect((bridge as any).operationTimeouts.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      const config: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
      };

      const error = new Error('Service unavailable');
      mockBiometricService.createKeys.mockRejectedValue(error);

      const result = await bridge.executeEnrollment(config);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Service unavailable');

      const state = bridge.getAppState();
      expect(state.isLoading).toBe(false);
      expect(state.operationStatus).toEqual(result);

      const errorLog = state.logs.find(log => log.status === 'error');
      expect(errorLog).toBeDefined();
    });

    test('should extract error messages from different error types', () => {
      const getErrorMessage = (bridge as any).getErrorMessage;

      expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
      expect(getErrorMessage('String error')).toBe('String error');
      expect(getErrorMessage(null)).toBe('Unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('Unknown error occurred');
      expect(getErrorMessage({ message: 'Object error' })).toBe('Unknown error occurred');
    });

    test('should set up error handling listeners', () => {
      expect(mockErrorHandler.addErrorListener).toHaveBeenCalled();
      expect(mockNetworkResilience.addConnectionListener).toHaveBeenCalled();
    });
  });

  describe('ID Generation', () => {
    test('should generate unique IDs', () => {
      const generateId = (bridge as any).generateId;
      const ids = new Set();

      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }

      expect(ids.size).toBe(1000); // All should be unique
    });

    test('should generate IDs with correct format', () => {
      const generateId = (bridge as any).generateId;
      const id = generateId();

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^\d+-[a-z0-9]+$/); // timestamp-randomstring format
    });
  });
});