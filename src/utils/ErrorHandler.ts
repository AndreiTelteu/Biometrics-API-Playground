/**
 * ErrorHandler - Comprehensive error handling utilities for web control
 * Provides standardized error handling, logging, and user-friendly error messages
 */

export interface ErrorDetails {
  code: string;
  message: string;
  originalError?: any;
  timestamp: Date;
  context?: string;
  recoverable?: boolean;
  userMessage?: string;
}

export interface NetworkErrorDetails extends ErrorDetails {
  statusCode?: number;
  endpoint?: string;
  retryable?: boolean;
}

export interface ServerErrorDetails extends ErrorDetails {
  port?: number;
  operation?: string;
  serverState?: any;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Set<(error: ErrorDetails) => void> = new Set();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle server-related errors
   */
  handleServerError(error: any, context: string, port?: number): ServerErrorDetails {
    const errorDetails: ServerErrorDetails = {
      code: this.getServerErrorCode(error),
      message: this.extractErrorMessage(error),
      originalError: error,
      timestamp: new Date(),
      context,
      port,
      recoverable: this.isServerErrorRecoverable(error),
      userMessage: this.getServerUserMessage(error, context),
    };

    this.notifyErrorListeners(errorDetails);
    this.logError(errorDetails);

    return errorDetails;
  }

  /**
   * Handle network-related errors
   */
  handleNetworkError(error: any, context: string, endpoint?: string): NetworkErrorDetails {
    const errorDetails: NetworkErrorDetails = {
      code: this.getNetworkErrorCode(error),
      message: this.extractErrorMessage(error),
      originalError: error,
      timestamp: new Date(),
      context,
      endpoint,
      statusCode: this.extractStatusCode(error),
      retryable: this.isNetworkErrorRetryable(error),
      recoverable: true,
      userMessage: this.getNetworkUserMessage(error, context),
    };

    this.notifyErrorListeners(errorDetails);
    this.logError(errorDetails);

    return errorDetails;
  }

  /**
   * Handle WebSocket-related errors
   */
  handleWebSocketError(error: any, context: string, connectionId?: string): ErrorDetails {
    const errorDetails: ErrorDetails = {
      code: this.getWebSocketErrorCode(error),
      message: this.extractErrorMessage(error),
      originalError: error,
      timestamp: new Date(),
      context: `WebSocket ${context}${connectionId ? ` (${connectionId})` : ''}`,
      recoverable: this.isWebSocketErrorRecoverable(error),
      userMessage: this.getWebSocketUserMessage(error, context),
    };

    this.notifyErrorListeners(errorDetails);
    this.logError(errorDetails);

    return errorDetails;
  }

  /**
   * Handle general application errors
   */
  handleApplicationError(error: any, context: string): ErrorDetails {
    const errorDetails: ErrorDetails = {
      code: this.getApplicationErrorCode(error),
      message: this.extractErrorMessage(error),
      originalError: error,
      timestamp: new Date(),
      context,
      recoverable: this.isApplicationErrorRecoverable(error),
      userMessage: this.getApplicationUserMessage(error, context),
    };

    this.notifyErrorListeners(errorDetails);
    this.logError(errorDetails);

    return errorDetails;
  }

  /**
   * Add error listener
   */
  addErrorListener(listener: (error: ErrorDetails) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Create standardized error response
   */
  createErrorResponse(error: ErrorDetails, requestId?: string): any {
    return {
      success: false,
      error: error.userMessage || error.message,
      code: error.code,
      timestamp: error.timestamp.toISOString(),
      requestId,
      recoverable: error.recoverable,
      details: __DEV__ ? {
        originalMessage: error.message,
        context: error.context,
        stack: error.originalError?.stack,
      } : undefined,
    };
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.error) {
      return this.extractErrorMessage(error.error);
    }

    return 'Unknown error occurred';
  }

  /**
   * Extract HTTP status code from error
   */
  private extractStatusCode(error: any): number | undefined {
    if (error?.status) return error.status;
    if (error?.statusCode) return error.statusCode;
    if (error?.response?.status) return error.response.status;
    return undefined;
  }

