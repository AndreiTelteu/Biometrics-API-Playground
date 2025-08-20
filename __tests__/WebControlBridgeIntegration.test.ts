/**
 * WebControlBridge Integration Tests
 * Tests the integration between WebControlBridge and existing services
 */

import { WebControlBridge } from '../src/services/WebControlBridge';
import { EndpointConfig } from '../src/types';

describe('WebControlBridge Integration', () => {
  let bridge: WebControlBridge;

  beforeEach(() => {
    bridge = new WebControlBridge();
  });

  describe('service integration', () => {
    it('should integrate with BiometricService for status checking', async () => {
      await bridge.initialize();

      const state = bridge.getAppState();
      
      // Should have attempted to check biometric availability
      expect(state.logs.length).toBeGreaterThan(0);
      
      // Should have either success or error log from initialization
      const initLog = state.logs.find(log => 
        log.message.includes('initialized') || log.message.includes('Failed to initialize')
      );
      expect(initLog).toBeDefined();
    });

    it('should handle state synchronization correctly', () => {
      const mockMobileState = {
        biometricStatus: { available: true, biometryType: 'FaceID' as const },
        keysExist: true,
        isLoading: false,
      };

      // Track state changes
      const stateChanges: any[] = [];
      bridge.onStateChange((state) => {
        stateChanges.push(state);
      });

      bridge.syncFromMobileApp(mockMobileState);

      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0].biometricStatus).toEqual(mockMobileState.biometricStatus);
      expect(stateChanges[0].keysExist).toBe(mockMobileState.keysExist);
    });

    it('should maintain operation state consistency', async () => {
      const mockConfig: EndpointConfig = {
        url: 'https://test-api.example.com/enroll',
        method: 'POST',
      };

      // Set up bridge state for successful operation
      bridge['state'].biometricStatus = { available: true, biometryType: 'FaceID' };

      // Track operation status changes
      const operationStatuses: any[] = [];
      bridge.onOperationStatus((status) => {
        operationStatuses.push(status);
      });

      // This will fail in test environment but should maintain state consistency
      const result = await bridge.executeEnrollment(mockConfig);

      const state = bridge.getAppState();
      
      // Should not be loading after operation completes
      expect(state.isLoading).toBe(false);
      
      // Should have operation status set
      expect(state.operationStatus).toEqual(result);
      
      // Should have received operation status notifications
      expect(operationStatuses.length).toBeGreaterThan(0);
    });

    it('should handle configuration updates with proper logging', async () => {
      const newEnrollConfig: EndpointConfig = {
        url: 'https://new-enroll-api.example.com',
        method: 'PUT',
        headers: { 'Authorization': 'Bearer new-token' },
      };

      const newValidateConfig: EndpointConfig = {
        url: 'https://new-validate-api.example.com',
        method: 'PATCH',
        customPayload: 'custom-{date}',
      };

      // Track log updates
      const logUpdates: any[] = [];
      bridge.onLogUpdate((log) => {
        logUpdates.push(log);
      });

      await bridge.updateConfiguration('enroll', newEnrollConfig);
      await bridge.updateConfiguration('validate', newValidateConfig);

      const state = bridge.getAppState();
      
      // Configurations should be updated
      expect(state.enrollEndpoint).toEqual(newEnrollConfig);
      expect(state.validateEndpoint).toEqual(newValidateConfig);
      
      // Should have logged configuration updates
      expect(logUpdates).toHaveLength(2);
      expect(logUpdates[0].message).toContain('enroll endpoint configuration updated');
      expect(logUpdates[1].message).toContain('validate endpoint configuration updated');
    });

    it('should handle multiple concurrent listeners correctly', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      // Add multiple listeners
      const unsubscribe1 = bridge.onStateChange(listener1);
      const unsubscribe2 = bridge.onStateChange(listener2);
      const unsubscribe3 = bridge.onLogUpdate(listener3);

      // Trigger state change
      bridge.syncFromMobileApp({ isLoading: true });

      // All state listeners should be called
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      // Log listener should not be called for state sync
      expect(listener3).not.toHaveBeenCalled();

      // Unsubscribe one listener
      unsubscribe1();

      // Trigger another state change
      bridge.syncFromMobileApp({ isLoading: false });

      // Only remaining state listener should be called
      expect(listener1).toHaveBeenCalledTimes(1); // Still only once
      expect(listener2).toHaveBeenCalledTimes(2); // Called twice

      // Clean up
      unsubscribe2();
      unsubscribe3();
    });

    it('should maintain log history correctly', async () => {
      // Add some configuration updates to generate logs
      await bridge.updateConfiguration('enroll', {
        url: 'https://test1.com',
        method: 'POST',
      });

      await bridge.updateConfiguration('validate', {
        url: 'https://test2.com',
        method: 'POST',
      });

      let state = bridge.getAppState();
      expect(state.logs).toHaveLength(2);

      // Clear logs
      bridge.clearLogs();

      state = bridge.getAppState();
      expect(state.logs).toHaveLength(1); // Only the "Logs cleared" message
      expect(state.logs[0].message).toBe('Logs cleared');
    });

    it('should handle operation cancellation properly', () => {
      // Set up an active operation
      bridge['currentOperationId'] = 'test-operation-123';
      bridge['state'].isLoading = true;

      const initialLogCount = bridge.getAppState().logs.length;

      bridge.cancelCurrentOperation();

      const state = bridge.getAppState();
      
      // Should no longer be loading
      expect(state.isLoading).toBe(false);
      
      // Should have added cancellation log
      expect(state.logs.length).toBe(initialLogCount + 1);
      expect(state.logs[state.logs.length - 1].message).toContain('Operation cancelled');
      
      // Should clear current operation ID
      expect(bridge['currentOperationId']).toBeNull();
    });

    it('should generate unique IDs for logs and operations', async () => {
      // Generate multiple logs quickly
      await bridge.updateConfiguration('enroll', { url: 'https://test1.com', method: 'POST' });
      await bridge.updateConfiguration('validate', { url: 'https://test2.com', method: 'POST' });
      await bridge.updateConfiguration('enroll', { url: 'https://test3.com', method: 'POST' });

      const state = bridge.getAppState();
      const logIds = state.logs.map(log => log.id);
      
      // All IDs should be unique
      const uniqueIds = new Set(logIds);
      expect(uniqueIds.size).toBe(logIds.length);
      
      // IDs should be non-empty strings
      logIds.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling integration', () => {
    it('should handle service errors gracefully', async () => {
      // This will trigger actual service calls that may fail in test environment
      const result = await bridge.executeEnrollment({
        url: 'https://invalid-url-that-will-fail.com',
        method: 'POST',
      });

      // Should handle errors gracefully
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe('string');
      expect(result.timestamp).toBeInstanceOf(Date);

      const state = bridge.getAppState();
      expect(state.isLoading).toBe(false);
      expect(state.operationStatus).toEqual(result);
    });

    it('should preserve error details in logs', async () => {
      const initialLogCount = bridge.getAppState().logs.length;

      // Attempt operation that will fail
      await bridge.executeValidation({
        url: 'https://will-fail.com',
        method: 'POST',
      });

      const state = bridge.getAppState();
      const newLogs = state.logs.slice(initialLogCount);
      
      // Should have error logs
      const errorLogs = newLogs.filter(log => log.status === 'error');
      expect(errorLogs.length).toBeGreaterThan(0);
      
      // Error logs should have meaningful messages
      errorLogs.forEach(log => {
        expect(log.message).toBeTruthy();
        expect(typeof log.message).toBe('string');
      });
    });
  });

  describe('type safety integration', () => {
    it('should maintain type safety across all operations', () => {
      const state = bridge.getAppState();
      
      // Verify state structure matches expected types
      expect(typeof state.biometricStatus.available).toBe('boolean');
      expect(typeof state.keysExist).toBe('boolean');
      expect(typeof state.isLoading).toBe('boolean');
      expect(Array.isArray(state.logs)).toBe(true);
      
      // Verify endpoint configs have correct structure
      expect(typeof state.enrollEndpoint.url).toBe('string');
      expect(typeof state.enrollEndpoint.method).toBe('string');
      expect(typeof state.validateEndpoint.url).toBe('string');
      expect(typeof state.validateEndpoint.method).toBe('string');
    });

    it('should handle optional properties correctly', async () => {
      const configWithOptionals: EndpointConfig = {
        url: 'https://test.com',
        method: 'POST',
        headers: { 'X-Test': 'value' },
        customPayload: 'test-{date}',
      };

      const configWithoutOptionals: EndpointConfig = {
        url: 'https://test2.com',
        method: 'GET',
      };

      await bridge.updateConfiguration('enroll', configWithOptionals);
      await bridge.updateConfiguration('validate', configWithoutOptionals);

      const state = bridge.getAppState();
      
      expect(state.enrollEndpoint.headers).toEqual({ 'X-Test': 'value' });
      expect(state.enrollEndpoint.customPayload).toBe('test-{date}');
      expect(state.validateEndpoint.headers).toBeUndefined();
      expect(state.validateEndpoint.customPayload).toBeUndefined();
    });
  });
});