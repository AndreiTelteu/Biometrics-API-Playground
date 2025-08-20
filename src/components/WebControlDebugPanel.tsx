/**
 * WebControlDebugPanel - Debug panel for web control operations
 * Shows logs, performance metrics, and system status for development
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { useTheme } from '../theme';
import { webControlLogger } from '../utils/WebControlLogger';
import { webControlStateManager } from '../services/WebControlStateManager';
import type { WebControlLogEntry } from '../utils/WebControlLogger';

interface WebControlDebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export const WebControlDebugPanel: React.FC<WebControlDebugPanelProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<WebControlLogEntry[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load logs and metrics
  const refreshData = useCallback(() => {
    const allLogs = webControlLogger.getLogs();
    const filteredLogs = selectedComponent === 'all' 
      ? allLogs 
      : allLogs.filter(log => log.component === selectedComponent);
    
    setLogs(filteredLogs.slice(-50)); // Show last 50 logs
    setPerformanceMetrics(webControlLogger.getPerformanceMetrics());
    setRefreshKey(prev => prev + 1);
  }, [selectedComponent]);

  // Auto-refresh data
  useEffect(() => {
    if (!visible) return;

    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [visible, refreshData]);

  // Setup log listener
  useEffect(() => {
    if (!visible) return;

    const removeListener = webControlLogger.addLogListener(() => {
      refreshData();
    });

    return removeListener;
  }, [visible, refreshData]);

  const handleExportLogs = async () => {
    try {
      const exportData = webControlLogger.exportLogs();
      await Share.share({
        message: exportData,
        title: 'Web Control Debug Logs',
      });
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export logs');
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all debug logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            webControlLogger.clearLogs();
            refreshData();
          },
        },
      ]
    );
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return theme.colors.error;
      case 'warn':
        return theme.colors.warning;
      case 'debug':
        return theme.colors.text + '60';
      default:
        return theme.colors.text;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  const components = ['all', 'server', 'websocket', 'bridge', 'state', 'auth', 'network'];

  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Web Control Debug Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {components.map(component => (
              <TouchableOpacity
                key={component}
                style={[
                  styles.filterButton,
                  selectedComponent === component && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedComponent(component)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedComponent === component && styles.filterButtonTextActive,
                  ]}
                >
                  {component}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={refreshData} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportLogs} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearLogs} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {performanceMetrics && (
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>Performance Metrics</Text>
            <View style={styles.metricsRow}>
              <Text style={styles.metricsLabel}>Total Operations:</Text>
              <Text style={styles.metricsValue}>
                {performanceMetrics.overall?.totalOperations || 0}
              </Text>
            </View>
            <View style={styles.metricsRow}>
              <Text style={styles.metricsLabel}>Avg Duration:</Text>
              <Text style={styles.metricsValue}>
                {performanceMetrics.overall?.avgDuration || 0}ms
              </Text>
            </View>
            <View style={styles.metricsRow}>
              <Text style={styles.metricsLabel}>Slow Operations:</Text>
              <Text style={styles.metricsValue}>
                {performanceMetrics.slowOperations?.length || 0}
              </Text>
            </View>
          </View>
        )}

        <ScrollView style={styles.logsContainer}>
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No logs available</Text>
            </View>
          ) : (
            logs.map((log, index) => (
              <View key={`${log.timestamp}-${index}`} style={styles.logEntry}>
                <View style={styles.logHeader}>
                  <Text style={[styles.logLevel, { color: getLogLevelColor(log.level) }]}>
                    {log.level.toUpperCase()}
                  </Text>
                  <Text style={styles.logComponent}>{log.component}</Text>
                  <Text style={styles.logTimestamp}>
                    {formatTimestamp(log.timestamp)}
                  </Text>
                </View>
                <Text style={styles.logMessage}>{log.message}</Text>
                {log.operationId && (
                  <Text style={styles.logOperationId}>Op: {log.operationId}</Text>
                )}
                {log.endpoint && (
                  <Text style={styles.logEndpoint}>Endpoint: {log.endpoint}</Text>
                )}
                {log.duration && (
                  <Text style={styles.logDuration}>Duration: {log.duration}ms</Text>
                )}
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <Text style={styles.logMetadata}>
                    {JSON.stringify(log.metadata, null, 2)}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    },
    closeButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
    },
    closeButtonText: {
      color: '#FFFFFF',
      fontWeight: theme.typography.weights.medium,
    },
    controls: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginRight: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterButtonText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      textTransform: 'capitalize',
    },
    filterButtonTextActive: {
      color: '#FFFFFF',
      fontWeight: theme.typography.weights.medium,
    },
    actions: {
      flexDirection: 'row',
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    actionButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginRight: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionButtonText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
    },
    metricsContainer: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    metricsTitle: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    metricsLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
    },
    metricsValue: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
    },
    logsContainer: {
      flex: 1,
      padding: theme.spacing.sm,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    emptyStateText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.text,
      opacity: 0.6,
    },
    logEntry: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    logHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    logLevel: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.bold,
      marginRight: theme.spacing.sm,
      minWidth: 50,
    },
    logComponent: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      opacity: 0.7,
      marginRight: theme.spacing.sm,
      textTransform: 'uppercase',
    },
    logTimestamp: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      opacity: 0.5,
      marginLeft: 'auto',
    },
    logMessage: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    logOperationId: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      opacity: 0.6,
      fontFamily: 'monospace',
    },
    logEndpoint: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      opacity: 0.6,
      fontFamily: 'monospace',
    },
    logDuration: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.warning,
      fontWeight: theme.typography.weights.medium,
    },
    logMetadata: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      opacity: 0.5,
      fontFamily: 'monospace',
      marginTop: theme.spacing.xs,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.xs,
    },
  });