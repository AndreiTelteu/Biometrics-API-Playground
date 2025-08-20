/**
 * Integration tests for Configuration Persistence and State Management
 * Tests the complete configuration persistence and synchronization system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ConfigurationPersistence, 
  configurationPersistence,
  PersistedServerSettings,
  PersistedEndpointConfigs,
  WebControlPreferences,
  OperationHistoryEntry 
} from '../src/services/ConfigurationPersistence';
import { 
  WebControlStateManager, 
  webControlStateManager 
} from '../src/services/WebControlStateManager';
import { EndpointConfig } from '../src/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock WebSocketManager
jest.mock('../src/services/WebSocketManager', () => ({
  webSocketManager: {
    hasActiveConnections: jest.fn(() => false),
    broadcast: jest.fn(),
  },
}));

// Mock error handler
jest.mock('../src/utils/ErrorHandler', () => ({
  errorHandler: {
    handleApplicationError: jest.fn((error, context) => ({ 
      message: error.message, 
      userMessage: error.message,
      context 
    })),
    addErrorListener: jest.fn(),
  },
}));

describe('Configuration Persistence Integration', () => {
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    
    // Ensure clean state for each test
    try {
      await webControlStateManager.shutdown();
    } catch (error) {
      // Ignore shutdown errors
    }
  });

  afterEach(async () => {
    // Clean up state manager
    try {
      await webControlStateManager.shutdown();
    } catch (error) {
      // Ignore shutdown errors in tests
    }
  });

  describe('ConfigurationPersistence', () => {
    test('should initialize with default configurations', async () => {
      await configurationPersistence.initialize();

      // Should save default configurations
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_server_settings',
        expect.stringContaining('"autoStart":false')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_endpoint_configs',
        expect.stringContaining('"enroll"')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_preferences',
        expect.stringContaining('"autoSyncConfigs":true')
      );
    });

    test('should save and retrieve server settings', async () => {
      const testSettings: Partial<PersistedServerSettings> = {
        preferredPort: 8080,
        autoStart: true,
        connectionTimeout: 30000,
      };

      await configurationPersistence.initialize();
      await configurationPersistence.saveServerSettings(testSettings);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_server_settings',
        expect.stringContaining('"preferredPort":8080')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_server_settings',
        expect.stringContaining('"autoStart":true')
      );
    });

    test('should save and retrieve endpoint configurations', async () => {
      const testConfig: EndpointConfig = {
        url: 'https://api.example.com/enroll',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };

      await configurationPersistence.initialize();
      await configurationPersistence.updateEndpointConfig('enroll', testConfig);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_endpoint_configs',
        expect.stringContaining('https://api.example.com/enroll')
      );
    });

    test('should manage operation history', async () => {
      const testOperation: OperationHistoryEntry = {
        id: 'test-op-123',
        type: 'enroll',
        timestamp: new Date().toISOString(),
        success: true,
        duration: 1500,
        endpoint: 'https://api.example.com/enroll',
      };

      await configurationPersistence.initialize();
      await configurationPersistence.addOperationToHistory(testOperation);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_operation_history',
        expect.stringContaining('test-op-123')
      );
    });

    test('should handle configuration import/export', async () => {
      const testConfig = {
        serverSettings: { autoStart: true, preferredPort: 9000 },
        endpointConfigs: {
          enroll: { url: 'https://test.com/enroll', method: 'POST' as const },
          validate: { url: 'https://test.com/validate', method: 'POST' as const },
          lastUpdated: new Date().toISOString(),
        },
        operationHistory: [],
        preferences: { autoSyncConfigs: false, persistLogs: true, maxLogEntries: 500, enableNotifications: false },
      };

      await configurationPersistence.initialize();
      
      // Export configuration
      const exported = await configurationPersistence.exportConfiguration();
      expect(typeof exported).toBe('string');

      // Import configuration
      await configurationPersistence.importConfiguration(JSON.stringify(testConfig));

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_server_settings',
        expect.stringContaining('"preferredPort":9000')
      );
    });

    test('should notify listeners of configuration changes', async () => {
      const listener = {
        onServerSettingsChanged: jest.fn(),
        onEndpointConfigsChanged: jest.fn(),
        onPreferencesChanged: jest.fn(),
      };

      await configurationPersistence.initialize();
      const removeListener = configurationPersistence.addChangeListener(listener);

      // Test server settings change
      await configurationPersistence.saveServerSettings({ autoStart: true });
      expect(listener.onServerSettingsChanged).toHaveBeenCalledWith(
        expect.objectContaining({ autoStart: true })
      );

      // Test endpoint config change
      const testConfig: EndpointConfig = { url: 'https://test.com', method: 'POST' };
      await configurationPersistence.updateEndpointConfig('enroll', testConfig);
      expect(listener.onEndpointConfigsChanged).toHaveBeenCalledWith(
        expect.objectContaining({ enroll: testConfig })
      );

      // Test preferences change
      await configurationPersistence.savePreferences({ autoSyncConfigs: false });
      expect(listener.onPreferencesChanged).toHaveBeenCalledWith(
        expect.objectContaining({ autoSyncConfigs: false })
      );

      removeListener();
    });

    test('should validate imported configurations', async () => {
      await configurationPersistence.initialize();

      // Test invalid configuration format
      await expect(
        configurationPersistence.importConfiguration('invalid json')
      ).rejects.toThrow();

      // Test invalid endpoint configuration
      const invalidConfig = {
        endpointConfigs: {
          enroll: { url: 'test', method: 'INVALID_METHOD' },
        },
      };

      await expect(
        configurationPersistence.importConfiguration(JSON.stringify(invalidConfig))
      ).rejects.toThrow('Invalid enroll endpoint configuration');
    });
  });

  describe('WebControlStateManager', () => {
    test('should initialize with persisted state', async () => {
      // Mock persisted data
      const mockServerSettings = JSON.stringify({ autoStart: true, preferredPort: 8080 });
      const mockEndpointConfigs = JSON.stringify({
        enroll: { url: 'https://api.example.com/enroll', method: 'POST' },
        validate: { url: 'https://api.example.com/validate', method: 'POST' },
        lastUpdated: new Date().toISOString(),
      });

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@webcontrol_server_settings') return Promise.resolve(mockServerSettings);
        if (key === '@webcontrol_endpoint_configs') return Promise.resolve(mockEndpointConfigs);
        return Promise.resolve(null);
      });

      await webControlStateManager.initialize();

      const state = webControlStateManager.getState();
      expect(state.server.settings.autoStart).toBe(true);
      expect(state.server.settings.preferredPort).toBe(8080);
      expect(state.configurations.endpoints.enroll.url).toBe('https://api.example.com/enroll');
    });

    test('should track active operations', async () => {
      await webControlStateManager.initialize();

      const operationId = webControlStateManager.startOperation('enroll', 'client-123', 'https://api.example.com/enroll');
      
      let state = webControlStateManager.getState();
      expect(state.operations.activeOperations.size).toBe(1);
      
      const operation = state.operations.activeOperations.get(operationId);
      expect(operation).toBeDefined();
      expect(operation!.type).toBe('enroll');
      expect(operation!.status).toBe('running');
      expect(operation!.clientId).toBe('client-123');

      // Complete operation
      await webControlStateManager.completeOperation(operationId, true, { success: true });
      
      state = webControlStateManager.getState();
      expect(state.operations.activeOperations.size).toBe(0);
      expect(state.operations.operationHistory.length).toBe(1);
    });

    test('should manage WebSocket connections', async () => {
      await webControlStateManager.initialize();

      // Add connection
      webControlStateManager.addConnection('conn-123', {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.100',
      });

      let state = webControlStateManager.getState();
      expect(state.connections.webSocketConnections.size).toBe(1);
      expect(state.connections.totalConnections).toBe(1);

      const connection = state.connections.webSocketConnections.get('conn-123');
      expect(connection).toBeDefined();
      expect(connection!.userAgent).toBe('Mozilla/5.0');

      // Update connection activity
      webControlStateManager.updateConnectionActivity('conn-123');
      
      state = webControlStateManager.getState();
      const updatedConnection = state.connections.webSocketConnections.get('conn-123');
      expect(updatedConnection!.operationsCount).toBe(1);

      // Remove connection
      webControlStateManager.removeConnection('conn-123');
      
      state = webControlStateManager.getState();
      expect(state.connections.webSocketConnections.size).toBe(0);
    });

    test('should synchronize configurations between web and mobile', async () => {
      await webControlStateManager.initialize();

      const webChanges = {
        endpointConfigs: {
          enroll: { url: 'https://web.example.com/enroll', method: 'POST' as const },
        },
        preferences: {
          autoSyncConfigs: false,
        },
      };

      await webControlStateManager.syncConfigurationFromWeb(webChanges);

      const state = webControlStateManager.getState();
      expect(state.configurations.endpoints.enroll.url).toBe('https://web.example.com/enroll');
      expect(state.configurations.preferences.autoSyncConfigs).toBe(false);
      expect(state.synchronization.lastWebSync).toBeDefined();
    });

    test('should handle configuration updates from mobile', async () => {
      await webControlStateManager.initialize();

      const newEndpointConfig: EndpointConfig = {
        url: 'https://mobile.example.com/validate',
        method: 'POST',
        headers: { 'Authorization': 'Bearer token' },
      };

      await webControlStateManager.updateEndpointConfiguration('validate', newEndpointConfig, 'mobile');

      const state = webControlStateManager.getState();
      expect(state.configurations.endpoints.validate.url).toBe('https://mobile.example.com/validate');
      expect(state.configurations.endpoints.validate.headers).toEqual({ 'Authorization': 'Bearer token' });

      // Should have persisted the change
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_endpoint_configs',
        expect.stringContaining('https://mobile.example.com/validate')
      );
    });

    test('should notify state change listeners', async () => {
      const listener = {
        onStateChanged: jest.fn(),
        onOperationStatusChanged: jest.fn(),
        onConfigurationChanged: jest.fn(),
        onConnectionChanged: jest.fn(),
      };

      await webControlStateManager.initialize();
      const removeListener = webControlStateManager.addStateChangeListener(listener);

      // Test server status update
      const serverStatus = {
        isRunning: true,
        port: 8080,
        url: 'http://0.0.0.0:8080',
        password: '123456',
        startTime: new Date(),
        activeConnections: 0,
      };

      webControlStateManager.updateServerStatus(serverStatus);
      expect(listener.onStateChanged).toHaveBeenCalled();

      // Test operation status change
      const operationId = webControlStateManager.startOperation('validate');
      expect(listener.onOperationStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'validate', status: 'running' })
      );

      // Test connection change
      webControlStateManager.addConnection('test-conn');
      expect(listener.onConnectionChanged).toHaveBeenCalled();

      removeListener();
    });

    test('should provide configuration for web interface', async () => {
      await webControlStateManager.initialize();

      // Set up some test data
      await webControlStateManager.updateServerSettings({ preferredPort: 9000 });
      const operationId = webControlStateManager.startOperation('enroll');
      webControlStateManager.addConnection('web-client');

      const webConfig = webControlStateManager.getConfigurationForWeb();

      expect(webConfig).toHaveProperty('serverSettings');
      expect(webConfig).toHaveProperty('endpointConfigs');
      expect(webConfig).toHaveProperty('preferences');
      expect(webConfig).toHaveProperty('serverStatus');
      expect(webConfig).toHaveProperty('activeOperations');
      expect(webConfig).toHaveProperty('connectionCount');

      expect(webConfig.serverSettings.preferredPort).toBe(9000);
      expect(webConfig.activeOperations.length).toBeGreaterThanOrEqual(1);
      expect(webConfig.connectionCount).toBeGreaterThanOrEqual(1);
    });

    test('should handle sync disabled state', async () => {
      await webControlStateManager.initialize();

      // Disable sync
      await webControlStateManager.updatePreferences({ autoSyncConfigs: false });

      const webChanges = {
        endpointConfigs: {
          enroll: { url: 'https://should-not-sync.com', method: 'POST' as const },
        },
      };

      // This should not update the configuration
      await webControlStateManager.syncConfigurationFromWeb(webChanges);

      const state = webControlStateManager.getState();
      expect(state.configurations.endpoints.enroll.url).not.toBe('https://should-not-sync.com');
    });

    test('should handle operation cancellation', async () => {
      await webControlStateManager.initialize();

      const operationId = webControlStateManager.startOperation('delete-keys');
      
      let state = webControlStateManager.getState();
      const initialOperationCount = state.operations.activeOperations.size;
      expect(initialOperationCount).toBeGreaterThanOrEqual(1);

      webControlStateManager.cancelOperation(operationId);
      
      state = webControlStateManager.getState();
      expect(state.operations.activeOperations.size).toBe(initialOperationCount - 1);
    });

    test('should persist state on shutdown', async () => {
      await webControlStateManager.initialize();

      // Make some changes
      await webControlStateManager.updateServerSettings({ autoStart: true });
      await webControlStateManager.updatePreferences({ maxLogEntries: 2000 });

      await webControlStateManager.shutdown();

      // Should have saved the current state
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_server_settings',
        expect.stringContaining('"autoStart":true')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_preferences',
        expect.stringContaining('"maxLogEntries":2000')
      );
    });
  });

  describe('Integration between ConfigurationPersistence and WebControlStateManager', () => {
    test('should maintain consistency between persistence and state manager', async () => {
      // Initialize both services
      await configurationPersistence.initialize();
      await webControlStateManager.initialize();

      const testEndpointConfig: EndpointConfig = {
        url: 'https://integration.test.com/enroll',
        method: 'POST',
        headers: { 'X-Test': 'integration' },
      };

      // Update through state manager
      await webControlStateManager.updateEndpointConfiguration('enroll', testEndpointConfig);

      // Verify that setItem was called with the correct data
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_endpoint_configs',
        expect.stringContaining('https://integration.test.com/enroll')
      );

      // Verify state manager has the updated data
      const state = webControlStateManager.getState();
      expect(state.configurations.endpoints.enroll.url).toBe('https://integration.test.com/enroll');
      expect(state.configurations.endpoints.enroll.headers).toEqual({ 'X-Test': 'integration' });
    });

    test('should handle configuration changes from persistence layer', async () => {
      const stateListener = {
        onStateChanged: jest.fn(),
        onOperationStatusChanged: jest.fn(),
        onConfigurationChanged: jest.fn(),
        onConnectionChanged: jest.fn(),
      };

      await configurationPersistence.initialize();
      await webControlStateManager.initialize();

      webControlStateManager.addStateChangeListener(stateListener);

      // Update directly through persistence (simulating external change)
      await configurationPersistence.saveServerSettings({ autoStart: true, preferredPort: 7777 });

      // State manager should be notified and updated
      expect(stateListener.onStateChanged).toHaveBeenCalled();

      const state = webControlStateManager.getState();
      expect(state.server.settings.autoStart).toBe(true);
      expect(state.server.settings.preferredPort).toBe(7777);
    });

    test('should handle operation history persistence', async () => {
      await configurationPersistence.initialize();
      await webControlStateManager.initialize();

      // Start and complete an operation
      const operationId = webControlStateManager.startOperation('validate', 'test-client', 'https://test.com/validate');
      await webControlStateManager.completeOperation(operationId, true, { result: 'success' });

      // Check that setItem was called for operation history
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@webcontrol_operation_history',
        expect.stringContaining('validate')
      );

      // Check that state manager has the history
      const state = webControlStateManager.getState();
      expect(state.operations.operationHistory.length).toBeGreaterThanOrEqual(1);
      const validateOperation = state.operations.operationHistory.find(op => op.type === 'validate');
      expect(validateOperation).toBeDefined();
      expect(validateOperation!.success).toBe(true);
      expect(validateOperation!.endpoint).toBe('https://test.com/validate');
    });
  });
});