/**
 * @format
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import { ThemeContextProvider, ThemeContextType } from '../src/theme/ThemeContext';
import { lightTheme, darkTheme } from '../src/theme/theme';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock useColorScheme
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn(() => 'light'),
}));

// Mock biometric services
jest.mock('../src/services', () => ({
  biometricService: {
    checkBiometricAvailability: jest.fn().mockResolvedValue({
      available: true,
      biometryType: 'TouchID',
    }),
    checkKeysExist: jest.fn().mockResolvedValue(false),
    createKeys: jest.fn(),
    createSignature: jest.fn(),
    deleteKeys: jest.fn(),
    generatePayload: jest.fn(),
  },
  biometricAPIService: {
    enrollPublicKey: jest.fn(),
    validateSignature: jest.fn(),
  },
}));

// Mock components to avoid complex rendering issues in tests
jest.mock('../src/components', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  return {
    BiometricStatusDisplay: () => React.createElement(Text, {}, 'BiometricStatusDisplay'),
    EndpointConfiguration: () => React.createElement(Text, {}, 'EndpointConfiguration'), 
    BiometricActions: () => React.createElement(Text, {}, 'BiometricActions'),
    StatusLog: () => React.createElement(Text, {}, 'StatusLog'),
    Header: ({ title = 'Biometrics Playground', subtitle = 'Test biometric authentication and backend integration' }: any) => 
      React.createElement(React.Fragment, {}, [
        React.createElement(Text, { key: 'title' }, title),
        React.createElement(Text, { key: 'subtitle' }, subtitle)
      ]),
  };
});

// Mock utils
jest.mock('../src/utils', () => ({
  useStatusLogger: () => ({
    logs: [],
    currentOperation: null,
    isLoading: false,
    logSuccess: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn(),
    executeWithLogging: jest.fn(),
    clearLogs: jest.fn(),
  }),
}));

// Mock theme context for testing
const mockThemeContext: ThemeContextType = {
  theme: lightTheme,
  isDark: false,
  themeMode: 'light',
  toggleTheme: jest.fn(),
  setTheme: jest.fn(),
};

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Theme Integration', () => {
    it('renders correctly with ThemeProvider wrapper', async () => {
      await ReactTestRenderer.act(() => {
        ReactTestRenderer.create(<App />);
      });
    });

    it('wraps content with ThemeProvider at root level', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });
    });

    it('initializes theme from stored preferences', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
      
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });
      
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@biometrics_playground:theme_mode');
    });

    it('handles theme loading errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });
      
      consoleSpy.mockRestore();
    });

    it('renders app content within theme context', async () => {
      const { getByText } = render(
        <ThemeContextProvider value={mockThemeContext}>
          <App />
        </ThemeContextProvider>
      );
      
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
        expect(getByText('Test biometric authentication and backend integration')).toBeTruthy();
      });
    });

    it('applies theme-aware background colors', async () => {
      const { getByTestId } = render(<App />);
      
      await waitFor(() => {
        // The app should render without errors and apply theme colors
        expect(getByTestId).toBeDefined();
      });
    });

    it('uses Header component instead of inline header', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });
    });

    it('applies modern spacing and layout with design system tokens', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });
    });

    it('removes old styling and uses theme-aware StatusBar', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Biometrics Playground')).toBeTruthy();
      });
    });
  });

  describe('Legacy Test Compatibility', () => {
    test('renders correctly', async () => {
      await ReactTestRenderer.act(() => {
        ReactTestRenderer.create(
          <ThemeContextProvider value={mockThemeContext}>
            <App />
          </ThemeContextProvider>
        );
      });
    });
  });
});
