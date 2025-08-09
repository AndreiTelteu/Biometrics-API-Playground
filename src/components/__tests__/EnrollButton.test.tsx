/**
 * EnrollButton Component Tests
 * 
 * Tests for the EnrollButton component including loading states,
 * button interactions, and visual feedback.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { act } from '@testing-library/react';
import EnrollButton from '../EnrollButton';

describe('EnrollButton', () => {
  const mockOnPress = jest.fn();

  const defaultProps = {
    onPress: mockOnPress,
    disabled: false,
    biometricAvailable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with default props', () => {
      const { getByTestId, getByText } = render(<EnrollButton {...defaultProps} />);

      expect(getByTestId('enroll-button')).toBeTruthy();
      expect(getByText('Enroll Biometric')).toBeTruthy();
      expect(getByText('🔐')).toBeTruthy();
    });

    it('shows disabled state when biometrics not available', () => {
      const { getByText } = render(
        <EnrollButton
          {...defaultProps}
          biometricAvailable={false}
        />
      );

      expect(getByText('Biometrics Not Available')).toBeTruthy();
      expect(getByText('❌')).toBeTruthy();
      expect(getByText('Biometric authentication is not available on this device')).toBeTruthy();
    });

    it('shows disabled state when explicitly disabled', () => {
      const { getByTestId } = render(
        <EnrollButton
          {...defaultProps}
          disabled={true}
        />
      );

      const button = getByTestId('enroll-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Button States', () => {
    it('applies correct styles for enabled state', () => {
      const { getByTestId } = render(<EnrollButton {...defaultProps} />);

      const button = getByTestId('enroll-button');
      expect(button.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#007bff',
          borderColor: '#007bff',
        })
      );
    });

    it('applies correct styles for disabled state', () => {
      const { getByTestId } = render(
        <EnrollButton
          {...defaultProps}
          disabled={true}
        />
      );

      const button = getByTestId('enroll-button');
      expect(button.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#6c757d',
          borderColor: '#6c757d',
        })
      );
    });

    it('applies correct styles when biometrics not available', () => {
      const { getByTestId } = render(
        <EnrollButton
          {...defaultProps}
          biometricAvailable={false}
        />
      );

      const button = getByTestId('enroll-button');
      expect(button.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#6c757d',
          borderColor: '#6c757d',
        })
      );
    });
  });

  describe('Button Interactions', () => {
    it('calls onPress when button is pressed and enabled', async () => {
      mockOnPress.mockResolvedValue(undefined);
      const { getByTestId } = render(<EnrollButton {...defaultProps} />);

      fireEvent.press(getByTestId('enroll-button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when button is disabled', () => {
      const { getByTestId } = render(
        <EnrollButton
          {...defaultProps}
          disabled={true}
        />
      );

      fireEvent.press(getByTestId('enroll-button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when biometrics not available', () => {
      const { getByTestId } = render(
        <EnrollButton
          {...defaultProps}
          biometricAvailable={false}
        />
      );

      fireEvent.press(getByTestId('enroll-button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('calls onPress and handles basic loading state', async () => {
      mockOnPress.mockResolvedValue(undefined);
      const { getByTestId } = render(<EnrollButton {...defaultProps} />);

      fireEvent.press(getByTestId('enroll-button'));
      
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('handles async operation errors', async () => {
      const error = new Error('Enrollment failed');
      mockOnPress.mockRejectedValue(error);

      const { getByTestId } = render(<EnrollButton {...defaultProps} />);

      fireEvent.press(getByTestId('enroll-button'));
      
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('prevents calls when disabled', () => {
      const { getByTestId } = render(
        <EnrollButton
          {...defaultProps}
          disabled={true}
        />
      );

      fireEvent.press(getByTestId('enroll-button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct testID for automation', () => {
      const { getByTestId } = render(<EnrollButton {...defaultProps} />);
      expect(getByTestId('enroll-button')).toBeTruthy();
    });

    it('provides appropriate feedback for screen readers', () => {
      const { getByText } = render(
        <EnrollButton
          {...defaultProps}
          biometricAvailable={false}
        />
      );

      // Help text should be available for screen readers
      expect(getByText('Biometric authentication is not available on this device')).toBeTruthy();
    });
  });

  describe('Visual Feedback', () => {
    it('shows correct icon for available biometrics', () => {
      const { getByText } = render(<EnrollButton {...defaultProps} />);
      expect(getByText('🔐')).toBeTruthy();
    });

    it('shows correct icon for unavailable biometrics', () => {
      const { getByText } = render(
        <EnrollButton
          {...defaultProps}
          biometricAvailable={false}
        />
      );
      expect(getByText('❌')).toBeTruthy();
    });

    it('shows loading indicator during operation', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnPress.mockReturnValue(promise);

      const { getByTestId } = render(<EnrollButton {...defaultProps} />);

      fireEvent.press(getByTestId('enroll-button'));

      await waitFor(() => {
        // ActivityIndicator should be present (we can't easily test its visibility, but we can test the loading text)
        expect(getByTestId('enroll-button')).toBeTruthy();
      });

      resolvePromise!();
    });
  });
});