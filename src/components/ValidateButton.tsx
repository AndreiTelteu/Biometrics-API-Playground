/**
 * ValidateButton Component
 * 
 * Button component for biometric validation with signature creation,
 * loading states and proper visual feedback using the enhanced Button component.
 */

import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../theme';
import Button from './Button';

interface ValidateButtonProps {
  onPress: () => Promise<void>;
  disabled: boolean;
  keysExist: boolean;
  endpointsConfigured: boolean;
}

const ValidateButton: React.FC<ValidateButtonProps> = ({
  onPress,
  disabled,
  keysExist,
  endpointsConfigured,
}) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const styles = createStyles(theme);

  const handlePress = async () => {
    if (disabled || !keysExist || !endpointsConfigured || isLoading) return;

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
    if (isLoading) return 'Validating...';
    if (!keysExist) return 'No Keys - Enroll First';
    if (!endpointsConfigured) return 'Configure Endpoints';
    return 'Check & Validate';
  };

  const getButtonVariant = () => {
    if (!keysExist || !endpointsConfigured) return 'secondary';
    return 'primary';
  };

  const getHelpText = () => {
    if (!keysExist) {
      return 'Enroll biometric credentials first to enable validation';
    }
    if (!endpointsConfigured) {
      return 'Configure validation endpoint to test signature verification';
    }
    return null;
  };

  const isButtonDisabled = disabled || !keysExist || !endpointsConfigured;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Button
        title={getButtonTitle()}
        variant={getButtonVariant()}
        size="lg"
        disabled={isButtonDisabled}
        loading={isLoading}
        onPress={handlePress}
        testID="validate-button"
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

export default ValidateButton;