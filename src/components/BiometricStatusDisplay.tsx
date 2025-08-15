/**
 * BiometricStatusDisplay Component
 * 
 * Displays current biometric sensor availability, type, key existence status,
 * and error states with detailed error messages and visual indicators.
 * Redesigned with modern card styling, improved visual hierarchy, and theme support.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { BiometryType } from '../types';
import { useTheme } from '../theme';
import Card from './Card';

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
  const { theme } = useTheme();
  const styles = createStyles(theme);

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

  const getBiometryTypeIcon = (type: BiometryType): string => {
    switch (type) {
      case 'TouchID':
        return '👆';
      case 'FaceID':
        return '👤';
      case 'Biometrics':
        return '🔐';
      default:
        return '📱';
    }
  };

  return (
    <Card variant="elevated" padding="lg" style={styles.container}>
      <Text style={styles.title}>Biometric Status</Text>
      
      {/* Main Status Section */}
      <View style={styles.statusGrid}>
        {/* Sensor Availability Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusIconContainer,
              available && !error ? styles.successIconContainer : 
              error ? styles.errorIconContainer : styles.warningIconContainer
            ]}>
              <Text style={styles.statusIcon}>
                {getStatusIcon(available, !!error)}
              </Text>
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>Sensor Availability</Text>
              <Text style={[
                styles.statusValue,
                available && !error ? styles.successText : 
                error ? styles.errorText : styles.warningText
              ]}>
                {available ? 'Available' : 'Not Available'}
              </Text>
            </View>
          </View>
        </View>

        {/* Biometry Type Display */}
        {available && biometryType && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusIconContainer, styles.infoIconContainer]}>
                <Text style={styles.statusIcon}>
                  {getBiometryTypeIcon(biometryType)}
                </Text>
              </View>
              <View style={styles.statusContent}>
                <Text style={styles.statusLabel}>Sensor Type</Text>
                <Text style={[styles.statusValue, styles.infoText]}>
                  {getBiometryTypeDisplayName(biometryType)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Key Existence Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusIconContainer,
              keysExist ? styles.successIconContainer : styles.infoIconContainer
            ]}>
              <Text style={styles.statusIcon}>
                {getKeyStatusIcon(keysExist)}
              </Text>
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>Biometric Keys</Text>
              <Text style={[
                styles.statusValue,
                keysExist ? styles.successText : styles.infoText
              ]}>
                {keysExist ? 'Keys Exist' : 'No Keys Found'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Error State Display */}
      {error && (
        <Card variant="outlined" padding="md" style={styles.errorCard}>
          <View style={styles.errorHeader}>
            <View style={[styles.statusIconContainer, styles.errorIconContainer]}>
              <Text style={styles.statusIcon}>⚠️</Text>
            </View>
            <Text style={styles.errorTitle}>Error Details</Text>
          </View>
          <Text style={styles.errorMessage}>{error}</Text>
        </Card>
      )}

      {/* Capability Summary */}
      <Card variant="outlined" padding="md" style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Capability Summary</Text>
        <View style={styles.capabilityList}>
          <View style={styles.capabilityItem}>
            <View style={[
              styles.capabilityIconContainer,
              available ? styles.successIconContainer : styles.errorIconContainer
            ]}>
              <Text style={styles.capabilityIcon}>
                {available ? '✅' : '❌'}
              </Text>
            </View>
            <Text style={styles.capabilityText}>
              Biometric authentication {available ? 'supported' : 'not supported'}
            </Text>
          </View>
          
          <View style={styles.capabilityItem}>
            <View style={[
              styles.capabilityIconContainer,
              keysExist ? styles.successIconContainer : styles.warningIconContainer
            ]}>
              <Text style={styles.capabilityIcon}>
                {keysExist ? '✅' : '⚠️'}
              </Text>
            </View>
            <Text style={styles.capabilityText}>
              {keysExist ? 'Ready for validation' : 'Enrollment required'}
            </Text>
          </View>
          
          {available && !keysExist && (
            <View style={styles.capabilityItem}>
              <View style={[styles.capabilityIconContainer, styles.infoIconContainer]}>
                <Text style={styles.capabilityIcon}>💡</Text>
              </View>
              <Text style={styles.capabilityText}>
                Tap "Enroll" to create biometric keys
              </Text>
            </View>
          )}
        </View>
      </Card>
    </Card>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeights.tight * theme.typography.sizes['2xl'],
  },
  statusGrid: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statusCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  successIconContainer: {
    backgroundColor: `${theme.colors.success}15`,
  },
  warningIconContainer: {
    backgroundColor: `${theme.colors.warning}15`,
  },
  errorIconContainer: {
    backgroundColor: `${theme.colors.error}15`,
  },
  infoIconContainer: {
    backgroundColor: `${theme.colors.info}15`,
  },
  statusIcon: {
    fontSize: 20,
    textAlign: 'center',
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: theme.typography.lineHeights.normal * theme.typography.sizes.sm,
  },
  statusValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    lineHeight: theme.typography.lineHeights.tight * theme.typography.sizes.lg,
  },
  successText: {
    color: theme.colors.success,
  },
  warningText: {
    color: theme.colors.warning,
  },
  errorText: {
    color: theme.colors.error,
  },
  infoText: {
    color: theme.colors.info,
  },
  errorCard: {
    marginBottom: theme.spacing.lg,
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}08`,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  errorTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.error,
    lineHeight: theme.typography.lineHeights.tight * theme.typography.sizes.lg,
  },
  errorMessage: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.error,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.base,
  },
  summaryCard: {
    borderColor: theme.colors.info,
    backgroundColor: `${theme.colors.info}08`,
  },
  summaryTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.info,
    marginBottom: theme.spacing.md,
    lineHeight: theme.typography.lineHeights.tight * theme.typography.sizes.lg,
  },
  capabilityList: {
    gap: theme.spacing.sm,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capabilityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  capabilityIcon: {
    fontSize: 16,
    textAlign: 'center',
  },
  capabilityText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    flex: 1,
    lineHeight: theme.typography.lineHeights.normal * theme.typography.sizes.base,
  },
});

export default BiometricStatusDisplay;