/**
 * Button Performance Tests
 * Tests for button animation performance and optimization
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Animated, InteractionManager } from 'react-native';
import Button from '../Button';
import { ThemeProvider } from '../../theme';
import * as animationUtils from '../../utils/animationUtils';

// Mock animation utilities
jest.mock('../../utils/animationUtils', () => ({
  ...jest.requireActual('../../utils/animationUtils'),
  isReducedMotionEnabled: jest.fn(),
  subscribeToReducedMotion: jest.fn(),
  createOptimizedTiming: jest.fn(),
  cleanupAnimation: jest.fn(),
}));

// Mock InteractionManager
jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn((callback) => callback()),
}));

const mockAnimationUtils = animationUtils as jest.Mocked<typeof animationUtils>;
const mockInteractionManager = InteractionManager as jest.Mocked<typeof InteractionManager>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Button Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnimationUtils.isReducedMotionEnabled.mockResolvedValue(false);
    mockAnimationUtils.subscribeToReducedMotion.mockReturnValue(() => {});
    mockAnimationUtils.createOptimizedTiming.mockImplementation((value, config) => 
      Animated.timing(value, config)
    );
  });

  describe('Press Animation Performance', () => {
    it('should use hardware acceleration for press animations', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      // Verify optimized timing was called with hardware acceleration
      expect(mockAnimationUtils.createOptimizedTiming).toHaveBeenCalledWith(
        expect.any(Animated.Value),
        expect.objectContaining({
          useNativeDriver: true,
        })
      );
    });

    it('should use InteractionManager for smooth press animations', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      expect(mockInteractionManager.runAfterInteractions).toHaveBeenCalled();
    });

    it('should create parallel animations for press feedback', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      // Should create animations for both scale and opacity
      expect(mockAnimationUtils.createOptimizedTiming).toHaveBeenCalledTimes(2);
    });

    it('should cleanup animations on press out', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressOut');
      });

      expect(mockAnimationUtils.cleanupAnimation).toHaveBeenCalled();
    });

    it('should cleanup animations on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <Button title="Test Button" />
        </TestWrapper>
      );

      unmount();

      expect(mockAnimationUtils.cleanupAnimation).toHaveBeenCalled();
    });
  });

  describe('Reduced Motion Support', () => {
    it('should skip animations when reduced motion is enabled', async () => {
      mockAnimationUtils.isReducedMotionEnabled.mockResolvedValue(true);

      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      // Should not create animations when reduced motion is enabled
      expect(mockAnimationUtils.createOptimizedTiming).not.toHaveBeenCalled();
    });

    it('should subscribe to reduced motion changes', () => {
      render(
        <TestWrapper>
          <Button title="Test Button" />
        </TestWrapper>
      );

      expect(mockAnimationUtils.subscribeToReducedMotion).toHaveBeenCalled();
    });

    it('should set values immediately for reduced motion', async () => {
      mockAnimationUtils.isReducedMotionEnabled.mockResolvedValue(true);

      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      // Should not use InteractionManager for immediate value changes
      expect(mockInteractionManager.runAfterInteractions).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State Performance', () => {
    it('should not create animations when disabled', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" disabled testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      expect(mockAnimationUtils.createOptimizedTiming).not.toHaveBeenCalled();
    });

    it('should not create animations when loading', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" loading testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      expect(mockAnimationUtils.createOptimizedTiming).not.toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should cleanup previous animations before starting new ones', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      // Trigger multiple rapid press events
      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressOut');
      });

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      // Should cleanup previous animation before starting new one
      expect(mockAnimationUtils.cleanupAnimation).toHaveBeenCalled();
    });
  });

  describe('Animation Configuration', () => {
    it('should use fast duration for press animations', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      expect(mockAnimationUtils.createOptimizedTiming).toHaveBeenCalledWith(
        expect.any(Animated.Value),
        expect.objectContaining({
          duration: 150, // Fast animation duration
        })
      );
    });

    it('should use appropriate scale and opacity values', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      const calls = mockAnimationUtils.createOptimizedTiming.mock.calls;
      
      // Should animate to scale 0.95 and opacity 0.8
      expect(calls.some(call => call[1].toValue === 0.95)).toBe(true);
      expect(calls.some(call => call[1].toValue === 0.8)).toBe(true);
    });

    it('should reset to original values on press out', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button title="Test Button" testID="button" />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressIn');
      });

      // Clear previous calls
      mockAnimationUtils.createOptimizedTiming.mockClear();

      await act(async () => {
        fireEvent(getByTestId('button'), 'pressOut');
      });

      const calls = mockAnimationUtils.createOptimizedTiming.mock.calls;
      
      // Should animate back to scale 1 and opacity 1
      expect(calls.some(call => call[1].toValue === 1)).toBe(true);
    });
  });
});