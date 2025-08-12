/**
 * CollapsibleSection Component
 * A reusable collapsible section with smooth animations and state persistence
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';

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
  const rotationAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const storageKey = `${STORAGE_KEY_PREFIX}${id}`;

  // Load saved state from AsyncStorage
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(storageKey);
        if (savedState !== null) {
          const expanded = JSON.parse(savedState);
          setIsExpanded(expanded);
          rotationAnim.setValue(expanded ? 1 : 0);
        }
      } catch (error) {
        console.warn('Failed to load collapsible section state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedState();
  }, [storageKey, rotationAnim]);

  // Save state to AsyncStorage
  const saveState = async (expanded: boolean) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(expanded));
    } catch (error) {
      console.warn('Failed to save collapsible section state:', error);
    }
  };

  // Handle toggle with animation
  const handleToggle = () => {
    const newExpanded = !isExpanded;
    
    // Configure layout animation (with fallback for testing)
    try {
      if (LayoutAnimation && LayoutAnimation.configureNext) {
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

    // Animate rotation
    Animated.timing(rotationAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: theme.animations.durations.normal,
      useNativeDriver: true,
    }).start();

    setIsExpanded(newExpanded);
    saveState(newExpanded);
    onToggle?.(newExpanded);
  };

  // Calculate rotation for chevron
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
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
        <View style={styles.content} testID={testID ? `${testID}-content` : undefined}>
          {children}
        </View>
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