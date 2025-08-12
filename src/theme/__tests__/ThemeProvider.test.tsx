/**
 * ThemeProvider Tests
 * Unit tests for theme toggle operations and persistence
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '../useTheme';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock useColorScheme
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn(() => 'light'),
}));

// Test component that uses theme
const TestComponent = () => {
  const { theme, isDark, toggleTheme, themeMode } = useTheme();
  
  return (
    <>
      <Text testID="theme-mode">{themeMode}</Text>
      <Text testID="is-dark">{isDark.toString()}</Text>
      <Text testID="background-color">{theme.colors.background}</Text>
      <Text testID="text-color">{theme.colors.text}</Text>
      <Text testID="toggle-button" onPress={toggleTheme}>
        Toggle Theme
      </Text>
    </>
  );
};

const renderWithThemeProvider = () => {
  return render(
    <ThemeProvider>
      <TestComponent />
    </ThemeProvider>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Theme Initialization', () => {
    it('initializes with light theme by default', async () => {
      const { getByTestId } = renderWithThemeProvider();

      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('light');
        expect(getByTestId('is-dark').children[0]).toBe('false');
        expect(getByTestId('background-color').children[0]).toBe('#F2F2F7');
        expect(getByTestId('text-color').children[0]).toBe('#000000');
      });
    });

    it('loads saved theme preference from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

      const { getByTestId } = renderWithThemeProvider();

      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('dark');
        expect(getByTestId('is-dark').children[0]).toBe('true');
        expect(getByTestId('background-color').children[0]).toBe('#000000');
        expect(getByTestId('text-color').children[0]).toBe('#FFFFFF');
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@biometrics_playground:theme_mode');
    });

    it('falls back to light theme when AsyncStorage fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { getByTestId } = renderWithThemeProvider();

      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('light');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to load theme preference:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Theme Toggle Functionality', () => {
    it('toggles from light to dark theme', async () => {
      const { getByTestId } = renderWithThemeProvider();

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('light');
      });

      // Toggle theme
      await act(async () => {
        getByTestId('toggle-button').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('dark');
        expect(getByTestId('is-dark').children[0]).toBe('true');
        expect(getByTestId('background-color').children[0]).toBe('#000000');
        expect(getByTestId('text-color').children[0]).toBe('#FFFFFF');
      });
    });

    it('toggles from dark to light theme', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

      const { getByTestId } = renderWithThemeProvider();

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('dark');
      });

      // Toggle theme
      await act(async () => {
        getByTestId('toggle-button').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('light');
        expect(getByTestId('is-dark').children[0]).toBe('false');
        expect(getByTestId('background-color').children[0]).toBe('#F2F2F7');
        expect(getByTestId('text-color').children[0]).toBe('#000000');
      });
    });

    it('persists theme changes to AsyncStorage', async () => {
      const { getByTestId } = renderWithThemeProvider();

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('light');
      });

      // Toggle theme
      await act(async () => {
        getByTestId('toggle-button').props.onPress();
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@biometrics_playground:theme_mode',
          'dark'
        );
      });
    });

    it('handles AsyncStorage save errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { getByTestId } = renderWithThemeProvider();

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('light');
      });

      // Toggle theme
      await act(async () => {
        getByTestId('toggle-button').props.onPress();
      });

      // Theme should still change even if save fails
      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('dark');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save theme preference:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Theme Consistency', () => {
    it('provides consistent theme colors for light mode', async () => {
      const { getByTestId } = renderWithThemeProvider();

      await waitFor(() => {
        expect(getByTestId('background-color').children[0]).toBe('#F2F2F7');
        expect(getByTestId('text-color').children[0]).toBe('#000000');
      });
    });

    it('provides consistent theme colors for dark mode', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

      const { getByTestId } = renderWithThemeProvider();

      await waitFor(() => {
        expect(getByTestId('background-color').children[0]).toBe('#000000');
        expect(getByTestId('text-color').children[0]).toBe('#FFFFFF');
      });
    });

    it('maintains theme consistency across multiple toggles', async () => {
      const { getByTestId } = renderWithThemeProvider();

      // Start with light theme
      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('light');
      });

      // Toggle to dark
      await act(async () => {
        getByTestId('toggle-button').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('dark');
      });

      // Toggle back to light
      await act(async () => {
        getByTestId('toggle-button').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('theme-mode').children[0]).toBe('light');
        expect(getByTestId('background-color').children[0]).toBe('#F2F2F7');
        expect(getByTestId('text-color').children[0]).toBe('#000000');
      });
    });
  });

  describe('Error Handling', () => {
    it('throws error when useTheme is used outside ThemeProvider', () => {
      const TestComponentWithoutProvider = () => {
        useTheme();
        return <Text>Test</Text>;
      };

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useThemeContext must be used within a ThemeProvider');
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders during theme toggle', async () => {
      let renderCount = 0;
      
      const TestComponentWithCounter = () => {
        renderCount++;
        const { theme, toggleTheme } = useTheme();
        
        return (
          <>
            <Text testID="background-color">{theme.colors.background}</Text>
            <Text testID="toggle-button" onPress={toggleTheme}>
              Toggle Theme
            </Text>
          </>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponentWithCounter />
        </ThemeProvider>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(getByTestId('background-color')).toBeTruthy();
      });

      const initialRenderCount = renderCount;

      // Toggle theme
      await act(async () => {
        getByTestId('toggle-button').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('background-color').children[0]).toBe('#000000');
      });

      // Should only re-render once for the theme change
      expect(renderCount).toBe(initialRenderCount + 1);
    });
  });
});