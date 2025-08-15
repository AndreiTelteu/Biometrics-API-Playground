/**
 * CollapsibleSection Component
 * A reusable collapsible section with smooth animations and state persistence
 * Optimized for performance with hardware acceleration and reduced motion support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';
import {
  createOptimizedTiming,
  createAccessibleAnimation,
  isReducedMotionEnabled,
  subscribeToReducedMotion,
  startAnimationProfiling,
  endAnimationProfiling,
  cleanupAnimation,
} from '../utils/animationUtils';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const rotationAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const heightAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const storageKey = `${STORAGE_KEY_PREFIX}${id}`;
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);

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
          // Set all animation values immediately using appropriate drivers
          Animated.timing(rotationAnim, {
            toValue: expanded ? 1 : 0,
            duration: 0, // Immediate
            useNativeDriver: true,
          }).start();
          Animated.timing(heightAnim, {
            toValue: expanded ? 1 : 0,
            duration: 0, // Immediate
            useNativeDriver: false,
          }).start();
          Animated.timing(opacityAnim, {
            toValue: expanded ? 1 : 0,
            duration: 0, // Immediate
            useNativeDriver: false,
          }).start();
        }
      } catch (error) {
        console.warn('Failed to load collapsible section state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedState();
  }, [storageKey, rotationAnim, heightAnim, opacityAnim]);

  // Save state to AsyncStorage
  const saveState = async (expanded: boolean) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(expanded));
    } catch (error) {
      console.warn('Failed to save collapsible section state:', error);
    }
  };

  // Handle toggle with optimized animation
  const handleToggle = () => {
    const newExpanded = !isExpanded;
    const animationId = `collapsible-${id}-${Date.now()}`;
    
    // Clean up any existing animation
    cleanupAnimation(currentAnimation.current);
    
    // Use InteractionManager to ensure smooth animations
    InteractionManager.runAfterInteractions(() => {
      if (reducedMotion) {
        // Immediate state change for reduced motion using appropriate drivers
        Animated.timing(rotationAnim, {
          toValue: newExpanded ? 1 : 0,
          duration: 0, // Immediate
          useNativeDriver: true,
        }).start();
        Animated.timing(heightAnim, {
          toValue: newExpanded ? 1 : 0,
          duration: 0, // Immediate
          useNativeDriver: false,
        }).start();
        Animated.timing(opacityAnim, {
          toValue: newExpanded ? 1 : 0,
          duration: 0, // Immediate
          useNativeDriver: false,
        }).start();
      } else {
        // Start performance profiling
        startAnimationProfiling(animationId, theme.animations.durations.normal);
        
        // Configure optimized layout animation (with fallback for testing)
        try {
          if (LayoutAnimation && LayoutAnimation.configureNext && !reducedMotion) {
            LayoutAnimation.configureNext({
              duration: theme.animations.durations.normal,
              create: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
              },
              update: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.scaleXY,
              },
            });
          }
        } catch (error) {
          // Silently handle LayoutAnimation errors (e.g., in testing environment)
        }

        // Create optimized parallel animations with hardware acceleration
        currentAnimation.current = Animated.parallel([
          createOptimizedTiming(rotationAnim, {
            toValue: newExpanded ? 1 : 0,
            duration: theme.animations.durations.normal,
            useNativeDriver: true, // Hardware accelerated
          }),
          createOptimizedTiming(heightAnim, {
            toValue: newExpanded ? 1 : 0,
            duration: theme.animations.durations.normal,
            useNativeDriver: false, // Height changes require layout
          }),
          createOptimizedTiming(opacityAnim, {
            toValue: newExpanded ? 1 : 0,
            duration: theme.animations.durations.fast,
            useNativeDriver: true, // Hardware accelerated
          }),
        ]);

        currentAnimation.current.start((finished) => {
          if (finished) {
            endAnimationProfiling(animationId);
          }
          currentAnimation.current = null;
        });
      }
    });

    setIsExpanded(newExpanded);
    saveState(newExpanded);
    onToggle?.(newExpanded);
  };

  // Calculate interpolated values for animations
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const contentHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const contentOpacity = opacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      cleanupAnimation(currentAnimation.current);
    };
  }, []);

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
            <View style={styles.errorIndicator} testID={testID ? `${testID}-error-indicator` : undefined}>
              <Text style={styles.errorText}>!</Text>
            </View>
          )}
        </View>
        <Animated.View
          style={[styles.chevron, { transform: [{ rotate: rotation }] }]}
          testID={testID ? `${testID}-chevron` : undefined}
        >
          <Text style={styles.chevronText}>▼</Text>
        </Animated.View>
      </TouchableOpacity>
      
      {isExpanded && (
        <Animated.View 
          style={[
            styles.content, 
            {
              opacity: contentOpacity,
              transform: [{ scaleY: contentHeight }],
            }
          ]} 
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
      lineHeight: theme.typography.lineHeights.normal * theme.typography.sizes.lg,
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