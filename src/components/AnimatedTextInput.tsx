/**
 * Animated TextInput Component
 * Enhanced TextInput with smooth focus animations and validation transitions
 */

import React, { useRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../theme';

export interface AnimatedTextInputProps extends TextInputProps {
  /**
   * Whether the input has an error
   */
  hasError?: boolean;
  /**
   * Custom container style
   */
  containerStyle?: ViewStyle;
  /**
   * Custom input style
   */
  inputStyle?: TextStyle;
  /**
   * Animation duration for focus transitions
   */
  animationDuration?: number;
}

export const AnimatedTextInput: React.FC<AnimatedTextInputProps> = ({
  hasError = false,
  containerStyle,
  inputStyle,
  animationDuration,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  // Animation values
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const errorAnimation = useRef(new Animated.Value(hasError ? 1 : 0)).current;
  
  const duration = animationDuration || theme.animations.durations.normal;

  // Handle focus events
  const handleFocus = (event: any) => {
    setIsFocused(true);
    
    Animated.timing(focusAnimation, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    }).start();
    
    if (onFocus) {
      onFocus(event);
    }
  };

  const handleBlur = (event: any) => {
    setIsFocused(false);
    
    Animated.timing(focusAnimation, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false,
    }).start();
    
    if (onBlur) {
      onBlur(event);
    }
  };

  // Update error animation when hasError prop changes
  React.useEffect(() => {
    Animated.timing(errorAnimation, {
      toValue: hasError ? 1 : 0,
      duration: theme.animations.durations.normal,
      useNativeDriver: false,
    }).start();
  }, [hasError, errorAnimation, theme.animations.durations.normal]);

  // Animated styles
  const animatedBorderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.primary],
  });

  const animatedBorderWidth = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const animatedShadowOpacity = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.2],
  });

  const animatedShadowRadius = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 4],
  });

  const errorBorderColor = errorAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.error],
  });

  const styles = createStyles(theme);

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        {
          borderColor: hasError ? errorBorderColor : animatedBorderColor,
          borderWidth: animatedBorderWidth,
          shadowOpacity: animatedShadowOpacity,
          shadowRadius: animatedShadowRadius,
        },
      ]}
    >
      <TextInput
        {...textInputProps}
        style={[styles.input, inputStyle]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={theme.colors.textSecondary}
      />
    </Animated.View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    input: {
      height: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.sizes.base,
      color: theme.colors.text,
      backgroundColor: 'transparent',
    },
  });