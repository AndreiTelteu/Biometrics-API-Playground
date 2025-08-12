/**
 * Constants for the Biometrics Playground app
 */

import { EndpointConfig } from '../types';

// Biometry type constants (matching react-native-biometrics)
export const BIOMETRY_TYPES = {
  TOUCH_ID: 'TouchID' as const,
  FACE_ID: 'FaceID' as const,
  BIOMETRICS: 'Biometrics' as const,
} as const;

// HTTP methods
export const HTTP_METHODS = {
  GET: 'GET' as const,
  POST: 'POST' as const,
  PUT: 'PUT' as const,
  PATCH: 'PATCH' as const,
} as const;

// Operation types
export const OPERATION_TYPES = {
  ENROLL: 'enroll' as const,
  VALIDATE: 'validate' as const,
  DELETE: 'delete' as const,
  STATUS: 'status' as const,
} as const;

// Operation status
export const OPERATION_STATUS = {
  SUCCESS: 'success' as const,
  ERROR: 'error' as const,
  INFO: 'info' as const,
} as const;

// Default configurations
export const DEFAULT_ENROLL_ENDPOINT: EndpointConfig = {
  url: '',
  method: HTTP_METHODS.POST,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const DEFAULT_VALIDATE_ENDPOINT: EndpointConfig = {
  url: '',
  method: HTTP_METHODS.POST,
  headers: {
    'Content-Type': 'application/json',
  },
  customPayload: undefined,
};

// Error messages
export const ERROR_MESSAGES = {
  BIOMETRICS_NOT_AVAILABLE: 'Biometric authentication is not available on this device',
  BIOMETRICS_NOT_ENROLLED: 'No biometric credentials are enrolled on this device',
  KEYS_NOT_FOUND: 'Biometric keys not found. Please enroll first.',
  INVALID_URL: 'Please enter a valid URL',
  INVALID_HTTP_METHOD: 'Please select a valid HTTP method',
  NETWORK_ERROR: 'Network request failed. Please check your connection.',
  AUTHENTICATION_FAILED: 'Biometric authentication failed',
  USER_CANCELLED: 'User cancelled biometric authentication',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  KEYS_CREATED: 'Biometric keys created successfully',
  KEYS_DELETED: 'Biometric keys deleted successfully',
  ENROLLMENT_SUCCESS: 'Enrollment completed successfully',
  VALIDATION_SUCCESS: 'Validation completed successfully',
  SIGNATURE_CREATED: 'Signature created successfully',
} as const;

// Prompt messages
export const PROMPT_MESSAGES = {
  ENROLL: 'Authenticate to create biometric keys',
  VALIDATE: 'Authenticate to create signature',
  DELETE_KEYS: 'Authenticate to delete biometric keys',
} as const;

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
  ENROLL_ENDPOINT: 'biometrics_enroll_endpoint',
  VALIDATE_ENDPOINT: 'biometrics_validate_endpoint',
  APP_SETTINGS: 'biometrics_app_settings',
} as const;

// API configuration
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// UI constants
export const UI_CONSTANTS = {
  MAX_LOG_ENTRIES: 100,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
} as const;