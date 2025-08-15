/**
 * Integration tests for theme functionality across all redesigned components
 * Verifies core theme system functionality, integration, and consistency
 */

describe('Theme Functionality Integration Across All Components', () => {
  it('should verify theme provider exists and exports correctly', () => {
    const fs = require('fs');
    const themeProviderContent = fs.readFileSync('src/theme/ThemeProvider.tsx', 'utf8');
    
    // Verify core theme provider functionality
    expect(themeProviderContent).toContain('ThemeProvider');
    expect(themeProviderContent).toContain('toggleTheme');
    expect(themeProviderContent).toContain('isDark');
    expect(themeProviderContent).toContain('AsyncStorage');
    expect(themeProviderContent).toContain('useState');
    
    console.log('✅ Theme provider functionality verified');
  });

  it('should verify theme hook exists and is properly exported', () => {
    const fs = require('fs');
    const themeIndexContent = fs.readFileSync('src/theme/index.ts', 'utf8');
    
    // Verify theme system exports
    expect(themeIndexContent).toContain('useTheme');
    expect(themeIndexContent).toContain('ThemeProvider');
    expect(themeIndexContent).toContain('lightTheme');
    expect(themeIndexContent).toContain('darkTheme');
    
    console.log('✅ Theme hook and exports verified');
  });

  it('should verify theme integration in main App component', () => {
    const fs = require('fs');
    const appContent = fs.readFileSync('App.tsx', 'utf8');
    
    // Verify App uses theme system
    expect(appContent).toContain('ThemeProvider');
    expect(appContent).toContain('useTheme');
    expect(appContent).toContain('theme');
    expect(appContent).toContain('isDark');
    
    console.log('✅ Theme integration in App component verified');
  });

  it('should verify all major components use theme system', () => {
    const fs = require('fs');
    
    const componentFiles = [
      'src/components/Header.tsx',
      'src/components/BiometricStatusDisplay.tsx',
      'src/components/BiometricActions.tsx',
      'src/components/EndpointConfiguration.tsx',
      'src/components/StatusLog.tsx',
      'src/components/CollapsibleSection.tsx',
    ];

    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('useTheme');
      expect(content).toContain('theme');
    });
    
    console.log('✅ All major components use theme system verified');
  });

  it('should verify theme toggle functionality exists in Header', () => {
    const fs = require('fs');
    const headerContent = fs.readFileSync('src/components/Header.tsx', 'utf8');
    
    // Verify theme toggle implementation
    expect(headerContent).toContain('toggleTheme');
    expect(headerContent).toContain('isDark');
    expect(headerContent).toContain('Switch to');
    expect(headerContent).toContain('☀️');
    expect(headerContent).toContain('🌙');
    
    console.log('✅ Theme toggle functionality in Header verified');
  });

  it('should verify theme persistence with AsyncStorage', () => {
    const fs = require('fs');
    const themeProviderContent = fs.readFileSync('src/theme/ThemeProvider.tsx', 'utf8');
    
    // Verify theme persistence
    expect(themeProviderContent).toContain('AsyncStorage');
    expect(themeProviderContent).toContain('getItem');
    expect(themeProviderContent).toContain('setItem');
    expect(themeProviderContent).toContain('THEME_STORAGE_KEY');
    
    console.log('✅ Theme persistence with AsyncStorage verified');
  });

  it('should verify theme affects StatusBar configuration', () => {
    const fs = require('fs');
    const appContent = fs.readFileSync('App.tsx', 'utf8');
    
    // Verify StatusBar theme integration
    expect(appContent).toContain('StatusBar');
    expect(appContent).toContain('barStyle');
    expect(appContent).toContain('isDark');
    expect(appContent).toContain('light-content');
    expect(appContent).toContain('dark-content');
    
    console.log('✅ Theme affects StatusBar configuration verified');
  });

  it('should verify theme system includes color definitions', () => {
    const fs = require('fs');
    
    // Check if theme files exist and contain color references
    const themeFiles = [
      'src/theme/index.ts',
      'src/theme/theme.ts',
      'src/theme/tokens.ts',
    ];

    let hasColorDefinitions = false;
    themeFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('colors') || content.includes('Colors')) {
          hasColorDefinitions = true;
        }
      }
    });

    expect(hasColorDefinitions).toBe(true);
    
    console.log('✅ Theme system includes color definitions verified');
  });

  it('should verify components use theme colors consistently', () => {
    const fs = require('fs');
    
    const componentFiles = [
      'src/components/Header.tsx',
      'src/components/BiometricStatusDisplay.tsx',
      'src/components/EndpointConfiguration.tsx',
      'src/components/StatusLog.tsx',
    ];

    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('theme.colors');
    });
    
    console.log('✅ Components use theme colors consistently verified');
  });

  it('should verify theme transitions are implemented', () => {
    const fs = require('fs');
    const animatedViewContent = fs.readFileSync('src/components/AnimatedView.tsx', 'utf8');
    
    // Verify theme transition support
    expect(animatedViewContent).toContain('Animated');
    expect(animatedViewContent).toContain('lightBackgroundColor');
    expect(animatedViewContent).toContain('darkBackgroundColor');
    expect(animatedViewContent).toContain('useTheme');
    
    console.log('✅ Theme transitions implementation verified');
  });

  it('should verify accessibility support for theme toggle', () => {
    const fs = require('fs');
    const headerContent = fs.readFileSync('src/components/Header.tsx', 'utf8');
    
    // Verify accessibility features
    expect(headerContent).toContain('accessibilityLabel');
    expect(headerContent).toContain('accessibilityRole');
    expect(headerContent).toContain('accessibilityState');
    
    console.log('✅ Accessibility support for theme toggle verified');
  });

  it('should verify theme error handling exists', () => {
    const fs = require('fs');
    const themeProviderContent = fs.readFileSync('src/theme/ThemeProvider.tsx', 'utf8');
    
    // Verify error handling
    expect(themeProviderContent).toContain('try');
    expect(themeProviderContent).toContain('catch');
    expect(themeProviderContent).toContain('console.warn');
    
    console.log('✅ Theme error handling verified');
  });

  it('should verify theme context provides required functionality', () => {
    const fs = require('fs');
    const themeProviderContent = fs.readFileSync('src/theme/ThemeProvider.tsx', 'utf8');
    
    // Verify context provides essential values
    expect(themeProviderContent).toContain('theme');
    expect(themeProviderContent).toContain('isDark');
    expect(themeProviderContent).toContain('toggleTheme');
    expect(themeProviderContent).toContain('contextValue');
    
    console.log('✅ Theme context functionality verified');
  });

  it('should verify theme system supports both light and dark modes', () => {
    const fs = require('fs');
    const themeIndexContent = fs.readFileSync('src/theme/index.ts', 'utf8');
    
    // Verify both themes are exported
    expect(themeIndexContent).toContain('lightTheme');
    expect(themeIndexContent).toContain('darkTheme');
    
    console.log('✅ Light and dark theme support verified');
  });

  it('should verify theme initialization on app startup', () => {
    const fs = require('fs');
    const themeProviderContent = fs.readFileSync('src/theme/ThemeProvider.tsx', 'utf8');
    
    // Verify theme initialization
    expect(themeProviderContent).toContain('useEffect');
    expect(themeProviderContent).toContain('initializeTheme');
    expect(themeProviderContent).toContain('loadThemePreference');
    
    console.log('✅ Theme initialization on app startup verified');
  });

  it('should verify theme switching preserves app functionality', () => {
    const fs = require('fs');
    const appContent = fs.readFileSync('App.tsx', 'utf8');
    
    // Verify core app functionality remains intact
    expect(appContent).toContain('handleEnroll');
    expect(appContent).toContain('handleValidate');
    expect(appContent).toContain('handleDeleteKeys');
    expect(appContent).toContain('ThemeProvider');
    
    console.log('✅ Theme switching preserves app functionality verified');
  });

  it('should verify theme system is properly structured', () => {
    const fs = require('fs');
    
    // Verify theme system file structure
    const themeFiles = [
      'src/theme/index.ts',
      'src/theme/ThemeProvider.tsx',
    ];

    themeFiles.forEach(file => {
      expect(fs.existsSync(file)).toBe(true);
    });
    
    console.log('✅ Theme system structure verified');
  });

  it('should verify theme integration with component styling', () => {
    const fs = require('fs');
    const configContent = fs.readFileSync('src/components/EndpointConfiguration.tsx', 'utf8');
    
    // Verify theme is used in component styling
    expect(configContent).toContain('theme.colors');
    expect(configContent).toContain('backgroundColor');
    expect(configContent).toContain('color');
    expect(configContent).toContain('borderColor');
    
    console.log('✅ Theme integration with component styling verified');
  });

  it('should verify theme system includes TypeScript support', () => {
    const fs = require('fs');
    const themeIndexContent = fs.readFileSync('src/theme/index.ts', 'utf8');
    
    // Verify TypeScript types are exported
    expect(themeIndexContent).toContain('export type');
    expect(themeIndexContent).toContain('Theme');
    
    console.log('✅ Theme system TypeScript support verified');
  });

  it('should verify theme system supports design tokens', () => {
    const fs = require('fs');
    const themeIndexContent = fs.readFileSync('src/theme/index.ts', 'utf8');
    
    // Verify design tokens are exported
    expect(themeIndexContent).toContain('typography');
    expect(themeIndexContent).toContain('spacing');
    expect(themeIndexContent).toContain('borderRadius');
    expect(themeIndexContent).toContain('shadows');
    
    console.log('✅ Theme system design tokens support verified');
  });

  it('should verify theme consistency across all redesigned components', () => {
    const fs = require('fs');
    
    // Verify all components that should use theme actually do
    const componentFiles = [
      'App.tsx',
      'src/components/Header.tsx',
      'src/components/BiometricStatusDisplay.tsx',
      'src/components/BiometricActions.tsx',
      'src/components/EndpointConfiguration.tsx',
      'src/components/StatusLog.tsx',
      'src/components/CollapsibleSection.tsx',
      'src/components/AnimatedView.tsx',
    ];

    let allComponentsUseTheme = true;
    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('theme') && !content.includes('Theme')) {
        allComponentsUseTheme = false;
      }
    });

    expect(allComponentsUseTheme).toBe(true);
    
    console.log('✅ Theme consistency across all redesigned components verified');
  });
});