  /**
   * Get server error code
   */
  private getServerErrorCode(error: any): string {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('port') && message.includes('use')) {
      return 'SERVER_PORT_IN_USE';
    }
    if (message.includes('permission') || message.includes('denied')) {
      return 'SERVER_PERMISSION_DENIED';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'SERVER_NETWORK_ERROR';
    }
    if (message.includes('timeout')) {
      return 'SERVER_TIMEOUT';
    }
    if (message.includes('already running')) {
      return 'SERVER_ALREADY_RUNNING';
    }
    
    return 'SERVER_UNKNOWN_ERROR';
  }

  /**
   * Get network error code
   */
  private getNetworkErrorCode(error: any): string {
    const statusCode = this.extractStatusCode(error);
    
    if (statusCode) {
      if (statusCode >= 400 && statusCode < 500) {
        return `NETWORK_CLIENT_ERROR_${statusCode}`;
      }
      if (statusCode >= 500) {
        return `NETWORK_SERVER_ERROR_${statusCode}`;
      }
    }

    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('timeout')) {
      return 'NETWORK_TIMEOUT';
    }
    if (message.includes('connection') && message.includes('refused')) {
      return 'NETWORK_CONNECTION_REFUSED';
    }
    if (message.includes('network') && message.includes('unreachable')) {
      return 'NETWORK_UNREACHABLE';
    }
    if (message.includes('dns') || message.includes('resolve')) {
      return 'NETWORK_DNS_ERROR';
    }
    
    return 'NETWORK_UNKNOWN_ERROR';
  }

  /**
   * Get WebSocket error code
   */
  private getWebSocketErrorCode(error: any): string {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('connection') && message.includes('closed')) {
      return 'WEBSOCKET_CONNECTION_CLOSED';
    }
    if (message.includes('handshake')) {
      return 'WEBSOCKET_HANDSHAKE_FAILED';
    }
    if (message.includes('upgrade')) {
      return 'WEBSOCKET_UPGRADE_FAILED';
    }
    if (message.includes('timeout')) {
      return 'WEBSOCKET_TIMEOUT';
    }
    
    return 'WEBSOCKET_UNKNOWN_ERROR';
  }

  /**
   * Get application error code
   */
  private getApplicationErrorCode(error: any): string {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('biometric')) {
      return 'APP_BIOMETRIC_ERROR';
    }
    if (message.includes('configuration')) {
      return 'APP_CONFIGURATION_ERROR';
    }
    if (message.includes('state')) {
      return 'APP_STATE_ERROR';
    }
    
    return 'APP_UNKNOWN_ERROR';
  }

  /**
   * Check if server error is recoverable
   */
  private isServerErrorRecoverable(error: any): boolean {
    const code = this.getServerErrorCode(error);
    
    // These errors can be recovered from by retrying or changing configuration
    const recoverableErrors = [
      'SERVER_PORT_IN_USE',
      'SERVER_NETWORK_ERROR',
      'SERVER_TIMEOUT',
    ];
    
    return recoverableErrors.includes(code);
  }

  /**
   * Check if network error is retryable
   */
  private isNetworkErrorRetryable(error: any): boolean {
    const statusCode = this.extractStatusCode(error);
    
    // 5xx errors and timeouts are generally retryable
    if (statusCode && statusCode >= 500) {
      return true;
    }
    
    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('timeout') || message.includes('connection');
  }

  /**
   * Check if WebSocket error is recoverable
   */
  private isWebSocketErrorRecoverable(error: any): boolean {
    const code = this.getWebSocketErrorCode(error);
    
    // Most WebSocket errors are recoverable by reconnecting
    const nonRecoverableErrors = ['WEBSOCKET_HANDSHAKE_FAILED'];
    
    return !nonRecoverableErrors.includes(code);
  }

  /**
   * Check if application error is recoverable
   */
  private isApplicationErrorRecoverable(error: any): boolean {
    const code = this.getApplicationErrorCode(error);
    
    // Most application errors are recoverable
    const nonRecoverableErrors = ['APP_BIOMETRIC_ERROR'];
    
    return !nonRecoverableErrors.includes(code);
  }

  /**
   * Get user-friendly server error message
   */
  private getServerUserMessage(error: any, context: string): string {
    const code = this.getServerErrorCode(error);
    
    switch (code) {
      case 'SERVER_PORT_IN_USE':
        return 'The selected port is already in use. The server will try another port automatically.';
      case 'SERVER_PERMISSION_DENIED':
        return 'Permission denied to start the server. Please check your device settings.';
      case 'SERVER_NETWORK_ERROR':
        return 'Network error occurred while starting the server. Please check your network connection.';
      case 'SERVER_TIMEOUT':
        return 'Server startup timed out. Please try again.';
      case 'SERVER_ALREADY_RUNNING':
        return 'The web server is already running.';
      default:
        return `Failed to ${context.toLowerCase()}. Please try again.`;
    }
  }

  /**
   * Get user-friendly network error message
   */
  private getNetworkUserMessage(error: any, context: string): string {
    const statusCode = this.extractStatusCode(error);
    
    if (statusCode === 401) {
      return 'Authentication failed. Please check your credentials.';
    }
    if (statusCode === 403) {
      return 'Access denied. You do not have permission to perform this action.';
    }
    if (statusCode === 404) {
      return 'The requested resource was not found.';
    }
    if (statusCode && statusCode >= 500) {
      return 'Server error occurred. Please try again later.';
    }
    
    const code = this.getNetworkErrorCode(error);
    
    switch (code) {
      case 'NETWORK_TIMEOUT':
        return 'Request timed out. Please check your network connection and try again.';
      case 'NETWORK_CONNECTION_REFUSED':
        return 'Connection refused. The server may be unavailable.';
      case 'NETWORK_UNREACHABLE':
        return 'Network unreachable. Please check your internet connection.';
      case 'NETWORK_DNS_ERROR':
        return 'Unable to resolve server address. Please check the URL.';
      default:
        return `Network error occurred during ${context.toLowerCase()}. Please try again.`;
    }
  }

  /**
   * Get user-friendly WebSocket error message
   */
  private getWebSocketUserMessage(error: any, context: string): string {
    const code = this.getWebSocketErrorCode(error);
    
    switch (code) {
      case 'WEBSOCKET_CONNECTION_CLOSED':
        return 'Connection lost. Attempting to reconnect...';
      case 'WEBSOCKET_HANDSHAKE_FAILED':
        return 'Failed to establish real-time connection. Please refresh and try again.';
      case 'WEBSOCKET_UPGRADE_FAILED':
        return 'Unable to upgrade to real-time connection. Some features may be limited.';
      case 'WEBSOCKET_TIMEOUT':
        return 'Connection timed out. Attempting to reconnect...';
      default:
        return `Real-time connection error occurred. Some features may be limited.`;
    }
  }

  /**
   * Get user-friendly application error message
   */
  private getApplicationUserMessage(error: any, context: string): string {
    const code = this.getApplicationErrorCode(error);
    
    switch (code) {
      case 'APP_BIOMETRIC_ERROR':
        return 'Biometric authentication error. Please try again or check your device settings.';
      case 'APP_CONFIGURATION_ERROR':
        return 'Configuration error. Please check your settings and try again.';
      case 'APP_STATE_ERROR':
        return 'Application state error. Please restart the app if the problem persists.';
      default:
        return `An error occurred during ${context.toLowerCase()}. Please try again.`;
    }
  }

  /**
   * Notify error listeners
   */
  private notifyErrorListeners(error: ErrorDetails): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Log error details
   */
  private logError(error: ErrorDetails): void {
    const logMessage = `[${error.code}] ${error.context}: ${error.message}`;
    
    if (__DEV__) {
      console.error(logMessage, {
        error: error.originalError,
        timestamp: error.timestamp,
        recoverable: error.recoverable,
      });
    } else {
      console.error(logMessage);
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();