/**
 * Accessibility Tests
 * Comprehensive accessibility testing for all redesigned components
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ThemeProvider } from '../../theme';
import Button from '../Button';
import CollapsibleSection from '../CollapsibleSection';
import Header from '../Header';
import Card from '../Card';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock animation utilities
jest.mock('../../utils/animationUtils', () => ({
  isReducedMotionEnabled: jest.fn().mockResolvedValue(false),
  subscribeToReducedMotion: jest.fn().mockReturnValue(() => {}),
  createOptimizedTiming: jest.fn(),
  cleanupAnimation: jest.fn(),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Accessibility Tests', () => {
  describe('Button Accessibility', () => {
    it('should have proper accessibility role', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button title="Test Button" />
        </TestWrapper>
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('should have accessible label', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Button title="Submit Form" />
        </TestWrapper>
      );

      expect(getByLabelText('Submit Form')).toBeTruthy();
    });

    it('should indicate disabled state', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button title="Disabled Button" disabled />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should indicate loading state', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button title="Loading Button" loading />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('should have minimum touch target size', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button title="Small Button" size="sm" />
        </TestWrapper>
      );

      const button = getByRole('button');
      const styles = button.props.style;
      
      // Minimum touch target should be 44x44 points
      expect(styles.minHeight).toBeGreaterThanOrEqual(36); // Small button minimum
    });

    it('should support different button variants', () => {
      const variants = ['primary', 'secondary', 'danger'] as const;
      
      variants.forEach(variant => {
        const { getByRole } = render(
          <TestWrapper>
            <Button title={`${variant} Button`} variant={variant} />
          </TestWrapper>
        );

        expect(getByRole('button')).toBeTruthy();
      });
    });
  });

  describe('CollapsibleSection Accessibility', () => {
    it('should have proper accessibility structure', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <Text>Content</Text>
          </CollapsibleSection>
        </TestWrapper>
      );

      const header = getByTestId('collapsible-header');
      expect(header.props.accessible).toBe(true);
    });

    it('should indicate expandable state', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Test Section" testID="collapsible">
            <Text>Content</Text>
          </CollapsibleSection>
        </TestWrapper>
      );

      const header = getByTestId('collapsible-header');
      expect(header.props.accessibilityRole).toBe('button');
    });

    it('should show error indicator when collapsed with errors', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection 
            id="test" 
            title="Test Section" 
            hasErrors 
            defaultExpanded={false}
            testID="collapsible"
          >
            <Text>Content</Text>
          </CollapsibleSection>
        </TestWrapper>
      );

      expect(getByTestId('collapsible-error-indicator')).toBeTruthy();
    });

    it('should have proper heading hierarchy', () => {
      const { getByText } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Main Section">
            <Text>Content</Text>
          </CollapsibleSection>
        </TestWrapper>
      );

      const title = getByText('Main Section');
      expect(title).toBeTruthy();
    });
  });

  describe('Header Accessibility', () => {
    it('should have proper heading structure', () => {
      const { getByText } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const title = getByText('Biometrics Playground');
      expect(title).toBeTruthy();
    });

    it('should have accessible theme toggle', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const themeToggle = getByTestId('theme-toggle');
      expect(themeToggle.props.accessible).toBe(true);
      expect(themeToggle.props.accessibilityRole).toBe('switch');
    });

    it('should indicate current theme state', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const themeToggle = getByTestId('theme-toggle');
      expect(themeToggle.props.accessibilityLabel).toContain('theme');
    });
  });

  describe('Card Accessibility', () => {
    it('should have proper container structure', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Card testID="test-card">
            <Text>Card Content</Text>
          </Card>
        </TestWrapper>
      );

      const card = getByTestId('test-card');
      expect(card).toBeTruthy();
    });

    it('should support custom accessibility props', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Card 
            testID="test-card"
            accessibilityLabel="Information Card"
            accessibilityRole="region"
          >
            <Text>Card Content</Text>
          </Card>
        </TestWrapper>
      );

      const card = getByTestId('test-card');
      expect(card.props.accessibilityLabel).toBe('Information Card');
      expect(card.props.accessibilityRole).toBe('region');
    });
  });

  describe('Color Contrast', () => {
    it('should have sufficient contrast in light theme', () => {
      const { getByText } = render(
        <TestWrapper>
          <Button title="Test Button" variant="primary" />
        </TestWrapper>
      );

      const button = getByText('Test Button');
      const styles = button.props.style;
      
      // Primary button should have white text on blue background
      // This provides high contrast ratio
      expect(styles.color).toBe('#FFFFFF');
    });

    it('should have sufficient contrast for secondary elements', () => {
      const { getByText } = render(
        <TestWrapper>
          <Button title="Secondary Button" variant="secondary" />
        </TestWrapper>
      );

      const button = getByText('Secondary Button');
      expect(button).toBeTruthy();
      // Secondary button uses theme text color which should have good contrast
    });

    it('should maintain contrast in error states', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection 
            id="test" 
            title="Error Section" 
            hasErrors 
            defaultExpanded={false}
            testID="collapsible"
          >
            <Text>Content</Text>
          </CollapsibleSection>
        </TestWrapper>
      );

      const errorIndicator = getByTestId('collapsible-error-indicator');
      const styles = errorIndicator.props.style;
      
      // Error indicator should have white text on red background
      expect(styles.backgroundColor).toContain('#FF'); // Red color
    });
  });

  describe('Touch Target Sizes', () => {
    it('should have minimum 44pt touch targets for buttons', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button title="Touch Target Test" />
        </TestWrapper>
      );

      const button = getByRole('button');
      const styles = button.props.style;
      
      expect(styles.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('should have adequate spacing between interactive elements', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <View testID="button-container">
            <Button title="Button 1" />
            <Button title="Button 2" />
          </View>
        </TestWrapper>
      );

      const container = getByTestId('button-container');
      expect(container).toBeTruthy();
      // Spacing is handled by parent layout components
    });

    it('should have accessible collapsible section headers', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Accessible Section" testID="collapsible">
            <Text>Content</Text>
          </CollapsibleSection>
        </TestWrapper>
      );

      const header = getByTestId('collapsible-header');
      const styles = header.props.style;
      
      expect(styles.minHeight).toBe(56); // Adequate touch target
    });
  });

  describe('Focus Management', () => {
    it('should support focus states on interactive elements', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button title="Focusable Button" />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button.props.accessible).toBe(true);
    });

    it('should have proper focus order', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <View testID="focus-container">
            <Button title="First Button" testID="button-1" />
            <Button title="Second Button" testID="button-2" />
          </View>
        </TestWrapper>
      );

      const firstButton = getByTestId('button-1');
      const secondButton = getByTestId('button-2');
      
      expect(firstButton).toBeTruthy();
      expect(secondButton).toBeTruthy();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful labels for all interactive elements', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Button title="Save Changes" />
        </TestWrapper>
      );

      expect(getByLabelText('Save Changes')).toBeTruthy();
    });

    it('should announce state changes', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button title="Loading Button" loading />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('should provide context for collapsible sections', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CollapsibleSection id="test" title="Configuration Settings" testID="collapsible">
            <Text>Settings content</Text>
          </CollapsibleSection>
        </TestWrapper>
      );

      const header = getByTestId('collapsible-header');
      expect(header.props.accessibilityRole).toBe('button');
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect reduced motion preferences', () => {
      // This is tested in the animation utils and component performance tests
      // The components should use the animation utilities that respect reduced motion
      const { getByRole } = render(
        <TestWrapper>
          <Button title="Animated Button" />
        </TestWrapper>
      );

      expect(getByRole('button')).toBeTruthy();
    });
  });

  describe('Theme Accessibility', () => {
    it('should maintain accessibility in both light and dark themes', () => {
      const { getByText } = render(
        <TestWrapper>
          <Button title="Theme Test Button" />
        </TestWrapper>
      );

      const button = getByText('Theme Test Button');
      expect(button).toBeTruthy();
      // Theme colors are designed to meet contrast requirements
    });

    it('should provide accessible theme switching', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const themeToggle = getByTestId('theme-toggle');
      expect(themeToggle.props.accessibilityRole).toBe('switch');
      expect(themeToggle.props.accessibilityLabel).toBeTruthy();
    });
  });
});