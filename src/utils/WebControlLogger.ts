/**
 * WebControlLogger - Specialized logging for web control operations
 * Provides detailed logging, debugging, and monitoring for web control features
 */

import { errorHandler } from './ErrorHandler';
import { LogEntry } from '../types';

export interface WebControlLogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  type: string;
  component: 'server' | 'websocket' | 'bridge' | 'state' | 'auth' | 'network';
  operationId?: string;
  clientId?: string;
  endpoint?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface WebControlLoggerConfig {
  enableDebugLogs: boolean;
  enablePerformanceLogs: boolean;
  enableNetworkLogs: boolean;
  maxLogEntries: number;
  logToConsole: boolean;
  logToFile: boolean;
}

export class WebControlLogger {
  private static instance: WebControlLogger;
  private logs: WebControlLogEntry[] = [];
  private logListeners: Set<(log: WebControlLogEntry) => void> = new Set();
  private config: WebControlLoggerConfig = {
    enableDebugLogs: __DEV__,
    enablePerformanceLogs: true,
    enableNetworkLogs: true,
    maxLogEntries: 1000,
    logToConsole: __DEV__,
    logToFile: false,
  };

  static getInstance(): WebControlLogger {
    if (!WebControlLogger.instance) {
      WebControlLogger.instance = new WebControlLogger();
    }
    return WebControlLogger.instance;
  }

