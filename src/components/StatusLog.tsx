import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LogEntry, OperationResult } from '../types';
import { useTheme } from '../theme';

export interface StatusLogProps {
  logs: LogEntry[];
  currentOperation?: OperationResult;
  isLoading?: boolean;
}

const StatusLog: React.FC<StatusLogProps> = ({
  logs,
  currentOperation,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnims = useRef<Map<string, Animated.Value>>(new Map());
  const scaleAnims = useRef<Map<string, Animated.Value>>(new Map());
  const previousLogsLength = useRef(logs.length);
  const timeoutRefs = useRef<Set<number>>(new Set());

  const formatTimestamp = (timestamp: Date): string => {
    return (
      timestamp.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) +
      '.' +
      timestamp.getMilliseconds().toString().padStart(3, '0')
    );
  };

  const getStatusColor = (status: LogEntry['status']): string => {
    switch (status) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'info':
        return theme.colors.info;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: LogEntry['status']): string => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  const getStatusBorderColor = (status: LogEntry['status']): string => {
    switch (status) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'info':
        return theme.colors.info;
      default:
        return theme.colors.border;
    }
  };

  // Initialize animations for new log entries
  useEffect(() => {
    logs.forEach(log => {
      if (!fadeAnims.current.has(log.id)) {
        fadeAnims.current.set(log.id, new Animated.Value(0));
        scaleAnims.current.set(log.id, new Animated.Value(0.8));
      }
    });

    // Clean up animations for removed logs
    const currentLogIds = new Set(logs.map(log => log.id));
    fadeAnims.current.forEach((_, id) => {
      if (!currentLogIds.has(id)) {
        fadeAnims.current.delete(id);
        scaleAnims.current.delete(id);
      }
    });
  }, [logs]);

  // Animate new log entries
  useEffect(() => {
    if (logs.length > previousLogsLength.current) {
      // New logs were added, animate them in
      const newLogs = logs.slice(previousLogsLength.current);
      
      newLogs.forEach((log, index) => {
        const fadeAnim = fadeAnims.current.get(log.id);
        const scaleAnim = scaleAnims.current.get(log.id);
        
        if (fadeAnim && scaleAnim) {
          // Stagger the animations slightly for multiple new entries
          const delay = index * 100;
          
          const timeoutId = setTimeout(() => {
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
              }),
            ]).start();
            timeoutRefs.current.delete(timeoutId);
          }, delay);

          timeoutRefs.current.add(timeoutId);
        }
      });

      // Auto-scroll to show new entries (scroll to top since logs are reversed)
      const scrollTimeoutId = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        timeoutRefs.current.delete(scrollTimeoutId);
      }, 150);

      timeoutRefs.current.add(scrollTimeoutId);
    } else {
      // Existing logs, make sure they're visible using native driver
      logs.forEach(log => {
        const fadeAnim = fadeAnims.current.get(log.id);
        const scaleAnim = scaleAnims.current.get(log.id);

        if (fadeAnim && scaleAnim) {
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 0, // Immediate
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 0, // Immediate
              useNativeDriver: true,
            }),
          ]).start();
        }
      });
    }

    previousLogsLength.current = logs.length;
  }, [logs]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current.clear();
    };
  }, []);

  const renderLogEntry = (entry: LogEntry) => {
    const fadeAnim = fadeAnims.current.get(entry.id) || new Animated.Value(1);
    const scaleAnim = scaleAnims.current.get(entry.id) || new Animated.Value(1);

    return (
      <Animated.View
        key={entry.id}
        style={[
          styles.logEntry,
          {
            backgroundColor: theme.colors.surface,
            borderLeftColor: getStatusBorderColor(entry.status),
            borderColor: theme.colors.border,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logHeader}>
          <View
            style={[
              styles.statusIconContainer,
              { backgroundColor: getStatusColor(entry.status) },
            ]}
          >
            <Text style={styles.statusIcon}>{getStatusIcon(entry.status)}</Text>
          </View>
          <View style={styles.logHeaderContent}>
            <View style={styles.logHeaderTop}>
              <Text style={[styles.operation, { color: theme.colors.text }]}>
                {entry.operation.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.timestamp,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {formatTimestamp(entry.timestamp)}
              </Text>
            </View>
            <Text style={[styles.message, { color: theme.colors.text }]}>
              {entry.message}
            </Text>
          </View>
        </View>
        {entry.details && (
          <Text
            style={[
              styles.details,
              {
                color: theme.colors.textSecondary,
                backgroundColor: theme.colors.surfaceSecondary,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {typeof entry.details === 'string'
              ? entry.details
              : JSON.stringify(entry.details, null, 2)}
          </Text>
        )}
      </Animated.View>
    );
  };

  const renderCurrentOperation = () => {
    if (!currentOperation && !isLoading) return null;

    return (
      <Animated.View
        style={[
          styles.currentOperation,
          {
            backgroundColor: theme.colors.surface,
            borderLeftColor: isLoading
              ? theme.colors.info
              : currentOperation?.success
              ? theme.colors.success
              : theme.colors.error,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.currentOperationHeader}>
          {isLoading && (
            <ActivityIndicator
              size="small"
              color={theme.colors.info}
              style={styles.loadingIndicator}
            />
          )}
          <Animated.Text
            style={[styles.currentOperationTitle, { color: theme.colors.info }]}
          >
            {isLoading ? 'Operation in progress...' : 'Latest Operation'}
          </Animated.Text>
        </View>
        {currentOperation && (
          <Animated.View>
            <Text
              style={[
                styles.currentOperationMessage,
                {
                  color: currentOperation.success
                    ? getStatusColor('success')
                    : getStatusColor('error'),
                },
              ]}
            >
              {currentOperation.message}
            </Text>
            {currentOperation.data && (
              <Text
                style={[
                  styles.currentOperationData,
                  {
                    color: theme.colors.textSecondary,
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {typeof currentOperation.data === 'string'
                  ? currentOperation.data
                  : JSON.stringify(currentOperation.data, null, 2)}
              </Text>
            )}
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Status Log
      </Text>
      {renderCurrentOperation()}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {logs.length === 0 ? (
          <Text
            style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}
          >
            No operations logged yet
          </Text>
        ) : (
          logs.slice().reverse().map(renderLogEntry)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  currentOperation: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  currentOperationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingIndicator: {
    marginRight: 8,
  },
  currentOperationTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  currentOperationMessage: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 22,
  },
  currentOperationData: {
    fontSize: 12,
    fontFamily: 'monospace',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    lineHeight: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  logEntry: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logHeaderContent: {
    flex: 1,
  },
  logHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  operation: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  details: {
    fontSize: 12,
    marginTop: 12,
    fontFamily: 'monospace',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    lineHeight: 16,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 32,
    lineHeight: 24,
  },
});

export default StatusLog;
