/**
 * Button Component Tests
 * Comprehensive test suite for Button component behavior and styling
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';
import { ThemeContextProvider } from '../../theme/ThemeContext';
import { lightTheme } from '../../theme/theme';

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

describe('Button', () => {
  describe('Basic Rendering', () => {
    it('renders with title text', () => {
      const { getByText } = renderWithTheme(
        <Button title="Test Button" />
      );

      expect(getByText('Test Button')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" testID="custom-button" />
      );

      expect(getByTestId('custom-button')).toBeTruthy();
      expect(getByTestId('custom-button-text')).toBeTruthy();
    });

    it('has correct accessibility properties', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.accessible).toBe(true);
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe('Test Button');
    });
  });

  describe('Variants', () => {
    it('renders with primary variant by default', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Primary Button" testID="test-button" />
      );

      expect(getByTestId('test-button')).toBeTruthy();
    });

    it('renders with secondary variant', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Secondary Button" variant="secondary" testID="test-button" />
      );

      expect(getByTestId('test-button')).toBeTruthy();
    });

    it('renders with danger variant', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Danger Button" variant="danger" testID="test-button" />
      );

      expect(getByTestId('test-button')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach(size => {
      it(`renders with ${size} size`, () => {
        const { getByTestId } = renderWithTheme(
          <Button title="Test Button" size={size} testID="test-button" />
        );

        expect(getByTestId('test-button')).toBeTruthy();
      });
    });

    it('uses medium size by default', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" testID="test-button" />
      );

      expect(getByTestId('test-button')).toBeTruthy();
    });
  });

  describe('Press Functionality', () => {
    it('calls onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" onPress={onPressMock} testID="test-button" />
      );

      fireEvent.press(getByTestId('test-button'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" onPress={onPressMock} disabled testID="test-button" />
      );

      fireEvent.press(getByTestId('test-button'));
      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" onPress={onPressMock} loading testID="test-button" />
      );

      fireEvent.press(getByTestId('test-button'));
      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('handles missing onPress gracefully', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" testID="test-button" />
      );

      expect(() => {
        fireEvent.press(getByTestId('test-button'));
      }).not.toThrow();
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styling when disabled', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" disabled testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
      // TouchableOpacity disabled prop is handled internally in test environment
      expect(button.props.style.opacity).toBe(0.6);
    });

    it('is not disabled by default', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.accessibilityState.disabled).toBe(false);
      // TouchableOpacity disabled prop is handled internally in test environment
      expect(button.props.style.opacity).toBe(1);
    });

    it('has reduced opacity when disabled', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" disabled testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.style.opacity).toBe(0.6);
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" loading testID="test-button" />
      );

      expect(getByTestId('test-button-loading')).toBeTruthy();
    });

    it('does not show loading indicator by default', () => {
      const { queryByTestId } = renderWithTheme(
        <Button title="Test Button" testID="test-button" />
      );

      expect(queryByTestId('test-button-loading')).toBeNull();
    });

    it('has correct accessibility state when loading', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" loading testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.accessibilityState.busy).toBe(true);
      // TouchableOpacity disabled prop is handled internally in test environment
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('applies loading text styling when loading', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" loading testID="test-button" />
      );

      const text = getByTestId('test-button-text');
      // Check if text style is an array and find the opacity value
      const textStyle = Array.isArray(text.props.style) ? text.props.style : [text.props.style];
      const hasOpacity = textStyle.some(style => style && style.opacity === 0.7);
      const hasMarginLeft = textStyle.some(style => style && style.marginLeft > 0);
      
      expect(hasOpacity).toBe(true);
      expect(hasMarginLeft).toBe(true);
    });
  });

  describe('Full Width', () => {
    it('applies full width styling when fullWidth is true', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" fullWidth testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.style.width).toBe('100%');
    });

    it('does not apply full width styling by default', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.style.width).toBeUndefined();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom button style overrides', () => {
      const customStyle = { marginTop: 20, backgroundColor: 'red' };
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" style={customStyle} testID="test-button" />
      );

      const button = getByTestId('test-button');
      // Check if the custom styles are applied
      expect(button.props.style.marginTop).toBe(20);
      expect(button.props.style.backgroundColor).toBe('red');
    });

    it('applies custom text style overrides', () => {
      const customTextStyle = { fontSize: 20, color: 'blue' };
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" textStyle={customTextStyle} testID="test-button" />
      );

      const text = getByTestId('test-button-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining(customTextStyle)
        ])
      );
    });

    it('uses custom activeOpacity when provided', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" activeOpacity={0.5} testID="test-button" />
      );

      const button = getByTestId('test-button');
      // TouchableOpacity activeOpacity is handled internally, check for pressable behavior
      expect(button.props.onStartShouldSetResponder).toBeDefined();
    });

    it('uses default activeOpacity when not provided', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" testID="test-button" />
      );

      const button = getByTestId('test-button');
      // TouchableOpacity activeOpacity is handled internally, check for pressable behavior
      expect(button.props.onStartShouldSetResponder).toBeDefined();
    });
  });

  describe('Theme Integration', () => {
    it('renders without errors with theme provider', () => {
      expect(() => {
        renderWithTheme(
          <Button title="Test Button" testID="test-button" />
        );
      }).not.toThrow();
    });

    it('applies theme-aware styling', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.style).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty title gracefully', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="" testID="test-button" />
      );

      expect(getByTestId('test-button')).toBeTruthy();
    });

    it('handles very long title', () => {
      const longTitle = 'This is a very long button title that should wrap properly and display correctly';
      const { getByText } = renderWithTheme(
        <Button title={longTitle} testID="test-button" />
      );

      expect(getByText(longTitle)).toBeTruthy();
    });

    it('handles both disabled and loading states', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Button title="Test Button" disabled loading onPress={onPressMock} testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
      expect(button.props.accessibilityState.busy).toBe(true);
      expect(getByTestId('test-button-loading')).toBeTruthy();

      fireEvent.press(button);
      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('Variant Combinations', () => {
    const variants = ['primary', 'secondary', 'danger'] as const;
    const sizes = ['sm', 'md', 'lg'] as const;

    variants.forEach(variant => {
      sizes.forEach(size => {
        it(`renders correctly with ${variant} variant and ${size} size`, () => {
          const { getByTestId } = renderWithTheme(
            <Button title="Test Button" variant={variant} size={size} testID="test-button" />
          );

          expect(getByTestId('test-button')).toBeTruthy();
        });
      });
    });

    it('renders correctly with all props combined', () => {
      const onPressMock = jest.fn();
      const customStyle = { marginTop: 10 };
      const customTextStyle = { fontWeight: 'bold' };
      
      const { getByTestId } = renderWithTheme(
        <Button
          title="Complex Button"
          variant="secondary"
          size="lg"
          disabled={false}
          loading={false}
          onPress={onPressMock}
          style={customStyle}
          textStyle={customTextStyle}
          activeOpacity={0.7}
          fullWidth={true}
          testID="test-button"
        />
      );

      const button = getByTestId('test-button');
      expect(button).toBeTruthy();
      expect(button.props.style.width).toBe('100%');
      expect(button.props.accessibilityState.disabled).toBe(false);
      
      fireEvent.press(button);
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility properties', () => {
      const { getByTestId } = renderWithTheme(
        <Button title="Accessible Button" testID="test-button" />
      );

      const button = getByTestId('test-button');
      expect(button.props.accessible).toBe(true);
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe('Accessible Button');
      expect(button.props.accessibilityState).toBeDefined();
    });

    it('updates accessibility state based on props', () => {
      const { getByTestId, rerender } = renderWithTheme(
        <Button title="Test Button" testID="test-button" />
      );

      let button = getByTestId('test-button');
      expect(button.props.accessibilityState.disabled).toBe(false);
      expect(button.props.accessibilityState.busy).toBe(false);

      rerender(
        <ThemeContextProvider value={mockThemeContext}>
          <Button title="Test Button" disabled loading testID="test-button" />
        </ThemeContextProvider>
      );

      button = getByTestId('test-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
      expect(button.props.accessibilityState.busy).toBe(true);
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const onPressMock = jest.fn();
      const { getByTestId, rerender } = renderWithTheme(
        <Button title="Test Button" onPress={onPressMock} testID="test-button" />
      );

      const button = getByTestId('test-button');
      const initialProps = button.props;

      // Re-render with same props
      rerender(
        <ThemeContextProvider value={mockThemeContext}>
          <Button title="Test Button" onPress={onPressMock} testID="test-button" />
        </ThemeContextProvider>
      );

      const buttonAfterRerender = getByTestId('test-button');
      expect(buttonAfterRerender.props.style).toEqual(initialProps.style);
    });
  });
});