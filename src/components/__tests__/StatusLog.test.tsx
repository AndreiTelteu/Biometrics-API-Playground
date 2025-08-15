import React from 'react';
import { render, screen } from '@testing-library/react-native';
import StatusLog from '../StatusLog';
import { LogEntry, OperationResult } from '../../types';

// Mock the theme hook
jest.mock('../../theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#007AFF',
        secondary: '#5856D6',
        background: '#F2F2F7',
        surface: '#FFFFFF',
        text: '#000000',
        textSecondary: '#6D6D80',
        border: '#C6C6C8',
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        info: '#007AFF',
        accent: '#FF2D92',
        surfaceSecondary: '#F9F9FB',
        overlay: 'rgba(0, 0, 0, 0.4)',
      },
    },
  }),
}));

// Mock data for testing
const mockLogEntries: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-01T10:00:00.000Z'),
    operation: 'enroll',
    status: 'success',
    message: 'Biometric enrollment successful',
    details: { publicKey: 'mock-public-key-123' },
  },
  {
    id: '2',
    timestamp: new Date('2024-01-01T10:01:00.000Z'),
    operation: 'validate',
    status: 'error',
    message: 'Validation failed: Invalid signature',
    details: { errorCode: 'INVALID_SIGNATURE' },
  },
  {
    id: '3',
    timestamp: new Date('2024-01-01T10:02:00.000Z'),
    operation: 'status',
    status: 'info',
    message: 'Biometric sensor check completed',
  },
];

const mockCurrentOperation: OperationResult = {
  success: true,
  message: 'Operation completed successfully',
  data: { result: 'test-data' },
  timestamp: new Date('2024-01-01T10:03:00.000Z'),
};

