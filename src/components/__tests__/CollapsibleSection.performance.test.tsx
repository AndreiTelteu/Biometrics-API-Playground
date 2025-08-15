/**
 * CollapsibleSection Performance Tests
 * Tests for animation performance and optimization
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Animated, InteractionManager } from 'react-native';
import CollapsibleSection from '../CollapsibleSection';
import { ThemeProvider } from '../../theme';
import * as animationUtils from '../../utils/animationUtils';

// Mock animation utilities
jest.mock('../../utils/animationUtils', () => ({
  ...jest.requireActual('../../utils/animationUtils'),
  isReducedMotionEnabled: jest.fn(),
  subscribeToReducedMotion: jest.fn(),
  createOptimizedTiming: jest.fn(),
  startAnimationProfiling: jest.fn(),
  endAnimationProfiling: jest.fn(),
  cleanupAnimation: jest.fn(),
}));

// Mock InteractionManager
jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn((callback) => callback()),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockAnimationUtils = animationUtils as jest.Mocked<typeof animationUtils>;
const mockInteractionManager = InteractionManager as jest.Mocked<typeof InteractionManager>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('CollapsibleSection Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnimationUtils.isReducedMotionEnabled.mockResolvedValue(false);
    mockAnimationUtils.subscribeToReducedMotion.mockReturnValue(() => {});
    mockAnimationUtils.createOptimizedTiming.mockImplementation((value, config) => 
      Animated.timing(value, config)
    );
  });

  describe('Animation Performance', () => {
    it('should use hardware acceleration for animations', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <div>Content</div>
          </CollapsibleSection>
        </TestWrapper>
      );

      await act(async () => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      // Verify optimized timing was called with hardware acceleration
      expect(mockAnimationUtils.createOptimizedTiming).toHaveBeenCalledWith(
        expect.any(Animated.Value),
        expect.objectContaining({
          useNativeDriver: true,
        })
      );
    });

    it('should use InteractionManager for smooth animations', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <div>Content</div>
          </CollapsibleSection>
        </TestWrapper>
      );

      await act(async () => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      expect(mockInteractionManager.runAfterInteractions).toHaveBeenCalled();
    });

    it('should start and end animation profiling', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <div>Content</div>
          </CollapsibleSection>
        </TestWrapper>
      );

      await act(async () => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      expect(mockAnimationUtils.startAnimationProfiling).toHaveBeenCalledWith(
        expect.stringContaining('collapsible-test-'),
        expect.any(Number)
      );
    });

    it('should cleanup animations on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section">
            <div>Content</div>
          </CollapsibleSection>
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
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <div>Content</div>
          </CollapsibleSection>
        </TestWrapper>
      );

      await act(async () => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      // Should not create animations when reduced motion is enabled
      expect(mockAnimationUtils.createOptimizedTiming).not.toHaveBeenCalled();
    });

    it('should subscribe to reduced motion changes', () => {
      render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section">
            <div>Content</div>
          </CollapsibleSection>
        </TestWrapper>
      );

      expect(mockAnimationUtils.subscribeToReducedMotion).toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should cleanup previous animations before starting new ones', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <div>Content</div>
          </CollapsibleSection>
        </TestWrapper>
      );

      // Trigger multiple rapid toggles
      await act(async () => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      // Should cleanup previous animation before starting new one
      expect(mockAnimationUtils.cleanupAnimation).toHaveBeenCalled();
    });
  });

  describe('Animation Configuration', () => {
    it('should use parallel animations for smooth transitions', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <div>Content</div>
          </CollapsibleSection>
        </TestWrapper>
      );

      await act(async () => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      // Should create multiple optimized animations (rotation, height, opacity)
      expect(mockAnimationUtils.createOptimizedTiming).toHaveBeenCalledTimes(3);
    });

    it('should use different native driver settings for different properties', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <div>Content</div>
          </CollapsibleSection>
        </TestWrapper>
      );

      await act(async () => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      const calls = mockAnimationUtils.createOptimizedTiming.mock.calls;
      
      // Should have calls with useNativeDriver: true (for transform/opacity)
      expect(calls.some(call => call[1].useNativeDriver === true)).toBe(true);
      
      // Should have calls with useNativeDriver: false (for height/layout)
      expect(calls.some(call => call[1].useNativeDriver === false)).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    it('should measure animation duration', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <div>Content</div>
          </CollapsibleSection>
        </TestWrapper>
      );

      await act(async () => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      // Should start profiling with expected duration
      expect(mockAnimationUtils.startAnimationProfiling).toHaveBeenCalledWith(
        expect.any(String),
        250 // Default theme animation duration
      );
    });
  });
});