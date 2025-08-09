/**
 * DeleteKeysButton Component
 * 
 * Button component for deleting biometric keys with confirmation dialog,
 * loading states and proper visual feedback.
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  Alert,
} from 'react-native';

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
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = () => {
    if (disabled || !keysExist || isLoading) return;

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

  const getButtonStyle = () => {
    if (disabled || !keysExist) {
      return [styles.button, styles.buttonDisabled];
    }
    return [styles.button, styles.buttonDanger];
  };

  const getButtonText = () => {
    if (isLoading) return 'Deleting...';
    if (!keysExist) return 'No Keys to Delete';
    return 'Delete Keys';
  };

  const getStatusIcon = () => {
    if (isLoading) return null;
    if (!keysExist) return '🚫';
    return '🗑️';
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled || !keysExist || isLoading}
      testID="delete-keys-button"
      activeOpacity={0.7}
      accessibilityState={{ disabled: disabled || !keysExist || isLoading }}
    >
      <View style={styles.buttonContent}>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color="#fff"
            style={styles.loadingIndicator}
          />
        ) : (
          <Text style={styles.buttonIcon}>{getStatusIcon()}</Text>
        )}
        <Text style={[
          styles.buttonText,
          disabled ? styles.buttonTextDisabled : styles.buttonTextEnabled
        ]}>
          {getButtonText()}
        </Text>
      </View>
      
      {!keysExist && (
        <Text style={styles.helpText}>
          No biometric keys found to delete
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 1,
  },
  buttonDanger: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextEnabled: {
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#fff',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default DeleteKeysButton;