  /**
   * Configure logger settings
   */
  configure(config: Partial<WebControlLoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log server-related events
   */
  logServer(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      level,
      message,
      component: 'server',
      metadata,
    });
  }

  /**
   * Log WebSocket-related events
   */
  logWebSocket(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    clientId?: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      level,
      message,
      component: 'websocket',
      clientId,
      metadata,
    });
  }

  /**
   * Log bridge operation events
   */
  logBridge(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    operationId?: string,
    endpoint?: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      level,
      message,
      component: 'bridge',
      operationId,
      endpoint,
      metadata,
    });
  }

  /**
   * Log state management events
   */
  logState(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      level,
      message,
      component: 'state',
      metadata,
    });
  }

  /**
   * Log authentication events
   */
  logAuth(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    clientId?: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      level,
      message,
      component: 'auth',
      clientId,
      metadata,
    });
  }

  /**
   * Log network events
   */
  logNetwork(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    endpoint?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enableNetworkLogs && level === 'debug') {
      return;
    }

    this.log({
      level,
      message,
      component: 'network',
      endpoint,
      metadata,
    });
  }

  /**
   * Log operation start with performance tracking
   */
  logOperationStart(
    component: WebControlLogEntry['component'],
    operation: string,
    operationId: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      level: 'info',
      message: `Starting ${operation}`,
      component,
      operationId,
      metadata: {
        ...metadata,
        startTime: Date.now(),
      },
    });
  }

  /**
   * Log operation completion with performance metrics
   */
  logOperationComplete(
    component: WebControlLogEntry['component'],
    operation: string,
    operationId: string,
    success: boolean,
    startTime: number,
    metadata?: Record<string, any>
  ): void {
    const duration = Date.now() - startTime;
    
    this.log({
      level: success ? 'info' : 'error',
      message: `${success ? 'Completed' : 'Failed'} ${operation}`,
      component,
      operationId,
      duration,
      metadata: {
        ...metadata,
        success,
        performanceMetrics: {
          duration,
          timestamp: new Date().toISOString(),
        },
      },
    });

    if (this.config.enablePerformanceLogs && duration > 1000) {
      this.log({
        level: 'warn',
        message: `Slow operation detected: ${operation} took ${duration}ms`,
        component,
        operationId,
        duration,
        metadata: { performanceWarning: true },
      });
    }
  }

  /**
   * Log error with context
   */
  logError(
    component: WebControlLogEntry['component'],
    error: any,
    context: string,
    operationId?: string,
    metadata?: Record<string, any>
  ): void {
    const errorDetails = errorHandler.handleApplicationError(error, context);
    
    this.log({
      level: 'error',
      message: `Error in ${context}: ${errorDetails.message}`,
      component,
      operationId,
      metadata: {
        ...metadata,
        errorCode: errorDetails.code,
        recoverable: errorDetails.recoverable,
        originalError: __DEV__ ? error : undefined,
        stack: __DEV__ ? error?.stack : undefined,
      },
    });
  }

  /**
   * Log debug information
   */
  logDebug(
    component: WebControlLogEntry['component'],
    message: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enableDebugLogs) {
      return;
    }

    this.log({
      level: 'debug',
      message,
      component,
      metadata,
    });
  }

  /**
   * Get all logs
   */
  getLogs(): WebControlLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by component
   */
  getLogsByComponent(component: WebControlLogEntry['component']): WebControlLogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * Get logs by operation ID
   */
  getLogsByOperation(operationId: string): WebControlLogEntry[] {
    return this.logs.filter(log => log.operationId === operationId);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: 'info' | 'warn' | 'error' | 'debug'): WebControlLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.notifyLogListeners({
      level: 'info',
      message: 'Logs cleared',
      component: 'state',
      timestamp: new Date(),
      type: 'web-control',
    });
  }

  /**
   * Add log listener
   */
  addLogListener(listener: (log: WebControlLogEntry) => void): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      logs: this.logs,
      summary: {
        totalLogs: this.logs.length,
        errorCount: this.logs.filter(l => l.level === 'error').length,
        warningCount: this.logs.filter(l => l.level === 'warn').length,
        components: [...new Set(this.logs.map(l => l.component))],
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Record<string, any> {
    const operationLogs = this.logs.filter(log => log.duration !== undefined);
    
    if (operationLogs.length === 0) {
      return { message: 'No performance data available' };
    }

    const durations = operationLogs.map(log => log.duration!);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    const componentMetrics = operationLogs.reduce((acc, log) => {
      if (!acc[log.component]) {
        acc[log.component] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      acc[log.component].count++;
      acc[log.component].totalDuration += log.duration!;
      acc[log.component].avgDuration = acc[log.component].totalDuration / acc[log.component].count;
      return acc;
    }, {} as Record<string, any>);

    return {
      overall: {
        totalOperations: operationLogs.length,
        avgDuration: Math.round(avgDuration),
        maxDuration,
        minDuration,
      },
      byComponent: componentMetrics,
      slowOperations: operationLogs
        .filter(log => log.duration! > 2000)
        .map(log => ({
          component: log.component,
          message: log.message,
          duration: log.duration,
          operationId: log.operationId,
        })),
    };
  }

  /**
   * Private method to log entry
   */
  private log(entry: Partial<WebControlLogEntry>): void {
    const logEntry: WebControlLogEntry = {
      level: entry.level || 'info',
      message: entry.message || '',
      timestamp: new Date(),
      type: 'web-control',
      component: entry.component || 'state',
      operationId: entry.operationId,
      clientId: entry.clientId,
      endpoint: entry.endpoint,
      duration: entry.duration,
      metadata: entry.metadata,
    };

    // Add to logs array
    this.logs.push(logEntry);

    // Limit log entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs.splice(0, this.logs.length - this.config.maxLogEntries);
    }

    // Console logging
    if (this.config.logToConsole) {
      this.logToConsole(logEntry);
    }

    // Notify listeners
    this.notifyLogListeners(logEntry);
  }

  /**
   * Private method to log to console
   */
  private logToConsole(entry: WebControlLogEntry): void {
    const prefix = `[WebControl:${entry.component}]`;
    const message = `${prefix} ${entry.message}`;
    
    switch (entry.level) {
      case 'error':
        console.error(message, entry.metadata);
        break;
      case 'warn':
        console.warn(message, entry.metadata);
        break;
      case 'debug':
        console.debug(message, entry.metadata);
        break;
      default:
        console.log(message, entry.metadata);
        break;
    }
  }

  /**
   * Private method to notify log listeners
   */
  private notifyLogListeners(entry: WebControlLogEntry): void {
    this.logListeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  }
}

// Export singleton instance
export const webControlLogger = WebControlLogger.getInstance();