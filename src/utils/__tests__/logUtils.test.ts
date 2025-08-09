import {
  createLogEntry,
  createSuccessLog,
  createErrorLog,
  createInfoLog,
  formatErrorMessage,
  LogMessages,
  truncateLogs,
  filterLogsByOperation,
  filterLogsByStatus,
  getLatestLog,
  getRecentLogs,
  exportLogsAsString,
} from '../logUtils';
import { LogEntry, OperationType, OperationStatus } from '../../types';

describe('Log Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createLogEntry', () => {
    it('should create a log entry with all required fields', () => {
      const entry = createLogEntry('enroll', 'success', 'Test message');
      
      expect(entry.operation).toBe('enroll');
      expect(entry.status).toBe('success');
      expect(entry.message).toBe('Test message');
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe('string');
    });

    it('should create a log entry with details', () => {
      const details = { key: 'value' };
      const entry = createLogEntry('validate', 'error', 'Test message', details);
      
      expect(entry.details).toEqual(details);
    });

    it('should generate unique IDs for different entries', () => {
      const entry1 = createLogEntry('enroll', 'success', 'Message 1');
      const entry2 = createLogEntry('enroll', 'success', 'Message 2');
      
      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('Convenience log creators', () => {
    it('should create success log with correct status', () => {
      const entry = createSuccessLog('enroll', 'Success message');
      
      expect(entry.status).toBe('success');
      expect(entry.operation).toBe('enroll');
      expect(entry.message).toBe('Success message');
    });

    it('should create error log with correct status', () => {
      const entry = createErrorLog('validate', 'Error message');
      
      expect(entry.status).toBe('error');
      expect(entry.operation).toBe('validate');
      expect(entry.message).toBe('Error message');
    });

    it('should create info log with correct status', () => {
      const entry = createInfoLog('status', 'Info message');
      
      expect(entry.status).toBe('info');
      expect(entry.operation).toBe('status');
      expect(entry.message).toBe('Info message');
    });
  });

  describe('formatErrorMessage', () => {
    it('should return string errors as-is', () => {
      const result = formatErrorMessage('Simple error message');
      expect(result).toBe('Simple error message');
    });

    it('should extract message from error objects', () => {
      const error = { message: 'Error object message' };
      const result = formatErrorMessage(error);
      expect(result).toBe('Error object message');
    });

    it('should extract error from error objects', () => {
      const error = { error: 'Error property message' };
      const result = formatErrorMessage(error);
      expect(result).toBe('Error property message');
    });

    it('should return default message for unknown error types', () => {
      const result = formatErrorMessage({ unknown: 'property' });
      expect(result).toBe('An unknown error occurred');
    });

    it('should handle null and undefined errors', () => {
      expect(formatErrorMessage(null)).toBe('An unknown error occurred');
      expect(formatErrorMessage(undefined)).toBe('An unknown error occurred');
    });
  });

  describe('LogMessages constants', () => {
    it('should contain all expected enrollment messages', () => {
      expect(LogMessages.ENROLLMENT_STARTED).toBeDefined();
      expect(LogMessages.ENROLLMENT_SUCCESS).toBeDefined();
      expect(LogMessages.ENROLLMENT_FAILED).toBeDefined();
      expect(LogMessages.ENROLLMENT_CANCELLED).toBeDefined();
    });

    it('should contain all expected validation messages', () => {
      expect(LogMessages.VALIDATION_STARTED).toBeDefined();
      expect(LogMessages.VALIDATION_SUCCESS).toBeDefined();
      expect(LogMessages.VALIDATION_FAILED).toBeDefined();
      expect(LogMessages.VALIDATION_CANCELLED).toBeDefined();
    });

    it('should contain all expected key management messages', () => {
      expect(LogMessages.DELETE_KEYS_STARTED).toBeDefined();
      expect(LogMessages.DELETE_KEYS_SUCCESS).toBeDefined();
      expect(LogMessages.DELETE_KEYS_FAILED).toBeDefined();
    });
  });

  describe('truncateLogs', () => {
    const createMockLogs = (count: number): LogEntry[] => {
      const baseTime = new Date('2024-01-01T10:00:00.000Z').getTime();
      return Array.from({ length: count }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(baseTime + i * 1000),
        operation: 'status' as OperationType,
        status: 'info' as OperationStatus,
        message: `Message ${i}`,
      }));
    };

    it('should return all logs when count is below limit', () => {
      const logs = createMockLogs(50);
      const result = truncateLogs(logs, 100);
      
      expect(result).toHaveLength(50);
      expect(result).toEqual(logs);
    });

    it('should truncate logs when count exceeds limit', () => {
      const logs = createMockLogs(150);
      const result = truncateLogs(logs, 100);
      
      expect(result).toHaveLength(100);
      // Should keep the most recent entries
      expect(result[0].message).toBe('Message 50');
      expect(result[99].message).toBe('Message 149');
    });

    it('should use default limit of 100', () => {
      const logs = createMockLogs(150);
      const result = truncateLogs(logs);
      
      expect(result).toHaveLength(100);
    });
  });

  describe('filterLogsByOperation', () => {
    const mockLogs: LogEntry[] = [
      createLogEntry('enroll', 'success', 'Enroll 1'),
      createLogEntry('validate', 'success', 'Validate 1'),
      createLogEntry('enroll', 'error', 'Enroll 2'),
      createLogEntry('delete', 'success', 'Delete 1'),
    ];

    it('should filter logs by operation type', () => {
      const result = filterLogsByOperation(mockLogs, 'enroll');
      
      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('Enroll 1');
      expect(result[1].message).toBe('Enroll 2');
    });

    it('should return empty array when no matches found', () => {
      const result = filterLogsByOperation(mockLogs, 'status');
      expect(result).toHaveLength(0);
    });
  });

  describe('filterLogsByStatus', () => {
    const mockLogs: LogEntry[] = [
      createLogEntry('enroll', 'success', 'Success 1'),
      createLogEntry('validate', 'error', 'Error 1'),
      createLogEntry('enroll', 'success', 'Success 2'),
      createLogEntry('delete', 'info', 'Info 1'),
    ];

    it('should filter logs by status', () => {
      const result = filterLogsByStatus(mockLogs, 'success');
      
      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('Success 1');
      expect(result[1].message).toBe('Success 2');
    });

    it('should return empty array when no matches found', () => {
      const result = filterLogsByStatus(mockLogs, 'error');
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Error 1');
    });
  });

  describe('getLatestLog', () => {
    it('should return undefined for empty array', () => {
      const result = getLatestLog([]);
      expect(result).toBeUndefined();
    });

    it('should return the most recent log entry', () => {
      const logs: LogEntry[] = [
        { ...createLogEntry('enroll', 'success', 'First'), timestamp: new Date('2024-01-01T10:00:00Z') },
        { ...createLogEntry('validate', 'success', 'Latest'), timestamp: new Date('2024-01-01T10:02:00Z') },
        { ...createLogEntry('delete', 'success', 'Middle'), timestamp: new Date('2024-01-01T10:01:00Z') },
      ];
      
      const result = getLatestLog(logs);
      expect(result?.message).toBe('Latest');
    });
  });

  describe('getRecentLogs', () => {
    it('should return logs from the last N minutes', () => {
      const now = new Date('2024-01-01T10:10:00Z');
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => now.getTime());
      
      const logs: LogEntry[] = [
        { ...createLogEntry('enroll', 'success', 'Old'), timestamp: new Date('2024-01-01T10:00:00Z') },
        { ...createLogEntry('validate', 'success', 'Recent'), timestamp: new Date('2024-01-01T10:08:00Z') },
        { ...createLogEntry('delete', 'success', 'Very Recent'), timestamp: new Date('2024-01-01T10:09:00Z') },
      ];
      
      const result = getRecentLogs(logs, 5);
      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('Recent');
      expect(result[1].message).toBe('Very Recent');
      
      Date.now = originalDateNow;
    });

    it('should use default of 5 minutes', () => {
      const now = new Date('2024-01-01T10:10:00Z');
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => now.getTime());
      
      const logs: LogEntry[] = [
        { ...createLogEntry('enroll', 'success', 'Old'), timestamp: new Date('2024-01-01T10:00:00Z') },
        { ...createLogEntry('validate', 'success', 'Recent'), timestamp: new Date('2024-01-01T10:08:00Z') },
      ];
      
      const result = getRecentLogs(logs);
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Recent');
      
      Date.now = originalDateNow;
    });
  });

  describe('exportLogsAsString', () => {
    it('should format logs as readable string', () => {
      const logs: LogEntry[] = [
        {
          id: '1',
          timestamp: new Date('2024-01-01T10:00:00.000Z'),
          operation: 'enroll',
          status: 'success',
          message: 'Test message',
        },
        {
          id: '2',
          timestamp: new Date('2024-01-01T10:01:00.000Z'),
          operation: 'validate',
          status: 'error',
          message: 'Error message',
          details: { code: 'TEST_ERROR' },
        },
      ];
      
      const result = exportLogsAsString(logs);
      
      expect(result).toContain('ENROLL - SUCCESS: Test message');
      expect(result).toContain('VALIDATE - ERROR: Error message');
      expect(result).toContain('Details: {"code":"TEST_ERROR"}');
    });

    it('should handle logs without details', () => {
      const logs: LogEntry[] = [
        {
          id: '1',
          timestamp: new Date('2024-01-01T10:00:00.000Z'),
          operation: 'status',
          status: 'info',
          message: 'Simple message',
        },
      ];
      
      const result = exportLogsAsString(logs);
      expect(result).toBe('[2024-01-01T10:00:00.000Z] STATUS - INFO: Simple message');
    });

    it('should return empty string for empty logs array', () => {
      const result = exportLogsAsString([]);
      expect(result).toBe('');
    });
  });
});