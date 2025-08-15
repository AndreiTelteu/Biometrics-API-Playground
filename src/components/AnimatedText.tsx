/**
 * Animated Text Component
 * Provides smooth theme transition animations for text
 */

import React from 'react';
import { Animated, TextStyle } from 'react-native';
import { useTheme } from '../theme';

export interface AnimatedTextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  lightColor?: string;
  darkColor?: string;
  animateColor?: boolean;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  style,
  lightColor,
  darkColor,
  animateColor = true,
}) => {
  const { theme, themeTransition } = useTheme();

  // Create animated styles
  const animatedStyle: any = {};

  if (animateColor && lightColor && darkColor) {
    animatedStyle.color = themeTransition.interpolate({
      inputRange: [0, 1],
      outputRange: [lightColor, darkColor],
    });
  }

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {children}
    </Animated.Text>
  );
};