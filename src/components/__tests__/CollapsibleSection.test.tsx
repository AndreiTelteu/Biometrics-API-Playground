/**
 * CollapsibleSection Component Tests
 * Comprehensive test suite for CollapsibleSection component behavior
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CollapsibleSection } from '../CollapsibleSection';
import { ThemeProvider } from '../../theme';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock LayoutAnimation
const mockConfigureNext = jest.fn();

// Mock just the LayoutAnimation module
jest.mock('react-native/Libraries/LayoutAnimation/LayoutAnimation', () => ({
  configureNext: mockConfigureNext,
  Types: {
    easeInEaseOut: 'easeInEaseOut',
  },
  Properties: {
    opacity: 'opacity',
    scaleXY: 'scaleXY',
  },
}));

const TestContent = () => (
  <View testID="test-content">
    <Text>Test content inside collapsible section</Text>
  </View>
);

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('CollapsibleSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigureNext.mockClear();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Basic Rendering', () => {
    it('renders with title and content when expanded by default', async () => {
      const { getByText, getByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByText('Test Section')).toBeTruthy();
        expect(getByTestId('test-content')).toBeTruthy();
      });
    });

    it('renders with custom testID', async () => {
      const { getByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="custom-test-id">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('custom-test-id')).toBeTruthy();
        expect(getByTestId('custom-test-id-header')).toBeTruthy();
        expect(getByTestId('custom-test-id-content')).toBeTruthy();
        expect(getByTestId('custom-test-id-chevron')).toBeTruthy();
      });
    });

    it('renders collapsed when defaultExpanded is false', async () => {
      const { getByText, queryByTestId } = renderWithTheme(
        <CollapsibleSection
          id="test-section"
          title="Test Section"
          defaultExpanded={false}
          testID="collapsible"
        >
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByText('Test Section')).toBeTruthy();
        expect(queryByTestId('test-content')).toBeNull();
      });
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('toggles content visibility when header is pressed', async () => {
      const { getByTestId, queryByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
      });

      // Collapse
      act(() => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      await waitFor(() => {
        expect(queryByTestId('test-content')).toBeNull();
      });

      // Expand again
      act(() => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
      });
    });

    it('calls onToggle callback when state changes', async () => {
      const onToggleMock = jest.fn();
      const { getByTestId } = renderWithTheme(
        <CollapsibleSection
          id="test-section"
          title="Test Section"
          onToggle={onToggleMock}
          testID="collapsible"
        >
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('collapsible-header')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      await waitFor(() => {
        expect(onToggleMock).toHaveBeenCalledWith(false);
      });

      act(() => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      await waitFor(() => {
        expect(onToggleMock).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Error Indication', () => {
    it('shows error indicator when hasErrors is true and section is collapsed', async () => {
      const { getByTestId, queryByTestId } = renderWithTheme(
        <CollapsibleSection
          id="test-section"
          title="Test Section"
          hasErrors={true}
          defaultExpanded={false}
          testID="collapsible"
        >
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('collapsible-error-indicator')).toBeTruthy();
      });

      // Expand section
      act(() => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      await waitFor(() => {
        expect(queryByTestId('collapsible-error-indicator')).toBeNull();
      });
    });

    it('does not show error indicator when hasErrors is false', async () => {
      const { queryByTestId } = renderWithTheme(
        <CollapsibleSection
          id="test-section"
          title="Test Section"
          hasErrors={false}
          defaultExpanded={false}
          testID="collapsible"
        >
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(queryByTestId('collapsible-error-indicator')).toBeNull();
      });
    });

    it('does not show error indicator when expanded even with errors', async () => {
      const { queryByTestId } = renderWithTheme(
        <CollapsibleSection
          id="test-section"
          title="Test Section"
          hasErrors={true}
          defaultExpanded={true}
          testID="collapsible"
        >
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(queryByTestId('collapsible-error-indicator')).toBeNull();
      });
    });
  });

  describe('State Persistence', () => {
    it('loads saved state from AsyncStorage on mount', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

      const { queryByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('collapsible_section_test-section');
        expect(queryByTestId('test-content')).toBeNull();
      });
    });

    it('saves state to AsyncStorage when toggled', async () => {
      const { getByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('collapsible-header')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'collapsible_section_test-section',
          'false'
        );
      });
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { getByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to load collapsible section state:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('handles AsyncStorage save errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { getByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('collapsible-header')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save collapsible section state:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Animation Behavior', () => {
    it('handles layout animation gracefully', async () => {
      const { getByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('collapsible-header')).toBeTruthy();
      });

      // Should not throw error even if LayoutAnimation is not available
      expect(() => {
        act(() => {
          fireEvent.press(getByTestId('collapsible-header'));
        });
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility structure', async () => {
      const { getByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        const header = getByTestId('collapsible-header');
        expect(header).toBeTruthy();
        expect(header.props.accessible).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing children gracefully', async () => {
      const { getByText } = renderWithTheme(
        <CollapsibleSection id="test-section" title="Test Section" testID="collapsible">
          {null}
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByText('Test Section')).toBeTruthy();
      });
    });

    it('handles empty string title', async () => {
      const { getByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section" title="" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('collapsible')).toBeTruthy();
      });
    });

    it('handles special characters in id', async () => {
      const { getByTestId } = renderWithTheme(
        <CollapsibleSection id="test-section-123_special" title="Test" testID="collapsible">
          <TestContent />
        </CollapsibleSection>
      );

      await waitFor(() => {
        expect(getByTestId('collapsible')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByTestId('collapsible-header'));
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'collapsible_section_test-section-123_special',
          'false'
        );
      });
    });
  });
});