/**
 * BiometricActions Component
 * 
 * Container component that manages biometric action buttons including
 * EnrollButton, ValidateButton, and DeleteKeysButton with proper state management.
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { BiometricActionsProps } from '../types';
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

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 8,
  },
  buttonContainer: {
    gap: 12,
  },
});

export default BiometricActions;