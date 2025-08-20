/**
 * NetworkResilience - Network resilience utilities for web control
 * Provides connection monitoring, automatic reconnection, and graceful degradation
 */

import { errorHandler, NetworkErrorDetails } from './ErrorHandler';

export interface ConnectionState {
  isConnected: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  isReconnecting: boolean;
}

export interface ReconnectionOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

export interface ConnectionListener {
  onConnected?: () => void;
  onDisconnected?: (error?: any) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  onReconnectionFailed?: (error: any) => void;
}

export class NetworkResilience {
  private static instance: NetworkResilience;
  private connectionState: ConnectionState = {
    isConnected: false,
    lastConnected: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    isReconnecting: false,
  };

  private listeners: Set<ConnectionListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly DEFAULT_HEARTBEAT_INTERVAL = 30000; // 30 seconds

  static getInstance(): NetworkResilience {
    if (!NetworkResilience.instance) {
      NetworkResilience.instance = new NetworkResilience();
    }
    return NetworkResilience.instance;
  }

  /**
   * Initialize network resilience monitoring
   */
  initialize(options?: ReconnectionOptions): void {
    this.updateReconnectionOptions(options);
    this.startHeartbeat();
  }

  /**
   * Shutdown network resilience monitoring
   */
  shutdown(): void {
    this.stopReconnection();
    this.stopHeartbeat();
    this.listeners.clear();
    this.connectionState.isConnected = false;
  }

  /**
   * Mark connection as established
   */
  markConnected(): void {
    const wasConnected = this.connectionState.isConnected;
    
    this.connectionState.isConnected = true;
    this.connectionState.lastConnected = new Date();
    this.connectionState.reconnectAttempts = 0;
    this.connectionState.isReconnecting = false;
    
    this.stopReconnection();
    
    if (!wasConnected) {
      this.notifyListeners('onConnected');
    } else if (this.connectionState.reconnectAttempts > 0) {
      this.notifyListeners('onReconnected');
    }
  }

  /**
   * Mark connection as lost
   */
  markDisconnected(error?: any): void {
    if (!this.connectionState.isConnected) {
      return;
    }

    this.connectionState.isConnected = false;
    
    const networkError = errorHandler.handleNetworkError(
      error || new Error('Connection lost'),
      'Connection monitoring'
    );

    this.notifyListeners('onDisconnected', networkError);
    
    // Start reconnection if the error is retryable
    if (networkError.retryable) {
      this.startReconnection();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  async attemptReconnection(reconnectFunction: () => Promise<void>): Promise<boolean> {
    if (this.connectionState.isConnected || this.connectionState.isReconnecting) {
      return false;
    }

    if (this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
      const error = new Error(`Max reconnection attempts (${this.connectionState.maxReconnectAttempts}) exceeded`);
      const networkError = errorHandler.handleNetworkError(error, 'Reconnection');
      this.notifyListeners('onReconnectionFailed', networkError);
      return false;
    }

    this.connectionState.isReconnecting = true;
    this.connectionState.reconnectAttempts++;

    this.notifyListeners('onReconnecting', this.connectionState.reconnectAttempts);

    try {
      await reconnectFunction();
      this.markConnected();
      return true;
    } catch (error) {
      const networkError = errorHandler.handleNetworkError(error, 'Reconnection attempt');
      
      // Schedule next reconnection attempt
      const delay = this.calculateReconnectDelay(this.connectionState.reconnectAttempts);
      
      this.reconnectTimer = setTimeout(() => {
        this.connectionState.isReconnecting = false;
        this.attemptReconnection(reconnectFunction);
      }, delay);

      return false;
    }
  }

  /**
   * Execute operation with automatic retry on network failure
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const networkError = errorHandler.handleNetworkError(error, context);
        
        // Don't retry if the error is not retryable or this is the last attempt
        if (!networkError.retryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying
        const delay = this.calculateRetryDelay(attempt);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Add connection listener
   */
  addConnectionListener(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update reconnection options
   */
  updateReconnectionOptions(options?: ReconnectionOptions): void {
    if (options?.maxAttempts !== undefined) {
      this.connectionState.maxReconnectAttempts = options.maxAttempts;
    }
    if (options?.initialDelay !== undefined) {
      this.connectionState.reconnectDelay = options.initialDelay;
    }
  }

  /**
   * Force reconnection attempt
   */
  forceReconnection(reconnectFunction: () => Promise<void>): void {
    this.stopReconnection();
    this.connectionState.reconnectAttempts = 0;
    this.connectionState.isReconnecting = false;
    this.attemptReconnection(reconnectFunction);
  }

  /**
   * Start automatic reconnection process
   */
  private startReconnection(): void {
    if (this.connectionState.isReconnecting || this.reconnectTimer) {
      return;
    }

    const delay = this.calculateReconnectDelay(1);
    
    this.reconnectTimer = setTimeout(() => {
      this.connectionState.isReconnecting = false;
      // The actual reconnection will be triggered by the caller
    }, delay);
  }

  /**
   * Stop reconnection process
   */
  private stopReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.connectionState.isReconnecting = false;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, this.DEFAULT_HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Perform heartbeat check
   */
  private performHeartbeat(): void {
    // This is a placeholder for heartbeat logic
    // In a real implementation, this would ping the server or check connection status
    if (this.connectionState.isConnected && this.connectionState.lastConnected) {
      const timeSinceLastConnection = Date.now() - this.connectionState.lastConnected.getTime();
      
      // If no activity for too long, consider connection potentially lost
      if (timeSinceLastConnection > this.DEFAULT_HEARTBEAT_INTERVAL * 2) {
        // This would trigger a connection check in a real implementation
        console.log('Heartbeat: Connection may be stale, consider checking');
      }
    }
  }

  /**
   * Calculate reconnection delay with exponential backoff
   */
  private calculateReconnectDelay(attempt: number): number {
    const baseDelay = this.connectionState.reconnectDelay;
    const maxDelay = 30000; // 30 seconds max
    const backoffMultiplier = 2;
    
    let delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    delay = Math.min(delay, maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;
    
    return Math.floor(delay);
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 5000; // 5 seconds max
    
    let delay = baseDelay * attempt;
    delay = Math.min(delay, maxDelay);
    
    return delay;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Notify all listeners of connection events
   */
  private notifyListeners(event: keyof ConnectionListener, data?: any): void {
    this.listeners.forEach(listener => {
      try {
        const handler = listener[event];
        if (handler) {
          (handler as any)(data);
        }
      } catch (error) {
        console.error(`Error in connection listener (${event}):`, error);
      }
    });
  }
}

// Export singleton instance
export const networkResilience = NetworkResilience.getInstance();