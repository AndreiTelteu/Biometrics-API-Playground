/**
 * Biometrics Playground App
 * Main application component integrating all biometric playground components
 *
 * @format
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, StyleSheet, ScrollView, Alert } from 'react-native';
import { AnimatedView } from './src/components/AnimatedView';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import theme provider and hook
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useTheme } from './src/theme';

// Import components
import BiometricActions from './src/components/BiometricActions';
import BiometricStatusDisplay from './src/components/BiometricStatusDisplay';
import EndpointConfiguration from './src/components/EndpointConfiguration';
import { Header } from './src/components/Header';
import StatusLog from './src/components/StatusLog';

// Import services
import { biometricService, biometricAPIService } from './src/services';

// Import utilities
import { useStatusLogger } from './src/utils';

// Import types
import type { BiometricStatus, EndpointConfig } from './src/types';

// Import constants
import {
  DEFAULT_ENROLL_ENDPOINT,
  DEFAULT_VALIDATE_ENDPOINT,
} from './src/constants';

// Storage keys for persistence
const STORAGE_KEYS = {
  ENROLL_ENDPOINT: '@biometrics_playground:enroll_endpoint',
  VALIDATE_ENDPOINT: '@biometrics_playground:validate_endpoint',
};

function AppContent(): React.JSX.Element {
  const { theme, isDark } = useTheme();

  // State management for biometric status, configuration, and logs
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    available: false,
    biometryType: undefined,
  });

  const [keysExist, setKeysExist] = useState<boolean>(false);

  const [enrollEndpoint, setEnrollEndpoint] = useState<EndpointConfig>(
    DEFAULT_ENROLL_ENDPOINT,
  );
  const [validateEndpoint, setValidateEndpoint] = useState<EndpointConfig>(
    DEFAULT_VALIDATE_ENDPOINT,
  );

  // Use status logger hook for operation logging
  const {
    logs,
    currentOperation,
    isLoading,
    logSuccess,
    logError,
    logInfo,
    executeWithLogging,
  } = useStatusLogger();

  /**
   * Initialize biometrics on app load
   */
  const initializeBiometrics = useCallback(async () => {
    try {
      logInfo('status', 'Initializing biometric sensors...');

      // Check biometric availability
      const status = await biometricService.checkBiometricAvailability();
      setBiometricStatus(status);

      if (status.available) {
        // Check if keys exist
        const keysExistResult = await biometricService.checkKeysExist();
        setKeysExist(keysExistResult);

        logSuccess(
          'status',
          `Biometric initialization complete. Sensor: ${
            status.biometryType
          }, Keys: ${keysExistResult ? 'Present' : 'Not found'}`,
        );
      } else {
        logError('status', status.error || 'Biometric sensors not available');
      }
    } catch (error) {
      logError('status', 'Failed to initialize biometrics', error);
    }
  }, [logInfo, logSuccess, logError]);

  /**
   * Load endpoint configuration from storage
   */
  const loadEndpointConfiguration = useCallback(async () => {
    try {
      const [enrollConfig, validateConfig] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ENROLL_ENDPOINT),
        AsyncStorage.getItem(STORAGE_KEYS.VALIDATE_ENDPOINT),
      ]);

      if (enrollConfig) {
        setEnrollEndpoint(JSON.parse(enrollConfig));
      }
      if (validateConfig) {
        setValidateEndpoint(JSON.parse(validateConfig));
      }
    } catch (error) {
      logError('status', 'Failed to load endpoint configuration', error);
    }
  }, [logError]);

  /**
   * Save endpoint configuration to storage
   */
  const saveEndpointConfiguration = useCallback(
    async (type: 'enroll' | 'validate', config: EndpointConfig) => {
      try {
        const storageKey =
          type === 'enroll'
            ? STORAGE_KEYS.ENROLL_ENDPOINT
            : STORAGE_KEYS.VALIDATE_ENDPOINT;
        await AsyncStorage.setItem(storageKey, JSON.stringify(config));

        if (type === 'enroll') {
          setEnrollEndpoint(config);
        } else {
          setValidateEndpoint(config);
        }

        logInfo('status', `${type} endpoint configuration saved`);
      } catch (error) {
        logError(
          'status',
          `Failed to save ${type} endpoint configuration`,
          error,
        );
      }
    },
    [logInfo, logError],
  );

  /**
   * Handle enrollment flow with backend integration
   */
  const handleEnroll = useCallback(async () => {
    await executeWithLogging(
      'enroll',
      'Starting biometric enrollment...',
      async () => {
        // Validate biometric availability first
        if (!biometricStatus.available) {
          throw new Error(
            `Biometric sensors not available: ${
              biometricStatus.error || 'Unknown reason'
            }`,
          );
        }

        // Create biometric keys with user authentication
        logInfo('enroll', 'Creating biometric keys...');
        const createKeysResult = await biometricService.createKeys(
          'Authenticate to create biometric keys for enrollment',
        );

        if (!createKeysResult.success) {
          throw new Error(`Key creation failed: ${createKeysResult.message}`);
        }

        const publicKey = createKeysResult.data.publicKey;
        logSuccess(
          'enroll',
          `Biometric keys created successfully. Public key: ${publicKey.substring(
            0,
            50,
          )}...`,
        );

        // Update keys exist status
        setKeysExist(true);

        // Send public key to backend if endpoint is configured
        if (enrollEndpoint.url) {
          logInfo(
            'enroll',
            `Sending public key to enrollment endpoint: ${enrollEndpoint.url}`,
          );

          const enrollResult = await biometricAPIService.enrollPublicKey(
            enrollEndpoint,
            publicKey,
          );

          if (!enrollResult.success) {
            // Reset keys exist status on backend failure
            setKeysExist(false);
            throw new Error(
              `Backend enrollment failed: ${enrollResult.message}`,
            );
          }

          logSuccess(
            'enroll',
            'Public key successfully registered with backend',
          );

          return {
            publicKey,
            backendResponse: enrollResult.data,
            endpoint: enrollEndpoint.url,
            method: enrollEndpoint.method,
          };
        } else {
          logInfo(
            'enroll',
            'No enrollment endpoint configured - keys created locally only',
          );
          return {
            publicKey,
            localOnly: true,
          };
        }
      },
      'Enrollment completed successfully',
    );
  }, [
    executeWithLogging,
    enrollEndpoint,
    biometricStatus,
    logInfo,
    logSuccess,
  ]);

  /**
   * Handle validation flow with signature verification
   */
  const handleValidate = useCallback(async () => {
    await executeWithLogging(
      'validate',
      'Starting biometric validation...',
      async () => {
        // Validate prerequisites
        if (!biometricStatus.available) {
          throw new Error(
            `Biometric sensors not available: ${
              biometricStatus.error || 'Unknown reason'
            }`,
          );
        }

        if (!keysExist) {
          throw new Error(
            'No biometric keys found. Please enroll first before attempting validation.',
          );
        }

        // Generate payload for signature (custom or timestamp)
        logInfo('validate', 'Generating payload for signature...');
        const payload = biometricService.generatePayload(
          validateEndpoint.customPayload,
        );
        const payloadType = validateEndpoint.customPayload
          ? 'custom'
          : 'timestamp';
        logInfo('validate', `Generated ${payloadType} payload: ${payload}`);

        // Create signature with biometric authentication
        logInfo(
          'validate',
          'Requesting biometric authentication for signature creation...',
        );
        const signatureResult = await biometricService.createSignature({
          promptMessage: 'Authenticate to create signature for validation',
          payload,
          cancelButtonText: 'Cancel Validation',
        });

        if (!signatureResult.success) {
          throw new Error(
            `Signature creation failed: ${signatureResult.message}`,
          );
        }

        const signature = signatureResult.data.signature;
        logSuccess(
          'validate',
          `Signature created successfully. Length: ${signature.length} characters`,
        );

        // Send signature to backend for validation if endpoint is configured
        if (validateEndpoint.url) {
          logInfo(
            'validate',
            `Sending signature to validation endpoint: ${validateEndpoint.url}`,
          );

          const validationResult = await biometricAPIService.validateSignature(
            validateEndpoint,
            signature,
            payload,
          );

          if (!validationResult.success) {
            throw new Error(
              `Backend validation failed: ${validationResult.message}`,
            );
          }

          logSuccess(
            'validate',
            'Signature successfully validated by backend server',
          );

          return {
            signature,
            payload,
            backendResponse: validationResult.data,
            endpoint: validateEndpoint.url,
            method: validateEndpoint.method,
            validationTimestamp: new Date().toISOString(),
          };
        } else {
          logInfo(
            'validate',
            'No validation endpoint configured - signature created locally only',
          );

          return {
            signature,
            payload,
            localOnly: true,
            validationTimestamp: new Date().toISOString(),
          };
        }
      },
      'Validation completed successfully',
    );
  }, [
    executeWithLogging,
    validateEndpoint,
    biometricStatus,
    keysExist,
    logInfo,
    logSuccess,
  ]);

  /**
   * Handle key deletion with confirmation
   */
  const handleDeleteKeys = useCallback(async () => {
    Alert.alert(
      'Delete Biometric Keys',
      'Are you sure you want to delete the biometric keys? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await executeWithLogging(
              'delete',
              'Deleting biometric keys...',
              async () => {
                const deleteResult = await biometricService.deleteKeys();
                if (!deleteResult.success) {
                  throw new Error(deleteResult.message);
                }

                // Update keys exist status
                setKeysExist(false);

                return deleteResult.data;
              },
              'Biometric keys deleted successfully',
            );
          },
        },
      ],
    );
  }, [executeWithLogging]);

  // Component lifecycle management - initialize on app load
  useEffect(() => {
    const initialize = async () => {
      await loadEndpointConfiguration();
      await initializeBiometrics();
    };

    initialize();
  }, [loadEndpointConfiguration, initializeBiometrics]);

  const styles = createStyles(theme);

  return (
    <AnimatedView
      style={styles.container}
      lightBackgroundColor={theme.colors.background}
      darkBackgroundColor={theme.colors.background}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header />

        <BiometricStatusDisplay
          available={biometricStatus.available}
          biometryType={biometricStatus.biometryType}
          keysExist={keysExist}
          error={biometricStatus.error}
        />

        <EndpointConfiguration
          enrollConfig={enrollEndpoint}
          validateConfig={validateEndpoint}
          onConfigChange={saveEndpointConfiguration}
        />

        <BiometricActions
          onEnroll={handleEnroll}
          onValidate={handleValidate}
          onDeleteKeys={handleDeleteKeys}
          disabled={isLoading}
          keysExist={keysExist}
          biometricAvailable={biometricStatus.available}
          endpointsConfigured={!!(enrollEndpoint.url && validateEndpoint.url)}
        />

        <StatusLog
          logs={logs}
          currentOperation={currentOperation || undefined}
          isLoading={isLoading}
        />
      </ScrollView>
    </AnimatedView>
  );
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
  });

export default App;
