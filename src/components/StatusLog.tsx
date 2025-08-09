import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LogEntry, OperationResult } from '../types';

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
  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + timestamp.getMilliseconds().toString().padStart(3, '0');
  };

  const getStatusColor = (status: LogEntry['status']): string => {
    switch (status) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'info':
        return '#2196F3';
      default:
        return '#757575';
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

  const renderLogEntry = (entry: LogEntry) => (
    <View key={entry.id} style={styles.logEntry}>
      <View style={styles.logHeader}>
        <Text
          style={[styles.statusIcon, { color: getStatusColor(entry.status) }]}
        >
          {getStatusIcon(entry.status)}
        </Text>
        <Text style={styles.timestamp}>{formatTimestamp(entry.timestamp)}</Text>
        <Text style={styles.operation}>{entry.operation.toUpperCase()}</Text>
      </View>
      <Text style={styles.message}>{entry.message}</Text>
      {entry.details && (
        <Text style={styles.details}>
          {typeof entry.details === 'string'
            ? entry.details
            : JSON.stringify(entry.details, null, 2)}
        </Text>
      )}
    </View>
  );

  const renderCurrentOperation = () => {
    if (!currentOperation && !isLoading) return null;

    return (
      <View style={styles.currentOperation}>
        <View style={styles.currentOperationHeader}>
          {isLoading && (
            <ActivityIndicator
              size="small"
              color="#2196F3"
              style={styles.loadingIndicator}
            />
          )}
          <Text style={styles.currentOperationTitle}>
            {isLoading ? 'Operation in progress...' : 'Latest Operation'}
          </Text>
        </View>
        {currentOperation && (
          <>
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
              <Text style={styles.currentOperationData}>
                {typeof currentOperation.data === 'string'
                  ? currentOperation.data
                  : JSON.stringify(currentOperation.data, null, 2)}
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status Log</Text>
      {renderCurrentOperation()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {logs.length === 0 ? (
          <Text style={styles.emptyMessage}>No operations logged yet</Text>
        ) : (
          logs
            .slice()
            .reverse()
            .map(renderLogEntry)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  currentOperation: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  currentOperationMessage: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  currentOperationData: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
    maxHeight: 300,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  logEntry: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginRight: 12,
  },
  operation: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  message: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  details: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontFamily: 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
});

export default StatusLog;