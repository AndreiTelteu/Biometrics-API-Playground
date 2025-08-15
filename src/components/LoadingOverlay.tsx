/**
 * Loading Overlay Component
 * Full-screen loading overlay with smooth transitions
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ViewStyle,
  Modal,
} from 'react-native';
import { useTheme } from '../theme';
import { LoadingIndicator } from './LoadingIndicator';

export interface LoadingOverlayProps {
  /**
   * Whether the loading overlay is visible
   */
  visible: boolean;
  /**
   * Loading message to display
   */
  message?: string;
  /**
   * Type of loading indicator
   */
  indicatorType?: 'spinner' | 'pulse' | 'dots';
  /**
   * Custom overlay style
   */
  style?: ViewStyle;
  /**
   * Test ID for testing
   */
  testID?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  indicatorType = 'spinner',
  style,
  testID,
}) => {
  const { theme } = useTheme();
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    if (visible) {
      // Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: theme.animations.durations.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnimation, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out and scale down
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: theme.animations.durations.fast,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 0.8,
          duration: theme.animations.durations.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnimation, scaleAnimation, theme.animations.durations]);
  
  const styles = createStyles(theme);
  
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      testID={testID}
    >
      <Animated.View
        style={[
          styles.overlay,
          style,
          {
            opacity: fadeAnimation,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnimation }],
            },
          ]}
        >
          <LoadingIndicator
            type={indicatorType}
            size="large"
            color={theme.colors.primary}
          />
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      alignItems: 'center',
      minWidth: 200,
      ...theme.shadows.lg,
    },
    message: {
      marginTop: theme.spacing.lg,
      fontSize: theme.typography.sizes.base,
      color: theme.colors.text,
      textAlign: 'center',
      fontWeight: theme.typography.weights.medium,
    },
  });