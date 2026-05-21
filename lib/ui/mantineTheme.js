import {
  Alert,
  Button,
  Card,
  createTheme,
  Modal,
  Paper,
  PasswordInput,
  TextInput,
} from '@mantine/core';

const brand = [
  '#eff6ff',
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',
  '#2563eb',
  '#1d4ed8',
  '#1e40af',
  '#1e3a8a',
];

const accent = [
  '#f5f3ff',
  '#ede9fe',
  '#ddd6fe',
  '#c4b5fd',
  '#a78bfa',
  '#8b5cf6',
  '#7c3aed',
  '#6d28d9',
  '#5b21b6',
  '#4c1d95',
];

export const mantineTheme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  defaultRadius: 'md',
  colors: {
    brand,
    accent,
  },
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
  fontFamilyMonospace:
    "'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace",
  headings: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
    fontWeight: '700',
  },
  radius: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.10), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 12px rgba(37, 99, 235, 0.12)',
    lg: '0 10px 24px rgba(15, 23, 42, 0.12)',
    xl: '0 24px 48px rgba(15, 23, 42, 0.18)',
  },
  components: {
    Button: Button.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    PasswordInput: PasswordInput.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    Card: Card.extend({
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
        withBorder: true,
      },
    }),
    Paper: Paper.extend({
      defaultProps: {
        radius: 'lg',
        shadow: 'xs',
        withBorder: true,
      },
    }),
    Alert: Alert.extend({
      defaultProps: {
        radius: 'md',
        variant: 'light',
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'lg',
        shadow: 'xl',
        centered: true,
      },
    }),
  },
});
