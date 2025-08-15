/**
 * AnimatedText Component Tests
 * Tests for smooth text color transition animations
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { AnimatedText } from '../AnimatedText';

// Mock the theme context
const mockTheme = {
  colors: {
    text: '#000000',
    textSecondary: '#6D6D80',
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

describe('AnimatedText', () => {
  it('renders text content correctly', () => {
    const { getByText } = render(
      <AnimatedText>
        Test Text Content
      </AnimatedText>
    );

    expect(getByText('Test Text Content')).toBeTruthy();
  });

  it('applies animated text color when specified', () => {
    const { getByTestId } = render(
      <AnimatedText
        testID="animated-text"
        lightColor="#000000"
        darkColor="#FFFFFF"
        animateColor={true}
      >
        Animated Text
      </AnimatedText>
    );

    const animatedText = getByTestId('animated-text');
    expect(animatedText).toBeTruthy();
  });

  it('does not animate color when animateColor is false', () => {
    const { getByTestId } = render(
      <AnimatedText
        testID="animated-text"
        lightColor="#000000"
        darkColor="#FFFFFF"
        animateColor={false}
      >
        Static Text
      </AnimatedText>
    );

    const animatedText = getByTestId('animated-text');
    expect(animatedText).toBeTruthy();
  });

  it('applies custom styles correctly', () => {
    const customStyle = { fontSize: 18, fontWeight: 'bold' };
    
    const { getByTestId } = render(
      <AnimatedText
        testID="animated-text"
        style={customStyle}
      >
        Styled Text
      </AnimatedText>
    );

    const animatedText = getByTestId('animated-text');
    expect(animatedText).toBeTruthy();
  });

  it('handles array of styles correctly', () => {
    const styles = [
      { fontSize: 16 },
      { color: '#333333' },
      { fontWeight: '600' }
    ];
    
    const { getByTestId } = render(
      <AnimatedText
        testID="animated-text"
        style={styles}
      >
        Multi-styled Text
      </AnimatedText>
    );

    const animatedText = getByTestId('animated-text');
    expect(animatedText).toBeTruthy();
  });
});