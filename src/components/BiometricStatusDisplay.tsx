/**
 * BiometricStatusDisplay Component
 * 
 * Displays current biometric sensor availability, type, key existence status,
 * and error states with detailed error messages and visual indicators.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { BiometryType } from '../types';

interface BiometricStatusDisplayProps {
  available: boolean;
  biometryType: BiometryType;
  keysExist: boolean;
  error?: string;
}

const BiometricStatusDisplay: React.FC<BiometricStatusDisplayProps> = ({
  available,
  biometryType,
  keysExist,
  error,
}) => {
  const getBiometryTypeDisplayName = (type: BiometryType): string => {
    switch (type) {
      case 'TouchID':
        return 'Touch ID';
      case 'FaceID':
        return 'Face ID';
      case 'Biometrics':
        return 'Biometric Authentication';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = (isAvailable: boolean, hasError: boolean): string => {
    if (hasError) return '❌';
    return isAvailable ? '✅' : '⚠️';
  };

  const getKeyStatusIcon = (exists: boolean): string => {
    return exists ? '🔑' : '🚫';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Biometric Status</Text>
      
      {/* Sensor Availability Status */}
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <Text style={styles.statusIcon}>
            {getStatusIcon(available, !!error)}
          </Text>
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>Sensor Availability:</Text>
            <Text style={[
              styles.statusValue,
              available ? styles.successText : styles.warningText
            ]}>
              {available ? 'Available' : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* Biometry Type Display */}
        {available && biometryType && (
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>📱</Text>
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>Sensor Type:</Text>
              <Text style={styles.statusValue}>
                {getBiometryTypeDisplayName(biometryType)}
              </Text>
            </View>
          </View>
        )}

        {/* Key Existence Status */}
        <View style={styles.statusRow}>
          <Text style={styles.statusIcon}>
            {getKeyStatusIcon(keysExist)}
          </Text>
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>Biometric Keys:</Text>
            <Text style={[
              styles.statusValue,
              keysExist ? styles.successText : styles.infoText
            ]}>
              {keysExist ? 'Keys Exist' : 'No Keys Found'}
            </Text>
          </View>
        </View>
      </View>

      {/* Error State Display */}
      {error && (
        <View style={styles.errorSection}>
          <View style={styles.errorHeader}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Error Details</Text>
          </View>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      )}

      {/* Capability Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Capability Summary</Text>
        <View style={styles.capabilityList}>
          <View style={styles.capabilityItem}>
            <Text style={styles.capabilityIcon}>
              {available ? '✅' : '❌'}
            </Text>
            <Text style={styles.capabilityText}>
              Biometric authentication {available ? 'supported' : 'not supported'}
            </Text>
          </View>
          
          <View style={styles.capabilityItem}>
            <Text style={styles.capabilityIcon}>
              {keysExist ? '✅' : '⚠️'}
            </Text>
            <Text style={styles.capabilityText}>
              {keysExist ? 'Ready for validation' : 'Enrollment required'}
            </Text>
          </View>
          
          {available && !keysExist && (
            <View style={styles.capabilityItem}>
              <Text style={styles.capabilityIcon}>💡</Text>
              <Text style={styles.capabilityText}>
                Tap "Enroll" to create biometric keys
              </Text>
            </View>
          )}
        </View>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusSection: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  successText: {
    color: '#28a745',
  },
  warningText: {
    color: '#ffc107',
  },
  infoText: {
    color: '#17a2b8',
  },
  errorSection: {
    backgroundColor: '#f8d7da',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#721c24',
  },
  errorMessage: {
    fontSize: 14,
    color: '#721c24',
    lineHeight: 20,
  },
  summarySection: {
    backgroundColor: '#e7f3ff',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#b8daff',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#004085',
    marginBottom: 8,
  },
  capabilityList: {
    gap: 6,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capabilityIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  capabilityText: {
    fontSize: 14,
    color: '#004085',
    flex: 1,
  },
});

export default BiometricStatusDisplay;