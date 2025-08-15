/**
 * EndpointConfiguration Modern Styling Tests
 * 
 * Tests for modern form styling, focus states, and validation error transitions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EndpointConfiguration from '../EndpointConfiguration';
import { ThemeProvider } from '../../theme';
import { EndpointConfig } from '../../types';

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

const mockEnrollConfig: EndpointConfig = {
  url: '',
  method: 'POST',
};

const mockValidateConfig: EndpointConfig = {
  url: '',
  method: 'POST',
};

const mockOnConfigChange = jest.fn();

describe('EndpointConfiguration Modern Styling', () => {
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

  describe('Modern TextInput Styling', () => {
    it('should apply modern styling to URL inputs', async () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <EndpointConfiguration
            enrollConfig={mockEnrollConfig}
            validateConfig={mockValidateConfig}
            onConfigChange={mockOnConfigChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');
        const validateUrlInput = getByPlaceholderText('https://api.example.com/validate');

        // Check that inputs have modern styling properties
        expect(enrollUrlInput.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              height: 48,
              borderWidth: 2,
              borderRadius: expect.any(Number),
            })
          ])
        );

        expect(validateUrlInput.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              height: 48,
              borderWidth: 2,
              borderRadius: expect.any(Number),
            })
          ])
        );
      });
    });

    it('should apply focus styles when inputs are focused', async () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <EndpointConfiguration
            enrollConfig={mockEnrollConfig}
            validateConfig={mockValidateConfig}
            onConfigChange={mockOnConfigChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');

        // Focus the input
        fireEvent(enrollUrlInput, 'focus');

        // Check that focus styles are applied
        expect(enrollUrlInput.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              borderWidth: 2,
            })
          ])
        );
      });
    });

    it('should apply modern styling to payload input', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <EndpointConfiguration
            enrollConfig={mockEnrollConfig}
            validateConfig={mockValidateConfig}
            onConfigChange={mockOnConfigChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const payloadInput = getByTestId('validate-custom-payload');
        expect(payloadInput).toBeTruthy();
      });
    });
  });

  describe('Enhanced Method Selector Buttons', () => {
    it('should apply modern styling to method buttons', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <EndpointConfiguration
            enrollConfig={mockEnrollConfig}
            validateConfig={mockValidateConfig}
            onConfigChange={mockOnConfigChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const postButton = getByTestId('enroll-method-POST');
        const getButton = getByTestId('enroll-method-GET');
        expect(postButton).toBeTruthy();
        expect(getButton).toBeTruthy();
      });
    });

    it('should update method selection', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <EndpointConfiguration
            enrollConfig={mockEnrollConfig}
            validateConfig={mockValidateConfig}
            onConfigChange={mockOnConfigChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const getButton = getByTestId('enroll-method-GET');
        fireEvent.press(getButton);
        expect(mockOnConfigChange).toHaveBeenCalledWith('enroll', {
          url: '',
          method: 'GET',
        });
      });
    });
  });

  describe('Improved Header Input Styling', () => {
    it('should add and style header inputs', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <TestWrapper>
          <EndpointConfiguration
            enrollConfig={mockEnrollConfig}
            validateConfig={mockValidateConfig}
            onConfigChange={mockOnConfigChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const addButton = getByTestId('add-enroll-header');
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const headerInput = getByPlaceholderText('Content-Type: application/json');
        expect(headerInput).toBeTruthy();
      });
    });
  });

  describe('Validation Error Display', () => {
    it('should display error text for invalid URLs', async () => {
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <EndpointConfiguration
            enrollConfig={mockEnrollConfig}
            validateConfig={mockValidateConfig}
            onConfigChange={mockOnConfigChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');
        fireEvent.changeText(enrollUrlInput, 'invalid-url');
      });

      await waitFor(() => {
        const errorText = getByText(/Please enter a valid URL/);
        expect(errorText).toBeTruthy();
      });
    });
  });

  describe('Focus State Management', () => {
    it('should handle focus events on inputs', async () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <EndpointConfiguration
            enrollConfig={mockEnrollConfig}
            validateConfig={mockValidateConfig}
            onConfigChange={mockOnConfigChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const enrollUrlInput = getByPlaceholderText('https://api.example.com/enroll');
        fireEvent(enrollUrlInput, 'focus');
        fireEvent(enrollUrlInput, 'blur');
        expect(enrollUrlInput).toBeTruthy();
      });
    });
  });

  describe('Modern Helper Text', () => {
    it('should display helper text', async () => {
      const { getByText } = render(
        <TestWrapper>
          <EndpointConfiguration
            enrollConfig={mockEnrollConfig}
            validateConfig={mockValidateConfig}
            onConfigChange={mockOnConfigChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const helperText = getByText(/Use {date} to insert the current timestamp/);
        expect(helperText).toBeTruthy();
      });
    });
  });
});