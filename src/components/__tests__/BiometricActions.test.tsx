/**
 * BiometricActions Component Tests
 * 
 * Tests for the main BiometricActions container component including
 * button state management and interaction handling.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BiometricActions from '../BiometricActions';

// Mock the individual button components
jest.mock('../EnrollButton', () => {
  const MockEnrollButton = ({ onPress, disabled, biometricAvailable }: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity
        testID="mock-enroll-button"
        onPress={onPress}
        disabled={disabled}
        accessibilityState={{ disabled }}
      >
        <Text>
          Enroll {disabled ? 'Disabled' : 'Enabled'} {biometricAvailable ? 'Available' : 'Unavailable'}
        </Text>
      </TouchableOpacity>
    );
  };
  return MockEnrollButton;
});

jest.mock('../ValidateButton', () => {
  const MockValidateButton = ({ onPress, disabled, keysExist, endpointsConfigured }: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity
        testID="mock-validate-button"
        onPress={onPress}
        disabled={disabled}
        accessibilityState={{ disabled }}
      >
        <Text>
          Validate {disabled ? 'Disabled' : 'Enabled'} Keys:{keysExist ? 'Yes' : 'No'} Endpoints:{endpointsConfigured ? 'Yes' : 'No'}
        </Text>
      </TouchableOpacity>
    );
  };
  return MockValidateButton;
});

jest.mock('../DeleteKeysButton', () => {
  const MockDeleteKeysButton = ({ onPress, disabled, keysExist }: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity
        testID="mock-delete-button"
        onPress={onPress}
        disabled={disabled}
        accessibilityState={{ disabled }}
      >
        <Text>
          Delete {disabled ? 'Disabled' : 'Enabled'} Keys:{keysExist ? 'Yes' : 'No'}
        </Text>
      </TouchableOpacity>
    );
  };
  return MockDeleteKeysButton;
});

describe('BiometricActions', () => {
  const mockOnEnroll = jest.fn();
  const mockOnValidate = jest.fn();
  const mockOnDeleteKeys = jest.fn();

  const defaultProps = {
    onEnroll: mockOnEnroll,
    onValidate: mockOnValidate,
    onDeleteKeys: mockOnDeleteKeys,
    disabled: false,
    keysExist: false,
    biometricAvailable: true,
    endpointsConfigured: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders all three action buttons', () => {
      const { getByTestId } = render(<BiometricActions {...defaultProps} />);

      expect(getByTestId('mock-enroll-button')).toBeTruthy();
      expect(getByTestId('mock-validate-button')).toBeTruthy();
      expect(getByTestId('mock-delete-button')).toBeTruthy();
    });

    it('passes correct props to EnrollButton', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          disabled={true}
          biometricAvailable={false}
        />
      );

      const enrollButton = getByTestId('mock-enroll-button');
      expect(enrollButton.props.accessibilityState.disabled).toBe(true);
      expect(enrollButton).toHaveTextContent('Enroll Disabled Unavailable');
    });

    it('passes correct props to ValidateButton', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          keysExist={true}
          endpointsConfigured={false}
        />
      );

      const validateButton = getByTestId('mock-validate-button');
      expect(validateButton.props.accessibilityState.disabled).toBe(true); // Should be disabled when endpoints not configured
      expect(validateButton).toHaveTextContent('Validate Disabled Keys:Yes Endpoints:No');
    });

    it('passes correct props to DeleteKeysButton', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          keysExist={true}
          disabled={false}
        />
      );

      const deleteButton = getByTestId('mock-delete-button');
      expect(deleteButton.props.accessibilityState.disabled).toBe(false);
      expect(deleteButton).toHaveTextContent('Delete Enabled Keys:Yes');
    });
  });

  describe('Button State Management', () => {
    it('disables EnrollButton when biometrics not available', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          biometricAvailable={false}
        />
      );

      const enrollButton = getByTestId('mock-enroll-button');
      expect(enrollButton.props.accessibilityState.disabled).toBe(true);
    });

    it('disables ValidateButton when keys do not exist', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          keysExist={false}
        />
      );

      const validateButton = getByTestId('mock-validate-button');
      expect(validateButton.props.accessibilityState.disabled).toBe(true);
    });

    it('disables ValidateButton when endpoints not configured', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          keysExist={true}
          endpointsConfigured={false}
        />
      );

      const validateButton = getByTestId('mock-validate-button');
      expect(validateButton.props.accessibilityState.disabled).toBe(true);
    });

    it('disables DeleteKeysButton when keys do not exist', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          keysExist={false}
        />
      );

      const deleteButton = getByTestId('mock-delete-button');
      expect(deleteButton.props.accessibilityState.disabled).toBe(true);
    });

    it('disables all buttons when globally disabled', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          disabled={true}
          keysExist={true}
          biometricAvailable={true}
          endpointsConfigured={true}
        />
      );

      expect(getByTestId('mock-enroll-button').props.accessibilityState.disabled).toBe(true);
      expect(getByTestId('mock-validate-button').props.accessibilityState.disabled).toBe(true);
      expect(getByTestId('mock-delete-button').props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Button Interactions', () => {
    it('calls onEnroll when EnrollButton is pressed', async () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          biometricAvailable={true}
        />
      );

      fireEvent.press(getByTestId('mock-enroll-button'));
      expect(mockOnEnroll).toHaveBeenCalledTimes(1);
    });

    it('calls onValidate when ValidateButton is pressed', async () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          keysExist={true}
          endpointsConfigured={true}
        />
      );

      fireEvent.press(getByTestId('mock-validate-button'));
      expect(mockOnValidate).toHaveBeenCalledTimes(1);
    });

    it('calls onDeleteKeys when DeleteKeysButton is pressed', async () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          keysExist={true}
        />
      );

      fireEvent.press(getByTestId('mock-delete-button'));
      expect(mockOnDeleteKeys).toHaveBeenCalledTimes(1);
    });
  });

  describe('Optimal Button States', () => {
    it('enables all buttons when conditions are optimal', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          disabled={false}
          keysExist={true}
          biometricAvailable={true}
          endpointsConfigured={true}
        />
      );

      expect(getByTestId('mock-enroll-button').props.accessibilityState.disabled).toBe(false);
      expect(getByTestId('mock-validate-button').props.accessibilityState.disabled).toBe(false);
      expect(getByTestId('mock-delete-button').props.accessibilityState.disabled).toBe(false);
    });

    it('shows correct state for fresh installation (no keys)', () => {
      const { getByTestId } = render(
        <BiometricActions
          {...defaultProps}
          disabled={false}
          keysExist={false}
          biometricAvailable={true}
          endpointsConfigured={true}
        />
      );

      // Only enroll should be enabled
      expect(getByTestId('mock-enroll-button').props.accessibilityState.disabled).toBe(false);
      expect(getByTestId('mock-validate-button').props.accessibilityState.disabled).toBe(true);
      expect(getByTestId('mock-delete-button').props.accessibilityState.disabled).toBe(true);
    });
  });
});