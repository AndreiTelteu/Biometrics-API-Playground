/**
 * Unit tests for EndpointConfiguration component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EndpointConfiguration from '../EndpointConfiguration';
import { EndpointConfig } from '../../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// No need to mock Picker since we're using TouchableOpacity buttons

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('EndpointConfiguration', () => {
  const mockOnConfigChange = jest.fn();
  
  const defaultEnrollConfig: EndpointConfig = {
    url: '',
    method: 'POST',
  };
  
  const defaultValidateConfig: EndpointConfig = {
    url: '',
    method: 'POST',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  it('renders correctly with default props', () => {
    const { getByText, getByPlaceholderText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    expect(getByText('API Endpoint Configuration')).toBeTruthy();
    expect(getByText('Enrollment Endpoint')).toBeTruthy();
    expect(getByText('Validation Endpoint')).toBeTruthy();
    expect(getByPlaceholderText('https://api.example.com/enroll')).toBeTruthy();
    expect(getByPlaceholderText('https://api.example.com/validate')).toBeTruthy();
  });

  it('shows warning when no endpoints are configured', () => {
    const { getByText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    expect(getByText(/Configure at least one endpoint/)).toBeTruthy();
  });

  it('validates URL format correctly', () => {
    const { getByPlaceholderText, getByText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');
    
    // Test invalid URL
    fireEvent.changeText(enrollUrlInput, 'invalid-url');
    
    expect(getByText(/Please enter a valid URL/)).toBeTruthy();
  });

  it('accepts valid URLs', () => {
    const { getByPlaceholderText, queryByText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');
    
    // Test valid URL
    fireEvent.changeText(enrollUrlInput, 'https://api.example.com/enroll');
    
    expect(queryByText(/Please enter a valid URL/)).toBeNull();
    expect(mockOnConfigChange).toHaveBeenCalledWith('enroll', {
      url: 'https://api.example.com/enroll',
      method: 'POST',
    });
  });

  it('calls onConfigChange when URL changes', () => {
    const { getByPlaceholderText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');
    fireEvent.changeText(enrollUrlInput, 'https://test.com/api');

    expect(mockOnConfigChange).toHaveBeenCalledWith('enroll', {
      url: 'https://test.com/api',
      method: 'POST',
    });
  });

  it('loads saved configuration from AsyncStorage', async () => {
    const savedEnrollConfig = {
      url: 'https://saved-enroll.com',
      method: 'PUT',
    };
    
    const savedValidateConfig = {
      url: 'https://saved-validate.com',
      method: 'PATCH',
    };

    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify(savedEnrollConfig))
      .mockResolvedValueOnce(JSON.stringify(savedValidateConfig));

    render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    await waitFor(() => {
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('biometric_enroll_config');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('biometric_validate_config');
      expect(mockOnConfigChange).toHaveBeenCalledWith('enroll', savedEnrollConfig);
      expect(mockOnConfigChange).toHaveBeenCalledWith('validate', savedValidateConfig);
    });
  });

  it('saves configuration to AsyncStorage when URL changes', async () => {
    const { getByPlaceholderText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');
    fireEvent.changeText(enrollUrlInput, 'https://test.com/api');

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'biometric_enroll_config',
        JSON.stringify({
          url: 'https://test.com/api',
          method: 'POST',
        })
      );
    });
  });

  it('handles AsyncStorage errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load saved endpoint configuration:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('allows empty URLs (optional configuration)', () => {
    const { getByPlaceholderText, queryByText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');
    
    // Test empty URL
    fireEvent.changeText(enrollUrlInput, '');
    
    expect(queryByText(/Please enter a valid URL/)).toBeNull();
  });

  it('validates both HTTP and HTTPS URLs', () => {
    const { getByPlaceholderText, queryByText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');
    
    // Test HTTP URL
    fireEvent.changeText(enrollUrlInput, 'http://api.example.com/enroll');
    expect(queryByText(/Please enter a valid URL/)).toBeNull();
    
    // Test HTTPS URL
    fireEvent.changeText(enrollUrlInput, 'https://api.example.com/enroll');
    expect(queryByText(/Please enter a valid URL/)).toBeNull();
  });

  it('updates validation endpoint configuration', () => {
    const { getByPlaceholderText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const validateUrlInput = getByPlaceholderText('https://api.example.com/validate');
    fireEvent.changeText(validateUrlInput, 'https://validate.test.com');

    expect(mockOnConfigChange).toHaveBeenCalledWith('validate', {
      url: 'https://validate.test.com',
      method: 'POST',
    });
  });

  it('displays validation errors for validate endpoint', () => {
    const { getByPlaceholderText, getByText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const validateUrlInput = getByPlaceholderText('https://api.example.com/validate');
    fireEvent.changeText(validateUrlInput, 'not-a-url');

    expect(getByText(/Please enter a valid URL/)).toBeTruthy();
  });

  it('changes HTTP method when method button is pressed', () => {
    const { getByTestId } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const putButton = getByTestId('enroll-method-PUT');
    fireEvent.press(putButton);

    expect(mockOnConfigChange).toHaveBeenCalledWith('enroll', {
      url: '',
      method: 'PUT',
    });
  });

  it('shows selected method button as active', () => {
    const enrollConfig: EndpointConfig = {
      url: 'https://test.com',
      method: 'PUT',
    };

    const { getByTestId } = render(
      <EndpointConfiguration
        enrollConfig={enrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const putButton = getByTestId('enroll-method-PUT');
    const postButton = getByTestId('enroll-method-POST');

    // PUT button should have selected style
    expect(putButton.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#007bff' })
    );

    // POST button should not have selected style
    expect(postButton.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#fff' })
    );
  });

  it('allows adding and removing headers', () => {
    const { getByTestId, getByPlaceholderText, queryByPlaceholderText } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    // Initially no header inputs should be visible
    expect(queryByPlaceholderText('Content-Type: application/json')).toBeNull();

    // Add a header
    const addHeaderButton = getByTestId('add-enroll-header');
    fireEvent.press(addHeaderButton);

    // Now header input should be visible
    const headerInput = getByPlaceholderText('Content-Type: application/json');
    
    expect(headerInput).toBeTruthy();

    // Fill in header value
    fireEvent.changeText(headerInput, 'Authorization: Bearer token123');

    // Should call onConfigChange with headers
    expect(mockOnConfigChange).toHaveBeenCalledWith('enroll', {
      url: '',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer token123'
      }
    });
  });

  it('loads saved configuration with headers', async () => {
    const savedConfig = {
      url: 'https://api.example.com/enroll',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer token123',
        'Content-Type': 'application/json'
      }
    };

    mockAsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'biometric_enroll_config') {
        return Promise.resolve(JSON.stringify(savedConfig));
      }
      return Promise.resolve(null);
    });

    const { getByDisplayValue } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    // Wait for async loading
    await waitFor(() => {
      expect(getByDisplayValue('Authorization: Bearer token123')).toBeTruthy();
      expect(getByDisplayValue('Content-Type: application/json')).toBeTruthy();
    });

    expect(mockOnConfigChange).toHaveBeenCalledWith('enroll', savedConfig);
  });

  it('renders custom payload input field only for validation endpoint', () => {
    const { getByTestId, getAllByText, queryByTestId } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    // Should have only one custom payload label (for validate only)
    expect(getAllByText('Custom Payload (optional):').length).toBe(1);
    expect(queryByTestId('enroll-custom-payload')).toBeNull();
    expect(getByTestId('validate-custom-payload')).toBeTruthy();
  });

  it('calls onConfigChange when custom payload changes for validation endpoint', () => {
    const { getByTestId } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const validatePayloadInput = getByTestId('validate-custom-payload');
    fireEvent.changeText(validatePayloadInput, 'custom test payload');

    expect(mockOnConfigChange).toHaveBeenCalledWith('validate', {
      url: '',
      method: 'POST',
      customPayload: 'custom test payload'
    });
  });

  it('saves custom payload to AsyncStorage', async () => {
    const { getByTestId } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const validatePayloadInput = getByTestId('validate-custom-payload');
    fireEvent.changeText(validatePayloadInput, 'validation payload');

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'biometric_validate_config',
        JSON.stringify({
          url: '',
          method: 'POST',
          customPayload: 'validation payload'
        })
      );
    });
  });

  it('loads saved custom payload from AsyncStorage', async () => {
    const savedConfig = {
      url: 'https://api.example.com/validate',
      method: 'POST',
      customPayload: 'saved custom payload'
    };

    mockAsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'biometric_validate_config') {
        return Promise.resolve(JSON.stringify(savedConfig));
      }
      return Promise.resolve(null);
    });

    const { getByDisplayValue } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    await waitFor(() => {
      expect(getByDisplayValue('saved custom payload')).toBeTruthy();
    });

    expect(mockOnConfigChange).toHaveBeenCalledWith('validate', savedConfig);
  });

  it('handles empty custom payload correctly for validation endpoint', () => {
    const { getByTestId } = render(
      <EndpointConfiguration
        enrollConfig={defaultEnrollConfig}
        validateConfig={defaultValidateConfig}
        onConfigChange={mockOnConfigChange}
      />
    );

    const validatePayloadInput = getByTestId('validate-custom-payload');
    
    // Set a payload first
    fireEvent.changeText(validatePayloadInput, 'test payload');
    
    // Then clear it
    fireEvent.changeText(validatePayloadInput, '');

    expect(mockOnConfigChange).toHaveBeenLastCalledWith('validate', {
      url: '',
      method: 'POST',
      customPayload: undefined
    });
  });
});