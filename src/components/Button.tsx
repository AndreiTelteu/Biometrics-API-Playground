/**
 * Button Component
 * Enhanced button component with modern styling, variants, and animations
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTheme } from '../theme';

export interface ButtonProps {
  /**
   * Button text content
   */
  title: string;
  /**
   * Button variant for different styling
   */
  variant?: 'primary' | 'secondary' | 'danger';
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in loading state
   */
  loading?: boolean;
  /**
   * Callback when button is pressed
   */
  onPress?: () => void;
  /**
   * Custom style overrides for the button container
   */
  style?: ViewStyle;
  /**
   * Custom style overrides for the button text
   */
  textStyle?: TextStyle;
  /**
   * Test ID for testing
   */
  testID?: string;
  /**
   * Active opacity when pressed
   */
  activeOpacity?: number;
  /**
   * Whether the button should take full width
   */
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
  testID,
  activeOpacity = 0.8,
  fullWidth = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, variant, size, disabled, loading, fullWidth);
  
  // Animation values for press feedback
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const opacityAnimation = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: 0.95,
          duration: theme.animations.durations.fast,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 0.8,
          duration: theme.animations.durations.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: theme.animations.durations.fast,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: theme.animations.durations.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  const isInteractionDisabled = disabled || loading;

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnimation }],
          opacity: opacityAnimation,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isInteractionDisabled}
        activeOpacity={1} // We handle opacity with our animation
        testID={testID}
        accessible={true}
        accessibilityRole="button"
        accessibilityState={{
          disabled: isInteractionDisabled,
          busy: loading,
        }}
        accessibilityLabel={title}
      >
        {loading && (
          <ActivityIndicator
            size="small"
            color={styles.loadingIndicator.color}
            style={styles.loadingIndicator}
            testID={testID ? `${testID}-loading` : undefined}
          />
        )}
        <Text style={[styles.text, textStyle]} testID={testID ? `${testID}-text` : undefined}>
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (
  theme: any,
  variant: string,
  size: string,
  disabled: boolean,
  loading: boolean,
  fullWidth: boolean
) => {
  // Base button style
  const baseButtonStyle: ViewStyle = {
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...theme.shadows.sm,
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      minHeight: 36,
    },
    md: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      minHeight: 48,
    },
    lg: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      minHeight: 56,
    },
  };

  // Text size configurations
  const textSizeConfig = {
    sm: {
      fontSize: theme.typography.sizes.sm,
      lineHeight: theme.typography.lineHeights.normal * theme.typography.sizes.sm,
    },
    md: {
      fontSize: theme.typography.sizes.base,
      lineHeight: theme.typography.lineHeights.normal * theme.typography.sizes.base,
    },
    lg: {
      fontSize: theme.typography.sizes.lg,
      lineHeight: theme.typography.lineHeights.normal * theme.typography.sizes.lg,
    },
  };

  // Variant configurations
  const variantConfig = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderWidth: 0,
      textColor: '#FFFFFF',
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
      textColor: theme.colors.text,
    },
    danger: {
      backgroundColor: theme.colors.error,
      borderWidth: 0,
      textColor: '#FFFFFF',
    },
  };

  const currentSize = sizeConfig[size as keyof typeof sizeConfig];
  const currentTextSize = textSizeConfig[size as keyof typeof textSizeConfig];
  const currentVariant = variantConfig[variant as keyof typeof variantConfig];

  return StyleSheet.create({
    button: {
      ...baseButtonStyle,
      ...currentSize,
      backgroundColor: currentVariant.backgroundColor,
      borderWidth: currentVariant.borderWidth,
      borderColor: currentVariant.borderColor,
      opacity: disabled ? 0.6 : 1,
      width: fullWidth ? '100%' : undefined,
    },
    text: {
      ...currentTextSize,
      color: currentVariant.textColor,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
      opacity: loading ? 0.7 : 1,
      marginLeft: loading ? theme.spacing.sm : 0,
    },
    loadingIndicator: {
      color: currentVariant.textColor,
    },
  });
};

export default Button;