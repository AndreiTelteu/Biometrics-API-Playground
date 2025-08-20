/**
 * WebControlBridge - Bridge service for web control integration
 * Interfaces between web requests and existing biometric services
 * Maintains state synchronization between web and mobile interfaces
 */

import { biometricService } from './BiometricService';
import { biometricAPIService } from './BiometricAPIService';
import { webControlStateManager } from './WebControlStateManager';
import { configurationPersistence } from './ConfigurationPersistence';
import {
  EndpointConfig,
  OperationResult,
  BiometricStatus,
  AppState,
  LogEntry,
  WebSocketMessage,
  WebSocketMessageType,
} from '../types';
import { errorHandler } from '../utils/ErrorHandler';
import { networkResilience } from '../utils/NetworkResilience';

export interface WebControlBridgeState {
  biometricStatus: BiometricStatus;
  keysExist: boolean;
  enrollEndpoint: EndpointConfig;
  validateEndpoint: EndpointConfig;
  operationStatus: OperationResult | null;
  logs: LogEntry[];
  isLoading: boolean;
}

export interface WebRequest {
  action: 'enroll' | 'validate' | 'delete-keys' | 'get-state' | 'update-config';
  payload?: {
    endpointConfig?: EndpointConfig;
    configType?: 'enroll' | 'validate';
    customPayload?: string;
  };
  requestId: string;
}

export interface WebResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId: string;
  timestamp: string;
}

export interface StateChangeListener {
  (state: WebControlBridgeState): void;
}

export interface LogUpdateListener {
  (log: LogEntry): void;
}

export interface OperationStatusListener {
  (operation: OperationResult): void;
}

export class WebControlBridge {
  private state: WebControlBridgeState;
  private stateChangeListeners: Set<StateChangeListener> = new Set();
  private logUpdateListeners: Set<LogUpdateListener> = new Set();
  private operationStatusListeners: Set<OperationStatusListener> = new Set();
  private currentOperationId: string | null = null;
  private operationTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly OPERATION_TIMEOUT = 60000; // 60 seconds

  constructor(initialState?: Partial<WebControlBridgeState>) {
    this.state = {
      biometricStatus: { available: false, biometryType: undefined },
      keysExist: false,
      enrollEndpoint: { url: '', method: 'POST' },
      validateEndpoint: { url: '', method: 'POST' },
      operationStatus: null,
      logs: [],
      isLoading: false,
      ...initialState,
    };
  }

