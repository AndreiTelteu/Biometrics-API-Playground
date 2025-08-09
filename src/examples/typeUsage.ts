/**
 * Example usage of TypeScript interfaces and types
 * This file demonstrates how to use the defined types in the application
 */

import {
  BiometricStatus,
  EndpointConfig,
  OperationResult,
  LogEntry,
  AppState,
  BiometryType,
} from '../types';

import {
  createOperationResult,
  validateEndpointConfig,
} from '../utils/typeGuards';

import { createLogEntry } from '../utils/logUtils';

import {
  BIOMETRY_TYPES,
  HTTP_METHODS,
  OPERATION_TYPES,
  OPERATION_STATUS,
  DEFAULT_ENROLL_ENDPOINT,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../constants';

// Example: Creating a biometric status object
export function createBiometricStatus(
  available: boolean,
  biometryType: BiometryType,
  error?: string
): BiometricStatus {
  return {
    available,
    biometryType,
    error,
  };
}

// Example: Creating endpoint configurations
export function createEndpointConfigs(): {
  enrollEndpoint: EndpointConfig;
  validateEndpoint: EndpointConfig;
} {
  const enrollEndpoint: EndpointConfig = {
    url: 'https://api.example.com/biometric/enroll',
    method: HTTP_METHODS.POST,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-token-here',
    },
  };

  const validateEndpoint: EndpointConfig = {
    url: 'https://api.example.com/biometric/validate',
    method: HTTP_METHODS.POST,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-token-here',
    },
  };

  return { enrollEndpoint, validateEndpoint };
}

// Example: Creating operation results
export function createSuccessResult(message: string, data?: any): OperationResult {
  return createOperationResult(true, message, data);
}

export function createErrorResult(message: string, error?: any): OperationResult {
  return createOperationResult(false, message, error);
}

// Example: Creating log entries
export function logEnrollmentSuccess(publicKey: string): LogEntry {
  return createLogEntry(
    OPERATION_TYPES.ENROLL,
    OPERATION_STATUS.SUCCESS,
    SUCCESS_MESSAGES.ENROLLMENT_SUCCESS,
    { publicKey }
  );
}

export function logValidationError(error: string): LogEntry {
  return createLogEntry(
    OPERATION_TYPES.VALIDATE,
    OPERATION_STATUS.ERROR,
    `Validation failed: ${error}`,
    { error }
  );
}

// Example: Validating configurations
export function validateAndCreateEndpoint(url: string, method: string): EndpointConfig | null {
  const config: EndpointConfig = {
    url,
    method: method as any, // We'll validate this
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const validation = validateEndpointConfig(config);
  if (!validation.isValid) {
    console.error('Invalid endpoint configuration:', validation.errors);
    return null;
  }

  return config;
}

// Example: Creating initial app state
export function createInitialAppState(): AppState {
  return {
    biometricStatus: {
      available: false,
      biometryType: undefined,
    },
    keysExist: false,
    enrollEndpoint: DEFAULT_ENROLL_ENDPOINT,
    validateEndpoint: DEFAULT_ENROLL_ENDPOINT,
    operationStatus: null,
    logs: [],
    isLoading: false,
  };
}

// Example: Type-safe error handling
export function handleBiometricError(error: any): OperationResult {
  let message: string = ERROR_MESSAGES.UNKNOWN_ERROR;
  
  if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error.message === 'string') {
    message = error.message;
  }

  return createErrorResult(message, error);
}

// Example: Working with biometry types
export function getBiometryDisplayName(biometryType: BiometryType): string {
  switch (biometryType) {
    case BIOMETRY_TYPES.TOUCH_ID:
      return 'Touch ID';
    case BIOMETRY_TYPES.FACE_ID:
      return 'Face ID';
    case BIOMETRY_TYPES.BIOMETRICS:
      return 'Biometric Authentication';
    default:
      return 'Not Available';
  }
}

// Example: Type-safe state updates
export function updateAppStateWithBiometricStatus(
  currentState: AppState,
  status: BiometricStatus
): AppState {
  return {
    ...currentState,
    biometricStatus: status,
    logs: [
      ...currentState.logs,
      createLogEntry(
        OPERATION_TYPES.STATUS,
        OPERATION_STATUS.INFO,
        `Biometric status updated: ${status.available ? 'Available' : 'Not Available'}`,
        status
      ),
    ],
  };
}