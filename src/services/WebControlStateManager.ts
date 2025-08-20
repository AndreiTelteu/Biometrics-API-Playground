/**
 * WebControlStateManager - Enhanced state management for web control feature
 * Manages active operations, connections, and configuration synchronization
 */

import { 
  configurationPersistence, 
  PersistedServerSettings, 
  PersistedEndpointConfigs, 
  WebControlPreferences,
  OperationHistoryEntry,
  ConfigurationChangeListener 
} from './ConfigurationPersistence';
import { webSocketManager } from './WebSocketManager';
import { EndpointConfig, ServerStatus, WebSocketMessage, LogEntry } from '../types';
import { errorHandler } from '../utils/ErrorHandler';

export interface WebControlStateManagerState {
  // Server state
  server: {
    status: ServerStatus;
    settings: PersistedServerSettings;
  };
  
  // Configuration state
  configurations: {
    endpoints: PersistedEndpointConfigs;
    preferences: WebControlPreferences;
    lastSyncTimestamp: string;
  };
  
  // Operation state
  operations: {
    activeOperations: Map<string, ActiveOperation>;
    operationQueue: QueuedOperation[];
    operationHistory: OperationHistoryEntry[];
  };
  
  // Connection state
  connections: {
    webSocketConnections: Map<string, ConnectionInfo>;
    totalConnections: number;
    lastActivity: Date | null;
  };
  
  // Synchronization state
  synchronization: {
    isConfigSyncEnabled: boolean;
    pendingConfigChanges: ConfigurationChange[];
    lastWebSync: Date | null;
    lastMobileSync: Date | null;
  };
}

export interface ActiveOperation {
  id: string;
  type: 'enroll' | 'validate' | 'delete-keys';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  progress?: number;
  endpoint?: string;
  clientId?: string;
}

export interface QueuedOperation {
  id: string;
  type: 'enroll' | 'validate' | 'delete-keys';
  config?: EndpointConfig;
  clientId: string;
  queuedAt: Date;
  priority: number;
}

export interface ConnectionInfo {
  id: string;
  connectedAt: Date;
  lastActivity: Date;
  operationsCount: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface ConfigurationChange {
  id: string;
  type: 'server-settings' | 'endpoint-config' | 'preferences';
  target: 'enroll' | 'validate' | 'server' | 'preferences';
  changes: any;
  timestamp: Date;
  source: 'web' | 'mobile';
  applied: boolean;
}

export interface StateChangeListener {
  onStateChanged: (state: WebControlStateManagerState) => void;
  onOperationStatusChanged: (operation: ActiveOperation) => void;
  onConfigurationChanged: (change: ConfigurationChange) => void;
  onConnectionChanged: (connections: Map<string, ConnectionInfo>) => void;
}

export class WebControlStateManager {
  private state: WebControlStateManagerState;
  private stateChangeListeners: Set<StateChangeListener> = new Set();
  private configChangeListener?: () => void;
  private isInitialized: boolean = false;
  private syncInterval?: ReturnType<typeof setInterval>;
  private readonly SYNC_INTERVAL = 5000; // 5 seconds
  private readonly MAX_OPERATION_QUEUE_SIZE = 50;
  private readonly MAX_OPERATION_HISTORY = 1000;

  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * Initialize the state manager
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Initialize configuration persistence
      await configurationPersistence.initialize();

      // Load persisted state
      await this.loadPersistedState();

      // Setup configuration change listener
      this.setupConfigurationChangeListener();

      // Start synchronization interval
      this.startSynchronizationInterval();

