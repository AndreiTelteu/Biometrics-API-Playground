/**
 * Type guards and validation utilities for the Biometrics Playground app
 */

import {
  BiometryType,
  HttpMethod,
  OperationType,
  OperationStatus,
  EndpointConfig,
  ValidationResult,
  BiometricStatus,
  OperationResult,
  LogEntry,
} from '../types';

// Type guards for biometry types
export function isBiometryType(value: any): value is BiometryType {
  return value === 'TouchID' || value === 'FaceID' || value === 'Biometrics' || value === undefined;
}

export function isHttpMethod(value: any): value is HttpMethod {
  return ['GET', 'POST', 'PUT', 'PATCH'].includes(value);
}

export function isOperationType(value: any): value is OperationType {
  return ['enroll', 'validate', 'delete', 'status'].includes(value);
}

export function isOperationStatus(value: any): value is OperationStatus {
  return ['success', 'error', 'info'].includes(value);
}

// Validation functions
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateEndpointConfig(config: EndpointConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.url) {
    errors.push('URL is required');
  } else if (!validateUrl(config.url)) {
    errors.push('URL format is invalid');
  }

  if (!isHttpMethod(config.method)) {
    errors.push('HTTP method must be GET, POST, PUT, or PATCH');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateBiometricStatus(status: any): status is BiometricStatus {
  return (
    typeof status === 'object' &&
    status !== null &&
    typeof status.available === 'boolean' &&
    isBiometryType(status.biometryType) &&
    (status.error === undefined || typeof status.error === 'string')
  );
}

export function validateOperationResult(result: any): result is OperationResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    typeof result.success === 'boolean' &&
    typeof result.message === 'string' &&
    result.timestamp instanceof Date
  );
}

export function validateLogEntry(entry: any): entry is LogEntry {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.id === 'string' &&
    entry.timestamp instanceof Date &&
    isOperationType(entry.operation) &&
    isOperationStatus(entry.status) &&
    typeof entry.message === 'string'
  );
}

// Utility functions for creating typed objects
export function createOperationResult(
  success: boolean,
  message: string,
  data?: any
): OperationResult {
  return {
    success,
    message,
    data,
    timestamp: new Date(),
  };
}

// Note: createLogEntry is exported from logUtils.ts to avoid duplication

// Error message helpers
export function getValidationErrorMessage(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return `Multiple errors: ${errors.join(', ')}`;
}