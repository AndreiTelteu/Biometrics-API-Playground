/**
 * ValidateButton Component
 * 
 * Button component for biometric validation with signature creation,
 * loading states and proper visual feedback.
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

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
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (disabled || !keysExist || !endpointsConfigured || isLoading) return;

    setIsLoading(true);
    try {
      await onPress();
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonStyle = () => {
    if (disabled || !keysExist || !endpointsConfigured) {
      return [styles.button, styles.buttonDisabled];
    }
    return [styles.button, styles.buttonSuccess];
  };

  const getButtonText = () => {
    if (isLoading) return 'Validating...';
    if (!keysExist) return 'No Keys - Enroll First';
    if (!endpointsConfigured) return 'Configure Endpoints';
    return 'Check & Validate';
  };

  const getStatusIcon = () => {
    if (isLoading) return null;
    if (!keysExist) return '🚫';
    if (!endpointsConfigured) return '⚙️';
    return '✅';
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

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled || isLoading}
      testID="validate-button"
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
      
      {getHelpText() && (
        <Text style={styles.helpText}>
          {getHelpText()}
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
  buttonSuccess: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
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

export default ValidateButton;