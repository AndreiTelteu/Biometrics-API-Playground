/**
 * EnrollButton Component
 * 
 * Button component for biometric enrollment with loading states and proper
 * visual feedback using the enhanced Button component.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../theme';
import Button from './Button';

interface EnrollButtonProps {
  onPress: () => Promise<void>;
  disabled: boolean;
  biometricAvailable: boolean;
}

const EnrollButton: React.FC<EnrollButtonProps> = ({
  onPress,
  disabled,
  biometricAvailable,
}) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const styles = createStyles(theme);

  const handlePress = async () => {
    if (disabled || !biometricAvailable || isLoading) return;

    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsLoading(true);
    try {
      await onPress();
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonTitle = () => {
    if (isLoading) return 'Enrolling...';
    if (!biometricAvailable) return 'Biometrics Not Available';
    return 'Enroll Biometric';
  };

  const getHelpText = () => {
    if (!biometricAvailable) {
      return 'Biometric authentication is not available on this device';
    }
    return null;
  };

  const isButtonDisabled = disabled || !biometricAvailable;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Button
        title={getButtonTitle()}
        variant="primary"
        size="lg"
        disabled={isButtonDisabled}
        loading={isLoading}
        onPress={handlePress}
        testID="enroll-button"
        fullWidth
        activeOpacity={0.8}
      />
      
      {getHelpText() && (
        <Text style={styles.helpText}>
          {getHelpText()}
        </Text>
      )}
    </Animated.View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    width: '100%',
  },
  helpText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
    lineHeight: theme.typography.lineHeights.normal * theme.typography.sizes.xs,
  },
});

export default EnrollButton;