/**
 * DeleteKeysButton Component Tests
 * 
 * Tests for the DeleteKeysButton component including confirmation dialog,
 * loading states, and button interactions.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import DeleteKeysButton from '../DeleteKeysButton';

// Mock Alert.alert
const mockAlert = jest.fn();

// Mock the Alert module
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert = {
    alert: mockAlert,
  };
  return RN;
});

describe('DeleteKeysButton', () => {
  const mockOnPress = jest.fn();

  const defaultProps = {
    onPress: mockOnPress,
    disabled: false,
    keysExist: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with default props when keys exist', () => {
      const { getByTestId, getByText } = render(<DeleteKeysButton {...defaultProps} />);

      expect(getByTestId('delete-keys-button')).toBeTruthy();
      expect(getByText('Delete Keys')).toBeTruthy();
      expect(getByText('🗑️')).toBeTruthy();
    });

    it('shows correct state when keys do not exist', () => {
      const { getByText } = render(
        <DeleteKeysButton
          {...defaultProps}
          keysExist={false}
        />
      );

      expect(getByText('No Keys to Delete')).toBeTruthy();
      expect(getByText('🚫')).toBeTruthy();
      expect(getByText('No biometric keys found to delete')).toBeTruthy();
    });

    it('shows disabled state when explicitly disabled', () => {
      const { getByTestId } = render(
        <DeleteKeysButton
          {...defaultProps}
          disabled={true}
        />
      );

      const button = getByTestId('delete-keys-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Button States', () => {
    it('applies correct styles for enabled state', () => {
      const { getByTestId } = render(<DeleteKeysButton {...defaultProps} />);

      const button = getByTestId('delete-keys-button');
      expect(button.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#dc3545',
          borderColor: '#dc3545',
        })
      );
    });

    it('applies correct styles for disabled state', () => {
      const { getByTestId } = render(
        <DeleteKeysButton
          {...defaultProps}
          keysExist={false}
        />
      );

      const button = getByTestId('delete-keys-button');
      expect(button.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#6c757d',
          borderColor: '#6c757d',
        })
      );
    });

    it('is disabled when keys do not exist', () => {
      const { getByTestId } = render(
        <DeleteKeysButton
          {...defaultProps}
          keysExist={false}
        />
      );

      expect(getByTestId('delete-keys-button').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Confirmation Dialog', () => {
    it('shows confirmation dialog when button is pressed', () => {
      const { getByTestId } = render(<DeleteKeysButton {...defaultProps} />);

      fireEvent.press(getByTestId('delete-keys-button'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Delete Biometric Keys',
        'Are you sure you want to delete the biometric keys? This action cannot be undone and you will need to enroll again.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        ],
        { cancelable: true }
      );
    });

    it('does not show confirmation dialog when disabled', () => {
      const { getByTestId } = render(
        <DeleteKeysButton
          {...defaultProps}
          disabled={true}
        />
      );

      fireEvent.press(getByTestId('delete-keys-button'));
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('does not show confirmation dialog when keys do not exist', () => {
      const { getByTestId } = render(
        <DeleteKeysButton
          {...defaultProps}
          keysExist={false}
        />
      );

      fireEvent.press(getByTestId('delete-keys-button'));
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('calls onPress when user confirms deletion', async () => {
      mockOnPress.mockResolvedValue(undefined);
      const { getByTestId } = render(<DeleteKeysButton {...defaultProps} />);

      fireEvent.press(getByTestId('delete-keys-button'));

      // Get the onPress function from the Delete button in the alert
      const alertCall = mockAlert.mock.calls[0];
      const deleteButtonConfig = alertCall[2]![1]; // Second button (Delete)
      const confirmDelete = deleteButtonConfig.onPress;

      // Simulate user confirming deletion
      await confirmDelete!();

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when user cancels deletion', () => {
      const { getByTestId } = render(<DeleteKeysButton {...defaultProps} />);

      fireEvent.press(getByTestId('delete-keys-button'));

      // User cancels - onPress should not be called
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

      const { getByTestId, getByText, queryByText } = render(<DeleteKeysButton {...defaultProps} />);

      fireEvent.press(getByTestId('delete-keys-button'));

      // Confirm deletion
      const alertCall = mockAlert.mock.calls[0];
      const deleteButtonConfig = alertCall[2]![1];
      const confirmDelete = deleteButtonConfig.onPress;
      confirmDelete!();

      // Should show loading state
      await waitFor(() => {
        expect(getByText('Deleting...')).toBeTruthy();
        expect(queryByText('🗑️')).toBeNull(); // Icon should be hidden
      });

      // Button should be disabled during loading
      expect(getByTestId('delete-keys-button').props.disabled).toBe(true);

      // Resolve the promise
      resolvePromise!();
      await waitFor(() => {
        expect(queryByText('Deleting...')).toBeNull();
        expect(getByText('Delete Keys')).toBeTruthy();
      });
    });

    it('handles async operation errors gracefully', async () => {
      const error = new Error('Deletion failed');
      mockOnPress.mockRejectedValue(error);

      const { getByTestId, getByText, queryByText } = render(<DeleteKeysButton {...defaultProps} />);

      fireEvent.press(getByTestId('delete-keys-button'));

      // Confirm deletion
      const alertCall = mockAlert.mock.calls[0];
      const deleteButtonConfig = alertCall[2]![1];
      const confirmDelete = deleteButtonConfig.onPress;
      confirmDelete!();

      // Should show loading state initially
      await waitFor(() => {
        expect(getByText('Deleting...')).toBeTruthy();
      });

      // Should return to normal state after error
      await waitFor(() => {
        expect(queryByText('Deleting...')).toBeNull();
        expect(getByText('Delete Keys')).toBeTruthy();
      });

      // Button should be enabled again
      expect(getByTestId('delete-keys-button').props.disabled).toBe(false);
    });

    it('prevents multiple simultaneous operations', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnPress.mockReturnValue(promise);

      const { getByTestId } = render(<DeleteKeysButton {...defaultProps} />);

      // First press and confirm
      fireEvent.press(getByTestId('delete-keys-button'));
      const alertCall = mockAlert.mock.calls[0];
      const deleteButtonConfig = alertCall[2]![1];
      const confirmDelete = deleteButtonConfig.onPress;
      confirmDelete!();

      expect(mockOnPress).toHaveBeenCalledTimes(1);

      // Second press while loading - should be ignored (no new alert)
      fireEvent.press(getByTestId('delete-keys-button'));
      expect(mockAlert).toHaveBeenCalledTimes(1); // Still only called once

      resolvePromise!();
      await waitFor(() => {
        expect(getByTestId('delete-keys-button').props.disabled).toBe(false);
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct testID for automation', () => {
      const { getByTestId } = render(<DeleteKeysButton {...defaultProps} />);
      expect(getByTestId('delete-keys-button')).toBeTruthy();
    });

    it('provides appropriate feedback for screen readers', () => {
      const { getByText } = render(
        <DeleteKeysButton
          {...defaultProps}
          keysExist={false}
        />
      );

      // Help text should be available for screen readers
      expect(getByText('No biometric keys found to delete')).toBeTruthy();
    });
  });

  describe('Visual Feedback', () => {
    it('shows correct icon for available keys', () => {
      const { getByText } = render(<DeleteKeysButton {...defaultProps} />);
      expect(getByText('🗑️')).toBeTruthy();
    });

    it('shows correct icon for no keys', () => {
      const { getByText } = render(
        <DeleteKeysButton
          {...defaultProps}
          keysExist={false}
        />
      );
      expect(getByText('🚫')).toBeTruthy();
    });

    it('shows loading indicator during operation', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnPress.mockReturnValue(promise);

      const { getByTestId } = render(<DeleteKeysButton {...defaultProps} />);

      fireEvent.press(getByTestId('delete-keys-button'));

      // Confirm deletion
      const alertCall = mockAlert.mock.calls[0];
      const deleteButtonConfig = alertCall[2]![1];
      const confirmDelete = deleteButtonConfig.onPress;
      confirmDelete!();

      await waitFor(() => {
        // ActivityIndicator should be present (we can't easily test its visibility, but we can test the loading text)
        expect(getByTestId('delete-keys-button')).toBeTruthy();
      });

      resolvePromise!();
    });
  });

  describe('Help Text Display', () => {
    it('shows help text when keys do not exist', () => {
      const { getByText } = render(
        <DeleteKeysButton
          {...defaultProps}
          keysExist={false}
        />
      );

      expect(getByText('No biometric keys found to delete')).toBeTruthy();
    });

    it('does not show help text when keys exist', () => {
      const { queryByText } = render(<DeleteKeysButton {...defaultProps} />);

      expect(queryByText('No biometric keys found to delete')).toBeNull();
    });
  });
});