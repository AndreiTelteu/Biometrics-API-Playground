/**
 * Demo file for BiometricStatusDisplay component
 * This file demonstrates different states of the BiometricStatusDisplay component
 */

import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import BiometricStatusDisplay from '../BiometricStatusDisplay';

const BiometricStatusDisplayDemo: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.demoTitle}>BiometricStatusDisplay Component Demo</Text>
      
      <Text style={styles.sectionTitle}>Available with TouchID and Keys</Text>
      <BiometricStatusDisplay
        available={true}
        biometryType="TouchID"
        keysExist={true}
      />

      <Text style={styles.sectionTitle}>Available with FaceID, No Keys</Text>
      <BiometricStatusDisplay
        available={true}
        biometryType="FaceID"
        keysExist={false}
      />

      <Text style={styles.sectionTitle}>Available with Generic Biometrics</Text>
      <BiometricStatusDisplay
        available={true}
        biometryType="Biometrics"
        keysExist={true}
      />

      <Text style={styles.sectionTitle}>Not Available</Text>
      <BiometricStatusDisplay
        available={false}
        biometryType={undefined}
        keysExist={false}
      />

      <Text style={styles.sectionTitle}>Error State</Text>
      <BiometricStatusDisplay
        available={false}
        biometryType={undefined}
        keysExist={false}
        error="Biometric hardware not available on this device"
      />

      <Text style={styles.sectionTitle}>Available but with Error</Text>
      <BiometricStatusDisplay
        available={true}
        biometryType="TouchID"
        keysExist={false}
        error="Failed to check key existence"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  demoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#495057',
  },
});

export default BiometricStatusDisplayDemo;