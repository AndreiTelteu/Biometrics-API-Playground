/**
 * Tests for TypeScript interfaces and type guards
 */

import {
  BiometricStatus,
  EndpointConfig,
  OperationResult,
  LogEntry,
  BiometryType,
  HttpMethod,
} from '../types';

import {
  validateEndpointConfig,
  validateUrl,
  createOperationResult,
  isBiometryType,
  isHttpMethod,
} from '../utils/typeGuards';

import { createLogEntry } from '../utils/logUtils';

import {
  BIOMETRY_TYPES,
  HTTP_METHODS,
  OPERATION_TYPES,
  OPERATION_STATUS,
} from '../constants';

describe('Type Guards', () => {
  test('isBiometryType should validate biometry types correctly', () => {
    expect(isBiometryType('TouchID')).toBe(true);
    expect(isBiometryType('FaceID')).toBe(true);
    expect(isBiometryType('Biometrics')).toBe(true);
    expect(isBiometryType(undefined)).toBe(true);
    expect(isBiometryType('InvalidType')).toBe(false);
    expect(isBiometryType(null)).toBe(false);
  });

  test('isHttpMethod should validate HTTP methods correctly', () => {
    expect(isHttpMethod('GET')).toBe(true);
    expect(isHttpMethod('POST')).toBe(true);
    expect(isHttpMethod('PUT')).toBe(true);
    expect(isHttpMethod('PATCH')).toBe(true);
    expect(isHttpMethod('DELETE')).toBe(false);
    expect(isHttpMethod('INVALID')).toBe(false);
  });

  test('validateUrl should validate URLs correctly', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://localhost:3000')).toBe(true);
    expect(validateUrl('https://api.example.com/endpoint')).toBe(true);
    expect(validateUrl('invalid-url')).toBe(false);
    expect(validateUrl('')).toBe(false);
  });

  test('validateEndpointConfig should validate endpoint configuration', () => {
    const validConfig: EndpointConfig = {
      url: 'https://api.example.com/enroll',
      method: 'POST',
    };

    const invalidConfig: EndpointConfig = {
      url: 'invalid-url',
      method: 'POST',
    };

    const emptyConfig: EndpointConfig = {
      url: '',
      method: 'GET',
    };

    expect(validateEndpointConfig(validConfig).isValid).toBe(true);
    expect(validateEndpointConfig(invalidConfig).isValid).toBe(false);
    expect(validateEndpointConfig(emptyConfig).isValid).toBe(false);
  });
});

describe('Utility Functions', () => {
  test('createOperationResult should create valid operation result', () => {
    const result = createOperationResult(true, 'Success', { key: 'value' });
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Success');
    expect(result.data).toEqual({ key: 'value' });
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('createLogEntry should create valid log entry', () => {
    const logEntry = createLogEntry('enroll', 'success', 'Enrollment successful');
    
    expect(logEntry.operation).toBe('enroll');
    expect(logEntry.status).toBe('success');
    expect(logEntry.message).toBe('Enrollment successful');
    expect(logEntry.timestamp).toBeInstanceOf(Date);
    expect(typeof logEntry.id).toBe('string');
    expect(logEntry.id.length).toBeGreaterThan(0);
  });
});

describe('Constants', () => {
  test('BIOMETRY_TYPES should have correct values', () => {
    expect(BIOMETRY_TYPES.TOUCH_ID).toBe('TouchID');
    expect(BIOMETRY_TYPES.FACE_ID).toBe('FaceID');
    expect(BIOMETRY_TYPES.BIOMETRICS).toBe('Biometrics');
  });

  test('HTTP_METHODS should have correct values', () => {
    expect(HTTP_METHODS.GET).toBe('GET');
    expect(HTTP_METHODS.POST).toBe('POST');
    expect(HTTP_METHODS.PUT).toBe('PUT');
    expect(HTTP_METHODS.PATCH).toBe('PATCH');
  });

  test('OPERATION_TYPES should have correct values', () => {
    expect(OPERATION_TYPES.ENROLL).toBe('enroll');
    expect(OPERATION_TYPES.VALIDATE).toBe('validate');
    expect(OPERATION_TYPES.DELETE).toBe('delete');
    expect(OPERATION_TYPES.STATUS).toBe('status');
  });

  test('OPERATION_STATUS should have correct values', () => {
    expect(OPERATION_STATUS.SUCCESS).toBe('success');
    expect(OPERATION_STATUS.ERROR).toBe('error');
    expect(OPERATION_STATUS.INFO).toBe('info');
  });
});

describe('Type Interfaces', () => {
  test('BiometricStatus interface should be properly typed', () => {
    const status: BiometricStatus = {
      available: true,
      biometryType: 'TouchID',
      error: undefined,
    };

    expect(status.available).toBe(true);
    expect(status.biometryType).toBe('TouchID');
    expect(status.error).toBeUndefined();
  });

  test('EndpointConfig interface should be properly typed', () => {
    const config: EndpointConfig = {
      url: 'https://api.example.com',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
      },
    };

    expect(config.url).toBe('https://api.example.com');
    expect(config.method).toBe('POST');
    expect(config.headers).toBeDefined();
    expect(config.headers!['Content-Type']).toBe('application/json');
  });
});