import { LogEntry, OperationType, OperationStatus } from '../types';

/**
 * Utility functions for creating and managing log entries
 */

/**
 * Generates a unique ID for log entries
 */
const generateLogId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Creates a new log entry with proper formatting
 */
export const createLogEntry = (
  operation: OperationType,
  status: OperationStatus,
  message: string,
  details?: any
): LogEntry => {
  return {
    id: generateLogId(),
    timestamp: new Date(),
    operation,
    status,
    message,
    details,
  };
};

/**
 * Creates a success log entry
 */
export const createSuccessLog = (
  operation: OperationType,
  message: string,
  details?: any
): LogEntry => {
  return createLogEntry(operation, 'success', message, details);
};

/**
 * Creates an error log entry
 */
export const createErrorLog = (
  operation: OperationType,
  message: string,
  details?: any
): LogEntry => {
  return createLogEntry(operation, 'error', message, details);
};

/**
 * Creates an info log entry
 */
export const createInfoLog = (
  operation: OperationType,
  message: string,
  details?: any
): LogEntry => {
  return createLogEntry(operation, 'info', message, details);
};

/**
 * Formats error messages for consistent display
 */
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  return 'An unknown error occurred';
};

/**
 * Creates standardized log messages for common operations
 */
export const LogMessages = {
  // Enrollment messages
  ENROLLMENT_STARTED: 'Starting biometric enrollment...',
  ENROLLMENT_SUCCESS: 'Biometric enrollment completed successfully',
  ENROLLMENT_FAILED: 'Biometric enrollment failed',
  ENROLLMENT_CANCELLED: 'Biometric enrollment was cancelled by user',
  ENROLLMENT_API_SUCCESS: 'Public key successfully sent to enrollment endpoint',
  ENROLLMENT_API_FAILED: 'Failed to send public key to enrollment endpoint',
  
  // Validation messages
  VALIDATION_STARTED: 'Starting biometric validation...',
  VALIDATION_SUCCESS: 'Biometric validation completed successfully',
  VALIDATION_FAILED: 'Biometric validation failed',
  VALIDATION_CANCELLED: 'Biometric validation was cancelled by user',
  VALIDATION_API_SUCCESS: 'Signature successfully validated by server',
  VALIDATION_API_FAILED: 'Server validation failed',
  
  // Key management messages
  DELETE_KEYS_STARTED: 'Deleting biometric keys...',
  DELETE_KEYS_SUCCESS: 'Biometric keys deleted successfully',
  DELETE_KEYS_FAILED: 'Failed to delete biometric keys',
  
  // Status check messages
  STATUS_CHECK_STARTED: 'Checking biometric sensor status...',
  STATUS_CHECK_SUCCESS: 'Biometric sensor status updated',
  STATUS_CHECK_FAILED: 'Failed to check biometric sensor status',
  KEYS_CHECK_SUCCESS: 'Biometric keys status updated',
  KEYS_CHECK_FAILED: 'Failed to check biometric keys status',
  
  // Configuration messages
  CONFIG_UPDATED: 'Endpoint configuration updated',
  CONFIG_INVALID: 'Invalid endpoint configuration',
  
  // Network messages
  NETWORK_REQUEST_STARTED: 'Sending request to server...',
  NETWORK_REQUEST_SUCCESS: 'Server request completed successfully',
  NETWORK_REQUEST_FAILED: 'Server request failed',
  NETWORK_TIMEOUT: 'Request timed out',
  NETWORK_OFFLINE: 'Network is offline',
} as const;

/**
 * Truncates log entries array to prevent memory issues
 */
export const truncateLogs = (logs: LogEntry[], maxEntries: number = 100): LogEntry[] => {
  if (logs.length <= maxEntries) {
    return logs;
  }
  
  // Keep the most recent entries
  return logs.slice(-maxEntries);
};

/**
 * Filters logs by operation type
 */
export const filterLogsByOperation = (
  logs: LogEntry[],
  operation: OperationType
): LogEntry[] => {
  return logs.filter(log => log.operation === operation);
};

/**
 * Filters logs by status
 */
export const filterLogsByStatus = (
  logs: LogEntry[],
  status: OperationStatus
): LogEntry[] => {
  return logs.filter(log => log.status === status);
};

/**
 * Gets the most recent log entry
 */
export const getLatestLog = (logs: LogEntry[]): LogEntry | undefined => {
  if (logs.length === 0) return undefined;
  
  return logs.reduce((latest, current) => 
    current.timestamp > latest.timestamp ? current : latest
  );
};

/**
 * Gets logs from the last N minutes
 */
export const getRecentLogs = (logs: LogEntry[], minutes: number = 5): LogEntry[] => {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
  return logs.filter(log => log.timestamp > cutoffTime);
};

/**
 * Exports log entries to a formatted string for debugging
 */
export const exportLogsAsString = (logs: LogEntry[]): string => {
  return logs
    .map(log => {
      const timestamp = log.timestamp.toISOString();
      const details = log.details ? ` | Details: ${JSON.stringify(log.details)}` : '';
      return `[${timestamp}] ${log.operation.toUpperCase()} - ${log.status.toUpperCase()}: ${log.message}${details}`;
    })
    .join('\n');
};