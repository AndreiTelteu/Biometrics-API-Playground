/**
 * WebControlBridge - Bridge service for web control integration
 * Interfaces between web requests and existing biometric services
 * Maintains state synchronization between web and mobile interfaces
 */

import { biometricService } from './BiometricService';
import { biometricAPIService } from './BiometricAPIService';
import {
  EndpointConfig,
  OperationResult,
  BiometricStatus,
  AppState,
  LogEntry,
  WebSocketMessage,
  WebSocketMessageType,
} from '../types';

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
      // Check biometric availability
      const biometricStatus = await biometricService.checkBiometricAvailability();
      this.updateState({ biometricStatus });

      // Check if keys exist
      if (biometricStatus.available) {
        const keysExist = await biometricService.checkKeysExist();
        this.updateState({ keysExist });
      }

      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'status',
        status: 'success',
        message: 'WebControlBridge initialized successfully',
      });
    } catch (error) {
      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'status',
        status: 'error',
        message: `Failed to initialize WebControlBridge: ${this.getErrorMessage(error)}`,
      });
    }
  }

  /**
   * Execute enrollment operation
   */
  async executeEnrollment(config?: EndpointConfig): Promise<OperationResult> {
    const operationId = this.generateId();
    this.currentOperationId = operationId;

    try {
      this.updateState({ isLoading: true });
      this.notifyOperationStart('enroll', operationId);

      // Use provided config or current state config
      const enrollConfig = config || this.state.enrollEndpoint;

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

      // Create biometric keys
      const createKeysResult = await biometricService.createKeys(
        'Authenticate to create biometric keys for enrollment'
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

        const enrollResult = await biometricAPIService.enrollPublicKey(
          enrollConfig,
          publicKey
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
        operation: 'enroll',
        status: 'error',
        message: errorResult.message,
        details: error,
      });

      this.updateState({ operationStatus: errorResult, isLoading: false });
      this.notifyOperationComplete('enroll', operationId, errorResult);

      return errorResult;
    } finally {
      this.currentOperationId = null;
    }
  }

  /**
   * Execute validation operation
   */
  async executeValidation(config?: EndpointConfig): Promise<OperationResult> {
    const operationId = this.generateId();
    this.currentOperationId = operationId;

    try {
      this.updateState({ isLoading: true });
      this.notifyOperationStart('validate', operationId);

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
      this.currentOperationId = null;
    }
  }

  /**
   * Execute delete keys operation
   */
  async deleteKeys(): Promise<OperationResult> {
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
      this.currentOperationId = null;
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

    this.addLog({
      id: this.generateId(),
      timestamp: new Date(),
      operation: 'status',
      status: 'info',
      message: `${type} endpoint configuration updated`,
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
   * Cancel current operation if running
   */
  cancelCurrentOperation(): void {
    if (this.currentOperationId) {
      this.addLog({
        id: this.generateId(),
        timestamp: new Date(),
        operation: 'status',
        status: 'info',
        message: 'Operation cancelled by user',
      });

      this.updateState({ isLoading: false });
      this.currentOperationId = null;
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
}

// Export singleton instance
export const webControlBridge = new WebControlBridge();