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
  Animated,
} from 'react-native';
// Note: Using a simple button-based method selector instead of Picker for better test compatibility
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EndpointConfig, HttpMethod, ValidationResult } from '../types';
import CollapsibleSection from './CollapsibleSection';
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
const parseHeadersFromStrings = (
  headerEntries: HeaderEntry[],
): Record<string, string> => {
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
  const [enrollMethod, setEnrollMethod] = useState<HttpMethod>(
    enrollConfig.method,
  );
  const [validateUrl, setValidateUrl] = useState(validateConfig.url);
  const [validateMethod, setValidateMethod] = useState<HttpMethod>(
    validateConfig.method,
  );

  const [enrollUrlError, setEnrollUrlError] = useState<string>('');
  const [validateUrlError, setValidateUrlError] = useState<string>('');

  // Focus states for enhanced styling
  const [enrollUrlFocused, setEnrollUrlFocused] = useState(false);
  const [validateUrlFocused, setValidateUrlFocused] = useState(false);
  const [validatePayloadFocused, setValidatePayloadFocused] = useState(false);
  const [focusedHeaderInputs, setFocusedHeaderInputs] = useState<Set<string>>(
    new Set(),
  );

  // Animation values for error transitions
  const [enrollErrorAnimation] = useState(new Animated.Value(0));
  const [validateErrorAnimation] = useState(new Animated.Value(0));

  // Headers state
  const [enrollHeaders, setEnrollHeaders] = useState<HeaderEntry[]>(() =>
    Object.entries(enrollConfig.headers || {}).map(([key, value], index) => ({
      id: `enroll-${index}`,
      headerString: `${key}: ${value}`,
    })),
  );
  const [validateHeaders, setValidateHeaders] = useState<HeaderEntry[]>(() =>
    Object.entries(validateConfig.headers || {}).map(([key, value], index) => ({
      id: `validate-${index}`,
      headerString: `${key}: ${value}`,
    })),
  );

  // Payload customization state (only for validation endpoint)
  const [validateCustomPayload, setValidateCustomPayload] = useState(
    validateConfig.customPayload || '{date}',
  );

  // Load saved configuration on component mount
  useEffect(() => {
    loadSavedConfiguration();
  }, []);

  // Initialize error animations based on initial error state
  useEffect(() => {
    if (enrollUrlError) {
      Animated.timing(enrollErrorAnimation, {
        toValue: 1,
        duration: 0, // Immediate
        useNativeDriver: false,
      }).start();
    }
    if (validateUrlError) {
      Animated.timing(validateErrorAnimation, {
        toValue: 1,
        duration: 0, // Immediate
        useNativeDriver: false,
      }).start();
    }
  }, []);

  // Save configuration whenever it changes
  useEffect(() => {
    if (enrollUrl || enrollMethod !== 'POST' || enrollHeaders.length > 0) {
      const headers = parseHeadersFromStrings(enrollHeaders);

      saveConfiguration('enroll', {
        url: enrollUrl,
        method: enrollMethod,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
    }
  }, [enrollUrl, enrollMethod, enrollHeaders]);

  useEffect(() => {
    if (
      validateUrl ||
      validateMethod !== 'POST' ||
      validateHeaders.length > 0 ||
      validateCustomPayload
    ) {
      const headers = parseHeadersFromStrings(validateHeaders);

      saveConfiguration('validate', {
        url: validateUrl,
        method: validateMethod,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        customPayload: validateCustomPayload || undefined,
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
          const headerEntries = Object.entries(config.headers).map(
            ([key, value], index) => ({
              id: `enroll-loaded-${index}`,
              headerString: `${key}: ${value}`,
            }),
          );
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
          const headerEntries = Object.entries(config.headers).map(
            ([key, value], index) => ({
              id: `validate-loaded-${index}`,
              headerString: `${key}: ${value}`,
            }),
          );
          setValidateHeaders(headerEntries);
        }

        onConfigChange('validate', config);
      }
    } catch (error) {
      console.warn('Failed to load saved endpoint configuration:', error);
    }
  };

  const saveConfiguration = async (
    type: 'enroll' | 'validate',
    config: EndpointConfig,
  ) => {
    try {
      const storageKey =
        type === 'enroll'
          ? STORAGE_KEYS.ENROLL_CONFIG
          : STORAGE_KEYS.VALIDATE_CONFIG;
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
    const urlRegex =
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

    if (!urlRegex.test(url)) {
      errors.push(
        'Please enter a valid URL (must start with http:// or https://)',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleEnrollUrlChange = (url: string) => {
    setEnrollUrl(url);
    const validation = validateUrlFormat(url);
    const newError = validation.errors.join(', ');

    // Animate error appearance/disappearance
    if (newError && !enrollUrlError) {
      // Error appearing
      Animated.timing(enrollErrorAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else if (!newError && enrollUrlError) {
      // Error disappearing
      Animated.timing(enrollErrorAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }

    setEnrollUrlError(newError);

    if (validation.isValid) {
      const headers = parseHeadersFromStrings(enrollHeaders);

      const newConfig: EndpointConfig = {
        url,
        method: enrollMethod,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      };
      onConfigChange('enroll', newConfig);
    }
  };

  const handleValidateUrlChange = (url: string) => {
    setValidateUrl(url);
    const validation = validateUrlFormat(url);
    const newError = validation.errors.join(', ');

    // Animate error appearance/disappearance
    if (newError && !validateUrlError) {
      // Error appearing
      Animated.timing(validateErrorAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else if (!newError && validateUrlError) {
      // Error disappearing
      Animated.timing(validateErrorAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }

    setValidateUrlError(newError);

    if (validation.isValid) {
      const headers = parseHeadersFromStrings(validateHeaders);

      const newConfig: EndpointConfig = {
        url,
        method: validateMethod,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        customPayload: validateCustomPayload || undefined,
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
      headers: Object.keys(headers).length > 0 ? headers : undefined,
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
      customPayload: validateCustomPayload || undefined,
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
      customPayload: payload || undefined,
    };
    onConfigChange('validate', newConfig);
  };

  // Header management functions
  const generateHeaderId = (type: 'enroll' | 'validate') => {
    return `${type}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;
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
      header.id === id ? { ...header, headerString } : header,
    );
    setEnrollHeaders(updatedHeaders);

    // Update configuration immediately
    const headers = parseHeadersFromStrings(updatedHeaders);

    const newConfig: EndpointConfig = {
      url: enrollUrl,
      method: enrollMethod,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    };
    onConfigChange('enroll', newConfig);
  };

  const updateValidateHeader = (id: string, headerString: string) => {
    const updatedHeaders = validateHeaders.map(header =>
      header.id === id ? { ...header, headerString } : header,
    );
    setValidateHeaders(updatedHeaders);

    // Update configuration immediately
    const headers = parseHeadersFromStrings(updatedHeaders);

    const newConfig: EndpointConfig = {
      url: validateUrl,
      method: validateMethod,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      customPayload: validateCustomPayload || undefined,
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
              enrollUrlError ? styles.inputError : null,
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
            <Animated.View
              style={[
                styles.errorContainer,
                {
                  opacity: enrollErrorAnimation,
                  transform: [
                    {
                      translateY: enrollErrorAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.errorText}>{enrollUrlError}</Text>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>HTTP Method:</Text>
          <View style={styles.methodSelector}>
            {HTTP_METHODS.map(method => (
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
          {enrollHeaders.map(header => (
            <View key={header.id} style={styles.headerRow}>
              <TextInput
                style={[
                  styles.headerInput,
                  styles.headerFullInput,
                  focusedHeaderInputs.has(header.id) && styles.textInputFocused,
                ]}
                value={header.headerString}
                onChangeText={text => updateEnrollHeader(header.id, text)}
                onFocus={() =>
                  setFocusedHeaderInputs(prev => new Set(prev).add(header.id))
                }
                onBlur={() =>
                  setFocusedHeaderInputs(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(header.id);
                    return newSet;
                  })
                }
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
            style={[
              styles.textInput,
              validateUrlFocused && styles.textInputFocused,
              validateUrlError ? styles.inputError : null,
            ]}
            value={validateUrl}
            onChangeText={handleValidateUrlChange}
            onFocus={() => setValidateUrlFocused(true)}
            onBlur={() => setValidateUrlFocused(false)}
            placeholder="https://api.example.com/validate"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {validateUrlError ? (
            <Animated.View
              style={[
                styles.errorContainer,
                {
                  opacity: validateErrorAnimation,
                  transform: [
                    {
                      translateY: validateErrorAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.errorText}>{validateUrlError}</Text>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>HTTP Method:</Text>
          <View style={styles.methodSelector}>
            {HTTP_METHODS.map(method => (
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
                    validateMethod === method &&
                      styles.methodButtonTextSelected,
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
          {validateHeaders.map(header => (
            <View key={header.id} style={styles.headerRow}>
              <TextInput
                style={[
                  styles.headerInput,
                  styles.headerFullInput,
                  focusedHeaderInputs.has(header.id) && styles.textInputFocused,
                ]}
                value={header.headerString}
                onChangeText={text => updateValidateHeader(header.id, text)}
                onFocus={() =>
                  setFocusedHeaderInputs(prev => new Set(prev).add(header.id))
                }
                onBlur={() =>
                  setFocusedHeaderInputs(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(header.id);
                    return newSet;
                  })
                }
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
            style={[
              styles.textInput,
              styles.payloadInput,
              validatePayloadFocused && styles.textInputFocused,
            ]}
            value={validateCustomPayload}
            onChangeText={handleValidatePayloadChange}
            onFocus={() => setValidatePayloadFocused(true)}
            onBlur={() => setValidatePayloadFocused(false)}
            placeholder="{date}"
            placeholderTextColor={theme.colors.textSecondary}
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
            testID="validate-custom-payload"
          />
          <Text style={styles.helperText}>
            Use {'{date}'} to insert the current timestamp. Example:
            "user_action_{'{date}'}" will become
            "user_action_2024-01-15T10:30:00.000Z"
          </Text>
        </View>
      </CollapsibleSection>

      {!enrollUrl && !validateUrl && (
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
      marginBottom: theme.spacing.lg,
    },
    label: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.5,
    },
    textInput: {
      height: 48,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.sizes.base,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      ...theme.shadows.sm,
      transition: 'all 0.2s ease',
    },
    textInputFocused: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      ...theme.shadows.md,
    },
    inputError: {
      borderColor: theme.colors.error,
      borderWidth: 2,
    },
    errorContainer: {
      overflow: 'hidden',
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.typography.sizes.xs,
      marginTop: theme.spacing.xs,
      fontWeight: theme.typography.weights.medium,
      paddingHorizontal: theme.spacing.xs,
    },
    methodSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    methodButton: {
      minWidth: 60,
      height: 40,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    methodButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      ...theme.shadows.md,
    },
    methodButtonText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semibold,
    },
    methodButtonTextSelected: {
      color: '#FFFFFF',
      fontWeight: theme.typography.weights.bold,
    },
    warningContainer: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warning + '15',
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.warning + '40',
      marginTop: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    warningText: {
      color: theme.colors.warning,
      fontSize: theme.typography.sizes.sm,
      textAlign: 'center',
      fontWeight: theme.typography.weights.medium,
    },
    headerTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    addHeaderButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      minHeight: 36,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    addHeaderButtonText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semibold,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    headerInput: {
      height: 44,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.sizes.sm,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      ...theme.shadows.sm,
    },
    headerFullInput: {
      flex: 1,
    },
    removeHeaderButton: {
      backgroundColor: theme.colors.error,
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    removeHeaderButtonText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 20,
    },
    noHeadersText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.sm,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: theme.borderRadius.md,
      marginVertical: theme.spacing.xs,
    },
    payloadInput: {
      minHeight: 100,
      textAlignVertical: 'top',
      paddingTop: theme.spacing.md,
    },
    helperText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.xs,
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
      lineHeight:
        theme.typography.lineHeights.relaxed * theme.typography.sizes.xs,
      backgroundColor: theme.colors.surfaceSecondary,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
    },
  });

export default EndpointConfiguration;
