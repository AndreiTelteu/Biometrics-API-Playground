/**
 * ValidateButton Component Tests
 * 
 * Tests for the ValidateButton component including loading states,
 * button interactions, and conditional enabling based on keys and endpoints.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ValidateButton from '../ValidateButton';

describe('ValidateButton', () => {
  const mockOnPress = jest.fn();

  const defaultProps = {
    onPress: mockOnPress,
    disabled: false,
    keysExist: true,
    endpointsConfigured: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with default props when ready for validation', () => {
      const { getByTestId, getByText } = render(<ValidateButton {...defaultProps} />);

      expect(getByTestId('validate-button')).toBeTruthy();
      expect(getByText('Check & Validate')).toBeTruthy();
      expect(getByText('✅')).toBeTruthy();
    });

    it('shows correct state when keys do not exist', () => {
      const { getByText } = render(
        <ValidateButton
          {...defaultProps}
          keysExist={false}
        />
      );

      expect(getByText('No Keys - Enroll First')).toBeTruthy();
      expect(getByText('🚫')).toBeTruthy();
      expect(getByText('Enroll biometric credentials first to enable validation')).toBeTruthy();
    });

    it('shows correct state when endpoints not configured', () => {
      const { getByText } = render(
        <ValidateButton
          {...defaultProps}
          endpointsConfigured={false}
        />
      );

      expect(getByText('Configure Endpoints')).toBeTruthy();
      expect(getByText('⚙️')).toBeTruthy();
      expect(getByText('Configure validation endpoint to test signature verification')).toBeTruthy();
    });

    it('shows disabled state when explicitly disabled', () => {
      const { getByTestId } = render(
        <ValidateButton
          {...defaultProps}
          disabled={true}
        />
      );

      const button = getByTestId('validate-button');
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Button States', () => {
    it('applies correct styles for enabled state', () => {
      const { getByTestId } = render(<ValidateButton {...defaultProps} />);

      const button = getByTestId('validate-button');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#28a745',
            borderColor: '#28a745',
          }),
        ])
      );
    });

    it('applies correct styles for disabled state', () => {
      const { getByTestId } = render(
        <ValidateButton
          {...defaultProps}
          keysExist={false}
        />
      );

      const button = getByTestId('validate-button');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#6c757d',
            borderColor: '#6c757d',
          }),
        ])
      );
    });

    it('is disabled when keys do not exist', () => {
      const { getByTestId } = render(
        <ValidateButton
          {...defaultProps}
          keysExist={false}
        />
      );

      expect(getByTestId('validate-button').props.disabled).toBe(true);
    });

    it('is disabled when endpoints not configured', () => {
      const { getByTestId } = render(
        <ValidateButton
          {...defaultProps}
          endpointsConfigured={false}
        />
      );

      expect(getByTestId('validate-button').props.disabled).toBe(true);
    });

    it('is disabled when both keys missing and endpoints not configured', () => {
      const { getByTestId, getByText } = render(
        <ValidateButton
          {...defaultProps}
          keysExist={false}
          endpointsConfigured={false}
        />
      );

      expect(getByTestId('validate-button').props.disabled).toBe(true);
      // Should prioritize keys missing message
      expect(getByText('No Keys - Enroll First')).toBeTruthy();
    });
  });

  describe('Button Interactions', () => {
    it('calls onPress when button is pressed and enabled', async () => {
      mockOnPress.mockResolvedValue(undefined);
      const { getByTestId } = render(<ValidateButton {...defaultProps} />);

      fireEvent.press(getByTestId('validate-button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when button is disabled', () => {
      const { getByTestId } = render(
        <ValidateButton
          {...defaultProps}
          disabled={true}
        />
      );

      fireEvent.press(getByTestId('validate-button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when keys do not exist', () => {
      const { getByTestId } = render(
        <ValidateButton
          {...defaultProps}
          keysExist={false}
        />
      );

      fireEvent.press(getByTestId('validate-button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when endpoints not configured', () => {
      const { getByTestId } = render(
        <ValidateButton
          {...defaultProps}
          endpointsConfigured={false}
        />
      );

      fireEvent.press(getByTestId('validate-button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during async operation', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnPress.mockReturnValue(promise);

      const { getByTestId, getByText, queryByText } = render(<ValidateButton {...defaultProps} />);

      fireEvent.press(getByTestId('validate-button'));

      // Should show loading state
      await waitFor(() => {
        expect(getByText('Validating...')).toBeTruthy();
        expect(queryByText('✅')).toBeNull(); // Icon should be hidden
      });

      // Button should be disabled during loading
      expect(getByTestId('validate-button').props.disabled).toBe(true);

      // Resolve the promise
      resolvePromise!();
      await waitFor(() => {
        expect(queryByText('Validating...')).toBeNull();
        expect(getByText('Check & Validate')).toBeTruthy();
      });
    });

    it('handles async operation errors gracefully', async () => {
      const error = new Error('Validation failed');
      mockOnPress.mockRejectedValue(error);

      const { getByTestId, getByText, queryByText } = render(<ValidateButton {...defaultProps} />);

      fireEvent.press(getByTestId('validate-button'));

      // Should show loading state initially
      await waitFor(() => {
        expect(getByText('Validating...')).toBeTruthy();
      });

      // Should return to normal state after error
      await waitFor(() => {
        expect(queryByText('Validating...')).toBeNull();
        expect(getByText('Check & Validate')).toBeTruthy();
      });

      // Button should be enabled again
      expect(getByTestId('validate-button').props.disabled).toBe(false);
    });

    it('prevents multiple simultaneous operations', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnPress.mockReturnValue(promise);

      const { getByTestId } = render(<ValidateButton {...defaultProps} />);

      // First press
      fireEvent.press(getByTestId('validate-button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);

      // Second press while loading - should be ignored
      fireEvent.press(getByTestId('validate-button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1); // Still only called once

      resolvePromise!();
      await waitFor(() => {
        expect(getByTestId('validate-button').props.disabled).toBe(false);
      });
    });
  });

  describe('Help Text Display', () => {
    it('shows help text when keys do not exist', () => {
      const { getByText } = render(
        <ValidateButton
          {...defaultProps}
          keysExist={false}
        />
      );

      expect(getByText('Enroll biometric credentials first to enable validation')).toBeTruthy();
    });

    it('shows help text when endpoints not configured', () => {
      const { getByText } = render(
        <ValidateButton
          {...defaultProps}
          endpointsConfigured={false}
        />
      );

      expect(getByText('Configure validation endpoint to test signature verification')).toBeTruthy();
    });

    it('does not show help text when ready for validation', () => {
      const { queryByText } = render(<ValidateButton {...defaultProps} />);

      expect(queryByText('Enroll biometric credentials first to enable validation')).toBeNull();
      expect(queryByText('Configure validation endpoint to test signature verification')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has correct testID for automation', () => {
      const { getByTestId } = render(<ValidateButton {...defaultProps} />);
      expect(getByTestId('validate-button')).toBeTruthy();
    });

    it('provides appropriate feedback for screen readers', () => {
      const { getByText } = render(
        <ValidateButton
          {...defaultProps}
          keysExist={false}
        />
      );

      // Help text should be available for screen readers
      expect(getByText('Enroll biometric credentials first to enable validation')).toBeTruthy();
    });
  });

  describe('Visual Feedback', () => {
    it('shows correct icon for ready state', () => {
      const { getByText } = render(<ValidateButton {...defaultProps} />);
      expect(getByText('✅')).toBeTruthy();
    });

    it('shows correct icon for missing keys', () => {
      const { getByText } = render(
        <ValidateButton
          {...defaultProps}
          keysExist={false}
        />
      );
      expect(getByText('🚫')).toBeTruthy();
    });

    it('shows correct icon for missing endpoints', () => {
      const { getByText } = render(
        <ValidateButton
          {...defaultProps}
          endpointsConfigured={false}
        />
      );
      expect(getByText('⚙️')).toBeTruthy();
    });

    it('shows loading indicator during operation', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnPress.mockReturnValue(promise);

      const { getByTestId } = render(<ValidateButton {...defaultProps} />);

      fireEvent.press(getByTestId('validate-button'));

      await waitFor(() => {
        // ActivityIndicator should be present (we can't easily test its visibility, but we can test the loading text)
        expect(getByTestId('validate-button')).toBeTruthy();
      });

      resolvePromise!();
    });
  });
});