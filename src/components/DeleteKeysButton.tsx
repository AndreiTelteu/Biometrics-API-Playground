/**
 * DeleteKeysButton Component
 * 
 * Button component for deleting biometric keys with confirmation dialog,
 * loading states and proper visual feedback using the enhanced Button component.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { useTheme } from '../theme';
import Button from './Button';

interface DeleteKeysButtonProps {
  onPress: () => Promise<void>;
  disabled: boolean;
  keysExist: boolean;
}

const DeleteKeysButton: React.FC<DeleteKeysButtonProps> = ({
  onPress,
  disabled,
  keysExist,
}) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const styles = createStyles(theme);

  const handlePress = () => {
    if (disabled || !keysExist || isLoading) return;

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

    // Show confirmation dialog before deleting keys
    Alert.alert(
      'Delete Biometric Keys',
      'Are you sure you want to delete the biometric keys? This action cannot be undone and you will need to enroll again.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleConfirmedDelete,
        },
      ],
      { cancelable: true }
    );
  };

  const handleConfirmedDelete = async () => {
    setIsLoading(true);
    try {
      await onPress();
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonTitle = () => {
    if (isLoading) return 'Deleting...';
    if (!keysExist) return 'No Keys to Delete';
    return 'Delete Keys';
  };

  const getHelpText = () => {
    if (!keysExist) {
      return 'No biometric keys found to delete';
    }
    return null;
  };

  const isButtonDisabled = disabled || !keysExist;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Button
        title={getButtonTitle()}
        variant="danger"
        size="lg"
        disabled={isButtonDisabled}
        loading={isLoading}
        onPress={handlePress}
        testID="delete-keys-button"
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

export default DeleteKeysButton;