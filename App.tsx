/**
 * Biometrics Playground App
 * Main application component integrating all biometric playground components
 *
 * @format
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, StyleSheet, ScrollView, Alert, TouchableOpacity, Text } from 'react-native';
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
import { WebControl } from './src/components/WebControl';
import { WebControlDebugPanel } from './src/components/WebControlDebugPanel';

// Import services
import { biometricService, biometricAPIService, webServerService } from './src/services';
import { webControlStateManager } from './src/services/WebControlStateManager';

// Import utilities
import { useStatusLogger, webControlLogger, errorHandler, networkResilience } from './src/utils';

// Import types
import type { BiometricStatus, EndpointConfig, ServerStatus, ErrorDetails } from './src/types';

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

  // Web control state
  const [webControlError, setWebControlError] = useState<string | null>(null);
  const [isWebControlInitialized, setIsWebControlInitialized] = useState<boolean>(false);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);

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
      webControlLogger.logDebug('bridge', 'Initializing biometric sensors...');

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
        
        webControlLogger.logBridge(
          'info',
          'Biometric initialization completed successfully',
          undefined,
          undefined,
          { biometryType: status.biometryType, keysExist: keysExistResult }
        );
      } else {
        const errorMsg = status.error || 'Biometric sensors not available';
        logError('status', errorMsg);
        webControlLogger.logBridge('error', errorMsg);
      }
    } catch (error) {
      logError('status', 'Failed to initialize biometrics', error);
      webControlLogger.logError('bridge', error, 'Biometric initialization');
    }
  }, [logSuccess, logError]);

  /**
   * Initialize web control system
   */
  const initializeWebControl = useCallback(async () => {
    try {
      webControlLogger.logState('info', 'Initializing web control system...');
      
      // Initialize web control state manager
      await webControlStateManager.initialize();
      
      // Initialize network resilience
      networkResilience.initialize({
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
      });
      
      // Setup error handling for web control
      const removeErrorListener = errorHandler.addErrorListener((error: ErrorDetails) => {
        if (error.code.startsWith('SERVER_') || 
            error.code.startsWith('WEBSOCKET_') || 
            error.code.startsWith('NETWORK_')) {
          setWebControlError(error.userMessage || error.message);
          
          // Clear error after 10 seconds
          setTimeout(() => {
            setWebControlError(null);
          }, 10000);
        }
      });
      
      setIsWebControlInitialized(true);
      webControlLogger.logState('info', 'Web control system initialized successfully');
      
      // Return cleanup function
      return () => {
        removeErrorListener();
        networkResilience.shutdown();
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setWebControlError(`Failed to initialize web control: ${errorMsg}`);
      webControlLogger.logError('state', error, 'Web control initialization');
      throw error;
    }
  }, []);

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

        // logInfo('status', `${type} endpoint configuration saved`);
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
    const operationId = webControlStateManager.startOperation('enroll');
    const startTime = Date.now();
    
    webControlLogger.logOperationStart('bridge', 'enrollment', operationId, {
      endpoint: enrollEndpoint.url,
      biometricAvailable: biometricStatus.available,
    });

    try {
      await executeWithLogging(
        'enroll',
        'Starting biometric enrollment...',
        async () => {
          // Validate biometric availability first
          if (!biometricStatus.available) {
            const error = new Error(
              `Biometric sensors not available: ${
                biometricStatus.error || 'Unknown reason'
              }`,
            );
            webControlLogger.logError('bridge', error, 'Enrollment validation', operationId);
            throw error;
          }

          // Create biometric keys with user authentication
          logInfo('enroll', 'Creating biometric keys...');
          webControlLogger.logBridge('info', 'Creating biometric keys...', operationId);
          
          const createKeysResult = await biometricService.createKeys(
            'Authenticate to create biometric keys for enrollment',
          );

          if (!createKeysResult.success) {
            const error = new Error(`Key creation failed: ${createKeysResult.message}`);
            webControlLogger.logError('bridge', error, 'Key creation', operationId);
            throw error;
          }

          const publicKey = createKeysResult.data.publicKey;
          logSuccess(
            'enroll',
            `Biometric keys created successfully. Public key: ${publicKey.substring(
              0,
              50,
            )}...`,
          );
          
          webControlLogger.logBridge(
            'info', 
            'Biometric keys created successfully', 
            operationId,
            undefined,
            { publicKeyLength: publicKey.length }
          );

          // Update keys exist status
          setKeysExist(true);

          // Send public key to backend if endpoint is configured
          if (enrollEndpoint.url) {
            logInfo(
              'enroll',
              `Sending public key to enrollment endpoint: ${enrollEndpoint.url}`,
            );
            
            webControlLogger.logNetwork(
              'info',
              'Sending enrollment request to backend',
              enrollEndpoint.url,
              { method: enrollEndpoint.method }
            );

            const enrollResult = await networkResilience.executeWithRetry(
              () => biometricAPIService.enrollPublicKey(enrollEndpoint, publicKey),
              'Backend enrollment',
              3
            );

            if (!enrollResult.success) {
              // Reset keys exist status on backend failure
              setKeysExist(false);
              const error = new Error(`Backend enrollment failed: ${enrollResult.message}`);
              webControlLogger.logError('bridge', error, 'Backend enrollment', operationId, {
                endpoint: enrollEndpoint.url,
                resetKeysExist: true,
              });
              throw error;
            }

            logSuccess(
              'enroll',
              'Public key successfully registered with backend',
            );
            
            webControlLogger.logNetwork(
              'info',
              'Enrollment request completed successfully',
              enrollEndpoint.url,
              { responseData: enrollResult.data }
            );

            const result = {
              publicKey,
              backendResponse: enrollResult.data,
              endpoint: enrollEndpoint.url,
              method: enrollEndpoint.method,
            };
            
            webControlLogger.logOperationComplete('bridge', 'enrollment', operationId, true, startTime, result);
            await webControlStateManager.completeOperation(operationId, true, result);
            
            return result;
          } else {
            logInfo(
              'enroll',
              'No enrollment endpoint configured - keys created locally only',
            );
            
            const result = {
              publicKey,
              localOnly: true,
            };
            
            webControlLogger.logOperationComplete('bridge', 'enrollment', operationId, true, startTime, result);
            await webControlStateManager.completeOperation(operationId, true, result);
            
            return result;
          }
        },
        'Enrollment completed successfully',
      );
    } catch (error) {
      webControlLogger.logOperationComplete('bridge', 'enrollment', operationId, false, startTime, { error });
      await webControlStateManager.completeOperation(operationId, false, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
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
    const operationId = webControlStateManager.startOperation('validate');
    const startTime = Date.now();
    
    webControlLogger.logOperationStart('bridge', 'validation', operationId, {
      endpoint: validateEndpoint.url,
      biometricAvailable: biometricStatus.available,
      keysExist,
    });

    try {
      await executeWithLogging(
        'validate',
        'Starting biometric validation...',
        async () => {
          // Validate prerequisites
          if (!biometricStatus.available) {
            const error = new Error(
              `Biometric sensors not available: ${
                biometricStatus.error || 'Unknown reason'
              }`,
            );
            webControlLogger.logError('bridge', error, 'Validation prerequisites', operationId);
            throw error;
          }

          if (!keysExist) {
            const error = new Error(
              'No biometric keys found. Please enroll first before attempting validation.',
            );
            webControlLogger.logError('bridge', error, 'Validation prerequisites', operationId);
            throw error;
          }

          // Generate payload for signature (custom or timestamp)
          logInfo('validate', 'Generating payload for signature...');
          webControlLogger.logBridge('info', 'Generating payload for signature...', operationId);
          
          const payload = biometricService.generatePayload(
            validateEndpoint.customPayload,
          );
          const payloadType = validateEndpoint.customPayload
            ? 'custom'
            : 'timestamp';
          logInfo('validate', `Generated ${payloadType} payload: ${payload}`);
          
          webControlLogger.logBridge(
            'info',
            `Generated ${payloadType} payload`,
            operationId,
            undefined,
            { payloadType, payloadLength: payload.length }
          );

          // Create signature with biometric authentication
          logInfo(
            'validate',
            'Requesting biometric authentication for signature creation...',
          );
          webControlLogger.logBridge('info', 'Creating biometric signature...', operationId);
          
          const signatureResult = await biometricService.createSignature({
            promptMessage: 'Authenticate to create signature for validation',
            payload,
            cancelButtonText: 'Cancel Validation',
          });

          if (!signatureResult.success) {
            const error = new Error(`Signature creation failed: ${signatureResult.message}`);
            webControlLogger.logError('bridge', error, 'Signature creation', operationId);
            throw error;
          }

          const signature = signatureResult.data.signature;
          logSuccess(
            'validate',
            `Signature created successfully. Length: ${signature.length} characters`,
          );
          
          webControlLogger.logBridge(
            'info',
            'Signature created successfully',
            operationId,
            undefined,
            { signatureLength: signature.length }
          );

          // Send signature to backend for validation if endpoint is configured
          if (validateEndpoint.url) {
            logInfo(
              'validate',
              `Sending signature to validation endpoint: ${validateEndpoint.url}`,
            );
            
            webControlLogger.logNetwork(
              'info',
              'Sending validation request to backend',
              validateEndpoint.url,
              { method: validateEndpoint.method }
            );

            const validationResult = await networkResilience.executeWithRetry(
              () => biometricAPIService.validateSignature(validateEndpoint, signature, payload),
              'Backend validation',
              3
            );

            if (!validationResult.success) {
              const error = new Error(`Backend validation failed: ${validationResult.message}`);
              webControlLogger.logError('bridge', error, 'Backend validation', operationId, {
                endpoint: validateEndpoint.url,
              });
              throw error;
            }

            logSuccess(
              'validate',
              'Signature successfully validated by backend server',
            );
            
            webControlLogger.logNetwork(
              'info',
              'Validation request completed successfully',
              validateEndpoint.url,
              { responseData: validationResult.data }
            );

            const result = {
              signature,
              payload,
              backendResponse: validationResult.data,
              endpoint: validateEndpoint.url,
              method: validateEndpoint.method,
              validationTimestamp: new Date().toISOString(),
            };
            
            webControlLogger.logOperationComplete('bridge', 'validation', operationId, true, startTime, result);
            await webControlStateManager.completeOperation(operationId, true, result);
            
            return result;
          } else {
            logInfo(
              'validate',
              'No validation endpoint configured - signature created locally only',
            );

            const result = {
              signature,
              payload,
              localOnly: true,
              validationTimestamp: new Date().toISOString(),
            };
            
            webControlLogger.logOperationComplete('bridge', 'validation', operationId, true, startTime, result);
            await webControlStateManager.completeOperation(operationId, true, result);
            
            return result;
          }
        },
        'Validation completed successfully',
      );
    } catch (error) {
      webControlLogger.logOperationComplete('bridge', 'validation', operationId, false, startTime, { error });
      await webControlStateManager.completeOperation(operationId, false, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
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
          onPress: () => {
            webControlLogger.logBridge('info', 'Key deletion cancelled by user');
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const operationId = webControlStateManager.startOperation('delete-keys');
            const startTime = Date.now();
            
            webControlLogger.logOperationStart('bridge', 'key deletion', operationId, {
              keysExist,
            });

            try {
              await executeWithLogging(
                'delete',
                'Deleting biometric keys...',
                async () => {
                  webControlLogger.logBridge('info', 'Deleting biometric keys...', operationId);
                  
                  const deleteResult = await biometricService.deleteKeys();
                  if (!deleteResult.success) {
                    const error = new Error(deleteResult.message);
                    webControlLogger.logError('bridge', error, 'Key deletion', operationId);
                    throw error;
                  }

                  // Update keys exist status
                  setKeysExist(false);
                  
                  webControlLogger.logBridge(
                    'info',
                    'Biometric keys deleted successfully',
                    operationId,
                    undefined,
                    { keysExistUpdated: false }
                  );

                  const result = deleteResult.data;
                  webControlLogger.logOperationComplete('bridge', 'key deletion', operationId, true, startTime, result);
                  await webControlStateManager.completeOperation(operationId, true, result);
                  
                  return result;
                },
                'Biometric keys deleted successfully',
              );
            } catch (error) {
              webControlLogger.logOperationComplete('bridge', 'key deletion', operationId, false, startTime, { error });
              await webControlStateManager.completeOperation(operationId, false, { error: error instanceof Error ? error.message : String(error) });
              throw error;
            }
          },
        },
      ],
    );
  }, [executeWithLogging, keysExist]);

  // Component lifecycle management - initialize on app load
  useEffect(() => {
    let webControlCleanup: (() => void) | undefined;

    const initialize = async () => {
      try {
        webControlLogger.logState('info', 'Starting application initialization...');
        
        // Initialize web control first
        webControlCleanup = await initializeWebControl();
        
        // Then initialize other components
        await loadEndpointConfiguration();
        await initializeBiometrics();
        
        webControlLogger.logState('info', 'Application initialization completed successfully');
      } catch (error) {
        webControlLogger.logError('state', error, 'Application initialization');
        setWebControlError('Failed to initialize application. Some features may not work correctly.');
      }
    };

    initialize();

    // Cleanup function
    return () => {
      if (webControlCleanup) {
        webControlCleanup();
      }
      
      // Shutdown web control state manager
      webControlStateManager.shutdown().catch(error => {
        webControlLogger.logError('state', error, 'Application shutdown');
      });
      
      webControlLogger.logState('info', 'Application cleanup completed');
    };
  }, [loadEndpointConfiguration, initializeBiometrics, initializeWebControl]);

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

        {webControlError && (
          <AnimatedView
            style={[
              styles.errorContainer,
              { backgroundColor: theme.colors.error + '20' }
            ]}
            lightBackgroundColor={theme.colors.error + '20'}
            darkBackgroundColor={theme.colors.error + '20'}
          >
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              Web Control Error: {webControlError}
            </Text>
          </AnimatedView>
        )}

        <BiometricStatusDisplay
          available={biometricStatus.available}
          biometryType={biometricStatus.biometryType}
          keysExist={keysExist}
          error={biometricStatus.error}
        />

        <WebControl />

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

        {__DEV__ && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => setShowDebugPanel(true)}
          >
            <Text style={styles.debugButtonText}>Debug Panel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {__DEV__ && (
        <WebControlDebugPanel
          visible={showDebugPanel}
          onClose={() => setShowDebugPanel(false)}
        />
      )}
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
    errorContainer: {
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.error + '40',
    },
    errorText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      textAlign: 'center',
      lineHeight: 20,
    },
    debugButton: {
      position: 'absolute',
      bottom: theme.spacing.md,
      right: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    debugButtonText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.bold,
    },
  });

export default App;