  /**
   * Initialize the bridge with current app state
   */
  async initialize(): Promise<void> {
    try {
      // Initialize state manager and configuration persistence
      await webControlStateManager.initialize();
      
      // Load persisted endpoint configurations
      const persistedConfigs = await configurationPersistence.getEndpointConfigs();
      this.updateState({
        enrollEndpoint: persistedConfigs.enroll,
        validateEndpoint: persistedConfigs.validate,
      });

      // Setup error handling
      this.setupErrorHandling();

      // Check biometric availability with retry
      const biometricStatus = await networkResilience.executeWithRetry(
        () => biometricService.checkBiometricAvailability(),
        'Biometric availability check'
      );
      this.updateState({ biometricStatus });

      // Check if keys exist
      if (biometricStatus.available) {
        const keysExist = await networkResilience.executeWithRetry(
          () => biometricService.checkKeysExist(),
          'Keys existence check'
        );
        this.updateState({ keysExist });
      }

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'status',
        status: 'success',
        message: 'WebControlBridge initialized successfully with persistent configuration',
      });
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'WebControlBridge initialization');
      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'status',
        status: 'error',
        message: `Failed to initialize WebControlBridge: ${appError?.userMessage || appError?.message || 'Unknown error'}`,
        details: appError,
      });
      throw error;
    }
  }

  /**
   * Execute enrollment operation
   */
  async executeEnrollment(config?: EndpointConfig): Promise<OperationResult> {
    // Check if we can start a new operation (includes cancellation of existing operation)
    if (!this.canStartNewOperation('enrollment')) {
      return {
        success: false,
        message: 'Cannot start enrollment operation at this time',
        timestamp: new Date(),
      };
    }

    // Cancel any existing operation before starting new one
    if (this.currentOperationId) {
      this.cancelCurrentOperation();
    }

    const operationId = this.generateId();
    this.currentOperationId = operationId;
    let stateOperationId: string | undefined;

    try {
      this.updateState({ isLoading: true });
      this.notifyOperationStart('enroll', operationId);
      this.setOperationTimeout(operationId);

      // Use provided config or current state config
      const enrollConfig = config || this.state.enrollEndpoint;
      
      // Start operation tracking in state manager
      stateOperationId = webControlStateManager.startOperation('enroll', undefined, enrollConfig.url);

      // Validate biometric availability
      if (!this.state.biometricStatus.available) {
        throw new Error(
          `Biometric sensors not available: ${
            this.state.biometricStatus.error || 'Unknown reason'
          }`
        );
      }

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'enroll',
        status: 'info',
        message: 'Creating biometric keys...',
      });

      // Create biometric keys with retry
      const createKeysResult = await networkResilience.executeWithRetry(
        () => biometricService.createKeys(
          'Authenticate to create biometric keys for enrollment'
        ),
        'Biometric key creation'
      );

      if (!createKeysResult.success) {
        throw new Error(`Key creation failed: ${createKeysResult.message}`);
      }

      const publicKey = createKeysResult.data.publicKey;
      this.updateState({ keysExist: true });

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'enroll',
        status: 'success',
        message: `Biometric keys created successfully. Public key: ${publicKey.substring(0, 50)}...`,
      });

      let result: OperationResult;

      // Send to backend if endpoint is configured
      if (enrollConfig.url) {
        this.addLog({
          id: this.generateId(),
          timestamp: new Date(),
          operation: 'enroll',
          status: 'info',
          message: `Sending public key to enrollment endpoint: ${enrollConfig.url}`,
        });

        const enrollResult = await networkResilience.executeWithRetry(
          () => biometricAPIService.enrollPublicKey(enrollConfig, publicKey),
          'Backend enrollment',
          2 // Fewer retries for backend calls
        );

        if (!enrollResult.success) {
          // Reset keys exist status on backend failure
          this.updateState({ keysExist: false });
          throw new Error(`Backend enrollment failed: ${enrollResult.message}`);
        }

        this.addLog({
          id: this.generateId(),
          timestamp: new Date(),
          operation: 'enroll',
          status: 'success',
          message: 'Public key successfully registered with backend',
        });

        result = {
          success: true,
          message: 'Enrollment completed successfully',
          data: {
            publicKey,
            backendResponse: enrollResult.data,
            endpoint: enrollConfig.url,
            method: enrollConfig.method,
          },
          timestamp: new Date(),
        };
      } else {
        this.addLog({
          id: this.generateId(),
          timestamp: new Date(),
          operation: 'enroll',
          status: 'info',
          message: 'No enrollment endpoint configured - keys created locally only',
        });

        result = {
          success: true,
          message: 'Local enrollment completed successfully',
          data: {
            publicKey,
            localOnly: true,
          },
          timestamp: new Date(),
        };
      }

      this.updateState({ operationStatus: result, isLoading: false });
      this.notifyOperationComplete('enroll', operationId, result);
      
      // Complete operation tracking in state manager
      if (stateOperationId) {
        await webControlStateManager.completeOperation(stateOperationId, true, result);
      }

      return result;
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Enrollment operation');
      
      const errorResult: OperationResult = {
        success: false,
        message: appError?.userMessage || appError?.message || this.getErrorMessage(error),
        timestamp: new Date(),
      };

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'enroll',
        status: 'error',
        message: errorResult.message,
        details: appError,
      });

      this.updateState({ operationStatus: errorResult, isLoading: false });
      this.notifyOperationComplete('enroll', operationId, errorResult);
      
      // Complete operation tracking in state manager with error
      if (stateOperationId) {
        await webControlStateManager.completeOperation(stateOperationId, false, errorResult);
      }

      return errorResult;
    } finally {
      this.cleanupOperation(operationId, 'completed');
    }
  }

  /**
   * Execute validation operation
   */
  async executeValidation(config?: EndpointConfig): Promise<OperationResult> {
    // Check if we can start a new operation (includes cancellation of existing operation)
    if (!this.canStartNewOperation('validation')) {
      return {
        success: false,
        message: 'Cannot start validation operation at this time',
        timestamp: new Date(),
      };
    }

    // Cancel any existing operation before starting new one
    if (this.currentOperationId) {
      this.cancelCurrentOperation();
    }

    const operationId = this.generateId();
    this.currentOperationId = operationId;

    try {
      this.updateState({ isLoading: true });
      this.notifyOperationStart('validate', operationId);
      this.setOperationTimeout(operationId);

      // Use provided config or current state config
      const validateConfig = config || this.state.validateEndpoint;

      // Validate prerequisites
      if (!this.state.biometricStatus.available) {
        throw new Error(
          `Biometric sensors not available: ${
            this.state.biometricStatus.error || 'Unknown reason'
          }`
        );
      }

      if (!this.state.keysExist) {
        throw new Error(
          'No biometric keys found. Please enroll first before attempting validation.'
        );
      }

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'validate',
        status: 'info',
        message: 'Generating payload for signature...',
      });

      // Generate payload for signature
      const payload = biometricService.generatePayload(validateConfig.customPayload);
      const payloadType = validateConfig.customPayload ? 'custom' : 'timestamp';

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'validate',
        status: 'info',
        message: `Generated ${payloadType} payload: ${payload}`,
      });

      // Create signature with biometric authentication
      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'validate',
        status: 'info',
        message: 'Requesting biometric authentication for signature creation...',
      });

      const signatureResult = await biometricService.createSignature({
        promptMessage: 'Authenticate to create signature for validation',
        payload,
        cancelButtonText: 'Cancel Validation',
      });

      if (!signatureResult.success) {
        throw new Error(`Signature creation failed: ${signatureResult.message}`);
      }

      const signature = signatureResult.data.signature;

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'validate',
        status: 'success',
        message: `Signature created successfully. Length: ${signature.length} characters`,
      });

      let result: OperationResult;

      // Send to backend for validation if endpoint is configured
      if (validateConfig.url) {
        this.addLog({
          id: this.generateId(),
          timestamp: new Date(),
          operation: 'validate',
          status: 'info',
          message: `Sending signature to validation endpoint: ${validateConfig.url}`,
        });

        const validationResult = await biometricAPIService.validateSignature(
          validateConfig,
          signature,
          payload
        );

        if (!validationResult.success) {
          throw new Error(`Backend validation failed: ${validationResult.message}`);
        }

        this.addLog({
          id: this.generateId(),
          timestamp: new Date(),
          operation: 'validate',
          status: 'success',
          message: 'Signature successfully validated by backend server',
        });

        result = {
          success: true,
          message: 'Validation completed successfully',
          data: {
            signature,
            payload,
            backendResponse: validationResult.data,
            endpoint: validateConfig.url,
            method: validateConfig.method,
            validationTimestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        };
      } else {
        this.addLog({
          id: this.generateId(),
          timestamp: new Date(),
          operation: 'validate',
          status: 'info',
          message: 'No validation endpoint configured - signature created locally only',
        });

        result = {
          success: true,
          message: 'Local validation completed successfully',
          data: {
            signature,
            payload,
            localOnly: true,
            validationTimestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        };
      }

      this.updateState({ operationStatus: result, isLoading: false });
      this.notifyOperationComplete('validate', operationId, result);

      return result;
    } catch (error) {
      const errorResult: OperationResult = {
        success: false,
        message: this.getErrorMessage(error),
        timestamp: new Date(),
      };

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'validate',
        status: 'error',
        message: errorResult.message,
        details: error,
      });

      this.updateState({ operationStatus: errorResult, isLoading: false });
      this.notifyOperationComplete('validate', operationId, errorResult);

      return errorResult;
    } finally {
      this.cleanupOperation(operationId, 'completed');
    }
  }

  /**
   * Execute delete keys operation
   */
  async deleteKeys(): Promise<OperationResult> {
    // Check if we can start a new operation (includes cancellation of existing operation)
    if (!this.canStartNewOperation('delete keys')) {
      return {
        success: false,
        message: 'Cannot start delete keys operation at this time',
        timestamp: new Date(),
      };
    }

    // Cancel any existing operation before starting new one
    if (this.currentOperationId) {
      this.cancelCurrentOperation();
    }

    const operationId = this.generateId();
    this.currentOperationId = operationId;

    try {
      this.updateState({ isLoading: true });
      this.notifyOperationStart('delete', operationId);

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'delete',
        status: 'info',
        message: 'Deleting biometric keys...',
      });

      const deleteResult = await biometricService.deleteKeys();

      if (!deleteResult.success) {
        throw new Error(deleteResult.message);
      }

      // Update keys exist status
      this.updateState({ keysExist: false });

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'delete',
        status: 'success',
        message: 'Biometric keys deleted successfully',
      });

      const result: OperationResult = {
        success: true,
        message: 'Keys deleted successfully',
        data: deleteResult.data,
        timestamp: new Date(),
      };

      this.updateState({ operationStatus: result, isLoading: false });
      this.notifyOperationComplete('delete', operationId, result);

      return result;
    } catch (error) {
      const errorResult: OperationResult = {
        success: false,
        message: this.getErrorMessage(error),
        timestamp: new Date(),
      };

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'delete',
        status: 'error',
        message: errorResult.message,
        details: error,
      });

      this.updateState({ operationStatus: errorResult, isLoading: false });
      this.notifyOperationComplete('delete', operationId, errorResult);

      return errorResult;
    } finally {
      this.cleanupOperation(operationId, 'completed');
    }
  }

  /**
   * Get current app state
   */
  getAppState(): WebControlBridgeState {
    return { ...this.state };
  }

  /**
   * Update endpoint configuration
   */
  async updateConfiguration(
    type: 'enroll' | 'validate',
    config: EndpointConfig
  ): Promise<void> {
    const updates: Partial<WebControlBridgeState> = {};
    
    if (type === 'enroll') {
      updates.enrollEndpoint = config;
    } else {
      updates.validateEndpoint = config;
    }

    this.updateState(updates);

    // Persist configuration changes
    await webControlStateManager.updateEndpointConfiguration(type, config, 'mobile');

    this.addLog({
      id: this.generateId(),
      timestamp: new Date(),
      operation: 'status',
      status: 'info',
      message: `${type} endpoint configuration updated and persisted`,
    });

    // Notify listeners of configuration change
    this.notifyConfigUpdate(type, config);
  }

  /**
   * Synchronize state from mobile app
   */
  syncFromMobileApp(appState: Partial<WebControlBridgeState>): void {
    this.updateState(appState);
    this.notifyStateSync(appState);
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: StateChangeListener): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Add log update listener
   */
  onLogUpdate(listener: LogUpdateListener): () => void {
    this.logUpdateListeners.add(listener);
    return () => this.logUpdateListeners.delete(listener);
  }

  /**
   * Add operation status listener
   */
  onOperationStatus(listener: OperationStatusListener): () => void {
    this.operationStatusListeners.add(listener);
    return () => this.operationStatusListeners.delete(listener);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.updateState({ logs: [] });
    
    this.addLog({
      id: this.generateId(),
      timestamp: new Date(),
      operation: 'status',
      status: 'info',
      message: 'Logs cleared',
    });
  }

  /**
   * Check if an operation is currently running
   */
  isOperationRunning(): boolean {
    return this.currentOperationId !== null && this.state.isLoading;
  }

  /**
   * Get current operation ID if any operation is running
   */
  getCurrentOperationId(): string | null {
    return this.currentOperationId;
  }

  /**
   * Get detailed operation status information
   */
  getOperationStatus(): {
    isRunning: boolean;
    operationId: string | null;
    operationType: string | null;
    startTime: Date | null;
  } {
    return {
      isRunning: this.isOperationRunning(),
      operationId: this.currentOperationId,
      operationType: this.currentOperationId ? 'unknown' : null, // Could be enhanced to track operation type
      startTime: this.currentOperationId ? new Date() : null, // Could be enhanced to track actual start time
    };
  }

  /**
   * Safeguard to prevent multiple simultaneous operations
   * Returns true if it's safe to start a new operation, false otherwise
   */
  private canStartNewOperation(operationType: string): boolean {
    if (!this.isOperationRunning()) {
      return true;
    }

    // Log warning about concurrent operation attempt
    this.addLog({
      id: this.generateId(),
      timestamp: new Date(),
      operation: 'status',
      status: 'warning',
      message: `Attempted to start ${operationType} operation while another operation is running. Previous operation will be cancelled.`,
    });

    return true; // We allow starting new operations by cancelling the previous one
  }

  /**
   * Enhanced operation cleanup when operations are cancelled or replaced
   */
  private cleanupOperation(operationId: string, reason: string = 'completed'): void {
    // Clear any timeouts for this operation
    this.clearOperationTimeout(operationId);
    
    // If this was the current operation, clear it
    if (this.currentOperationId === operationId) {
      this.currentOperationId = null;
    }
    
    // Update loading state
    this.updateState({ isLoading: false });
    
    // Log cleanup
    this.addLog({
      id: this.generateId(),
      timestamp: new Date(),
      operation: 'status',
      status: 'info',
      message: `Operation ${operationId} cleanup completed (${reason})`,
    });
  }

  /**
   * Cancel current operation if running
   */
  cancelCurrentOperation(): void {
    if (this.currentOperationId) {
      const operationId = this.currentOperationId;
      
      // Clear timeout first
      this.clearOperationTimeout(operationId);
      
      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'status',
        status: 'info',
        message: `Operation ${operationId} cancelled by user or system`,
      });

      // Update state and clear current operation
      this.updateState({ isLoading: false });
      this.currentOperationId = null;

      // Notify listeners of cancellation
      const cancelResult: OperationResult = {
        success: false,
        message: 'Operation was cancelled',
        timestamp: new Date(),
      };
      
      this.updateState({ operationStatus: cancelResult });
      this.notifyOperationComplete('cancel', operationId, cancelResult);
    }
  }

  /**
   * Private method to update state and notify listeners
   */
  private updateState(updates: Partial<WebControlBridgeState>): void {
    this.state = { ...this.state, ...updates };
    this.stateChangeListeners.forEach(listener => listener(this.state));
  }

  /**
   * Private method to add log entry and notify listeners
   */
  private addLog(log: LogEntry): void {
    this.state.logs.push(log);
    this.logUpdateListeners.forEach(listener => listener(log));
  }

  /**
   * Private method to notify operation start
   */
  private notifyOperationStart(operation: string, operationId: string): void {
    this.operationStatusListeners.forEach(listener => 
      listener({
        success: true,
        message: `${operation} operation started`,
        data: { operationId, status: 'started' },
        timestamp: new Date(),
      })
    );
  }

  /**
   * Private method to notify operation completion
   */
  private notifyOperationComplete(
    operation: string,
    operationId: string,
    result: OperationResult
  ): void {
    this.operationStatusListeners.forEach(listener => 
      listener({
        ...result,
        data: { ...result.data, operationId, status: 'completed' },
      })
    );
  }

  /**
   * Private method to notify configuration updates
   */
  private notifyConfigUpdate(type: 'enroll' | 'validate', config: EndpointConfig): void {
    // This could be extended to notify WebSocket clients
    // For now, state change listeners will handle this
  }

  /**
   * Private method to notify state synchronization
   */
  private notifyStateSync(updates: Partial<WebControlBridgeState>): void {
    // This could be extended to notify WebSocket clients
    // For now, state change listeners will handle this
  }

  /**
   * Private method to generate unique IDs
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private method to extract error messages
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }

  /**
   * Setup error handling for the bridge
   */
  private setupErrorHandling(): void {
    // Add error listener to handle application errors
    errorHandler.addErrorListener((error) => {
      if (error.context?.includes('WebControlBridge') || error.code.startsWith('APP_')) {
        this.addLog({
          id: this.generateId(),
          timestamp: new Date(),
          operation: 'status',
          status: 'error',
          message: `Error handled: ${error.userMessage || error.message}`,
          details: error,
        });
      }
    });

    // Setup network resilience monitoring
    networkResilience.addConnectionListener({
      onDisconnected: (error) => {
        this.addLog({
          id: this.generateId(),
          timestamp: new Date(),
          operation: 'status',
          status: 'info',
          message: 'Network connection lost, operations may be affected',
        });
      },
      onReconnected: () => {
        this.addLog({
          id: this.generateId(),
          timestamp: new Date(),
          operation: 'status',
          status: 'success',
          message: 'Network connection restored',
        });
      },
    });
  }

  /**
   * Set operation timeout
   */
  private setOperationTimeout(operationId: string): void {
    const timeoutId = setTimeout(() => {
      if (this.currentOperationId === operationId) {
        this.handleOperationTimeout(operationId);
      }
    }, this.OPERATION_TIMEOUT);

    this.operationTimeouts.set(operationId, timeoutId);
  }

  /**
   * Clear operation timeout
   */
  private clearOperationTimeout(operationId: string): void {
    const timeoutId = this.operationTimeouts.get(operationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.operationTimeouts.delete(operationId);
    }
  }

  /**
   * Handle operation timeout
   */
  private handleOperationTimeout(operationId: string): void {
    const timeoutError = new Error('Operation timed out');
    const appError = errorHandler.handleApplicationError(timeoutError, 'Operation timeout');

    this.addLog({
      id: this.generateId(),
      timestamp: new Date(),
      operation: 'status',
      status: 'error',
      message: `Operation ${operationId} timed out after ${this.OPERATION_TIMEOUT / 1000} seconds`,
      details: appError,
    });

    // Cancel current operation
    this.cancelCurrentOperation();

    // Notify listeners
    const errorResult: OperationResult = {
      success: false,
      message: appError?.userMessage || 'Operation timed out',
      timestamp: new Date(),
    };

    this.updateState({ operationStatus: errorResult, isLoading: false });
    this.notifyOperationComplete('status', operationId, errorResult);
  }





  /**
   * Cleanup method for service destruction
   */
  async destroy(): Promise<void> {
    try {
      // Cancel any running operations
      this.cancelCurrentOperation();

      // Clear all timeouts
      this.operationTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      this.operationTimeouts.clear();

      // Clear listeners
      this.stateChangeListeners.clear();
      this.logUpdateListeners.clear();
      this.operationStatusListeners.clear();

      console.log('WebControlBridge destroyed');
    } catch (error) {
      console.error('Error during WebControlBridge destruction:', error);
    }
  }
}

// Export singleton instance
export const webControlBridge = new WebControlBridge();