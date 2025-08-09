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

const STORAGE_KEYS = {
  ENROLL_CONFIG: 'biometric_enroll_config',
  VALIDATE_CONFIG: 'biometric_validate_config',
};

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH'];

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

  // Load saved configuration on component mount
  useEffect(() => {
    loadSavedConfiguration();
  }, []);

  // Save configuration whenever it changes
  useEffect(() => {
    if (enrollUrl || enrollMethod !== 'POST') {
      saveConfiguration('enroll', { url: enrollUrl, method: enrollMethod });
    }
  }, [enrollUrl, enrollMethod]);

  useEffect(() => {
    if (validateUrl || validateMethod !== 'POST') {
      saveConfiguration('validate', { url: validateUrl, method: validateMethod });
    }
  }, [validateUrl, validateMethod]);

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
        onConfigChange('enroll', config);
      }

      if (savedValidateConfig) {
        const config = JSON.parse(savedValidateConfig) as EndpointConfig;
        setValidateUrl(config.url);
        setValidateMethod(config.method);
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
      const newConfig: EndpointConfig = { url, method: enrollMethod };
      onConfigChange('enroll', newConfig);
    }
  };

  const handleValidateUrlChange = (url: string) => {
    setValidateUrl(url);
    const validation = validateUrlFormat(url);
    setValidateUrlError(validation.errors.join(', '));
    
    if (validation.isValid) {
      const newConfig: EndpointConfig = { url, method: validateMethod };
      onConfigChange('validate', newConfig);
    }
  };

  const handleEnrollMethodChange = (method: HttpMethod) => {
    setEnrollMethod(method);
    const newConfig: EndpointConfig = { url: enrollUrl, method };
    onConfigChange('enroll', newConfig);
  };

  const handleValidateMethodChange = (method: HttpMethod) => {
    setValidateMethod(method);
    const newConfig: EndpointConfig = { url: validateUrl, method };
    onConfigChange('validate', newConfig);
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
});

export default EndpointConfiguration;