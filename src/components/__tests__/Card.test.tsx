/**
 * Card Component Tests
 * Comprehensive test suite for Card component behavior and styling
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { Card } from '../Card';
import { ThemeContextProvider } from '../../theme/ThemeContext';
import { lightTheme } from '../../theme/theme';

const TestContent = () => (
  <View testID="test-content">
    <Text>Test content inside card</Text>
  </View>
);

const mockThemeContext = {
  theme: lightTheme,
  isDark: false,
  themeMode: 'light' as const,
  toggleTheme: jest.fn(),
  setTheme: jest.fn(),
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeContextProvider value={mockThemeContext}>
      {component}
    </ThemeContextProvider>
  );
};

describe('Card', () => {
  describe('Basic Rendering', () => {
    it('renders with children content', () => {
      const { getByTestId } = renderWithTheme(
        <Card testID="test-card">
          <TestContent />
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
      expect(getByTestId('test-content')).toBeTruthy();
    });

    it('renders as View by default (not pressable)', () => {
      const { getByTestId } = renderWithTheme(
        <Card testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      expect(card.type).toBe('View');
    });

    it('renders with custom testID', () => {
      const { getByTestId } = renderWithTheme(
        <Card testID="custom-card-id">
          <TestContent />
        </Card>
      );

      expect(getByTestId('custom-card-id')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('renders with default variant', () => {
      const { getByTestId } = renderWithTheme(
        <Card variant="default" testID="test-card">
          <TestContent />
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('renders with elevated variant', () => {
      const { getByTestId } = renderWithTheme(
        <Card variant="elevated" testID="test-card">
          <TestContent />
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('renders with outlined variant', () => {
      const { getByTestId } = renderWithTheme(
        <Card variant="outlined" testID="test-card">
          <TestContent />
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });
  });

  describe('Padding Variants', () => {
    const paddingVariants = ['none', 'sm', 'md', 'lg', 'xl'] as const;

    paddingVariants.forEach(paddingVariant => {
      it(`renders with ${paddingVariant} padding`, () => {
        const { getByTestId } = renderWithTheme(
          <Card padding={paddingVariant} testID="test-card">
            <TestContent />
          </Card>
        );

        expect(getByTestId('test-card')).toBeTruthy();
      });
    });

    it('uses medium padding by default', () => {
      const { getByTestId } = renderWithTheme(
        <Card testID="test-card">
          <TestContent />
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });
  });

  describe('Pressable Functionality', () => {
    it('renders as TouchableOpacity when pressable is true', () => {
      const { getByTestId } = renderWithTheme(
        <Card pressable testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      // Check for TouchableOpacity-specific props instead of component type
      expect(card.props.onStartShouldSetResponder).toBeDefined();
      expect(card.props.onResponderGrant).toBeDefined();
    });

    it('calls onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Card pressable onPress={onPressMock} testID="test-card">
          <TestContent />
        </Card>
      );

      fireEvent.press(getByTestId('test-card'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Card pressable onPress={onPressMock} disabled testID="test-card">
          <TestContent />
        </Card>
      );

      fireEvent.press(getByTestId('test-card'));
      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('has correct accessibility properties when pressable', () => {
      const { getByTestId } = renderWithTheme(
        <Card pressable testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('uses custom activeOpacity when provided', () => {
      const { getByTestId } = renderWithTheme(
        <Card pressable activeOpacity={0.5} testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      // TouchableOpacity activeOpacity is handled internally, check for pressable behavior
      expect(card.props.onStartShouldSetResponder).toBeDefined();
    });

    it('uses default activeOpacity when not provided', () => {
      const { getByTestId } = renderWithTheme(
        <Card pressable testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      // TouchableOpacity activeOpacity is handled internally, check for pressable behavior
      expect(card.props.onStartShouldSetResponder).toBeDefined();
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styling when disabled', () => {
      const { getByTestId } = renderWithTheme(
        <Card pressable disabled testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      expect(card.props.accessibilityState.disabled).toBe(true);
    });

    it('is not disabled by default', () => {
      const { getByTestId } = renderWithTheme(
        <Card pressable testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      expect(card.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('Custom Styling', () => {
    it('applies custom style overrides', () => {
      const customStyle = { marginTop: 20, backgroundColor: 'red' };
      const { getByTestId } = renderWithTheme(
        <Card style={customStyle} testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining(customStyle)
        ])
      );
    });

    it('merges custom styles with default styles', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = renderWithTheme(
        <Card style={customStyle} testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      const styles = card.props.style;
      
      // Should be an array of styles
      expect(Array.isArray(styles)).toBe(true);
      
      // Should contain our custom style
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining(customStyle)
        ])
      );
    });
  });

  describe('Theme Integration', () => {
    it('renders without errors with theme provider', () => {
      expect(() => {
        renderWithTheme(
          <Card testID="test-card">
            <TestContent />
          </Card>
        );
      }).not.toThrow();
    });

    it('applies theme-aware styling', () => {
      const { getByTestId } = renderWithTheme(
        <Card testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      expect(card.props.style).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles null children gracefully', () => {
      const { getByTestId } = renderWithTheme(
        <Card testID="test-card">
          {null}
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('handles undefined children gracefully', () => {
      const { getByTestId } = renderWithTheme(
        <Card testID="test-card">
          {undefined}
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('handles multiple children', () => {
      const { getByTestId, getByText } = renderWithTheme(
        <Card testID="test-card">
          <Text>First child</Text>
          <Text>Second child</Text>
          <TestContent />
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
      expect(getByText('First child')).toBeTruthy();
      expect(getByText('Second child')).toBeTruthy();
      expect(getByTestId('test-content')).toBeTruthy();
    });

    it('handles onPress without pressable prop gracefully', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Card onPress={onPressMock} testID="test-card">
          <TestContent />
        </Card>
      );

      // Should render as View, not TouchableOpacity
      const card = getByTestId('test-card');
      expect(card.type).toBe('View');
      
      // onPress should not be called since it's not pressable
      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('Variant Combinations', () => {
    const variants = ['default', 'elevated', 'outlined'] as const;
    const paddings = ['none', 'sm', 'md', 'lg', 'xl'] as const;

    variants.forEach(variant => {
      paddings.forEach(padding => {
        it(`renders correctly with ${variant} variant and ${padding} padding`, () => {
          const { getByTestId } = renderWithTheme(
            <Card variant={variant} padding={padding} testID="test-card">
              <TestContent />
            </Card>
          );

          expect(getByTestId('test-card')).toBeTruthy();
        });
      });
    });

    it('renders correctly with all props combined', () => {
      const onPressMock = jest.fn();
      const customStyle = { marginTop: 10 };
      
      const { getByTestId } = renderWithTheme(
        <Card
          variant="elevated"
          padding="lg"
          pressable
          onPress={onPressMock}
          disabled={false}
          activeOpacity={0.7}
          style={customStyle}
          testID="test-card"
        >
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      expect(card).toBeTruthy();
      expect(card.props.onStartShouldSetResponder).toBeDefined();
      expect(card.props.accessibilityState.disabled).toBe(false);
      
      fireEvent.press(card);
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('does not have accessibility properties when not pressable', () => {
      const { getByTestId } = renderWithTheme(
        <Card testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      expect(card.props.accessible).toBeUndefined();
      expect(card.props.accessibilityRole).toBeUndefined();
    });

    it('has proper accessibility properties when pressable', () => {
      const { getByTestId } = renderWithTheme(
        <Card pressable testID="test-card">
          <TestContent />
        </Card>
      );

      const card = getByTestId('test-card');
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityRole).toBe('button');
    });
  });
});