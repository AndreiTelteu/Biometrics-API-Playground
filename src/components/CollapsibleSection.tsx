/**
 * CollapsibleSection Component
 * A reusable collapsible section with smooth animations and state persistence
 * Optimized for performance with hardware acceleration and reduced motion support
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  InteractionManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';
import {
  isReducedMotionEnabled,
  subscribeToReducedMotion,
  startAnimationProfiling,
  endAnimationProfiling,
} from '../utils/animationUtils';

// Note: Using Reanimated instead of LayoutAnimation for New Architecture compatibility

export interface CollapsibleSectionProps {
  /**
   * Unique identifier for the section (used for state persistence)
   */
  id: string;
  /**
   * Title displayed in the section header
   */
  title: string;
  /**
   * Initial expanded state (default: true)
   */
  defaultExpanded?: boolean;
  /**
   * Whether the section has validation errors
   */
  hasErrors?: boolean;
  /**
   * Content to display when expanded
   */
  children: React.ReactNode;
  /**
   * Optional callback when expand/collapse state changes
   */
  onToggle?: (isExpanded: boolean) => void;
  /**
   * Optional test ID for testing
   */
  testID?: string;
}

const STORAGE_KEY_PREFIX = 'collapsible_section_';

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  defaultExpanded = true,
  hasErrors = false,
  children,
  onToggle,
  testID,
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLoading, setIsLoading] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Use Reanimated shared values for better performance
  const rotationValue = useSharedValue(defaultExpanded ? 1 : 0);
  const heightValue = useSharedValue(defaultExpanded ? 1 : 0);
  const opacityValue = useSharedValue(defaultExpanded ? 1 : 0);

  const storageKey = `${STORAGE_KEY_PREFIX}${id}`;

  // Check reduced motion preference
  useEffect(() => {
    const checkReducedMotion = async () => {
      const isEnabled = await isReducedMotionEnabled();
      setReducedMotion(isEnabled);
    };

    checkReducedMotion();

    // Subscribe to reduced motion changes
    const unsubscribe = subscribeToReducedMotion(setReducedMotion);
    return unsubscribe;
  }, []);

  // Load saved state from AsyncStorage
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(storageKey);
        if (savedState !== null) {
          const expanded = JSON.parse(savedState);
          setIsExpanded(expanded);
          // Set all animation values immediately
          rotationValue.value = expanded ? 1 : 0;
          heightValue.value = expanded ? 1 : 0;
          opacityValue.value = expanded ? 1 : 0;
        }
      } catch (error) {
        console.warn('Failed to load collapsible section state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedState();
  }, [storageKey, rotationValue, heightValue, opacityValue]);

  // Save state to AsyncStorage
  const saveState = async (expanded: boolean) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(expanded));
    } catch (error) {
      console.warn('Failed to save collapsible section state:', error);
    }
  };

  // Handle toggle with Reanimated animations
  const handleToggle = () => {
    const newExpanded = !isExpanded;

    // Use InteractionManager to ensure smooth animations
    InteractionManager.runAfterInteractions(() => {
      const duration = reducedMotion ? 0 : theme.animations.durations.normal;

      // Animate with Reanimated for better performance and New Architecture support
      rotationValue.value = withTiming(newExpanded ? 1 : 0, { duration });
      heightValue.value = withTiming(newExpanded ? 1 : 0, { duration });
      opacityValue.value = withTiming(newExpanded ? 1 : 0, { duration });
    });

    setIsExpanded(newExpanded);
    saveState(newExpanded);
    onToggle?.(newExpanded);
  };

  // Create animated styles with Reanimated
  const chevronAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${rotationValue.value * 180}deg`,
        },
      ],
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityValue.value,
      transform: [
        {
          scaleY: heightValue.value,
        },
      ],
    };
  });

  const styles = createStyles(theme, hasErrors);

  // Don't render until state is loaded
  if (isLoading) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
        testID={testID ? `${testID}-header` : undefined}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>{title}</Text>
          {hasErrors && !isExpanded && (
            <View
              style={styles.errorIndicator}
              testID={testID ? `${testID}-error-indicator` : undefined}
            >
              <Text style={styles.errorText}>!</Text>
            </View>
          )}
        </View>
        <Animated.View
          style={[styles.chevron, chevronAnimatedStyle]}
          testID={testID ? `${testID}-chevron` : undefined}
        >
          <Text style={styles.chevronText}>▼</Text>
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View
          style={[styles.content, contentAnimatedStyle]}
          testID={testID ? `${testID}-content` : undefined}
        >
          {children}
        </Animated.View>
      )}
    </View>
  );
};

const createStyles = (theme: any, hasErrors: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginVertical: theme.spacing.sm,
      ...theme.shadows.md,
      borderWidth: 1,
      borderColor: hasErrors ? theme.colors.error : theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      minHeight: 56,
    },
    headerContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.text,
      lineHeight:
        theme.typography.lineHeights.normal * theme.typography.sizes.lg,
    },
    errorIndicator: {
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.sm,
    },
    errorText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.bold,
    },
    chevron: {
      padding: theme.spacing.xs,
    },
    chevronText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
  });

export default CollapsibleSection;
