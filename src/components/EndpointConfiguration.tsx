/**
 * EndpointConfiguration Component
 * 
 * Provides UI for configuring API endpoints with URL and HTTP method inputs,
 * form validation, and persistent storage using AsyncStorage.
 * Now features collapsible sections for better organization.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
// Note: Using a simple button-based method selector instead of Picker for better test compatibility
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EndpointConfig, HttpMethod, ValidationResult } from '../types';
import { CollapsibleSection } from './CollapsibleSection';
import { useTheme } from '../theme';

interface EndpointConfigurationProps {
  enrollConfig: EndpointConfig;
  validateConfig: EndpointConfig;
  onConfigChange: (type: 'enroll' | 'validate', config: EndpointConfig) => void;
}

interface HeaderEntry {
  headerString: string;
  id: string;
}

const STORAGE_KEYS = {
  ENROLL_CONFIG: 'biometric_enroll_config',
  VALIDATE_CONFIG: 'biometric_validate_config',
};

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH'];

// Helper function to parse header string into key-value pairs
const parseHeadersFromStrings = (headerEntries: HeaderEntry[]): Record<string, string> => {
  return headerEntries.reduce((acc, entry) => {
    const trimmed = entry.headerString.trim();
    if (trimmed) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        if (key && value) {
          acc[key] = value;
        }
      }
    }
    return acc;
  }, {} as Record<string, string>);
};

const EndpointConfiguration: React.FC<EndpointConfigurationProps> = ({
  enrollConfig,
  validateConfig,
  onConfigChange,
}) => {
  const { theme } = useTheme();
  const [enrollUrl, setEnrollUrl] = useState(enrollConfig.url);
  const [enrollMethod, setEnrollMethod] = useState<HttpMethod>(enrollConfig.method);
  const [validateUrl, setValidateUrl] = useState(validateConfig.url);
  const [validateMethod, setValidateMethod] = useState<HttpMethod>(validateConfig.method);
  
  const [enrollUrlError, setEnrollUrlError] = useState<string>('');
  const [validateUrlError, setValidateUrlError] = useState<string>('');

  // Focus states for enhanced styling
  const [enrollUrlFocused, setEnrollUrlFocused] = useState(false);
  const [validateUrlFocused, setValidateUrlFocused] = useState(false);
  const [validatePayloadFocused, setValidatePayloadFocused] = useState(false);

  // Headers state
  const [enrollHeaders, setEnrollHeaders] = useState<HeaderEntry[]>(() => 
    Object.entries(enrollConfig.headers || {}).map(([key, value], index) => ({
      id: `enroll-${index}`,
      headerString: `${key}: ${value}`,
    }))
  );
  const [validateHeaders, setValidateHeaders] = useState<HeaderEntry[]>(() => 
    Object.entries(validateConfig.headers || {}).map(([key, value], index) => ({
      id: `validate-${index}`,
      headerString: `${key}: ${value}`,
    }))
  );

  // Payload customization state (only for validation endpoint)
  const [validateCustomPayload, setValidateCustomPayload] = useState(validateConfig.customPayload || '{date}');

  // Load saved configuration on component mount
  useEffect(() => {
    loadSavedConfiguration();
  }, []);

  // Save configuration whenever it changes
  useEffect(() => {
    if (enrollUrl || enrollMethod !== 'POST' || enrollHeaders.length > 0) {
      const headers = parseHeadersFromStrings(enrollHeaders);
      
      saveConfiguration('enroll', { 
        url: enrollUrl, 
        method: enrollMethod,
        headers: Object.keys(headers).length > 0 ? headers : undefined
      });
    }
  }, [enrollUrl, enrollMethod, enrollHeaders]);

  useEffect(() => {
    if (validateUrl || validateMethod !== 'POST' || validateHeaders.length > 0 || validateCustomPayload) {
      const headers = parseHeadersFromStrings(validateHeaders);
      
      saveConfiguration('validate', { 
        url: validateUrl, 
        method: validateMethod,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        customPayload: validateCustomPayload || undefined
      });
    }
  }, [validateUrl, validateMethod, validateHeaders, validateCustomPayload]);

  const loadSavedConfiguration = async () => {
    try {
      const [savedEnrollConfig, savedValidateConfig] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ENROLL_CONFIG),
        AsyncStorage.getItem(STORAGE_KEYS.VALIDATE_CONFIG),
      ]);

      if (savedEnrollConfig) {
        const config = JSON.parse(savedEnrollConfig) as EndpointConfig;
        setEnrollUrl(config.url);
        setEnrollMethod(config.method);
        
        // Load headers
        if (config.headers) {
          const headerEntries = Object.entries(config.headers).map(([key, value], index) => ({
            id: `enroll-loaded-${index}`,
            headerString: `${key}: ${value}`,
          }));
          setEnrollHeaders(headerEntries);
        }
        
        onConfigChange('enroll', config);
      }

      if (savedValidateConfig) {
        const config = JSON.parse(savedValidateConfig) as EndpointConfig;
        setValidateUrl(config.url);
        setValidateMethod(config.method);
        setValidateCustomPayload(config.customPayload || '{date}');
        
        // Load headers
        if (config.headers) {
          const headerEntries = Object.entries(config.headers).map(([key, value], index) => ({
            id: `validate-loaded-${index}`,
            headerString: `${key}: ${value}`,
          }));
          setValidateHeaders(headerEntries);
        }
        
        onConfigChange('validate', config);
      }
    } catch (error) {
      console.warn('Failed to load saved endpoint configuration:', error);
    }
  };

  const saveConfiguration = async (type: 'enroll' | 'validate', config: EndpointConfig) => {
    try {
      const storageKey = type === 'enroll' ? STORAGE_KEYS.ENROLL_CONFIG : STORAGE_KEYS.VALIDATE_CONFIG;
      await AsyncStorage.setItem(storageKey, JSON.stringify(config));
    } catch (error) {
      console.warn(`Failed to save ${type} configuration:`, error);
    }
  };

  const validateUrlFormat = (url: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!url.trim()) {
      return { isValid: true, errors: [] }; // Empty URL is valid (optional)
    }

    // Basic URL validation regex
    const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    if (!urlRegex.test(url)) {
      errors.push('Please enter a valid URL (must start with http:// or https://)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleEnrollUrlChange = (url: string) => {
    setEnrollUrl(url);
    const validation = validateUrlFormat(url);
    setEnrollUrlError(validation.errors.join(', '));
    
    if (validation.isValid) {
      const headers = parseHeadersFromStrings(enrollHeaders);
      
      const newConfig: EndpointConfig = { 
        url, 
        method: enrollMethod,
        headers: Object.keys(headers).length > 0 ? headers : undefined
      };
      onConfigChange('enroll', newConfig);
    }
  };

  const handleValidateUrlChange = (url: string) => {
    setValidateUrl(url);
    const validation = validateUrlFormat(url);
    setValidateUrlError(validation.errors.join(', '));
    
    if (validation.isValid) {
      const headers = parseHeadersFromStrings(validateHeaders);
      
      const newConfig: EndpointConfig = { 
        url, 
        method: validateMethod,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        customPayload: validateCustomPayload || undefined
      };
      onConfigChange('validate', newConfig);
    }
  };

  const handleEnrollMethodChange = (method: HttpMethod) => {
    setEnrollMethod(method);
    const headers = parseHeadersFromStrings(enrollHeaders);
    
    const newConfig: EndpointConfig = { 
      url: enrollUrl, 
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined
    };
    onConfigChange('enroll', newConfig);
  };

  const handleValidateMethodChange = (method: HttpMethod) => {
    setValidateMethod(method);
    const headers = parseHeadersFromStrings(validateHeaders);
    
    const newConfig: EndpointConfig = { 
      url: validateUrl, 
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      customPayload: validateCustomPayload || undefined
    };
    onConfigChange('validate', newConfig);
  };



  const handleValidatePayloadChange = (payload: string) => {
    setValidateCustomPayload(payload);
    const headers = parseHeadersFromStrings(validateHeaders);
    
    const newConfig: EndpointConfig = { 
      url: validateUrl, 
      method: validateMethod,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      customPayload: payload || undefined
    };
    onConfigChange('validate', newConfig);
  };

  // Header management functions
  const generateHeaderId = (type: 'enroll' | 'validate') => {
    return `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  const addEnrollHeader = () => {
    const newHeader: HeaderEntry = {
      id: generateHeaderId('enroll'),
      headerString: '',
    };
    setEnrollHeaders([...enrollHeaders, newHeader]);
  };

  const addValidateHeader = () => {
    const newHeader: HeaderEntry = {
      id: generateHeaderId('validate'),
      headerString: '',
    };
    setValidateHeaders([...validateHeaders, newHeader]);
  };

  const updateEnrollHeader = (id: string, headerString: string) => {
    const updatedHeaders = enrollHeaders.map(header => 
      header.id === id ? { ...header, headerString } : header
    );
    setEnrollHeaders(updatedHeaders);
    
    // Update configuration immediately
    const headers = parseHeadersFromStrings(updatedHeaders);
    
    const newConfig: EndpointConfig = { 
      url: enrollUrl, 
      method: enrollMethod,
      headers: Object.keys(headers).length > 0 ? headers : undefined
    };
    onConfigChange('enroll', newConfig);
  };

  const updateValidateHeader = (id: string, headerString: string) => {
    const updatedHeaders = validateHeaders.map(header => 
      header.id === id ? { ...header, headerString } : header
    );
    setValidateHeaders(updatedHeaders);
    
    // Update configuration immediately
    const headers = parseHeadersFromStrings(updatedHeaders);
    
    const newConfig: EndpointConfig = { 
      url: validateUrl, 
      method: validateMethod,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      customPayload: validateCustomPayload || undefined
    };
    onConfigChange('validate', newConfig);
  };

  const removeEnrollHeader = (id: string) => {
    setEnrollHeaders(headers => headers.filter(header => header.id !== id));
  };

  const removeValidateHeader = (id: string) => {
    setValidateHeaders(headers => headers.filter(header => header.id !== id));
  };

  // Helper functions to detect errors in each section
  const hasEnrollmentErrors = () => {
    return enrollUrlError.length > 0;
  };

  const hasValidationErrors = () => {
    return validateUrlError.length > 0;
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Endpoint Configuration</Text>
      
      {/* Enrollment Endpoint Configuration */}
      <CollapsibleSection
        id="enrollment-config"
        title="Enrollment Endpoint"
        defaultExpanded={true}
        hasErrors={hasEnrollmentErrors()}
        testID="enrollment-config-section"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL:</Text>
          <TextInput
            style={[
              styles.textInput,
              enrollUrlFocused && styles.textInputFocused,
              enrollUrlError ? styles.inputError : null
            ]}
            value={enrollUrl}
            onChangeText={handleEnrollUrlChange}
            onFocus={() => setEnrollUrlFocused(true)}
            onBlur={() => setEnrollUrlFocused(false)}
            placeholder="https://api.example.com/enroll"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {enrollUrlError ? (
            <Text style={styles.errorText}>{enrollUrlError}</Text>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>HTTP Method:</Text>
          <View style={styles.methodSelector}>
            {HTTP_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodButton,
                  enrollMethod === method && styles.methodButtonSelected,
                ]}
                onPress={() => handleEnrollMethodChange(method)}
                testID={`enroll-method-${method}`}
              >
                <Text
                  style={[
                    styles.methodButtonText,
                    enrollMethod === method && styles.methodButtonTextSelected,
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.label}>Headers:</Text>
            <TouchableOpacity
              style={styles.addHeaderButton}
              onPress={addEnrollHeader}
              testID="add-enroll-header"
            >
              <Text style={styles.addHeaderButtonText}>+ Add Header</Text>
            </TouchableOpacity>
          </View>
          {enrollHeaders.map((header) => (
            <View key={header.id} style={styles.headerRow}>
              <TextInput
                style={[styles.headerInput, styles.headerFullInput]}
                value={header.headerString}
                onChangeText={(text) => updateEnrollHeader(header.id, text)}
                placeholder="Content-Type: application/json"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.removeHeaderButton}
                onPress={() => removeEnrollHeader(header.id)}
                testID={`remove-enroll-header-${header.id}`}
              >
                <Text style={styles.removeHeaderButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          {enrollHeaders.length === 0 && (
            <Text style={styles.noHeadersText}>No headers configured</Text>
          )}
        </View>
      </CollapsibleSection>

      {/* Validation Endpoint Configuration */}
      <CollapsibleSection
        id="validation-config"
        title="Validation Endpoint"
        defaultExpanded={true}
        hasErrors={hasValidationErrors()}
        testID="validation-config-section"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL:</Text>
          <TextInput
            style={[styles.textInput, validateUrlError ? styles.inputError : null]}
            value={validateUrl}
            onChangeText={handleValidateUrlChange}
            placeholder="https://api.example.com/validate"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {validateUrlError ? (
            <Text style={styles.errorText}>{validateUrlError}</Text>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>HTTP Method:</Text>
          <View style={styles.methodSelector}>
            {HTTP_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodButton,
                  validateMethod === method && styles.methodButtonSelected,
                ]}
                onPress={() => handleValidateMethodChange(method)}
                testID={`validate-method-${method}`}
              >
                <Text
                  style={[
                    styles.methodButtonText,
                    validateMethod === method && styles.methodButtonTextSelected,
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.label}>Headers:</Text>
            <TouchableOpacity
              style={styles.addHeaderButton}
              onPress={addValidateHeader}
              testID="add-validate-header"
            >
              <Text style={styles.addHeaderButtonText}>+ Add Header</Text>
            </TouchableOpacity>
          </View>
          {validateHeaders.map((header) => (
            <View key={header.id} style={styles.headerRow}>
              <TextInput
                style={[styles.headerInput, styles.headerFullInput]}
                value={header.headerString}
                onChangeText={(text) => updateValidateHeader(header.id, text)}
                placeholder="Content-Type: application/json"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.removeHeaderButton}
                onPress={() => removeValidateHeader(header.id)}
                testID={`remove-validate-header-${header.id}`}
              >
                <Text style={styles.removeHeaderButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          {validateHeaders.length === 0 && (
            <Text style={styles.noHeadersText}>No headers configured</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Custom Payload Template:</Text>
          <TextInput
            style={[styles.textInput, styles.payloadInput]}
            value={validateCustomPayload}
            onChangeText={handleValidatePayloadChange}
            placeholder="{date}"
            placeholderTextColor={theme.colors.textSecondary}
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
            testID="validate-custom-payload"
          />
          <Text style={styles.helperText}>
            Use {'{date}'} to insert the current timestamp. Example: "user_action_{'{date}'}" will become "user_action_2024-01-15T10:30:00.000Z"
          </Text>
        </View>
      </CollapsibleSection>

      {(!enrollUrl && !validateUrl) && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Configure at least one endpoint to test biometric operations
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      marginVertical: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: theme.typography.sizes.base,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.typography.sizes.xs,
      marginTop: theme.spacing.xs,
    },
    methodSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    methodButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
    },
    methodButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    methodButtonText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
    },
    methodButtonTextSelected: {
      color: '#FFFFFF',
    },
    warningContainer: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warning + '20', // Add transparency
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.warning,
      marginTop: theme.spacing.sm,
    },
    warningText: {
      color: theme.colors.warning,
      fontSize: theme.typography.sizes.sm,
      textAlign: 'center',
    },
    headerTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    addHeaderButton: {
      backgroundColor: theme.colors.success,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
    },
    addHeaderButtonText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    headerInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      fontSize: theme.typography.sizes.sm,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    headerFullInput: {
      flex: 1,
    },
    removeHeaderButton: {
      backgroundColor: theme.colors.error,
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeHeaderButtonText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 20,
    },
    noHeadersText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.xs,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: theme.spacing.sm,
    },
    payloadInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    helperText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.xs,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },
  });

export default EndpointConfiguration;