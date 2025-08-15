import { renderHook, act } from '@testing-library/react-native';
import { useStatusLogger } from '../useStatusLogger';
import { OperationType } from '../../types';

describe('useStatusLogger Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty logs and no current operation', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      expect(result.current.logs).toEqual([]);
      expect(result.current.currentOperation).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Log Management', () => {
    it('should add log entries correctly', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      act(() => {
        result.current.logSuccess('enroll', 'Success message', { data: 'test' });
      });
      
      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].operation).toBe('enroll');
      expect(result.current.logs[0].status).toBe('success');
      expect(result.current.logs[0].message).toBe('Success message');
      expect(result.current.logs[0].details).toEqual({ data: 'test' });
    });

    it('should set current operation when logging', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      act(() => {
        result.current.logSuccess('validate', 'Validation successful');
      });
      
      expect(result.current.currentOperation).toMatchObject({
        success: true,
        message: 'Validation successful',
        data: undefined,
      });
      expect(result.current.currentOperation?.timestamp).toBeInstanceOf(Date);
    });

    it('should handle error logging correctly', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      act(() => {
        result.current.logError('enroll', 'Enrollment failed', { errorCode: 'E001' });
      });
      
      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].status).toBe('error');
      expect(result.current.logs[0].message).toBe('Enrollment failed');
      expect(result.current.currentOperation?.success).toBe(false);
    });

    it('should handle info logging correctly', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      act(() => {
        // result.current.logInfo('status', 'Status check completed');
      });
      
      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].status).toBe('info');
      expect(result.current.logs[0].message).toBe('Status check completed');
    });
  });

  describe('Loading State Management', () => {
    it('should set loading state correctly', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      act(() => {
        result.current.setLoadingWithMessage(true);
      });
      
      expect(result.current.isLoading).toBe(true);
      
      act(() => {
        result.current.setLoadingWithMessage(false);
      });
      
      expect(result.current.isLoading).toBe(false);
    });

    it('should log message when setting loading state with message', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      act(() => {
        result.current.setLoadingWithMessage(true, 'enroll', 'Starting enrollment...');
      });
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].message).toBe('Starting enrollment...');
    });
  });

  describe('Clear Functions', () => {
    it('should clear all logs', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      act(() => {
        result.current.logSuccess('enroll', 'Test message');
        result.current.logError('validate', 'Test error');
      });
      
      expect(result.current.logs).toHaveLength(2);
      
      act(() => {
        result.current.clearLogs();
      });
      
      expect(result.current.logs).toHaveLength(0);
      expect(result.current.currentOperation).toBeNull();
    });

    it('should clear current operation only', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      act(() => {
        result.current.logSuccess('enroll', 'Test message');
      });
      
      expect(result.current.currentOperation).not.toBeNull();
      expect(result.current.logs).toHaveLength(1);
      
      act(() => {
        result.current.clearCurrentOperation();
      });
      
      expect(result.current.currentOperation).toBeNull();
      expect(result.current.logs).toHaveLength(1);
    });
  });

  describe('executeWithLogging', () => {
    it('should execute successful operations with logging', async () => {
      const { result } = renderHook(() => useStatusLogger());
      const mockAsyncFn = jest.fn().mockResolvedValue('success result');
      
      await act(async () => {
        const returnValue = await result.current.executeWithLogging(
          'enroll',
          'Starting operation...',
          mockAsyncFn,
          'Operation completed',
          'Operation failed'
        );
        
        expect(returnValue).toBe('success result');
      });
      
      expect(mockAsyncFn).toHaveBeenCalledTimes(1);
      expect(result.current.logs).toHaveLength(2); // Start message + success message
      expect(result.current.logs[0].message).toBe('Starting operation...');
      expect(result.current.logs[1].message).toBe('Operation completed');
      expect(result.current.logs[1].status).toBe('success');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle failed operations with logging', async () => {
      const { result } = renderHook(() => useStatusLogger());
      const mockError = new Error('Operation failed');
      const mockAsyncFn = jest.fn().mockRejectedValue(mockError);
      
      await act(async () => {
        try {
          await result.current.executeWithLogging(
            'validate',
            'Starting validation...',
            mockAsyncFn,
            'Validation completed',
            'Validation failed'
          );
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });
      
      expect(mockAsyncFn).toHaveBeenCalledTimes(1);
      expect(result.current.logs).toHaveLength(2); // Start message + error message
      expect(result.current.logs[0].message).toBe('Starting validation...');
      expect(result.current.logs[1].message).toBe('Validation failed');
      expect(result.current.logs[1].status).toBe('error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should use default messages when not provided', async () => {
      const { result } = renderHook(() => useStatusLogger());
      const mockAsyncFn = jest.fn().mockResolvedValue('result');
      
      await act(async () => {
        await result.current.executeWithLogging(
          'delete',
          'Starting delete...',
          mockAsyncFn
        );
      });
      
      expect(result.current.logs[1].message).toBe('delete completed successfully');
    });
  });

  describe('Log Truncation', () => {
    it('should truncate logs when exceeding maxLogs limit', () => {
      const { result } = renderHook(() => useStatusLogger(3));
      
      act(() => {
        result.current.logInfo('status', 'Message 1');
        result.current.logInfo('status', 'Message 2');
        result.current.logInfo('status', 'Message 3');
        result.current.logInfo('status', 'Message 4');
        result.current.logInfo('status', 'Message 5');
      });
      
      expect(result.current.logs).toHaveLength(3);
      // Should keep the most recent logs
      expect(result.current.logs[0].message).toBe('Message 3');
      expect(result.current.logs[1].message).toBe('Message 4');
      expect(result.current.logs[2].message).toBe('Message 5');
    });
  });

  describe('Error Message Formatting', () => {
    it('should format different error types correctly', () => {
      const { result } = renderHook(() => useStatusLogger());
      
      act(() => {
        result.current.logError('enroll', 'String error');
      });
      
      act(() => {
        result.current.logError('validate', { message: 'Object error' });
      });
      
      act(() => {
        result.current.logError('delete', { error: 'Error property' });
      });
      
      expect(result.current.logs).toHaveLength(3);
      expect(result.current.logs[0].message).toBe('String error');
      expect(result.current.logs[1].message).toBe('Object error');
      expect(result.current.logs[2].message).toBe('Error property');
    });
  });
});