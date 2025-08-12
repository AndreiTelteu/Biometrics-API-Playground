/**
 * Header Component
 * Modern header with theme toggle and improved branding
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../theme';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Biometrics Playground',
  subtitle = 'Test biometric authentication and backend integration',
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  // Create animated value for theme toggle
  const toggleAnimation = React.useRef(new Animated.Value(isDark ? 1 : 0)).current;

  // Update animation when theme changes
  React.useEffect(() => {
    Animated.timing(toggleAnimation, {
      toValue: isDark ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isDark, toggleAnimation]);

  // Animated styles for theme toggle
  const toggleBackgroundColor = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.primary],
  });

  const toggleTranslateX = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.themeToggleContainer}
          onPress={handleThemeToggle}
          activeOpacity={0.7}
          accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} theme`}
          accessibilityRole="switch"
          accessibilityState={{ checked: isDark }}
        >
          <Animated.View
            style={[
              styles.themeToggleTrack,
              { backgroundColor: toggleBackgroundColor },
            ]}
          >
            <Animated.View
              style={[
                styles.themeToggleThumb,
                { transform: [{ translateX: toggleTranslateX }] },
              ]}
            >
              <Text style={styles.themeToggleIcon}>
                {isDark ? '🌙' : '☀️'}
              </Text>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingTop: 20,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 20,
      minHeight: 80,
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
      paddingRight: 60, // Account for theme toggle width
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 4,
      lineHeight: 28,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 280,
    },
    themeToggleContainer: {
      position: 'absolute',
      right: 20,
      top: '50%',
      marginTop: -16,
    },
    themeToggleTrack: {
      width: 52,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      position: 'relative',
    },
    themeToggleThumb: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    themeToggleIcon: {
      fontSize: 14,
      textAlign: 'center',
    },
  });