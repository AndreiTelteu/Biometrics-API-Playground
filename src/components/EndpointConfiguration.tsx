/**
 * EndpointConfiguration Component
 * 
 * Provides UI for configuring API endpoints with URL and HTTP method inputs,
 * form validation, and persistent storage using AsyncStorage.
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
  const [enrollUrl, setEnrollUrl] = useState(enrollConfig.url);
  const [enrollMethod, setEnrollMethod] = useState<HttpMethod>(enrollConfig.method);
  const [validateUrl, setValidateUrl] = useState(validateConfig.url);
  const [validateMethod, setValidateMethod] = useState<HttpMethod>(validateConfig.method);
  
  const [enrollUrlError, setEnrollUrlError] = useState<string>('');
  const [validateUrlError, setValidateUrlError] = useState<string>('');

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
  const [validateCustomPayload, setValidateCustomPayload] = useState(validateConfig.customPayload || '');

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
        setValidateCustomPayload(config.customPayload || '');
        
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Endpoint Configuration</Text>
      
      {/* Enrollment Endpoint Configuration */}
      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Enrollment Endpoint</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL:</Text>
          <TextInput
            style={[styles.textInput, enrollUrlError ? styles.inputError : null]}
            value={enrollUrl}
            onChangeText={handleEnrollUrlChange}
            placeholder="https://api.example.com/enroll"
            placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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


      </View>

      {/* Validation Endpoint Configuration */}
      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Validation Endpoint</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL:</Text>
          <TextInput
            style={[styles.textInput, validateUrlError ? styles.inputError : null]}
            value={validateUrl}
            onChangeText={handleValidateUrlChange}
            placeholder="https://api.example.com/validate"
            placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
          <Text style={styles.label}>Custom Payload (optional):</Text>
          <TextInput
            style={[styles.textInput, styles.payloadInput]}
            value={validateCustomPayload}
            onChangeText={handleValidatePayloadChange}
            placeholder="Custom payload to sign (leave empty for timestamp)"
            placeholderTextColor="#999"
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
            testID="validate-custom-payload"
          />
          <Text style={styles.helperText}>
            If empty, a timestamp will be used as the default payload
          </Text>
        </View>
      </View>

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

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  configSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#495057',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  methodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  methodButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  methodButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  methodButtonTextSelected: {
    color: '#fff',
  },
  warningContainer: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginTop: 8,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addHeaderButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addHeaderButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  headerInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#495057',
  },
  headerFullInput: {
    flex: 1,
  },
  removeHeaderButton: {
    backgroundColor: '#dc3545',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeHeaderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  noHeadersText: {
    color: '#6c757d',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  payloadInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    color: '#6c757d',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default EndpointConfiguration;