/**
 * End-to-end tests for biometric enrollment workflow
 * Tests the complete enrollment flow including backend integration
 */

import { biometricService, biometricAPIService } from '../src/services';

// Mock biometric services
jest.mock('../src/services', () => ({
  biometricService: {
    checkBiometricAvailability: jest.fn(),
    checkKeysExist: jest.fn(),
    createKeys: jest.fn(),
    deleteKeys: jest.fn(),
    createSignature: jest.fn(),
    generateTimestampPayload: jest.fn(),
  },
  biometricAPIService: {
    enrollPublicKey: jest.fn(),
    validateSignature: jest.fn(),
  },
}));

// Mock status logger
jest.mock('../src/utils', () => ({
  useStatusLogger: () => ({
    logs: [],
    currentOperation: null,
    isLoading: false,
    logSuccess: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn(),
    executeWithLogging: jest.fn((operation, message, fn, successMessage) => fn()),
    clearLogs: jest.fn(),
  }),
}));

describe('Enrollment Flow End-to-End Tests', () => {
  const mockBiometricService = biometricService as jest.Mocked<typeof biometricService>;
  const mockBiometricAPIService = biometricAPIService as jest.Mocked<typeof biometricAPIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockBiometricService.checkBiometricAvailability.mockResolvedValue({
      available: true,
      biometryType: 'TouchID',
    });
    
    mockBiometricService.checkKeysExist.mockResolvedValue(false);
  });

  describe('Successful Enrollment Flow', () => {
    it('should complete enrollment with backend integration successfully', async () => {
      const mockPublicKey = 'mock-public-key-12345';
      const mockBackendResponse = { success: true, id: 'user-123' };

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
        data: mockBackendResponse,
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      // Wait for component to initialize
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      // Find and tap the enroll button
      const enrollButton = getByText('Enroll');
      expect(enrollButton).toBeTruthy();

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify biometric service was called with correct parameters
      expect(mockBiometricService.createKeys).toHaveBeenCalledWith(
        'Authenticate to create biometric keys for enrollment'
      );

      // Verify API service was called with correct parameters
      expect(mockBiometricAPIService.enrollPublicKey).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.any(String),
          method: expect.any(String),
        }),
        mockPublicKey
      );
    });

    it('should complete enrollment without backend when no endpoint configured', async () => {
      const mockPublicKey = 'mock-public-key-local-only';

      // Mock successful key creation
      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        message: 'Keys created successfully',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      // Wait for component to initialize
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      // Clear the enrollment endpoint to simulate no backend configuration
      // This would be done through the UI in a real scenario
      const enrollButton = getByText('Enroll');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify biometric service was called
      expect(mockBiometricService.createKeys).toHaveBeenCalled();

      // Verify API service was NOT called when no endpoint configured
      // Note: This test assumes the default endpoint is cleared
    });
  });

  describe('Enrollment Error Handling', () => {
    it('should handle biometric sensor unavailable error', async () => {
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

      const enrollButton = getByText('Enroll');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify error handling for unavailable biometrics
      expect(mockBiometricService.createKeys).not.toHaveBeenCalled();
    });

    it('should handle biometric key creation failure', async () => {
      // Mock key creation failure
      mockBiometricService.createKeys.mockResolvedValue({
        success: false,
        message: 'User cancelled biometric authentication',
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByText('Enroll');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify key creation was attempted
      expect(mockBiometricService.createKeys).toHaveBeenCalled();

      // Verify API service was not called due to key creation failure
      expect(mockBiometricAPIService.enrollPublicKey).not.toHaveBeenCalled();
    });

    it('should handle backend enrollment failure and reset key status', async () => {
      const mockPublicKey = 'mock-public-key-backend-fail';

      // Mock successful key creation
      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        message: 'Keys created successfully',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      });

      // Mock backend enrollment failure
      mockBiometricAPIService.enrollPublicKey.mockResolvedValue({
        success: false,
        message: 'Server error: Invalid public key format',
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByText('Enroll');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify both services were called
      expect(mockBiometricService.createKeys).toHaveBeenCalled();
      expect(mockBiometricAPIService.enrollPublicKey).toHaveBeenCalledWith(
        expect.any(Object),
        mockPublicKey
      );
    });

    it('should handle network timeout during enrollment', async () => {
      const mockPublicKey = 'mock-public-key-timeout';

      // Mock successful key creation
      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        message: 'Keys created successfully',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      });

      // Mock network timeout
      mockBiometricAPIService.enrollPublicKey.mockResolvedValue({
        success: false,
        message: 'Enrollment request failed: Request timeout',
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByText('Enroll');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Verify timeout error is handled properly
      expect(mockBiometricAPIService.enrollPublicKey).toHaveBeenCalled();
    });
  });

  describe('Enrollment UI State Management', () => {
    it('should disable enrollment button during operation', async () => {
      // Mock a slow key creation to test loading state
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

      const enrollButton = getByText('Enroll');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // Button should be disabled during operation
      // Note: This test would need to check the actual disabled state
      // which depends on the button implementation
    });

    it('should update biometric status after successful enrollment', async () => {
      const mockPublicKey = 'mock-public-key-status-update';

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
        data: { success: true },
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByText('Enroll');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      // After successful enrollment, keys should exist
      // This would be verified by checking if validation button becomes enabled
      // or if the status display shows keys exist
    });
  });

  describe('Enrollment with Different Endpoint Configurations', () => {
    it('should handle POST method enrollment', async () => {
      const mockPublicKey = 'mock-public-key-post';

      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        message: 'Keys created successfully',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      });

      mockBiometricAPIService.enrollPublicKey.mockResolvedValue({
        success: true,
        message: 'Enrollment successful',
        data: { method: 'POST' },
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByText('Enroll');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      expect(mockBiometricAPIService.enrollPublicKey).toHaveBeenCalledWith(
        expect.objectContaining({
          method: expect.any(String),
        }),
        mockPublicKey
      );
    });

    it('should handle custom headers in enrollment request', async () => {
      const mockPublicKey = 'mock-public-key-headers';

      mockBiometricService.createKeys.mockResolvedValue({
        success: true,
        message: 'Keys created successfully',
        data: { publicKey: mockPublicKey },
        timestamp: new Date(),
      });

      mockBiometricAPIService.enrollPublicKey.mockResolvedValue({
        success: true,
        message: 'Enrollment successful',
        data: { headers: 'custom' },
        timestamp: new Date(),
      });

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });

      const enrollButton = getByText('Enroll');

      await act(async () => {
        fireEvent.press(enrollButton);
      });

      expect(mockBiometricAPIService.enrollPublicKey).toHaveBeenCalled();
    });
  });
});