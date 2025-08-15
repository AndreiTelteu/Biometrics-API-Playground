/**
 * AnimatedTextInput Tests
 * Tests for form input focus animations and validation transitions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { AnimatedTextInput } from '../AnimatedTextInput';

// Mock the theme context
const mockTheme = {
  colors: {
    primary: '#007AFF',
    text: '#000000',
    textSecondary: '#6D6D80',
    surface: '#FFFFFF',
    border: '#C6C6C8',
    error: '#FF3B30',
  },
  typography: {
    sizes: { base: 16 },
  },
  spacing: { md: 16, sm: 8 },
  borderRadius: { md: 12 },
  animations: {
    durations: {
      normal: 250,
    },
  },
};

jest.mock('../../theme', () => ({
  useTheme: () => ({
    theme: mockTheme,
  }),
}));

// Mock Animated.timing
const mockAnimatedTiming = jest.fn(() => ({
  start: jest.fn(),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Animated: {
    ...jest.requireActual('react-native').Animated,
    timing: mockAnimatedTiming,
    Value: jest.fn(() => ({
      interpolate: jest.fn(() => mockTheme.colors.border),
    })),
    View: ({ children, style }: any) => children,
  },
}));

describe('AnimatedTextInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
      />
    );

    const input = getByTestId('animated-input');
    expect(input).toBeTruthy();
  });

  it('triggers focus animation when focused', () => {
    const { getByTestId } = render(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
      />
    );

    const input = getByTestId('animated-input');
    fireEvent(input, 'focus');

    expect(mockAnimatedTiming).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      })
    );
  });

  it('triggers blur animation when blurred', () => {
    const { getByTestId } = render(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
      />
    );

    const input = getByTestId('animated-input');
    fireEvent(input, 'blur');

    expect(mockAnimatedTiming).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      })
    );
  });

  it('triggers error animation when hasError changes to true', () => {
    const { rerender } = render(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
        hasError={false}
      />
    );

    // Clear previous calls
    jest.clearAllMocks();

    rerender(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
        hasError={true}
      />
    );

    expect(mockAnimatedTiming).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      })
    );
  });

  it('triggers error animation when hasError changes to false', () => {
    const { rerender } = render(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
        hasError={true}
      />
    );

    // Clear previous calls
    jest.clearAllMocks();

    rerender(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
        hasError={false}
      />
    );

    expect(mockAnimatedTiming).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      })
    );
  });

  it('calls custom onFocus handler', () => {
    const mockOnFocus = jest.fn();
    const { getByTestId } = render(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
        onFocus={mockOnFocus}
      />
    );

    const input = getByTestId('animated-input');
    fireEvent(input, 'focus');

    expect(mockOnFocus).toHaveBeenCalled();
  });

  it('calls custom onBlur handler', () => {
    const mockOnBlur = jest.fn();
    const { getByTestId } = render(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
        onBlur={mockOnBlur}
      />
    );

    const input = getByTestId('animated-input');
    fireEvent(input, 'blur');

    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('uses custom animation duration when provided', () => {
    const { getByTestId } = render(
      <AnimatedTextInput
        testID="animated-input"
        placeholder="Test input"
        animationDuration={500}
      />
    );

    const input = getByTestId('animated-input');
    fireEvent(input, 'focus');

    expect(mockAnimatedTiming).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        duration: 500,
      })
    );
  });
});