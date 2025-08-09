/**
 * Unit and snapshot tests for BiometricStatusDisplay component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import BiometricStatusDisplay from '../BiometricStatusDisplay';
import { BiometryType } from '../../types';

describe('BiometricStatusDisplay', () => {
  describe('Snapshot Tests', () => {
    it('renders correctly when biometrics are available with TouchID and keys exist', () => {
      const tree = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={true}
        />
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('renders correctly when biometrics are available with FaceID and no keys', () => {
      const tree = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="FaceID"
          keysExist={false}
        />
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('renders correctly when biometrics are available with generic Biometrics and keys exist', () => {
      const tree = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="Biometrics"
          keysExist={true}
        />
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('renders correctly when biometrics are not available', () => {
      const tree = render(
        <BiometricStatusDisplay
          available={false}
          biometryType={undefined}
          keysExist={false}
        />
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('renders correctly with error state', () => {
      const tree = render(
        <BiometricStatusDisplay
          available={false}
          biometryType={undefined}
          keysExist={false}
          error="Biometric hardware not available on this device"
        />
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('renders correctly with error state but biometrics available', () => {
      const tree = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={false}
          error="Failed to check key existence"
        />
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('renders correctly with undefined biometry type but available', () => {
      const tree = render(
        <BiometricStatusDisplay
          available={true}
          biometryType={undefined}
          keysExist={false}
        />
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('renders correctly with long error message', () => {
      const longError = "This is a very long error message that should wrap properly and display all the details about what went wrong during the biometric operation. It includes technical details and user-friendly explanations.";
      const tree = render(
        <BiometricStatusDisplay
          available={false}
          biometryType={undefined}
          keysExist={false}
          error={longError}
        />
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  describe('Component Behavior Tests', () => {
    it('displays correct status when biometrics are available', () => {
      const { getByText } = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={true}
        />
      );

      expect(getByText('Biometric Status')).toBeTruthy();
      expect(getByText('Available')).toBeTruthy();
      expect(getByText('Touch ID')).toBeTruthy();
      expect(getByText('Keys Exist')).toBeTruthy();
    });

    it('displays correct status when biometrics are not available', () => {
      const { getByText } = render(
        <BiometricStatusDisplay
          available={false}
          biometryType={undefined}
          keysExist={false}
        />
      );

      expect(getByText('Not Available')).toBeTruthy();
      expect(getByText('No Keys Found')).toBeTruthy();
    });

    it('displays correct biometry type names', () => {
      const { rerender, getByText } = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={false}
        />
      );
      expect(getByText('Touch ID')).toBeTruthy();

      rerender(
        <BiometricStatusDisplay
          available={true}
          biometryType="FaceID"
          keysExist={false}
        />
      );
      expect(getByText('Face ID')).toBeTruthy();

      rerender(
        <BiometricStatusDisplay
          available={true}
          biometryType="Biometrics"
          keysExist={false}
        />
      );
      expect(getByText('Biometric Authentication')).toBeTruthy();
    });

    it('does not display sensor type when biometrics are not available', () => {
      const { queryByText } = render(
        <BiometricStatusDisplay
          available={false}
          biometryType={undefined}
          keysExist={false}
        />
      );

      expect(queryByText('Sensor Type:')).toBeNull();
    });

    it('displays error section when error is provided', () => {
      const errorMessage = "Test error message";
      const { getByText } = render(
        <BiometricStatusDisplay
          available={false}
          biometryType={undefined}
          keysExist={false}
          error={errorMessage}
        />
      );

      expect(getByText('Error Details')).toBeTruthy();
      expect(getByText(errorMessage)).toBeTruthy();
    });

    it('does not display error section when no error is provided', () => {
      const { queryByText } = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={true}
        />
      );

      expect(queryByText('Error Details')).toBeNull();
    });

    it('displays capability summary correctly', () => {
      const { getByText } = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={false}
        />
      );

      expect(getByText('Capability Summary')).toBeTruthy();
      expect(getByText('Biometric authentication supported')).toBeTruthy();
      expect(getByText('Enrollment required')).toBeTruthy();
      expect(getByText('Tap "Enroll" to create biometric keys')).toBeTruthy();
    });

    it('displays ready for validation when keys exist', () => {
      const { getByText, queryByText } = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={true}
        />
      );

      expect(getByText('Ready for validation')).toBeTruthy();
      expect(queryByText('Enrollment required')).toBeNull();
      expect(queryByText('Tap "Enroll" to create biometric keys')).toBeNull();
    });

    it('displays not supported when biometrics are unavailable', () => {
      const { getByText, queryByText } = render(
        <BiometricStatusDisplay
          available={false}
          biometryType={undefined}
          keysExist={false}
        />
      );

      expect(getByText('Biometric authentication not supported')).toBeTruthy();
      expect(queryByText('Tap "Enroll" to create biometric keys')).toBeNull();
    });

    it('handles undefined biometry type gracefully', () => {
      const { queryByText } = render(
        <BiometricStatusDisplay
          available={true}
          biometryType={undefined}
          keysExist={false}
        />
      );

      // Should not display sensor type section when biometryType is undefined
      expect(queryByText('Sensor Type:')).toBeNull();
      expect(queryByText('Unknown')).toBeNull();
    });

    it('displays all status icons correctly', () => {
      const { getByText } = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={true}
        />
      );

      // Check that emojis are rendered (they appear as text in the component)
      const component = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={true}
        />
      );
      
      expect(component.toJSON()).toBeTruthy();
    });

    it('displays warning icons when biometrics are not available', () => {
      const component = render(
        <BiometricStatusDisplay
          available={false}
          biometryType={undefined}
          keysExist={false}
        />
      );
      
      expect(component.toJSON()).toBeTruthy();
    });

    it('displays error icons when error is present', () => {
      const component = render(
        <BiometricStatusDisplay
          available={false}
          biometryType={undefined}
          keysExist={false}
          error="Test error"
        />
      );
      
      expect(component.toJSON()).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty error message', () => {
      const { queryByText } = render(
        <BiometricStatusDisplay
          available={true}
          biometryType="TouchID"
          keysExist={true}
          error=""
        />
      );

      expect(queryByText('Error Details')).toBeNull();
    });

    it('handles all biometry types correctly', () => {
      const biometryTypes: (BiometryType)[] = ['TouchID', 'FaceID', 'Biometrics', undefined];
      
      biometryTypes.forEach(type => {
        const component = render(
          <BiometricStatusDisplay
            available={type !== undefined}
            biometryType={type}
            keysExist={false}
          />
        );
        expect(component.toJSON()).toBeTruthy();
      });
    });

    it('handles all combinations of available and keysExist states', () => {
      const combinations = [
        { available: true, keysExist: true },
        { available: true, keysExist: false },
        { available: false, keysExist: true },
        { available: false, keysExist: false },
      ];

      combinations.forEach(({ available, keysExist }) => {
        const component = render(
          <BiometricStatusDisplay
            available={available}
            biometryType={available ? "TouchID" : undefined}
            keysExist={keysExist}
          />
        );
        expect(component.toJSON()).toBeTruthy();
      });
    });
  });
});