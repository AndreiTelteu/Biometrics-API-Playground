/**
 * Header Component Tests
 * Unit tests for Header component rendering and theme toggle functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Header } from '../Header';
import { ThemeProvider } from '../../theme';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock useColorScheme
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn(() => 'light'),
}));

// Helper to render Header with ThemeProvider
const renderWithTheme = (props = {}) => {
  return render(
    <ThemeProvider>
      <Header {...props} />
    </ThemeProvider>
  );
};

const AsyncStorage = require('@react-native-async-storage/async-storage');

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('renders with default title and subtitle', async () => {
      const { getByText } = renderWithTheme();

      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
        expect(getByText('Test biometric authentication and backend integration')).toBeTruthy();
      });
    });

    it('renders with custom title and subtitle', async () => {
      const customProps = {
        title: 'Custom Title',
        subtitle: 'Custom subtitle text',
      };

      const { getByText } = renderWithTheme(customProps);

      await waitFor(() => {
        expect(getByText('Custom Title')).toBeTruthy();
        expect(getByText('Custom subtitle text')).toBeTruthy();
      });
    });

    it('renders theme toggle switch', async () => {
      const { getByLabelText } = renderWithTheme();

      await waitFor(() => {
        const themeToggle = getByLabelText('Switch to dark theme');
        expect(themeToggle).toBeTruthy();
      });
    });

    it('displays sun icon in light theme', async () => {
      const { getByText } = renderWithTheme();

      await waitFor(() => {
        expect(getByText('☀️')).toBeTruthy();
      });
    });
  });

  describe('Theme Toggle Functionality', () => {
    it('toggles theme when switch is pressed', async () => {
      const { getByLabelText, getByText } = renderWithTheme();

      await waitFor(() => {
        const themeToggle = getByLabelText('Switch to dark theme');
        expect(themeToggle).toBeTruthy();
      });

      const themeToggle = getByLabelText('Switch to dark theme');
      fireEvent.press(themeToggle);

      await waitFor(() => {
        expect(getByText('🌙')).toBeTruthy();
        expect(getByLabelText('Switch to light theme')).toBeTruthy();
      });
    });

    it('persists theme preference when toggled', async () => {
      const { getByLabelText } = renderWithTheme();

      await waitFor(() => {
        const themeToggle = getByLabelText('Switch to dark theme');
        fireEvent.press(themeToggle);
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@biometrics_playground:theme_mode',
          'dark'
        );
      });
    });

    it('has correct accessibility properties', async () => {
      const { getByLabelText } = renderWithTheme();

      await waitFor(() => {
        const themeToggle = getByLabelText('Switch to dark theme');
        expect(themeToggle.props.accessibilityRole).toBe('switch');
        expect(themeToggle.props.accessibilityState.checked).toBe(false);
      });
    });

    it('updates accessibility state when theme changes', async () => {
      const { getByLabelText } = renderWithTheme();

      await waitFor(() => {
        const themeToggle = getByLabelText('Switch to dark theme');
        fireEvent.press(themeToggle);
      });

      await waitFor(() => {
        const darkThemeToggle = getByLabelText('Switch to light theme');
        expect(darkThemeToggle.props.accessibilityState.checked).toBe(true);
      });
    });
  });

  describe('Styling and Layout', () => {
    it('applies theme-aware styling', async () => {
      const { getByText } = renderWithTheme();

      await waitFor(() => {
        const title = getByText('Biometrics Playground');
        expect(title.props.style).toMatchObject({
          color: '#000000', // Light theme text color
        });
      });
    });

    it('centers title content properly', async () => {
      const { getByText } = renderWithTheme();

      await waitFor(() => {
        const title = getByText('Biometrics Playground');
        expect(title.props.style).toMatchObject({
          textAlign: 'center',
        });
      });
    });

    it('positions theme toggle correctly', async () => {
      const { getByLabelText } = renderWithTheme();

      await waitFor(() => {
        const themeToggle = getByLabelText('Switch to dark theme');
        expect(themeToggle).toBeTruthy();
        // Theme toggle should be positioned absolutely in the top-right
      });
    });
  });

  describe('Animation', () => {
    it('animates theme toggle switch', async () => {
      const { getByLabelText, getByText } = renderWithTheme();

      await waitFor(() => {
        const themeToggle = getByLabelText('Switch to dark theme');
        fireEvent.press(themeToggle);
      });

      // Animation should complete and show moon icon
      await waitFor(() => {
        expect(getByText('🌙')).toBeTruthy();
      }, { timeout: 300 });
    });
  });

  describe('Error Handling', () => {
    it('handles AsyncStorage errors gracefully', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      const { getByLabelText, getByText } = renderWithTheme();

      await waitFor(() => {
        const themeToggle = getByLabelText('Switch to dark theme');
        fireEvent.press(themeToggle);
      });

      // Should still toggle theme even if storage fails
      await waitFor(() => {
        expect(getByText('🌙')).toBeTruthy();
      });
    });
  });
});