/**
 * EnrollButton Component
 * 
 * Button component for biometric enrollment with loading states and proper
 * visual feedback for button interactions.
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

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
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (disabled || !biometricAvailable || isLoading) return;

    setIsLoading(true);
    try {
      await onPress();
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonStyle = () => {
    if (disabled || !biometricAvailable) {
      return [styles.button, styles.buttonDisabled];
    }
    return [styles.button, styles.buttonPrimary];
  };

  const getButtonText = () => {
    if (isLoading) return 'Enrolling...';
    if (!biometricAvailable) return 'Biometrics Not Available';
    return 'Enroll Biometric';
  };

  const getStatusIcon = () => {
    if (isLoading) return null;
    if (!biometricAvailable) return '❌';
    return '🔐';
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled || isLoading}
      testID="enroll-button"
      activeOpacity={0.7}
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
      
      {!biometricAvailable && (
        <Text style={styles.helpText}>
          Biometric authentication is not available on this device
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
  buttonPrimary: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
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

export default EnrollButton;