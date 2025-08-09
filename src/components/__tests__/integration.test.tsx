/**
 * Integration Tests for Biometric Action Components
 * 
 * Tests to verify that all biometric action components work together
 * and integrate properly with the main BiometricActions container.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BiometricActions from '../BiometricActions';

describe('Biometric Actions Integration', () => {
  const mockOnEnroll = jest.fn();
  const mockOnValidate = jest.fn();
  const mockOnDeleteKeys = jest.fn();

  const defaultProps = {
    onEnroll: mockOnEnroll,
    onValidate: mockOnValidate,
    onDeleteKeys: mockOnDeleteKeys,
    disabled: false,
    keysExist: true,
    biometricAvailable: true,
    endpointsConfigured: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all components without crashing', () => {
    const { getByTestId } = render(<BiometricActions {...defaultProps} />);

    expect(getByTestId('enroll-button')).toBeTruthy();
    expect(getByTestId('validate-button')).toBeTruthy();
    expect(getByTestId('delete-keys-button')).toBeTruthy();
  });

  it('handles enrollment flow', () => {
    const { getByTestId } = render(<BiometricActions {...defaultProps} />);

    fireEvent.press(getByTestId('enroll-button'));
    expect(mockOnEnroll).toHaveBeenCalledTimes(1);
  });

  it('handles validation flow when ready', () => {
    const { getByTestId } = render(<BiometricActions {...defaultProps} />);

    fireEvent.press(getByTestId('validate-button'));
    expect(mockOnValidate).toHaveBeenCalledTimes(1);
  });

  it('shows appropriate states for fresh installation', () => {
    const { getByTestId, getByText } = render(
      <BiometricActions
        {...defaultProps}
        keysExist={false}
      />
    );

    // Enroll should be available
    expect(getByText('Enroll Biometric')).toBeTruthy();
    
    // Validate should show keys needed
    expect(getByText('No Keys - Enroll First')).toBeTruthy();
    
    // Delete should show no keys
    expect(getByText('No Keys to Delete')).toBeTruthy();
  });

  it('shows appropriate states when biometrics unavailable', () => {
    const { getByText } = render(
      <BiometricActions
        {...defaultProps}
        biometricAvailable={false}
      />
    );

    expect(getByText('Biometrics Not Available')).toBeTruthy();
  });

  it('shows appropriate states when endpoints not configured', () => {
    const { getByText } = render(
      <BiometricActions
        {...defaultProps}
        endpointsConfigured={false}
      />
    );

    expect(getByText('Configure Endpoints')).toBeTruthy();
  });

  it('handles global disabled state', () => {
    const { getByTestId } = render(
      <BiometricActions
        {...defaultProps}
        disabled={true}
      />
    );

    // All buttons should be disabled
    fireEvent.press(getByTestId('enroll-button'));
    fireEvent.press(getByTestId('validate-button'));
    fireEvent.press(getByTestId('delete-keys-button'));

    expect(mockOnEnroll).not.toHaveBeenCalled();
    expect(mockOnValidate).not.toHaveBeenCalled();
    expect(mockOnDeleteKeys).not.toHaveBeenCalled();
  });
});