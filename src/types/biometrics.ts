/**
 * TypeScript interfaces and types for the Biometrics Playground app
 */

// React Native Biometrics library types
export type BiometryType = 'TouchID' | 'FaceID' | 'Biometrics' | undefined;

export interface BiometricSensorResult {
  available: boolean;
  biometryType: BiometryType;
  error?: string;
}

export interface BiometricKeysResult {
  keysExist: boolean;
}

export interface BiometricCreateKeysResult {
  publicKey: string;
}

export interface BiometricDeleteKeysResult {
  keysDeleted: boolean;
}

export interface BiometricSignatureOptions {
  promptMessage: string;
  payload: string;
  cancelButtonText?: string;
}

export interface BiometricSignatureResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface BiometricSimplePromptOptions {
  promptMessage: string;
  fallbackPromptMessage?: string;
  cancelButtonText?: string;
}

export interface BiometricSimplePromptResult {
  success: boolean;
  error?: string;
}

// Application-specific interfaces
export interface BiometricStatus {
  available: boolean;
  biometryType: BiometryType;
  error?: string;
}

export interface EndpointConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
}

export interface OperationResult {
  success: boolean;
  message: string;
  data?: any;
  timestamp: Date;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  operation: 'enroll' | 'validate' | 'delete' | 'status';
  status: 'success' | 'error' | 'info';
  message: string;
  details?: any;
}

// HTTP method types for endpoint configuration
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

// Operation status types
export type OperationType = 'enroll' | 'validate' | 'delete' | 'status';
export type OperationStatus = 'success' | 'error' | 'info';

// App state interfaces
export interface AppState {
  biometricStatus: BiometricStatus;
  keysExist: boolean;
  enrollEndpoint: EndpointConfig;
  validateEndpoint: EndpointConfig;
  operationStatus: OperationResult | null;
  logs: LogEntry[];
  isLoading: boolean;
}

// Component prop interfaces
export interface BiometricStatusDisplayProps {
  available: boolean;
  biometryType: BiometryType;
  keysExist: boolean;
  error?: string;
}

export interface EndpointConfigurationProps {
  enrollConfig: EndpointConfig;
  validateConfig: EndpointConfig;
  onConfigChange: (type: 'enroll' | 'validate', config: EndpointConfig) => void;
}

export interface BiometricActionsProps {
  onEnroll: () => Promise<void>;
  onValidate: () => Promise<void>;
  onDeleteKeys: () => Promise<void>;
  disabled: boolean;
  keysExist: boolean;
  biometricAvailable: boolean;
  endpointsConfigured: boolean;
}

export interface StatusLogProps {
  logs: LogEntry[];
  currentOperation?: OperationResult;
}

// API service interfaces
export interface APIRequestOptions {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

// Error types
export interface BiometricError {
  code: string;
  message: string;
  details?: any;
}

export interface NetworkError {
  code: string;
  message: string;
  status?: number;
  details?: any;
}

// Configuration validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Constants for biometry types (matching react-native-biometrics)
export const BiometryTypes = {
  TouchID: 'TouchID' as const,
  FaceID: 'FaceID' as const,
  Biometrics: 'Biometrics' as const,
} as const;

// Default app state (without endpoint configs to avoid circular imports)
export const DEFAULT_APP_STATE: Partial<AppState> = {
  biometricStatus: {
    available: false,
    biometryType: undefined,
  },
  keysExist: false,
  operationStatus: null,
  logs: [],
  isLoading: false,
};