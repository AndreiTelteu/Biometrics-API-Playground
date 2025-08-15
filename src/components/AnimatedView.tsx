/**
 * Animated View Component
 * Provides smooth theme transition animations for any view
 */

import React from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export interface AnimatedViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  lightBackgroundColor?: string;
  darkBackgroundColor?: string;
  lightBorderColor?: string;
  darkBorderColor?: string;
  animateBackground?: boolean;
  animateBorder?: boolean;
}

export const AnimatedView: React.FC<AnimatedViewProps> = ({
  children,
  style,
  lightBackgroundColor,
  darkBackgroundColor,
  lightBorderColor,
  darkBorderColor,
  animateBackground = true,
  animateBorder = true,
}) => {
  const { theme, themeTransition } = useTheme();

  // Create animated styles
  const animatedStyle: any = {};

  if (animateBackground && lightBackgroundColor && darkBackgroundColor) {
    animatedStyle.backgroundColor = themeTransition.interpolate({
      inputRange: [0, 1],
      outputRange: [lightBackgroundColor, darkBackgroundColor],
    });
  }

  if (animateBorder && lightBorderColor && darkBorderColor) {
    animatedStyle.borderColor = themeTransition.interpolate({
      inputRange: [0, 1],
      outputRange: [lightBorderColor, darkBorderColor],
    });
  }

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};