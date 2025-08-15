/**
 * BiometricActions Component
 * 
 * Container component that manages biometric action buttons including
 * EnrollButton, ValidateButton, and DeleteKeysButton with modern design system styling.
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { BiometricActionsProps } from '../types';
import { useTheme } from '../theme';
import EnrollButton from './EnrollButton';
import ValidateButton from './ValidateButton';
import DeleteKeysButton from './DeleteKeysButton';

const BiometricActions: React.FC<BiometricActionsProps> = ({
  onEnroll,
  onValidate,
  onDeleteKeys,
  disabled,
  keysExist,
  biometricAvailable,
  endpointsConfigured,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <EnrollButton
          onPress={onEnroll}
          disabled={disabled || !biometricAvailable}
          biometricAvailable={biometricAvailable}
        />
        
        <ValidateButton
          onPress={onValidate}
          disabled={disabled || !keysExist || !endpointsConfigured}
          keysExist={keysExist}
          endpointsConfigured={endpointsConfigured}
        />
        
        <DeleteKeysButton
          onPress={onDeleteKeys}
          disabled={disabled || !keysExist}
          keysExist={keysExist}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginVertical: theme.spacing.md,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonContainer: {
    gap: theme.spacing.md,
  },
});

export default BiometricActions;