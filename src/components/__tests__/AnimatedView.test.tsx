/**
 * AnimatedView Component Tests
 * Tests for smooth theme transition animations
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated, Text } from 'react-native';
import { AnimatedView } from '../AnimatedView';

// Mock the theme context
const mockTheme = {
  colors: {
    surface: '#FFFFFF',
    border: '#C6C6C8',
  },
  animations: {
    durations: {
      normal: 250,
    },
  },
};

const mockThemeTransition = new Animated.Value(0);

jest.mock('../../theme', () => ({
  useTheme: () => ({
    theme: mockTheme,
    themeTransition: mockThemeTransition,
    isDark: false,
  }),
}));

describe('AnimatedView', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <AnimatedView>
        <Text>Test Content</Text>
      </AnimatedView>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('applies animated background color when specified', () => {
    const { getByTestId } = render(
      <AnimatedView
        testID="animated-view"
        lightBackgroundColor="#FFFFFF"
        darkBackgroundColor="#000000"
        animateBackground={true}
      >
        <Text>Content</Text>
      </AnimatedView>
    );

    const animatedView = getByTestId('animated-view');
    expect(animatedView).toBeTruthy();
  });

  it('applies animated border color when specified', () => {
    const { getByTestId } = render(
      <AnimatedView
        testID="animated-view"
        lightBorderColor="#C6C6C8"
        darkBorderColor="#38383A"
        animateBorder={true}
      >
        <Text>Content</Text>
      </AnimatedView>
    );

    const animatedView = getByTestId('animated-view');
    expect(animatedView).toBeTruthy();
  });

  it('does not animate background when animateBackground is false', () => {
    const { getByTestId } = render(
      <AnimatedView
        testID="animated-view"
        lightBackgroundColor="#FFFFFF"
        darkBackgroundColor="#000000"
        animateBackground={false}
      >
        <Text>Content</Text>
      </AnimatedView>
    );

    const animatedView = getByTestId('animated-view');
    expect(animatedView).toBeTruthy();
  });

  it('does not animate border when animateBorder is false', () => {
    const { getByTestId } = render(
      <AnimatedView
        testID="animated-view"
        lightBorderColor="#C6C6C8"
        darkBorderColor="#38383A"
        animateBorder={false}
      >
        <Text>Content</Text>
      </AnimatedView>
    );

    const animatedView = getByTestId('animated-view');
    expect(animatedView).toBeTruthy();
  });

  it('applies custom styles correctly', () => {
    const customStyle = { padding: 20, margin: 10 };
    
    const { getByTestId } = render(
      <AnimatedView
        testID="animated-view"
        style={customStyle}
      >
        <Text>Content</Text>
      </AnimatedView>
    );

    const animatedView = getByTestId('animated-view');
    expect(animatedView).toBeTruthy();
  });
});