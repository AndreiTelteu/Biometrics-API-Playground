/**
 * Theme Usage Example
 * Example component demonstrating how to use the theme system
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../useTheme';

export const ThemeExample: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      ...theme.shadows.md,
    },
    title: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    buttonText: {
      color: theme.colors.surface,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
    },
    themeInfo: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Theme System Example</Text>
        <Text style={styles.subtitle}>
          This component demonstrates the theme system usage
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={toggleTheme}>
          <Text style={styles.buttonText}>
            Switch to {isDark ? 'Light' : 'Dark'} Theme
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.themeInfo}>
          Current theme: {isDark ? 'Dark' : 'Light'}
        </Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.subtitle}>Theme Properties</Text>
        <Text style={[styles.themeInfo, { textAlign: 'left' }]}>
          Primary Color: {theme.colors.primary}
        </Text>
        <Text style={[styles.themeInfo, { textAlign: 'left' }]}>
          Background: {theme.colors.background}
        </Text>
        <Text style={[styles.themeInfo, { textAlign: 'left' }]}>
          Base Font Size: {theme.typography.sizes.base}px
        </Text>
        <Text style={[styles.themeInfo, { textAlign: 'left' }]}>
          Medium Spacing: {theme.spacing.md}px
        </Text>
      </View>
    </View>
  );
};