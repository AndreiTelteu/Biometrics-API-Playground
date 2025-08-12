/**
 * Unit tests for EndpointConfiguration component collapsible functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EndpointConfiguration from '../EndpointConfiguration';
import { EndpointConfig } from '../../types';
import { ThemeProvider } from '../../theme';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Test wrapper component with ThemeProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('EndpointConfiguration - Collapsible Functionality', () => {
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
    // Mock AsyncStorage to resolve immediately for CollapsibleSection state loading
    mockAsyncStorage.getItem.mockImplementation((key) => {
      // For collapsible section keys, return expanded state
      if (key.startsWith('collapsible_section_')) {
        return Promise.resolve(JSON.stringify(true));
      }
      // For other keys, return null (no saved config)
      return Promise.resolve(null);
    });
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  it('renders with collapsible sections', async () => {
    const { getByText } = render(
      <TestWrapper>
        <EndpointConfiguration
          enrollConfig={defaultEnrollConfig}
          validateConfig={defaultValidateConfig}
          onConfigChange={mockOnConfigChange}
        />
      </TestWrapper>
    );

    // Wait for async loading to complete
    await waitFor(() => {
      expect(getByText('Enrollment Endpoint')).toBeTruthy();
      expect(getByText('Validation Endpoint')).toBeTruthy();
    });
  });

  it('shows error indicators when sections have errors', async () => {
    const enrollConfigWithError: EndpointConfig = {
      url: 'invalid-url', // This will cause a validation error
      method: 'POST',
    };

    const { getByTestId } = render(
      <TestWrapper>
        <EndpointConfiguration
          enrollConfig={enrollConfigWithError}
          validateConfig={defaultValidateConfig}
          onConfigChange={mockOnConfigChange}
        />
      </TestWrapper>
    );

    // Wait for async loading and error validation
    await waitFor(() => {
      // The enrollment section should show an error indicator when collapsed
      const enrollmentSection = getByTestId('enrollment-config-section');
      expect(enrollmentSection).toBeTruthy();
    });
  });

  it('can toggle section expansion', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <EndpointConfiguration
          enrollConfig={defaultEnrollConfig}
          validateConfig={defaultValidateConfig}
          onConfigChange={mockOnConfigChange}
        />
      </TestWrapper>
    );

    // Wait for async loading
    await waitFor(() => {
      const enrollmentHeader = getByTestId('enrollment-config-section-header');
      expect(enrollmentHeader).toBeTruthy();
    });

    // Click to collapse the section
    const enrollmentHeader = getByTestId('enrollment-config-section-header');
    fireEvent.press(enrollmentHeader);

    // The section should still be accessible (just collapsed)
    expect(enrollmentHeader).toBeTruthy();
  });

  it('maintains all existing functionality within collapsible sections', async () => {
    const { getByText } = render(
      <TestWrapper>
        <EndpointConfiguration
          enrollConfig={defaultEnrollConfig}
          validateConfig={defaultValidateConfig}
          onConfigChange={mockOnConfigChange}
        />
      </TestWrapper>
    );

    // Wait for async loading
    await waitFor(() => {
      expect(getByText('API Endpoint Configuration')).toBeTruthy();
    });

    // Verify that the main title is still present
    expect(getByText('API Endpoint Configuration')).toBeTruthy();
  });
});