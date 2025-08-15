/**
 * Loading Indicator Component
 * Modern loading indicators with smooth animations
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

export interface LoadingIndicatorProps {
  /**
   * Size of the loading indicator
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Color of the loading indicator
   */
  color?: string;
  /**
   * Type of loading animation
   */
  type?: 'spinner' | 'pulse' | 'dots';
  /**
   * Custom container style
   */
  style?: ViewStyle;
  /**
   * Test ID for testing
   */
  testID?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  color,
  type = 'spinner',
  style,
  testID,
}) => {
  const { theme } = useTheme();
  
  // Size configurations
  const sizeConfig = {
    small: 20,
    medium: 32,
    large: 48,
  };
  
  const indicatorSize = sizeConfig[size];
  const indicatorColor = color || theme.colors.primary;
  
  if (type === 'spinner') {
    return (
      <SpinnerIndicator
        size={indicatorSize}
        color={indicatorColor}
        style={style}
        testID={testID}
      />
    );
  }
  
  if (type === 'pulse') {
    return (
      <PulseIndicator
        size={indicatorSize}
        color={indicatorColor}
        style={style}
        testID={testID}
      />
    );
  }
  
  if (type === 'dots') {
    return (
      <DotsIndicator
        size={indicatorSize}
        color={indicatorColor}
        style={style}
        testID={testID}
      />
    );
  }
  
  return null;
};

// Spinner Loading Indicator
const SpinnerIndicator: React.FC<{
  size: number;
  color: string;
  style?: ViewStyle;
  testID?: string;
}> = ({ size, color, style, testID }) => {
  const spinAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const spin = () => {
      Animated.timing(spinAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        // Reset to 0 using native driver for continuous loop
        Animated.timing(spinAnimation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }).start(() => spin());
      });
    };
    
    spin();
  }, [spinAnimation]);
  
  const rotate = spinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    },
    spinner: {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: size / 8,
      borderColor: `${color}20`,
      borderTopColor: color,
    },
  });
  
  return (
    <View style={[styles.container, style]} testID={testID}>
      <Animated.View
        style={[
          styles.spinner,
          {
            transform: [{ rotate }],
          },
        ]}
      />
    </View>
  );
};

// Pulse Loading Indicator
const PulseIndicator: React.FC<{
  size: number;
  color: string;
  style?: ViewStyle;
  testID?: string;
}> = ({ size, color, style, testID }) => {
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    
    pulse();
  }, [pulseAnimation]);
  
  const scale = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });
  
  const opacity = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });
  
  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pulse: {
      width: size * 0.8,
      height: size * 0.8,
      borderRadius: (size * 0.8) / 2,
      backgroundColor: color,
    },
  });
  
  return (
    <View style={[styles.container, style]} testID={testID}>
      <Animated.View
        style={[
          styles.pulse,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    </View>
  );
};

// Dots Loading Indicator
const DotsIndicator: React.FC<{
  size: number;
  color: string;
  style?: ViewStyle;
  testID?: string;
}> = ({ size, color, style, testID }) => {
  const dot1Animation = useRef(new Animated.Value(0)).current;
  const dot2Animation = useRef(new Animated.Value(0)).current;
  const dot3Animation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animateDots = () => {
      const dotAnimations = [dot1Animation, dot2Animation, dot3Animation];
      
      Animated.stagger(200, 
        dotAnimations.map(animation =>
          Animated.sequence([
            Animated.timing(animation, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(animation, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        )
      ).start(() => animateDots());
    };
    
    animateDots();
  }, [dot1Animation, dot2Animation, dot3Animation]);
  
  const dotSize = size / 4;
  
  const createDotStyle = (animation: Animated.Value) => ({
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
    opacity: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });
  
  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: dotSize / 2,
    },
    dot: {
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      backgroundColor: color,
    },
  });
  
  return (
    <View style={[styles.container, style]} testID={testID}>
      <Animated.View style={[styles.dot, createDotStyle(dot1Animation)]} />
      <Animated.View style={[styles.dot, createDotStyle(dot2Animation)]} />
      <Animated.View style={[styles.dot, createDotStyle(dot3Animation)]} />
    </View>
  );
};