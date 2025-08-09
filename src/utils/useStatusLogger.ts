import { useState, useCallback } from 'react';
import { LogEntry, OperationResult, OperationType } from '../types';
import {
  createLogEntry,
  createSuccessLog,
  createErrorLog,
  createInfoLog,
  truncateLogs,
  formatErrorMessage,
} from './logUtils';

/**
 * Custom hook for managing status logging and real-time feedback
 */
export const useStatusLogger = (maxLogs: number = 100) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentOperation, setCurrentOperation] = useState<OperationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Adds a new log entry to the logs array
   */
  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prevLogs => truncateLogs([...prevLogs, entry], maxLogs));
  }, [maxLogs]);

  /**
   * Logs a success message
   */
  const logSuccess = useCallback((
    operation: OperationType,
    message: string,
    details?: any
  ) => {
    const entry = createSuccessLog(operation, message, details);
    addLog(entry);
    setCurrentOperation({
      success: true,
      message,
      data: details,
      timestamp: entry.timestamp,
    });
  }, [addLog]);

  /**
   * Logs an error message
   */
  const logError = useCallback((
    operation: OperationType,
    error: any,
    details?: any
  ) => {
    const message = formatErrorMessage(error);
    const entry = createErrorLog(operation, message, details);
    addLog(entry);
    setCurrentOperation({
      success: false,
      message,
      data: details,
      timestamp: entry.timestamp,
    });
  }, [addLog]);

  /**
   * Logs an info message
   */
  const logInfo = useCallback((
    operation: OperationType,
    message: string,
    details?: any
  ) => {
    const entry = createInfoLog(operation, message, details);
    addLog(entry);
    setCurrentOperation({
      success: true,
      message,
      data: details,
      timestamp: entry.timestamp,
    });
  }, [addLog]);

  /**
   * Sets loading state and optionally logs an info message
   */
  const setLoadingWithMessage = useCallback((
    loading: boolean,
    operation?: OperationType,
    message?: string
  ) => {
    setIsLoading(loading);
    if (loading && operation && message) {
      logInfo(operation, message);
    }
  }, [logInfo]);

  /**
   * Clears all logs
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
    setCurrentOperation(null);
  }, []);

  /**
   * Clears current operation status
   */
  const clearCurrentOperation = useCallback(() => {
    setCurrentOperation(null);
  }, []);

  /**
   * Executes an async operation with automatic logging
   */
  const executeWithLogging = useCallback(async <T>(
    operation: OperationType,
    startMessage: string,
    asyncFn: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T> => {
    try {
      setLoadingWithMessage(true, operation, startMessage);
      
      const result = await asyncFn();
      
      logSuccess(
        operation,
        successMessage || `${operation} completed successfully`,
        result
      );
      
      return result;
    } catch (error) {
      logError(
        operation,
        errorMessage || error,
        { originalError: error }
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setLoadingWithMessage, logSuccess, logError]);

  return {
    // State
    logs,
    currentOperation,
    isLoading,
    
    // Actions
    addLog,
    logSuccess,
    logError,
    logInfo,
    setLoadingWithMessage,
    clearLogs,
    clearCurrentOperation,
    executeWithLogging,
  };
};