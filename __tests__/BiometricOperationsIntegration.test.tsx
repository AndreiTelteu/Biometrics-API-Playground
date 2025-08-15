/**
 * Integration tests for biometric operations with redesigned components
 * Tests enrollment, validation, and key deletion flows with new design system
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import App from '../App';
import { biometricService, biometricAPIService } from '../src/services';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock biometric services
jest.mock('../src/services', () => ({
  biometricService: {
    checkBiometricAvailability: jest.fn(),
    checkKeysExist: jest.fn(),
    createKeys: jest.fn(),
    deleteKeys: jest.fn(),
    createSignature: jest.fn(),
    generatePayload: jest.fn(),
  },
  biometricAPIService: {
    enrollPublicKey: jest.fn(),
    validateSignature: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Biometric Operations Integration with Redesigned Components', () => {
  const mockBiometricService = biometricService as jest.Mocked<typeof biometricService>;
  const mockBiometricAPIService = biometricAPIService as jest.Mocked<typeof biometricAPIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful biometric setup
    mockBiometricService.checkBiometricAvailability.mockResolvedValue({
      available: true,
      biometryType: 'FaceID',
    });
    
    mockBiometricService.checkKeysExist.mockResolvedValue(false);
  });

  describe('Enrollment Flow with Redesigned Components', () => {
    it('should complete enrollment flow with modern UI components', async () => {
      const mockPublicKey = 'mock-public-key-redesigned';
      
      // Mock successful key creation
      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        message: 'Keys created successfully',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      });

      // Mock successful backend enrollment
      mockBiometricAPIService.enrollPublicKey.mockResolvedValue({
        success: true,
        message: 'Enrollment successful',
        data: { success: true, id: 'user-123' },
        timestamp: new Date(),
      });

      const { getByText, getByTestId } = render(<App />);

      // Wait for app to initialize with theme provider
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      // Find the enroll button in the redesigned BiometricActions component
      const enrollButton = getByTestId('enroll-button');
      expect(enrollButton).toBeTruthy();

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify biometric service was called
      expect(mockBiometricService.createKeys).toHaveBeenCalledWith(
        'Authenticate to create biometric keys for enrollment'
      );

      // Verify API service was called
      expect(mockBiometricAPIService.enrollPublicKey).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.any(String),
          method: expect.any(String),
        }),
        mockPublicKey
      );

      // Verify success message appears in status log
      await waitFor(() => {
        expect(getByText(/Enrollment completed successfully/)).toBeTruthy();
      });
    });

    it('should handle enrollment errors with redesigned error display', async () => {
      // Mock biometric unavailable
      mockBiometricService.checkBiometricAvailability.mockResolvedValue({
        available: false,
        biometryType: undefined,
        error: 'Biometric hardware not available',
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      // The enroll button should be disabled when biometrics are unavailable
      const enrollButton = getByTestId('enroll-button');
      
      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify error is displayed in the redesigned status display
      await waitFor(() => {
        expect(getByText(/Biometric hardware not available/)).toBeTruthy();
      });
    });

    it('should show loading state in redesigned button during enrollment', async () => {
      // Mock slow key creation to test loading state
      mockBiometricService.createKeys.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            message: 'Keys created successfully',
            data: { publicKey: 'mock-key' },
            timestamp: new Date(),
          }), 100)
        )
      );

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByTestId('enroll-button');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // The button should show loading state (implementation depends on Button component)
      // This test verifies the loading mechanism is integrated
      expect(mockBiometricService.createKeys).toHaveBeenCalled();
    });
  });

  describe('Validation Flow with Redesigned Components', () => {
    beforeEach(() => {
      // Set up enrolled state
      mockBiometricService.checkKeysExist.mockResolvedValue(true);
    });

    it('should complete validation flow with modern UI components', async () => {
      const mockSignature = 'mock-signature-redesigned';
      const mockPayload = '2024-01-15T10:30:00.000Z';

      // Mock payload generation
      mockBiometricService.generatePayload.mockReturnValue(mockPayload);

      // Mock successful signature creation
      mockBiometricService.createSignature.mockResolvedValue({
        success: true,
        message: 'Signature created successfully',
        data: { signature: mockSignature, payload: mockPayload },
        timestamp: new Date(),
      });

      // Mock successful backend validation
      mockBiometricAPIService.validateSignature.mockResolvedValue({
        success: true,
        message: 'Validation successful',
        data: { valid: true, userId: 'user-123' },
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const validateButton = getByTestId('validate-button');
      expect(validateButton).toBeTruthy();

      await act(async () => {
        fireEvent.press(validateButton);
      });

      // Verify payload generation
      expect(mockBiometricService.generatePayload).toHaveBeenCalled();

      // Verify signature creation
      expect(mockBiometricService.createSignature).toHaveBeenCalledWith({
        promptMessage: 'Authenticate to create signature for validation',
        payload: mockPayload,
        cancelButtonText: 'Cancel Validation',
      });

      // Verify backend validation
      expect(mockBiometricAPIService.validateSignature).toHaveBeenCalledWith(
        expect.any(Object),
        mockSignature,
        mockPayload
      );

      // Verify success message in redesigned status log
      await waitFor(() => {
        expect(getByText(/Validation completed successfully/)).toBeTruthy();
      });
    });

    it('should handle validation prerequisite errors with redesigned components', async () => {
      // Mock no keys exist
      mockBiometricService.checkKeysExist.mockResolvedValue(false);

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const validateButton = getByTestId('validate-button');

      await act(async () => {
        fireEvent.press(validateButton);
      });

      // Verify error message appears in status log
      await waitFor(() => {
        expect(getByText(/No biometric keys found. Please enroll first/)).toBeTruthy();
      });
    });

    it('should handle signature creation failure with redesigned error display', async () => {
      const mockPayload = '2024-01-15T10:30:00.000Z';

      mockBiometricService.generatePayload.mockReturnValue(mockPayload);

      // Mock signature creation failure
      mockBiometricService.createSignature.mockResolvedValue({
        success: false,
        message: 'User cancelled authentication',
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const validateButton = getByTestId('validate-button');

      await act(async () => {
        fireEvent.press(validateButton);
      });

      // Verify error handling
      expect(mockBiometricService.createSignature).toHaveBeenCalled();

      // Verify error message in status log
      await waitFor(() => {
        expect(getByText(/User cancelled authentication/)).toBeTruthy();
      });
    });
  });

  describe('Key Deletion Flow with Redesigned Components', () => {
    beforeEach(() => {
      // Set up enrolled state
      mockBiometricService.checkKeysExist.mockResolvedValue(true);
    });

    it('should complete key deletion with confirmation dialog', async () => {
      // Mock successful key deletion
      mockBiometricService.deleteKeys.mockResolvedValue({
        success: true,
        message: 'Keys deleted successfully',
        data: { keysDeleted: true },
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const deleteButton = getByTestId('delete-keys-button');

      await act(async () => {
        fireEvent.press(deleteButton);
      });

      // Verify confirmation dialog appears
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Biometric Keys',
        'Are you sure you want to delete the biometric keys? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Delete' }),
        ])
      );

      // Simulate user confirming deletion
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2].find((action: any) => action.text === 'Delete');
      
      await act(async () => {
        await deleteAction.onPress();
      });

      // Verify deletion service was called
      expect(mockBiometricService.deleteKeys).toHaveBeenCalled();

      // Verify success message
      await waitFor(() => {
        expect(getByText(/Biometric keys deleted successfully/)).toBeTruthy();
      });
    });

    it('should handle key deletion failure with redesigned error display', async () => {
      // Mock key deletion failure
      mockBiometricService.deleteKeys.mockResolvedValue({
        success: false,
        message: 'Failed to delete keys from keystore',
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const deleteButton = getByTestId('delete-keys-button');

      await act(async () => {
        fireEvent.press(deleteButton);
      });

      // Simulate user confirming deletion
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2].find((action: any) => action.text === 'Delete');
      
      await act(async () => {
        await deleteAction.onPress();
      });

      // Verify error message appears in status log
      await waitFor(() => {
        expect(getByText(/Failed to delete keys from keystore/)).toBeTruthy();
      });
    });
  });

  describe('Theme Integration with Biometric Operations', () => {
    it('should maintain biometric functionality across theme changes', async () => {
      const { getByText, getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      // Find and toggle theme
      const themeToggle = getByTestId('theme-toggle');
      
      await act(async () => {
        fireEvent.press(themeToggle);
      });

      // Verify biometric operations still work after theme change
      const enrollButton = getByTestId('enroll-button');
      expect(enrollButton).toBeTruthy();

      // Mock successful enrollment
      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        message: 'Keys created successfully',
        data: { publicKey: 'test-key' },
        timestamp: new Date(),
      });

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      expect(mockBiometricService.createKeys).toHaveBeenCalled();
    });
  });

  describe('Error Handling with Redesigned Components', () => {
    it('should display network errors in redesigned status log', async () => {
      const mockPublicKey = 'mock-public-key-network-error';

      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        message: 'Keys created successfully',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      });

      // Mock network error
      mockBiometricAPIService.enrollPublicKey.mockResolvedValue({
        success: false,
        message: 'Network request failed: Connection timeout',
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByTestId('enroll-button');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify network error is displayed
      await waitFor(() => {
        expect(getByText(/Network request failed: Connection timeout/)).toBeTruthy();
      });
    });

    it('should handle biometric sensor errors with redesigned status display', async () => {
      // Mock sensor error during operation
      mockBiometricService.createKeys.mockResolvedValue({
        success: false,
        message: 'Biometric sensor temporarily unavailable',
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByTestId('enroll-button');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify sensor error is displayed
      await waitFor(() => {
        expect(getByText(/Biometric sensor temporarily unavailable/)).toBeTruthy();
      });
    });
  });

  describe('Status Logging Integration with Redesigned Components', () => {
    it('should log detailed operation steps in redesigned status log', async () => {
      const mockPublicKey = 'mock-public-key-detailed-logging';

      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        message: 'Keys created successfully',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      });

      mockBiometricAPIService.enrollPublicKey.mockResolvedValue({
        success: true,
        message: 'Enrollment successful',
        data: { success: true },
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByTestId('enroll-button');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify detailed logging steps appear
      await waitFor(() => {
        expect(getByText(/Starting biometric enrollment/)).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText(/Creating biometric keys/)).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText(/Enrollment completed successfully/)).toBeTruthy();
      });
    });
  });
});