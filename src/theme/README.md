# Theme System

A comprehensive design system for the Biometrics Playground app with support for light and dark themes, design tokens, and consistent styling across all components.

## Features

- **Light and Dark Themes**: Complete theme support with automatic persistence
- **Design Tokens**: Centralized color, typography, spacing, and animation values
- **Theme Context**: React context-based theme management
- **Type Safety**: Full TypeScript support for all theme properties
- **Smooth Transitions**: Built-in animation support for theme switching

## Quick Start

### 1. Wrap your app with ThemeProvider

```tsx
import React from 'react';
import { ThemeProvider } from './src/theme';
import { YourApp } from './YourApp';

export default function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. Use the theme in your components

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from './src/theme';

export const MyComponent: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.bold,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World</Text>
    </View>
  );
};
```

### 3. Toggle themes

```tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from './src/theme';

export const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <TouchableOpacity onPress={toggleTheme}>
      <Text>Switch to {isDark ? 'Light' : 'Dark'} Theme</Text>
    </TouchableOpacity>
  );
};
```

## Theme Structure

### Colors
Both light and dark themes include:
- `primary`, `secondary` - Brand colors
- `background`, `surface`, `surfaceSecondary` - Background colors
- `text`, `textSecondary` - Text colors
- `border` - Border colors
- `success`, `warning`, `error`, `info` - Status colors
- `accent` - Accent color
- `overlay` - Overlay color with transparency

### Typography
- **Sizes**: `xs` (12px) to `4xl` (36px)
- **Weights**: `normal`, `medium`, `semibold`, `bold`
- **Line Heights**: `tight`, `normal`, `relaxed`

### Spacing
- **Scale**: `xs` (4px) to `3xl` (64px)
- **Usage**: Consistent spacing throughout the app

### Animations
- **Durations**: `fast` (150ms), `normal` (250ms), `slow` (350ms)
- **Easings**: `easeIn`, `easeOut`, `easeInOut`

### Border Radius
- **Sizes**: `sm` (8px) to `xl` (20px)

### Shadows
- **Variants**: `sm`, `md`, `lg` with appropriate elevation values

## API Reference

### useTheme Hook

```tsx
const {
  theme,        // Current theme object
  isDark,       // Boolean indicating if dark theme is active
  themeMode,    // Current theme mode ('light' | 'dark')
  toggleTheme,  // Function to toggle between themes
  setTheme,     // Function to set specific theme
} = useTheme();
```

### Theme Object Structure

```tsx
interface Theme {
  colors: ThemeColors;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  animations: AnimationTokens;
  borderRadius: BorderRadiusTokens;
  shadows: ShadowTokens;
}
```

## Best Practices

1. **Always use theme values**: Don't hardcode colors, spacing, or typography
2. **Create styles inside components**: Use `StyleSheet.create()` inside components to access current theme
3. **Use semantic color names**: Prefer `theme.colors.text` over specific color values
4. **Consistent spacing**: Use the spacing scale for margins, padding, and gaps
5. **Responsive design**: Consider different screen sizes when using spacing and typography

## Examples

See `src/theme/examples/ThemeExample.tsx` for a complete usage example.

## Testing

The theme system includes comprehensive tests for:
- Theme structure validation
- Design token consistency
- Color value formats
- Typography scales
- Spacing values
- Animation configurations

Run tests with:
```bash
npm test -- --testPathPattern="src/theme"
```