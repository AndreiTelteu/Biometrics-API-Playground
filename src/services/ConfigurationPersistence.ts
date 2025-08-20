/**
 * ConfigurationPersistence - Service for persisting and managing web control configurations
 * Handles server settings, endpoint configurations, and state synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EndpointConfig, ServerStatus } from '../types';
import { errorHandler } from '../utils/ErrorHandler';

export interface PersistedServerSettings {
  preferredPort?: number;
  autoStart: boolean;
  lastPassword?: string;
  connectionTimeout: number;
  maxConnections: number;
}

export interface PersistedEndpointConfigs {
  enroll: EndpointConfig;
  validate: EndpointConfig;
  lastUpdated: string;
}

export interface PersistedWebControlState {
  serverSettings: PersistedServerSettings;
  endpointConfigs: PersistedEndpointConfigs;
  operationHistory: OperationHistoryEntry[];
  preferences: WebControlPreferences;
}

export interface OperationHistoryEntry {
  id: string;
  type: 'enroll' | 'validate' | 'delete-keys';
  timestamp: string;
  success: boolean;
  duration: number;
  endpoint?: string;
}

export interface WebControlPreferences {
  autoSyncConfigs: boolean;
  persistLogs: boolean;
  maxLogEntries: number;
  enableNotifications: boolean;
}

export interface ConfigurationChangeListener {
  onServerSettingsChanged: (settings: PersistedServerSettings) => void;
  onEndpointConfigsChanged: (configs: PersistedEndpointConfigs) => void;
  onPreferencesChanged: (preferences: WebControlPreferences) => void;
}

export class ConfigurationPersistence {
  private static readonly STORAGE_KEYS = {
    SERVER_SETTINGS: '@webcontrol_server_settings',
    ENDPOINT_CONFIGS: '@webcontrol_endpoint_configs',
    OPERATION_HISTORY: '@webcontrol_operation_history',
    PREFERENCES: '@webcontrol_preferences',
  };

  private static readonly DEFAULT_SERVER_SETTINGS: PersistedServerSettings = {
    autoStart: false,
    connectionTimeout: 60000,
    maxConnections: 10,
  };

  private static readonly DEFAULT_ENDPOINT_CONFIGS: PersistedEndpointConfigs = {
    enroll: { url: '', method: 'POST' },
    validate: { url: '', method: 'POST' },
    lastUpdated: new Date().toISOString(),
  };

  private static readonly DEFAULT_PREFERENCES: WebControlPreferences = {
    autoSyncConfigs: true,
    persistLogs: true,
    maxLogEntries: 1000,
    enableNotifications: true,
  };

  private changeListeners: Set<ConfigurationChangeListener> = new Set();
  private isInitialized: boolean = false;

  /**
   * Initialize the configuration persistence service
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Ensure all default configurations exist
      await this.ensureDefaultConfigurations();
      
      this.isInitialized = true;
      console.log('ConfigurationPersistence initialized successfully');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Configuration persistence initialization');
      console.error('Failed to initialize ConfigurationPersistence:', appError.message);
      throw error;
    }
  }

  /**
   * Get server settings
   */
  async getServerSettings(): Promise<PersistedServerSettings> {
    try {
      const stored = await AsyncStorage.getItem(ConfigurationPersistence.STORAGE_KEYS.SERVER_SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...ConfigurationPersistence.DEFAULT_SERVER_SETTINGS, ...parsed };
      }
      return ConfigurationPersistence.DEFAULT_SERVER_SETTINGS;
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Get server settings');
      console.error('Error getting server settings:', appError.message);
      return ConfigurationPersistence.DEFAULT_SERVER_SETTINGS;
    }
  }

  /**
   * Save server settings
   */
  async saveServerSettings(settings: Partial<PersistedServerSettings>): Promise<void> {
    try {
      const currentSettings = await this.getServerSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      await AsyncStorage.setItem(
        ConfigurationPersistence.STORAGE_KEYS.SERVER_SETTINGS,
        JSON.stringify(updatedSettings)
      );

      // Notify listeners
      this.notifyServerSettingsChanged(updatedSettings);
      
      console.log('Server settings saved successfully');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Save server settings');
      console.error('Error saving server settings:', appError.message);
      throw error;
    }
  }

  /**
   * Get endpoint configurations
   */
  async getEndpointConfigs(): Promise<PersistedEndpointConfigs> {
    try {
      const stored = await AsyncStorage.getItem(ConfigurationPersistence.STORAGE_KEYS.ENDPOINT_CONFIGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...ConfigurationPersistence.DEFAULT_ENDPOINT_CONFIGS, ...parsed };
      }
      return ConfigurationPersistence.DEFAULT_ENDPOINT_CONFIGS;
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Get endpoint configs');
      console.error('Error getting endpoint configs:', appError.message);
      return ConfigurationPersistence.DEFAULT_ENDPOINT_CONFIGS;
    }
  }

  /**
   * Save endpoint configurations
   */
  async saveEndpointConfigs(configs: Partial<PersistedEndpointConfigs>): Promise<void> {
    try {
      const currentConfigs = await this.getEndpointConfigs();
      const updatedConfigs = {
        ...currentConfigs,
        ...configs,
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(
        ConfigurationPersistence.STORAGE_KEYS.ENDPOINT_CONFIGS,
        JSON.stringify(updatedConfigs)
      );

      // Notify listeners
      this.notifyEndpointConfigsChanged(updatedConfigs);
      
      console.log('Endpoint configs saved successfully');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Save endpoint configs');
      console.error('Error saving endpoint configs:', appError.message);
      throw error;
    }
  }

  /**
   * Update specific endpoint configuration
   */
  async updateEndpointConfig(type: 'enroll' | 'validate', config: EndpointConfig): Promise<void> {
    try {
      const currentConfigs = await this.getEndpointConfigs();
      const updatedConfigs = {
        ...currentConfigs,
        [type]: config,
        lastUpdated: new Date().toISOString(),
      };
      
      await this.saveEndpointConfigs(updatedConfigs);
      console.log(`${type} endpoint configuration updated`);
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, `Update ${type} endpoint config`);
      console.error(`Error updating ${type} endpoint config:`, appError.message);
      throw error;
    }
  }

  /**
   * Get operation history
   */
  async getOperationHistory(): Promise<OperationHistoryEntry[]> {
    try {
      const stored = await AsyncStorage.getItem(ConfigurationPersistence.STORAGE_KEYS.OPERATION_HISTORY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Get operation history');
      console.error('Error getting operation history:', appError.message);
      return [];
    }
  }

  /**
   * Add operation to history
   */
  async addOperationToHistory(entry: OperationHistoryEntry): Promise<void> {
    try {
      const history = await this.getOperationHistory();
      const preferences = await this.getPreferences();
      
      // Add new entry
      history.unshift(entry);
      
      // Limit history size based on preferences
      if (history.length > preferences.maxLogEntries) {
        history.splice(preferences.maxLogEntries);
      }
      
      await AsyncStorage.setItem(
        ConfigurationPersistence.STORAGE_KEYS.OPERATION_HISTORY,
        JSON.stringify(history)
      );
      
      console.log(`Operation ${entry.type} added to history`);
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Add operation to history');
      console.error('Error adding operation to history:', appError.message);
      // Don't throw here as this is not critical
    }
  }

  /**
   * Clear operation history
   */
  async clearOperationHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        ConfigurationPersistence.STORAGE_KEYS.OPERATION_HISTORY,
        JSON.stringify([])
      );
      console.log('Operation history cleared');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Clear operation history');
      console.error('Error clearing operation history:', appError.message);
      throw error;
    }
  }

  /**
   * Get preferences
   */
  async getPreferences(): Promise<WebControlPreferences> {
    try {
      const stored = await AsyncStorage.getItem(ConfigurationPersistence.STORAGE_KEYS.PREFERENCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...ConfigurationPersistence.DEFAULT_PREFERENCES, ...parsed };
      }
      return ConfigurationPersistence.DEFAULT_PREFERENCES;
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Get preferences');
      console.error('Error getting preferences:', appError.message);
      return ConfigurationPersistence.DEFAULT_PREFERENCES;
    }
  }

  /**
   * Save preferences
   */
  async savePreferences(preferences: Partial<WebControlPreferences>): Promise<void> {
    try {
      const currentPreferences = await this.getPreferences();
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      await AsyncStorage.setItem(
        ConfigurationPersistence.STORAGE_KEYS.PREFERENCES,
        JSON.stringify(updatedPreferences)
      );

      // Notify listeners
      this.notifyPreferencesChanged(updatedPreferences);
      
      console.log('Preferences saved successfully');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Save preferences');
      console.error('Error saving preferences:', appError.message);
      throw error;
    }
  }

  /**
   * Get complete persisted state
   */
  async getPersistedState(): Promise<PersistedWebControlState> {
    try {
      const [serverSettings, endpointConfigs, operationHistory, preferences] = await Promise.all([
        this.getServerSettings(),
        this.getEndpointConfigs(),
        this.getOperationHistory(),
        this.getPreferences(),
      ]);

      return {
        serverSettings,
        endpointConfigs,
        operationHistory,
        preferences,
      };
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Get persisted state');
      console.error('Error getting persisted state:', appError.message);
      throw error;
    }
  }

  /**
   * Export configuration for backup
   */
  async exportConfiguration(): Promise<string> {
    try {
      const state = await this.getPersistedState();
      return JSON.stringify(state, null, 2);
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Export configuration');
      console.error('Error exporting configuration:', appError.message);
      throw error;
    }
  }

  /**
   * Import configuration from backup
   */
  async importConfiguration(configJson: string): Promise<void> {
    try {
      const config: PersistedWebControlState = JSON.parse(configJson);
      
      // Validate the configuration structure
      this.validateImportedConfiguration(config);
      
      // Save each part of the configuration
      await Promise.all([
        this.saveServerSettings(config.serverSettings),
        this.saveEndpointConfigs(config.endpointConfigs),
        this.savePreferences(config.preferences),
        AsyncStorage.setItem(
          ConfigurationPersistence.STORAGE_KEYS.OPERATION_HISTORY,
          JSON.stringify(config.operationHistory || [])
        ),
      ]);
      
      console.log('Configuration imported successfully');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Import configuration');
      console.error('Error importing configuration:', appError.message);
      throw error;
    }
  }

  /**
   * Clear all persisted data
   */
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ConfigurationPersistence.STORAGE_KEYS.SERVER_SETTINGS),
        AsyncStorage.removeItem(ConfigurationPersistence.STORAGE_KEYS.ENDPOINT_CONFIGS),
        AsyncStorage.removeItem(ConfigurationPersistence.STORAGE_KEYS.OPERATION_HISTORY),
        AsyncStorage.removeItem(ConfigurationPersistence.STORAGE_KEYS.PREFERENCES),
      ]);
      
      console.log('All persisted data cleared');
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Clear all data');
      console.error('Error clearing all data:', appError.message);
      throw error;
    }
  }

  /**
   * Add configuration change listener
   */
  addChangeListener(listener: ConfigurationChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /**
   * Private method to ensure default configurations exist
   */
  private async ensureDefaultConfigurations(): Promise<void> {
    try {
      const [serverSettings, endpointConfigs, preferences] = await Promise.all([
        this.getServerSettings(),
        this.getEndpointConfigs(),
        this.getPreferences(),
      ]);

      // Save defaults if they don't exist (this will create them if missing)
      await Promise.all([
        this.saveServerSettings(serverSettings),
        this.saveEndpointConfigs(endpointConfigs),
        this.savePreferences(preferences),
      ]);
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'Ensure default configurations');
      console.error('Error ensuring default configurations:', appError.message);
      throw error;
    }
  }

  /**
   * Private method to validate imported configuration
   */
  private validateImportedConfiguration(config: any): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration format');
    }

    // Validate server settings
    if (config.serverSettings && typeof config.serverSettings !== 'object') {
      throw new Error('Invalid server settings format');
    }

    // Validate endpoint configs
    if (config.endpointConfigs) {
      if (typeof config.endpointConfigs !== 'object') {
        throw new Error('Invalid endpoint configs format');
      }
      
      if (config.endpointConfigs.enroll && !this.isValidEndpointConfig(config.endpointConfigs.enroll)) {
        throw new Error('Invalid enroll endpoint configuration');
      }
      
      if (config.endpointConfigs.validate && !this.isValidEndpointConfig(config.endpointConfigs.validate)) {
        throw new Error('Invalid validate endpoint configuration');
      }
    }

    // Validate preferences
    if (config.preferences && typeof config.preferences !== 'object') {
      throw new Error('Invalid preferences format');
    }

    // Validate operation history
    if (config.operationHistory && !Array.isArray(config.operationHistory)) {
      throw new Error('Invalid operation history format');
    }
  }

  /**
   * Private method to validate endpoint configuration
   */
  private isValidEndpointConfig(config: any): boolean {
    return (
      config &&
      typeof config === 'object' &&
      typeof config.url === 'string' &&
      typeof config.method === 'string' &&
      ['GET', 'POST', 'PUT', 'PATCH'].includes(config.method)
    );
  }

  /**
   * Private method to notify server settings changes
   */
  private notifyServerSettingsChanged(settings: PersistedServerSettings): void {
    this.changeListeners.forEach(listener => {
      try {
        listener.onServerSettingsChanged(settings);
      } catch (error) {
        console.error('Error in server settings change listener:', error);
      }
    });
  }

  /**
   * Private method to notify endpoint configs changes
   */
  private notifyEndpointConfigsChanged(configs: PersistedEndpointConfigs): void {
    this.changeListeners.forEach(listener => {
      try {
        listener.onEndpointConfigsChanged(configs);
      } catch (error) {
        console.error('Error in endpoint configs change listener:', error);
      }
    });
  }

  /**
   * Private method to notify preferences changes
   */
  private notifyPreferencesChanged(preferences: WebControlPreferences): void {
    this.changeListeners.forEach(listener => {
      try {
        listener.onPreferencesChanged(preferences);
      } catch (error) {
        console.error('Error in preferences change listener:', error);
      }
    });
  }
}

// Export singleton instance
export const configurationPersistence = new ConfigurationPersistence();