      this.isInitialized = true;
      console.log('WebControlStateManager initialized successfully');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'WebControlStateManager initialization');
      console.error('Failed to initialize WebControlStateManager:', appError.message);
      throw error;
    }
  }

  /**
   * Shutdown the state manager
   */
  async shutdown(): Promise<void> {
    try {
      // Stop synchronization interval
      this.stopSynchronizationInterval();

      // Remove configuration change listener
      if (this.configChangeListener) {
        this.configChangeListener();
        this.configChangeListener = undefined;
      }

      // Save current state
      await this.saveCurrentState();

      this.isInitialized = false;
      console.log('WebControlStateManager shut down successfully');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'WebControlStateManager shutdown');
      console.error('Error during WebControlStateManager shutdown:', appError.message);
    }
  }

  /**
   * Get current state
   */
  getState(): WebControlStateManagerState {
    return this.deepCloneState(this.state);
  }

  /**
   * Update server status
   */
  updateServerStatus(status: ServerStatus): void {
    this.state.server.status = { ...status };
    this.notifyStateChanged();
    this.broadcastStateSync();
  }

  /**
   * Update server settings
   */
  async updateServerSettings(settings: Partial<PersistedServerSettings>): Promise<void> {
    try {
      // Save to persistence
      await configurationPersistence.saveServerSettings(settings);
      
      // Update local state
      this.state.server.settings = { ...this.state.server.settings, ...settings };
      
      // Create configuration change record
      const change: ConfigurationChange = {
        id: this.generateId(),
        type: 'server-settings',
        target: 'server',
        changes: settings,
        timestamp: new Date(),
        source: 'mobile', // Assume mobile unless specified otherwise
        applied: true,
      };
      
      this.addConfigurationChange(change);
      this.notifyStateChanged();
      this.broadcastConfigUpdate('server-settings', settings);
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Update server settings');
      console.error('Error updating server settings:', appError.message);
      throw error;
    }
  }

  /**
   * Update endpoint configuration
   */
  async updateEndpointConfiguration(
    type: 'enroll' | 'validate', 
    config: EndpointConfig,
    source: 'web' | 'mobile' = 'mobile'
  ): Promise<void> {
    try {
      // Save to persistence
      await configurationPersistence.updateEndpointConfig(type, config);
      
      // Update local state
      this.state.configurations.endpoints = {
        ...this.state.configurations.endpoints,
        [type]: config,
        lastUpdated: new Date().toISOString(),
      };
      
      // Create configuration change record
      const change: ConfigurationChange = {
        id: this.generateId(),
        type: 'endpoint-config',
        target: type,
        changes: config,
        timestamp: new Date(),
        source,
        applied: true,
      };
      
      this.addConfigurationChange(change);
      this.notifyStateChanged();
      this.broadcastConfigUpdate('endpoint-config', { type, config });
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, `Update ${type} endpoint configuration`);
      console.error(`Error updating ${type} endpoint configuration:`, appError.message);
      throw error;
    }
  }

  /**
   * Update preferences
   */
  async updatePreferences(preferences: Partial<WebControlPreferences>): Promise<void> {
    try {
      // Save to persistence
      await configurationPersistence.savePreferences(preferences);
      
      // Update local state
      this.state.configurations.preferences = { ...this.state.configurations.preferences, ...preferences };
      
      // Update sync enabled flag if changed
      if (preferences.autoSyncConfigs !== undefined) {
        this.state.synchronization.isConfigSyncEnabled = preferences.autoSyncConfigs;
      }
      
      // Create configuration change record
      const change: ConfigurationChange = {
        id: this.generateId(),
        type: 'preferences',
        target: 'preferences',
        changes: preferences,
        timestamp: new Date(),
        source: 'mobile',
        applied: true,
      };
      
      this.addConfigurationChange(change);
      this.notifyStateChanged();
      this.broadcastConfigUpdate('preferences', preferences);
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Update preferences');
      console.error('Error updating preferences:', appError.message);
      throw error;
    }
  }

  /**
   * Start operation
   */
  startOperation(
    type: 'enroll' | 'validate' | 'delete-keys',
    clientId?: string,
    endpoint?: string
  ): string {
    const operationId = this.generateId();
    
    const operation: ActiveOperation = {
      id: operationId,
      type,
      status: 'running',
      startTime: new Date(),
      endpoint,
      clientId,
    };
    
    this.state.operations.activeOperations.set(operationId, operation);
    this.notifyOperationStatusChanged(operation);
    this.notifyStateChanged();
    this.broadcastOperationStart(operation);
    
    return operationId;
  }

  /**
   * Update operation progress
   */
  updateOperationProgress(operationId: string, progress: number): void {
    const operation = this.state.operations.activeOperations.get(operationId);
    if (operation) {
      operation.progress = progress;
      this.notifyOperationStatusChanged(operation);
      this.broadcastOperationProgress(operation);
    }
  }

  /**
   * Complete operation
   */
  async completeOperation(
    operationId: string, 
    success: boolean, 
    result?: any
  ): Promise<void> {
    try {
      const operation = this.state.operations.activeOperations.get(operationId);
      if (!operation) {
        return;
      }
      
      operation.status = success ? 'completed' : 'failed';
      operation.endTime = new Date();
      operation.progress = 100;
      
      // Create history entry
      const historyEntry: OperationHistoryEntry = {
        id: operationId,
        type: operation.type,
        timestamp: operation.startTime.toISOString(),
        success,
        duration: operation.endTime.getTime() - operation.startTime.getTime(),
        endpoint: operation.endpoint,
      };
      
      // Add to history
      await this.addOperationToHistory(historyEntry);
      
      // Remove from active operations
      this.state.operations.activeOperations.delete(operationId);
      
      this.notifyOperationStatusChanged(operation);
      this.notifyStateChanged();
      this.broadcastOperationComplete(operation, result);
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Complete operation');
      console.error('Error completing operation:', appError.message);
    }
  }

  /**
   * Cancel operation
   */
  cancelOperation(operationId: string): void {
    const operation = this.state.operations.activeOperations.get(operationId);
    if (operation) {
      operation.status = 'cancelled';
      operation.endTime = new Date();
      
      this.state.operations.activeOperations.delete(operationId);
      this.notifyOperationStatusChanged(operation);
      this.notifyStateChanged();
      this.broadcastOperationCancel(operation);
    }
  }

  /**
   * Add connection
   */
  addConnection(connectionId: string, info: Partial<ConnectionInfo>): void {
    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      operationsCount: 0,
      ...info,
    };
    
    this.state.connections.webSocketConnections.set(connectionId, connectionInfo);
    this.state.connections.totalConnections++;
    this.state.connections.lastActivity = new Date();
    
    this.notifyConnectionChanged();
    this.notifyStateChanged();
  }

  /**
   * Remove connection
   */
  removeConnection(connectionId: string): void {
    if (this.state.connections.webSocketConnections.delete(connectionId)) {
      this.notifyConnectionChanged();
      this.notifyStateChanged();
    }
  }

  /**
   * Update connection activity
   */
  updateConnectionActivity(connectionId: string): void {
    const connection = this.state.connections.webSocketConnections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
      connection.operationsCount++;
      this.state.connections.lastActivity = new Date();
    }
  }

  /**
   * Synchronize configuration from web interface
   */
  async syncConfigurationFromWeb(changes: any): Promise<void> {
    try {
      if (!this.state.synchronization.isConfigSyncEnabled) {
        console.log('Configuration sync is disabled, ignoring web changes');
        return;
      }
      
      // Process different types of changes
      if (changes.serverSettings) {
        await this.updateServerSettings(changes.serverSettings);
      }
      
      if (changes.endpointConfigs) {
        if (changes.endpointConfigs.enroll) {
          await this.updateEndpointConfiguration('enroll', changes.endpointConfigs.enroll, 'web');
        }
        if (changes.endpointConfigs.validate) {
          await this.updateEndpointConfiguration('validate', changes.endpointConfigs.validate, 'web');
        }
      }
      
      if (changes.preferences) {
        await this.updatePreferences(changes.preferences);
      }
      
      this.state.synchronization.lastWebSync = new Date();
      this.notifyStateChanged();
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Sync configuration from web');
      console.error('Error syncing configuration from web:', appError.message);
      throw error;
    }
  }

  /**
   * Get configuration for web interface
   */
  getConfigurationForWeb(): any {
    return {
      serverSettings: this.state.server.settings,
      endpointConfigs: this.state.configurations.endpoints,
      preferences: this.state.configurations.preferences,
      serverStatus: this.state.server.status,
      activeOperations: Array.from(this.state.operations.activeOperations.values()),
      connectionCount: this.state.connections.totalConnections,
      lastSync: this.state.synchronization.lastWebSync,
    };
  }

  /**
   * Add state change listener
   */
  addStateChangeListener(listener: StateChangeListener): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Private method to create initial state
   */
  private createInitialState(): WebControlStateManagerState {
    return {
      server: {
        status: {
          isRunning: false,
          port: null,
          url: null,
          password: null,
          startTime: null,
          activeConnections: 0,
        },
        settings: {
          autoStart: false,
          connectionTimeout: 60000,
          maxConnections: 10,
        },
      },
      configurations: {
        endpoints: {
          enroll: { url: '', method: 'POST' },
          validate: { url: '', method: 'POST' },
          lastUpdated: new Date().toISOString(),
        },
        preferences: {
          autoSyncConfigs: true,
          persistLogs: true,
          maxLogEntries: 1000,
          enableNotifications: true,
        },
        lastSyncTimestamp: new Date().toISOString(),
      },
      operations: {
        activeOperations: new Map(),
        operationQueue: [],
        operationHistory: [],
      },
      connections: {
        webSocketConnections: new Map(),
        totalConnections: 0,
        lastActivity: null,
      },
      synchronization: {
        isConfigSyncEnabled: true,
        pendingConfigChanges: [],
        lastWebSync: null,
        lastMobileSync: null,
      },
    };
  }

  /**
   * Private method to load persisted state
   */
  private async loadPersistedState(): Promise<void> {
    try {
      const persistedState = await configurationPersistence.getPersistedState();
      
      // Update state with persisted data
      this.state.server.settings = persistedState.serverSettings;
      this.state.configurations.endpoints = persistedState.endpointConfigs;
      this.state.configurations.preferences = persistedState.preferences;
      this.state.operations.operationHistory = persistedState.operationHistory;
      this.state.synchronization.isConfigSyncEnabled = persistedState.preferences.autoSyncConfigs;
      
      console.log('Persisted state loaded successfully');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Load persisted state');
      console.error('Error loading persisted state:', appError.message);
      // Continue with default state
    }
  }

  /**
   * Private method to save current state
   */
  private async saveCurrentState(): Promise<void> {
    try {
      // Only save persistent parts of the state
      await Promise.all([
        configurationPersistence.saveServerSettings(this.state.server.settings),
        configurationPersistence.saveEndpointConfigs(this.state.configurations.endpoints),
        configurationPersistence.savePreferences(this.state.configurations.preferences),
      ]);
      
      console.log('Current state saved successfully');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Save current state');
      console.error('Error saving current state:', appError.message);
    }
  }

  /**
   * Private method to setup configuration change listener
   */
  private setupConfigurationChangeListener(): void {
    const listener: ConfigurationChangeListener = {
      onServerSettingsChanged: (settings) => {
        this.state.server.settings = settings;
        this.notifyStateChanged();
      },
      onEndpointConfigsChanged: (configs) => {
        this.state.configurations.endpoints = configs;
        this.notifyStateChanged();
      },
      onPreferencesChanged: (preferences) => {
        this.state.configurations.preferences = preferences;
        this.state.synchronization.isConfigSyncEnabled = preferences.autoSyncConfigs;
        this.notifyStateChanged();
      },
    };
    
    this.configChangeListener = configurationPersistence.addChangeListener(listener);
  }

  /**
   * Private method to start synchronization interval
   */
  private startSynchronizationInterval(): void {
    this.syncInterval = setInterval(() => {
      this.performPeriodicSync();
    }, this.SYNC_INTERVAL);
  }

  /**
   * Private method to stop synchronization interval
   */
  private stopSynchronizationInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Private method to perform periodic synchronization
   */
  private async performPeriodicSync(): Promise<void> {
    try {
      if (!this.state.synchronization.isConfigSyncEnabled) {
        return;
      }
      
      // Process pending configuration changes
      await this.processPendingConfigChanges();
      
      // Update last mobile sync timestamp
      this.state.synchronization.lastMobileSync = new Date();
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Periodic sync');
      console.error('Error during periodic sync:', appError.message);
    }
  }

  /**
   * Private method to process pending configuration changes
   */
  private async processPendingConfigChanges(): Promise<void> {
    const pendingChanges = this.state.synchronization.pendingConfigChanges.filter(c => !c.applied);
    
    for (const change of pendingChanges) {
      try {
        await this.applyConfigurationChange(change);
        change.applied = true;
      } catch (error) {
        console.error(`Error applying configuration change ${change.id}:`, error);
      }
    }
    
    // Remove old applied changes
    this.state.synchronization.pendingConfigChanges = this.state.synchronization.pendingConfigChanges
      .filter(c => !c.applied || (new Date().getTime() - c.timestamp.getTime()) < 300000); // Keep for 5 minutes
  }

  /**
   * Private method to apply configuration change
   */
  private async applyConfigurationChange(change: ConfigurationChange): Promise<void> {
    switch (change.type) {
      case 'server-settings':
        await configurationPersistence.saveServerSettings(change.changes);
        break;
      case 'endpoint-config':
        await configurationPersistence.updateEndpointConfig(change.target as 'enroll' | 'validate', change.changes);
        break;
      case 'preferences':
        await configurationPersistence.savePreferences(change.changes);
        break;
    }
  }

  /**
   * Private method to add configuration change
   */
  private addConfigurationChange(change: ConfigurationChange): void {
    this.state.synchronization.pendingConfigChanges.push(change);
    
    // Limit the number of pending changes
    if (this.state.synchronization.pendingConfigChanges.length > 100) {
      this.state.synchronization.pendingConfigChanges.splice(0, 50);
    }
  }

  /**
   * Private method to add operation to history
   */
  private async addOperationToHistory(entry: OperationHistoryEntry): Promise<void> {
    try {
      await configurationPersistence.addOperationToHistory(entry);
      
      // Update local history
      this.state.operations.operationHistory.unshift(entry);
      
      // Limit history size
      if (this.state.operations.operationHistory.length > this.MAX_OPERATION_HISTORY) {
        this.state.operations.operationHistory.splice(this.MAX_OPERATION_HISTORY);
      }
    } catch (error) {
      console.error('Error adding operation to history:', error);
    }
  }

  /**
   * Private method to broadcast state sync
   */
  private broadcastStateSync(): void {
    if (webSocketManager.hasActiveConnections()) {
      webSocketManager.broadcast('state-sync', this.getConfigurationForWeb());
    }
  }

  /**
   * Private method to broadcast config update
   */
  private broadcastConfigUpdate(type: string, data: any): void {
    if (webSocketManager.hasActiveConnections()) {
      webSocketManager.broadcast('config-update', { type, data, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Private method to broadcast operation start
   */
  private broadcastOperationStart(operation: ActiveOperation): void {
    if (webSocketManager.hasActiveConnections()) {
      webSocketManager.broadcast('operation-start', operation, operation.id);
    }
  }

  /**
   * Private method to broadcast operation progress
   */
  private broadcastOperationProgress(operation: ActiveOperation): void {
    if (webSocketManager.hasActiveConnections()) {
      webSocketManager.broadcast('operation-start', { ...operation, type: 'progress' }, operation.id);
    }
  }

  /**
   * Private method to broadcast operation complete
   */
  private broadcastOperationComplete(operation: ActiveOperation, result?: any): void {
    if (webSocketManager.hasActiveConnections()) {
      webSocketManager.broadcast('operation-complete', { operation, result }, operation.id);
    }
  }

  /**
   * Private method to broadcast operation cancel
   */
  private broadcastOperationCancel(operation: ActiveOperation): void {
    if (webSocketManager.hasActiveConnections()) {
      webSocketManager.broadcast('operation-complete', { operation, cancelled: true }, operation.id);
    }
  }

  /**
   * Private method to notify state changed
   */
  private notifyStateChanged(): void {
    const state = this.deepCloneState(this.state);
    this.stateChangeListeners.forEach(listener => {
      try {
        listener.onStateChanged(state);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  /**
   * Private method to notify operation status changed
   */
  private notifyOperationStatusChanged(operation: ActiveOperation): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener.onOperationStatusChanged({ ...operation });
      } catch (error) {
        console.error('Error in operation status change listener:', error);
      }
    });
  }

  /**
   * Private method to notify connection changed
   */
  private notifyConnectionChanged(): void {
    const connections = new Map(this.state.connections.webSocketConnections);
    this.stateChangeListeners.forEach(listener => {
      try {
        listener.onConnectionChanged(connections);
      } catch (error) {
        console.error('Error in connection change listener:', error);
      }
    });
  }

  /**
   * Private method to deep clone state
   */
  private deepCloneState(state: WebControlStateManagerState): WebControlStateManagerState {
    return {
      server: {
        status: { ...state.server.status },
        settings: { ...state.server.settings },
      },
      configurations: {
        endpoints: { ...state.configurations.endpoints },
        preferences: { ...state.configurations.preferences },
        lastSyncTimestamp: state.configurations.lastSyncTimestamp,
      },
      operations: {
        activeOperations: new Map(state.operations.activeOperations),
        operationQueue: [...state.operations.operationQueue],
        operationHistory: [...state.operations.operationHistory],
      },
      connections: {
        webSocketConnections: new Map(state.connections.webSocketConnections),
        totalConnections: state.connections.totalConnections,
        lastActivity: state.connections.lastActivity,
      },
      synchronization: {
        isConfigSyncEnabled: state.synchronization.isConfigSyncEnabled,
        pendingConfigChanges: [...state.synchronization.pendingConfigChanges],
        lastWebSync: state.synchronization.lastWebSync,
        lastMobileSync: state.synchronization.lastMobileSync,
      },
    };
  }

  /**
   * Private method to generate unique IDs
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const webControlStateManager = new WebControlStateManager();