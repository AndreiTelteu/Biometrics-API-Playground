/**
 * BiometricService - Core service for handling biometric operations
 * Provides methods for sensor detection, key management, and signature creation
 */

import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import {
  BiometricStatus,
  BiometricSensorResult,
  BiometricKeysResult,
  BiometricCreateKeysResult,
  BiometricDeleteKeysResult,
  BiometricSignatureResult,
  BiometricSignatureOptions,
  BiometricSimplePromptOptions,
  BiometricSimplePromptResult,
  OperationResult,
  BiometricError,
} from '../types/biometrics';

export class BiometricService {
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: false,
    });
  }

  /**
   * Check if biometric sensors are available on the device
   * @returns Promise<BiometricStatus> - Status of biometric availability
   */
  async checkBiometricAvailability(): Promise<BiometricStatus> {
    try {
      const result = await this.rnBiometrics.isSensorAvailable();
      
      return {
        available: result.available,
        biometryType: result.biometryType as any,
        error: result.error,
      };
    } catch (error) {
      return this.handleBiometricError(error, 'Failed to check biometric availability');
    }
  }

  /**
   * Check if biometric keys exist in the keystore
   * @returns Promise<boolean> - True if keys exist, false otherwise
   */
  async checkKeysExist(): Promise<boolean> {
    try {
      const result = await this.rnBiometrics.biometricKeysExist();
      return result.keysExist;
    } catch (error) {
      console.error('Error checking keys existence:', error);
      return false;
    }
  }

  /**
   * Create biometric keys and return the public key
   * @param promptMessage - Message to display during biometric prompt
   * @returns Promise<OperationResult> - Result containing public key or error
   */
  async createKeys(promptMessage: string = 'Authenticate to create biometric keys'): Promise<OperationResult> {
    try {
      const result = await this.rnBiometrics.createKeys();
      
      return {
        success: true,
        message: 'Biometric keys created successfully',
        data: { publicKey: result.publicKey },
        timestamp: new Date(),
      };
    } catch (error) {
      return this.handleOperationError(error, 'Failed to create biometric keys');
    }
  }

  /**
   * Delete existing biometric keys from the keystore
   * @returns Promise<OperationResult> - Result of the deletion operation
   */
  async deleteKeys(): Promise<OperationResult> {
    try {
      const result = await this.rnBiometrics.deleteKeys();
      
      return {
        success: result.keysDeleted,
        message: result.keysDeleted ? 'Biometric keys deleted successfully' : 'No keys found to delete',
        data: { keysDeleted: result.keysDeleted },
        timestamp: new Date(),
      };
    } catch (error) {
      return this.handleOperationError(error, 'Failed to delete biometric keys');
    }
  }

  /**
   * Create a biometric signature for the given payload
   * @param options - Signature options including prompt message and payload
   * @returns Promise<OperationResult> - Result containing signature or error
   */
  async createSignature(options: BiometricSignatureOptions): Promise<OperationResult> {
    try {
      const result = await this.rnBiometrics.createSignature({
        promptMessage: options.promptMessage,
        payload: options.payload,
        cancelButtonText: options.cancelButtonText || 'Cancel',
      });

      if (result.success && result.signature) {
        return {
          success: true,
          message: 'Signature created successfully',
          data: { 
            signature: result.signature,
            payload: options.payload,
          },
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          message: result.error || 'Failed to create signature',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return this.handleOperationError(error, 'Failed to create biometric signature');
    }
  }

  /**
   * Show a simple biometric prompt without signature creation
   * @param options - Prompt options
   * @returns Promise<OperationResult> - Result of the authentication
   */
  async simplePrompt(options: BiometricSimplePromptOptions): Promise<OperationResult> {
    try {
      const result = await this.rnBiometrics.simplePrompt({
        promptMessage: options.promptMessage,
        fallbackPromptMessage: options.fallbackPromptMessage,
        cancelButtonText: options.cancelButtonText || 'Cancel',
      });

      return {
        success: result.success,
        message: result.success ? 'Authentication successful' : (result.error || 'Authentication failed'),
        timestamp: new Date(),
      };
    } catch (error) {
      return this.handleOperationError(error, 'Biometric authentication failed');
    }
  }

  /**
   * Get the public key from existing biometric keys
   * @returns Promise<OperationResult> - Result containing public key or error
   */
  async getPublicKey(): Promise<OperationResult> {
    try {
      // First check if keys exist
      const keysExist = await this.checkKeysExist();
      if (!keysExist) {
        return {
          success: false,
          message: 'No biometric keys found. Please enroll first.',
          timestamp: new Date(),
        };
      }

      // Get the public key
      const result = await this.rnBiometrics.createKeys();
      
      return {
        success: true,
        message: 'Public key retrieved successfully',
        data: { publicKey: result.publicKey },
        timestamp: new Date(),
      };
    } catch (error) {
      return this.handleOperationError(error, 'Failed to retrieve public key');
    }
  }

  /**
   * Generate a timestamp payload for signature creation
   * @returns string - ISO timestamp string
   */
  generateTimestampPayload(): string {
    return new Date().toISOString();
  }

  /**
   * Validate biometric configuration and device capabilities
   * @returns Promise<OperationResult> - Validation result
   */
  async validateConfiguration(): Promise<OperationResult> {
    try {
      const status = await this.checkBiometricAvailability();
      
      if (!status.available) {
        return {
          success: false,
          message: `Biometrics not available: ${status.error || 'Unknown reason'}`,
          data: status,
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        message: `Biometrics available: ${status.biometryType}`,
        data: status,
        timestamp: new Date(),
      };
    } catch (error) {
      return this.handleOperationError(error, 'Failed to validate biometric configuration');
    }
  }

  /**
   * Handle biometric-specific errors and return formatted BiometricStatus
   * @private
   */
  private handleBiometricError(error: any, defaultMessage: string): BiometricStatus {
    const errorMessage = this.extractErrorMessage(error, defaultMessage);
    
    return {
      available: false,
      biometryType: undefined,
      error: errorMessage,
    };
  }

  /**
   * Handle operation errors and return formatted OperationResult
   * @private
   */
  private handleOperationError(error: any, defaultMessage: string): OperationResult {
    const errorMessage = this.extractErrorMessage(error, defaultMessage);
    
    return {
      success: false,
      message: errorMessage,
      timestamp: new Date(),
    };
  }

  /**
   * Extract meaningful error message from various error types
   * @private
   */
  private extractErrorMessage(error: any, defaultMessage: string): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error) {
      return error.error;
    }
    
    if (error?.code) {
      return `Error ${error.code}: ${error.message || defaultMessage}`;
    }
    
    return defaultMessage;
  }

  /**
   * Create a BiometricError object with standardized format
   * @private
   */
  private createBiometricError(code: string, message: string, details?: any): BiometricError {
    return {
      code,
      message,
      details,
    };
  }
}

// Export a singleton instance for convenience
export const biometricService = new BiometricService();