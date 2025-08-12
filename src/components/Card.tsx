/**
 * Card Component
 * A modern card component with theme support, shadows, and responsive design
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../theme';

export interface CardProps {
  /**
   * Content to display inside the card
   */
  children: React.ReactNode;
  /**
   * Card variant for different styling
   */
  variant?: 'default' | 'elevated' | 'outlined';
  /**
   * Padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Whether the card should be pressable
   */
  pressable?: boolean;
  /**
   * Callback when card is pressed (only works when pressable is true)
   */
  onPress?: () => void;
  /**
   * Custom style overrides
   */
  style?: ViewStyle;
  /**
   * Test ID for testing
   */
  testID?: string;
  /**
   * Whether to disable the card (only applies when pressable)
   */
  disabled?: boolean;
  /**
   * Active opacity when pressed (only applies when pressable)
   */
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  pressable = false,
  onPress,
  style,
  testID,
  disabled = false,
  activeOpacity = 0.8,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, variant, padding);

  const cardStyle = [
    styles.card,
    styles[variant],
    styles[`padding_${padding}`],
    disabled && styles.disabled,
    style,
  ];

  if (pressable) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={activeOpacity}
        testID={testID}
        accessible={true}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
};

const createStyles = (theme: any, variant: string, padding: string) => {
  const baseCardStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden' as const,
  };

  return StyleSheet.create({
    card: baseCardStyle,
    
    // Variants
    default: {
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    
    elevated: {
      ...theme.shadows.lg,
      borderWidth: 0,
    },
    
    outlined: {
      ...theme.shadows.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },

    // Padding variants
    padding_none: {
      padding: 0,
    },
    
    padding_sm: {
      padding: theme.spacing.sm,
    },
    
    padding_md: {
      padding: theme.spacing.md,
    },
    
    padding_lg: {
      padding: theme.spacing.lg,
    },
    
    padding_xl: {
      padding: theme.spacing.xl,
    },

    // States
    disabled: {
      opacity: 0.6,
    },
  });
};

export default Card;