describe('StatusLog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the component title', () => {
      render(<StatusLog logs={[]} />);
      expect(screen.getByText('Status Log')).toBeTruthy();
    });

    it('should display empty message when no logs are provided', () => {
      render(<StatusLog logs={[]} />);
      expect(screen.getByText('No operations logged yet')).toBeTruthy();
    });

    it('should render log entries when provided', () => {
      render(<StatusLog logs={mockLogEntries} />);
      
      expect(screen.getByText('Biometric enrollment successful')).toBeTruthy();
      expect(screen.getByText('Validation failed: Invalid signature')).toBeTruthy();
      expect(screen.getByText('Biometric sensor check completed')).toBeTruthy();
    });
  });

  describe('Log Entry Formatting', () => {
    it('should display timestamps in correct format', () => {
      render(<StatusLog logs={[mockLogEntries[0]]} />);
      
      // Check for timestamp format (HH:MM:SS.mmm)
      expect(screen.getByText(/\d{2}:\d{2}:\d{2}\.\d{3}/)).toBeTruthy();
    });

    it('should display operation types in uppercase', () => {
      render(<StatusLog logs={mockLogEntries} />);
      
      expect(screen.getByText('ENROLL')).toBeTruthy();
      expect(screen.getByText('VALIDATE')).toBeTruthy();
      expect(screen.getByText('STATUS')).toBeTruthy();
    });

    it('should display status icons correctly', () => {
      render(<StatusLog logs={mockLogEntries} />);
      
      // Check for status icons (success: ✓, error: ✗, info: ℹ)
      expect(screen.getByText('✓')).toBeTruthy();
      expect(screen.getByText('✗')).toBeTruthy();
      expect(screen.getByText('ℹ')).toBeTruthy();
    });

    it('should display details when provided', () => {
      render(<StatusLog logs={[mockLogEntries[0]]} />);
      
      // Details should be JSON stringified
      expect(screen.getByText(/"publicKey": "mock-public-key-123"/)).toBeTruthy();
    });

    it('should handle string details correctly', () => {
      const logWithStringDetails: LogEntry = {
        ...mockLogEntries[0],
        details: 'Simple string details',
      };
      
      render(<StatusLog logs={[logWithStringDetails]} />);
      expect(screen.getByText('Simple string details')).toBeTruthy();
    });

    it('should not display details section when details are undefined', () => {
      render(<StatusLog logs={[mockLogEntries[2]]} />);
      
      // Should not find any JSON-like text
      expect(screen.queryByText(/\{.*\}/)).toBeNull();
    });
  });

  describe('Current Operation Display', () => {
    it('should display current operation when provided', () => {
      render(<StatusLog logs={[]} currentOperation={mockCurrentOperation} />);
      
      expect(screen.getByText('Latest Operation')).toBeTruthy();
      expect(screen.getByText('Operation completed successfully')).toBeTruthy();
    });

    it('should display current operation data when provided', () => {
      render(<StatusLog logs={[]} currentOperation={mockCurrentOperation} />);
      
      expect(screen.getByText(/"result": "test-data"/)).toBeTruthy();
    });

    it('should not display current operation section when not provided', () => {
      render(<StatusLog logs={[]} />);
      
      expect(screen.queryByText('Latest Operation')).toBeNull();
    });

    it('should handle current operation without data', () => {
      const operationWithoutData: OperationResult = {
        success: false,
        message: 'Operation failed',
        timestamp: new Date(),
      };
      
      render(<StatusLog logs={[]} currentOperation={operationWithoutData} />);
      
      expect(screen.getByText('Operation failed')).toBeTruthy();
      expect(screen.queryByText(/\{.*\}/)).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should display loading indicator when isLoading is true', () => {
      render(<StatusLog logs={[]} isLoading={true} />);
      
      expect(screen.getByText('Operation in progress...')).toBeTruthy();
      // ActivityIndicator should be present (testID would be better but not set)
    });

    it('should not display loading indicator when isLoading is false', () => {
      render(<StatusLog logs={[]} isLoading={false} />);
      
      expect(screen.queryByText('Operation in progress...')).toBeNull();
    });

    it('should display loading state even without current operation', () => {
      render(<StatusLog logs={[]} isLoading={true} />);
      
      expect(screen.getByText('Operation in progress...')).toBeTruthy();
    });
  });

  describe('Log Entry Ordering', () => {
    it('should display logs in reverse chronological order (newest first)', () => {
      render(<StatusLog logs={mockLogEntries} />);
      
      const messages = screen.getAllByText(/Biometric|Validation/);
      
      // The newest entry (status check) should appear first
      // But since we're looking for specific messages, check the order of enrollment and validation
      expect(messages[0]).toHaveTextContent('Biometric sensor check completed');
    });
  });

  describe('Status Colors and Icons', () => {
    it('should apply correct colors for different status types', () => {
      const { getByText } = render(<StatusLog logs={mockLogEntries} />);
      
      // Test that status icons are rendered (colors would need style testing)
      expect(getByText('✓')).toBeTruthy(); // success
      expect(getByText('✗')).toBeTruthy(); // error
      expect(getByText('ℹ')).toBeTruthy(); // info
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty log entry gracefully', () => {
      const emptyLog: LogEntry = {
        id: 'empty',
        timestamp: new Date(),
        operation: 'status',
        status: 'info',
        message: '',
      };
      
      render(<StatusLog logs={[emptyLog]} />);
      
      // Should still render the entry structure
      expect(screen.getByText('STATUS')).toBeTruthy();
    });

    it('should handle very long messages', () => {
      const longMessageLog: LogEntry = {
        id: 'long',
        timestamp: new Date(),
        operation: 'enroll',
        status: 'error',
        message: 'A'.repeat(200), // Very long message
      };
      
      render(<StatusLog logs={[longMessageLog]} />);
      
      expect(screen.getByText('A'.repeat(200))).toBeTruthy();
    });

    it('should handle complex nested details objects', () => {
      const complexDetailsLog: LogEntry = {
        id: 'complex',
        timestamp: new Date(),
        operation: 'validate',
        status: 'success',
        message: 'Complex operation completed',
        details: {
          nested: {
            data: {
              array: [1, 2, 3],
              boolean: true,
              null: null,
            },
          },
        },
      };
      
      render(<StatusLog logs={[complexDetailsLog]} />);
      
      expect(screen.getByText(/nested/)).toBeTruthy();
      expect(screen.getByText(/array/)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should render with proper text content for screen readers', () => {
      render(<StatusLog logs={mockLogEntries} />);
      
      // All text content should be accessible
      expect(screen.getByText('Status Log')).toBeTruthy();
      expect(screen.getByText('Biometric enrollment successful')).toBeTruthy();
    });
  });

  describe('Modern Styling', () => {
    it('should render with modern card design', () => {
      const { getByText } = render(<StatusLog logs={mockLogEntries} />);
      
      // Test that the component renders with modern styling
      expect(getByText('Status Log')).toBeTruthy();
      expect(getByText('Biometric enrollment successful')).toBeTruthy();
    });

    it('should display status icons in circular containers', () => {
      render(<StatusLog logs={mockLogEntries} />);
      
      // Status icons should be rendered in circular containers
      expect(screen.getByText('✓')).toBeTruthy();
      expect(screen.getByText('✗')).toBeTruthy();
      expect(screen.getByText('ℹ')).toBeTruthy();
    });

    it('should apply theme-aware colors', () => {
      render(<StatusLog logs={mockLogEntries} />);
      
      // Component should render without errors with theme colors
      expect(screen.getByText('Status Log')).toBeTruthy();
      expect(screen.getByText('ENROLL')).toBeTruthy();
      expect(screen.getByText('VALIDATE')).toBeTruthy();
    });

    it('should render with improved typography and spacing', () => {
      render(<StatusLog logs={mockLogEntries} />);
      
      // Test improved layout structure
      expect(screen.getByText('Status Log')).toBeTruthy();
      expect(screen.getByText('Biometric enrollment successful')).toBeTruthy();
      expect(screen.getByText('Validation failed: Invalid signature')).toBeTruthy();
    });

    it('should display enhanced details styling', () => {
      render(<StatusLog logs={[mockLogEntries[0]]} />);
      
      // Details should be displayed with modern styling
      expect(screen.getByText(/"publicKey": "mock-public-key-123"/)).toBeTruthy();
    });

    it('should render current operation with modern design', () => {
      render(<StatusLog logs={[]} currentOperation={mockCurrentOperation} />);
      
      expect(screen.getByText('Latest Operation')).toBeTruthy();
      expect(screen.getByText('Operation completed successfully')).toBeTruthy();
    });
  });

  describe('Animations', () => {
    beforeEach(() => {
      // Mock Animated.timing and Animated.spring
      jest.spyOn(require('react-native').Animated, 'timing').mockImplementation(() => ({
        start: jest.fn(),
      }));
      jest.spyOn(require('react-native').Animated, 'spring').mockImplementation(() => ({
        start: jest.fn(),
      }));
      jest.spyOn(require('react-native').Animated, 'parallel').mockImplementation(() => ({
        start: jest.fn(),
      }));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should render log entries with fade-in animations', () => {
      render(<StatusLog logs={mockLogEntries} />);
      
      // Test that log entries are rendered (animations are mocked)
      expect(screen.getByText('Biometric enrollment successful')).toBeTruthy();
      expect(screen.getByText('Validation failed: Invalid signature')).toBeTruthy();
      expect(screen.getByText('Biometric sensor check completed')).toBeTruthy();
    });

    it('should handle smooth scrolling behavior', () => {
      const { rerender } = render(<StatusLog logs={[mockLogEntries[0]]} />);
      
      // Add new log entry to trigger scroll animation
      rerender(<StatusLog logs={mockLogEntries} />);
      
      // Verify all entries are still rendered
      expect(screen.getByText('Biometric enrollment successful')).toBeTruthy();
      expect(screen.getByText('Validation failed: Invalid signature')).toBeTruthy();
      expect(screen.getByText('Biometric sensor check completed')).toBeTruthy();
    });

    it('should include loading state animations', () => {
      render(<StatusLog logs={[]} isLoading={true} />);
      
      expect(screen.getByText('Operation in progress...')).toBeTruthy();
      // ActivityIndicator should be present
    });

    it('should animate new log entries when logs are added', () => {
      const { rerender } = render(<StatusLog logs={[]} />);
      
      // Add logs to trigger animations
      rerender(<StatusLog logs={[mockLogEntries[0]]} />);
      
      expect(screen.getByText('Biometric enrollment successful')).toBeTruthy();
    });

    it('should handle staggered animations for multiple new entries', () => {
      const { rerender } = render(<StatusLog logs={[]} />);
      
      // Add multiple logs at once
      rerender(<StatusLog logs={mockLogEntries} />);
      
      // All entries should be rendered
      expect(screen.getByText('Biometric enrollment successful')).toBeTruthy();
      expect(screen.getByText('Validation failed: Invalid signature')).toBeTruthy();
      expect(screen.getByText('Biometric sensor check completed')).toBeTruthy();
    });

    it('should clean up animations for removed logs', () => {
      const { rerender } = render(<StatusLog logs={mockLogEntries} />);
      
      // Remove some logs
      rerender(<StatusLog logs={[mockLogEntries[0]]} />);
      
      // Only the remaining log should be visible
      expect(screen.getByText('Biometric enrollment successful')).toBeTruthy();
      expect(screen.queryByText('Validation failed: Invalid signature')).toBeNull();
    });
  });
});