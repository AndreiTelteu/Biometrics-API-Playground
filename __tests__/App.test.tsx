/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { ThemeContextProvider, ThemeContextType } from '../src/theme/ThemeContext';
import { lightTheme } from '../src/theme/theme';

// Mock theme context for testing
const mockThemeContext: ThemeContextType = {
  theme: lightTheme,
  isDark: false,
  themeMode: 'light',
  toggleTheme: jest.fn(),
  setTheme: jest.fn(),
};

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <ThemeContextProvider value={mockThemeContext}>
        <App />
      </ThemeContextProvider>
    );
  });
});
