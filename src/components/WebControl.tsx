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

  // Update server status
  const updateServerStatus = useCallback(() => {
    const status = webServerService.getServerStatus();
    setServerStatus(status);
    onServerStatusChange?.(status);
  }, [onServerStatusChange]);

  // Initialize server status on mount
  useEffect(() => {
    updateServerStatus();
  }, [updateServerStatus]);

  // Handle server start
  const handleStartServer = useCallback(async () => {
    if (isLoading || serverStatus.isRunning) return;

    setIsLoading(true);
    try {
      const serverInfo = await webServerService.startServer();
      updateServerStatus();
      
      Alert.alert(
        'Web Server Started',
        `Server is now running and accessible at:\n${serverInfo.url}\n\nUsername: admin\nPassword: ${serverInfo.password}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Server Start Failed',
        `Failed to start web server: ${error}`,
        [{ text: 'OK' }]
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
            try {
              await webServerService.stopServer();
              updateServerStatus();
            } catch (error) {
              Alert.alert(
                'Server Stop Failed',
                `Failed to stop web server: ${error}`,
                [{ text: 'OK' }]
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
      </View>

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
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
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