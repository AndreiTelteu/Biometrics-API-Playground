import React from 'react';
import { View, StyleSheet, Button, Alert } from 'react-native';
import { StatusLog } from '../components';
import { useStatusLogger } from '../utils';

/**
 * Example component demonstrating how to use StatusLog with useStatusLogger hook
 * This shows real-time status updates, loading indicators, and error handling
 */
const StatusLogExample: React.FC = () => {
  const {
    logs,
    currentOperation,
    isLoading,
    logSuccess,
    logError,
    logInfo,
    executeWithLogging,
    clearLogs,
  } = useStatusLogger();

  const handleSimulateEnrollment = async () => {
    try {
      await executeWithLogging(
        'enroll',
        'Starting biometric enrollment...',
        async () => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Simulate random success/failure
          if (Math.random() > 0.3) {
            return { publicKey: 'mock-public-key-12345' };
          } else {
            throw new Error('Biometric sensor not available');
          }
        },
        'Biometric enrollment completed successfully',
        'Biometric enrollment failed'
      );
    } catch (error) {
      // Error is already logged by executeWithLogging
      Alert.alert('Enrollment Failed', 'Please try again');
    }
  };

  const handleSimulateValidation = async () => {
    try {
      await executeWithLogging(
        'validate',
        'Starting biometric validation...',
        async () => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Simulate random success/failure
          if (Math.random() > 0.4) {
            return { 
              signature: 'mock-signature-abcdef',
              timestamp: new Date().toISOString(),
              valid: true 
            };
          } else {
            throw new Error('Invalid biometric signature');
          }
        },
        'Biometric validation completed successfully',
        'Biometric validation failed'
      );
    } catch (error) {
      Alert.alert('Validation Failed', 'Please try again');
    }
  };

  const handleSimulateStatusCheck = () => {
    logInfo('status', 'Checking biometric sensor availability...', {
      sensorType: 'TouchID',
      available: true,
      keysExist: false,
    });
  };

  const handleSimulateError = () => {
    logError('enroll', 'Network connection failed', {
      errorCode: 'NETWORK_ERROR',
      endpoint: 'https://api.example.com/enroll',
      timestamp: new Date().toISOString(),
    });
  };

  const handleSimulateSuccess = () => {
    logSuccess('validate', 'Server validation successful', {
      responseTime: '245ms',
      serverTimestamp: new Date().toISOString(),
      validationScore: 0.98,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button
          title="Simulate Enrollment"
          onPress={handleSimulateEnrollment}
          disabled={isLoading}
        />
        <Button
          title="Simulate Validation"
          onPress={handleSimulateValidation}
          disabled={isLoading}
        />
        <Button
          title="Status Check"
          onPress={handleSimulateStatusCheck}
          disabled={isLoading}
        />
        <Button
          title="Simulate Error"
          onPress={handleSimulateError}
          disabled={isLoading}
        />
        <Button
          title="Simulate Success"
          onPress={handleSimulateSuccess}
          disabled={isLoading}
        />
        <Button
          title="Clear Logs"
          onPress={clearLogs}
          color="#ff6b6b"
        />
      </View>
      
      <StatusLog
        logs={logs}
        currentOperation={currentOperation}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 8,
  },
});

export default StatusLogExample;