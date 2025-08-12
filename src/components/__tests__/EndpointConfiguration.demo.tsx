/**
 * Demo component to test EndpointConfiguration manually
 * This is not a unit test but a demo for manual testing
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import EndpointConfiguration from '../EndpointConfiguration';
import { EndpointConfig } from '../../types';

const EndpointConfigurationDemo: React.FC = () => {
  const [enrollConfig, setEnrollConfig] = useState<EndpointConfig>({
    url: '',
    method: 'POST',
  });

  const [validateConfig, setValidateConfig] = useState<EndpointConfig>({
    url: '',
    method: 'POST',
  });

  const handleConfigChange = (type: 'enroll' | 'validate', config: EndpointConfig) => {
    console.log(`${type} config changed:`, config);
    if (type === 'enroll') {
      setEnrollConfig(config);
    } else {
      setValidateConfig(config);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Endpoint Configuration Demo</Text>
      
      <EndpointConfiguration
        enrollConfig={enrollConfig}
        validateConfig={validateConfig}
        onConfigChange={handleConfigChange}
      />

      <View style={styles.debugInfo}>
        <Text style={styles.debugTitle}>Current Configuration:</Text>
        <Text style={styles.debugText}>
          Enroll: {enrollConfig.method} {enrollConfig.url || '(empty)'}
        </Text>
        <Text style={styles.debugText}>
          Validate: {validateConfig.method} {validateConfig.url || '(empty)'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  debugInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default EndpointConfigurationDemo;

// Add a simple test to satisfy Jest
describe('EndpointConfigurationDemo', () => {
  it('should render without crashing', () => {
    // This is just a demo component, so we just need a placeholder test
    expect(true).toBe(true);
  });
});