/**
 * WebControl Component
 * Provides UI controls for starting/stopping the web server and displaying server status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';
import { webServerService } from '../services';
import { webControlStateManager } from '../services/WebControlStateManager';
import { configurationPersistence } from '../services/ConfigurationPersistence';
import { errorHandler, networkResilience } from '../utils';
import type { ServerStatus } from '../types';

interface WebControlProps {
  onServerStatusChange?: (status: ServerStatus) => void;
}

export const WebControl: React.FC<WebControlProps> = ({
  onServerStatusChange,
}) => {
  const { theme } = useTheme();
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    isRunning: false,
    port: null,
    url: null,
    password: null,
    startTime: null,
    activeConnections: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<{
    isConnected: boolean;
    lastError?: string;
  }>({ isConnected: true });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update server status
  const updateServerStatus = useCallback(() => {
    const status = webServerService.getServerStatus();
    setServerStatus(status);
    onServerStatusChange?.(status);
  }, [onServerStatusChange]);

  // Initialize server status and error handling on mount
  useEffect(() => {
    const initializeWebControl = async () => {
      try {
        // Initialize state management
        await webControlStateManager.initialize();
        
        // Setup state change listener
        const removeStateListener = webControlStateManager.addStateChangeListener({
          onStateChanged: (state) => {
            setServerStatus(state.server.status);
            onServerStatusChange?.(state.server.status);
          },
          onOperationStatusChanged: (operation) => {
            // Handle operation status changes if needed
          },
          onConfigurationChanged: (change) => {
            // Handle configuration changes if needed
          },
          onConnectionChanged: (connections) => {
            // Update active connections count
            const status = webServerService.getServerStatus();
            status.activeConnections = connections.size;
            setServerStatus(status);
          },
        });

        updateServerStatus();
        setupErrorHandling();
        setupNetworkMonitoring();

        return () => {
          removeStateListener();
        };
      } catch (error) {
        console.error('Failed to initialize WebControl:', error);
        setErrorMessage('Failed to initialize web control system');
      }
    };

    initializeWebControl();
  }, [updateServerStatus, onServerStatusChange]);

  // Setup error handling
  const setupErrorHandling = useCallback(() => {
    const removeErrorListener = errorHandler.addErrorListener((error) => {
      if (error.code.startsWith('SERVER_') || error.code.startsWith('WEBSOCKET_')) {
        setErrorMessage(error.userMessage || error.message);
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          setErrorMessage(null);
        }, 5000);
      }
    });

    return removeErrorListener;
  }, []);

  // Setup network monitoring
  const setupNetworkMonitoring = useCallback(() => {
    const removeNetworkListener = networkResilience.addConnectionListener({
      onConnected: () => {
        setNetworkStatus({ isConnected: true });
      },
      onDisconnected: (error) => {
        setNetworkStatus({ 
          isConnected: false, 
          lastError: error?.userMessage || error?.message 
        });
      },
      onReconnected: () => {
        setNetworkStatus({ isConnected: true });
      },
    });

    return removeNetworkListener;
  }, []);

  // Handle server start
  const handleStartServer = useCallback(async () => {
    if (isLoading || serverStatus.isRunning) return;

    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Get server settings from persistence
      const serverSettings = await configurationPersistence.getServerSettings();
      
      const serverInfo = await webServerService.startServer(serverSettings.preferredPort);
      
      // Update server settings with actual port used
      await webControlStateManager.updateServerSettings({
        ...serverSettings,
        preferredPort: serverInfo.port,
      });
      
      updateServerStatus();
      
      Alert.alert(
        'Web Server Started',
        `Server is now running and accessible at:\n${serverInfo.url}\n\nUsername: admin\nPassword: ${serverInfo.password}\n\nConfiguration is automatically synchronized between web and mobile interfaces.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(errorMsg);
      
      Alert.alert(
        'Server Start Failed',
        `Failed to start web server:\n\n${errorMsg}`,
        [
          { text: 'OK' },
          {
            text: 'Retry',
            onPress: () => {
              setTimeout(() => handleStartServer(), 1000);
            },
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, serverStatus.isRunning, updateServerStatus]);

  // Handle server stop
  const handleStopServer = useCallback(async () => {
    if (isLoading || !serverStatus.isRunning) return;

    Alert.alert(
      'Stop Web Server',
      'Are you sure you want to stop the web server? This will disconnect all active sessions.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Stop Server',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            setErrorMessage(null);
            
            try {
              await webServerService.stopServer();
              updateServerStatus();
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              setErrorMessage(errorMsg);
              
              Alert.alert(
                'Server Stop Failed',
                `Failed to stop web server:\n\n${errorMsg}`,
                [
                  { text: 'OK' },
                  {
                    text: 'Force Stop',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        // Force cleanup by destroying the service
                        await (webServerService as any).destroy?.();
                        updateServerStatus();
                      } catch (forceError) {
                        console.error('Force stop error:', forceError);
                      }
                    },
                  },
                ]
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [isLoading, serverStatus.isRunning, updateServerStatus]);

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Web Control</Text>
        <View style={styles.statusContainer}>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: serverStatus.isRunning
                    ? theme.colors.success
                    : theme.colors.error,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {serverStatus.isRunning ? 'Running' : 'Stopped'}
            </Text>
          </View>
          {serverStatus.isRunning && (
            <View style={styles.networkIndicator}>
              <View
                style={[
                  styles.networkDot,
                  {
                    backgroundColor: networkStatus.isConnected
                      ? theme.colors.success
                      : theme.colors.warning,
                  },
                ]}
              />
              <Text style={styles.networkText}>
                {networkStatus.isConnected ? 'Connected' : 'Network Issue'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {errorMessage && (
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {!networkStatus.isConnected && networkStatus.lastError && (
        <View style={[styles.warningContainer, { backgroundColor: theme.colors.warning + '20' }]}>
          <Text style={[styles.warningText, { color: theme.colors.warning }]}>
            Network: {networkStatus.lastError}
          </Text>
        </View>
      )}

      {serverStatus.isRunning && (
        <View style={styles.serverInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>URL:</Text>
            <Text style={styles.infoValue}>{serverStatus.url}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Port:</Text>
            <Text style={styles.infoValue}>{serverStatus.port}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Password:</Text>
            <Text style={[styles.infoValue, styles.password]}>
              {serverStatus.password}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Active Connections:</Text>
            <Text style={styles.infoValue}>{serverStatus.activeConnections}</Text>
          </View>
          {serverStatus.startTime && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Started:</Text>
              <Text style={styles.infoValue}>
                {serverStatus.startTime.toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          serverStatus.isRunning ? styles.stopButton : styles.startButton,
          isLoading && styles.buttonDisabled,
        ]}
        onPress={serverStatus.isRunning ? handleStopServer : handleStartServer}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
            style={styles.loadingIndicator}
          />
        ) : null}
        <Text style={styles.buttonText}>
          {isLoading
            ? serverStatus.isRunning
              ? 'Stopping...'
              : 'Starting...'
            : serverStatus.isRunning
            ? 'Stop Web Server'
            : 'Start Web Server'}
        </Text>
      </TouchableOpacity>

      {!serverStatus.isRunning && (
        <Text style={styles.description}>
          Start the web server to control this app remotely through a desktop browser.
          The server will be accessible from any device on your local network.
        </Text>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    },
    statusContainer: {
      alignItems: 'flex-end',
    },
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: theme.spacing.sm,
    },
    statusText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
    },
    networkIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    networkDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: theme.spacing.xs,
    },
    networkText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      opacity: 0.7,
    },
    errorContainer: {
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.error + '40',
    },
    errorText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      textAlign: 'center',
    },
    warningContainer: {
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.warning + '40',
    },
    warningText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      textAlign: 'center',
    },
    serverInfo: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    infoLabel: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
      flex: 1,
    },
    infoValue: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.text,
      flex: 2,
      textAlign: 'right',
    },
    password: {
      fontFamily: 'monospace',
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.primary,
    },
    button: {
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    startButton: {
      backgroundColor: theme.colors.primary,
    },
    stopButton: {
      backgroundColor: theme.colors.error,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.bold,
    },
    loadingIndicator: {
      marginRight: theme.spacing.sm,
    },
    description: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: 20,
      opacity: 0.7,
    },
  });