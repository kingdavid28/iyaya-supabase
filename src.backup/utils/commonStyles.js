import { StyleSheet } from 'react-native';

/**
 * Common styling utilities to reduce duplication across components
 * Provides consistent base styles and reusable style patterns
 */

// Common color palette
export const colors = {
  background: '#f5f5f5',
  backgroundLight: '#f8fafc',
  backgroundDark: '#F4F7FC',
  white: '#ffffff',
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  text: '#000000',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E1E1E1',
  borderLight: '#F0F0F0',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Common dimensions
export const dimensions = {
  padding: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  margin: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
};

// Common base styles
export const baseStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  containerLight: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  
  containerDark: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  
  containerWithPadding: {
    flex: 1,
    backgroundColor: colors.background,
    padding: dimensions.padding.md,
  },
  
  // Content containers
  content: {
    flex: 1,
    padding: dimensions.padding.md,
  },
  
  contentCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: dimensions.padding.md,
  },
  
  // Card styles
  card: {
    backgroundColor: colors.white,
    borderRadius: dimensions.borderRadius.md,
    padding: dimensions.padding.md,
    marginBottom: dimensions.margin.md,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  cardSmall: {
    backgroundColor: colors.white,
    borderRadius: dimensions.borderRadius.sm,
    padding: dimensions.padding.sm,
    marginBottom: dimensions.margin.sm,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Text styles
  title: {
    fontSize: dimensions.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: dimensions.margin.sm,
  },
  
  subtitle: {
    fontSize: dimensions.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: dimensions.margin.sm,
  },
  
  body: {
    fontSize: dimensions.fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  
  bodySecondary: {
    fontSize: dimensions.fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  
  caption: {
    fontSize: dimensions.fontSize.sm,
    color: colors.textLight,
  },
  
  // Button styles
  button: {
    backgroundColor: colors.primary,
    borderRadius: dimensions.borderRadius.md,
    paddingVertical: dimensions.padding.md,
    paddingHorizontal: dimensions.padding.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonSecondary: {
    backgroundColor: colors.white,
    borderRadius: dimensions.borderRadius.md,
    paddingVertical: dimensions.padding.md,
    paddingHorizontal: dimensions.padding.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  buttonText: {
    fontSize: dimensions.fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  
  buttonTextSecondary: {
    fontSize: dimensions.fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  
  // Input styles
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: dimensions.borderRadius.md,
    paddingVertical: dimensions.padding.md,
    paddingHorizontal: dimensions.padding.md,
    fontSize: dimensions.fontSize.md,
    backgroundColor: colors.white,
  },
  
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Layout helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  column: {
    flexDirection: 'column',
  },
  
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Spacing helpers
  marginBottom: {
    marginBottom: dimensions.margin.md,
  },
  
  marginTop: {
    marginTop: dimensions.margin.md,
  },
  
  paddingHorizontal: {
    paddingHorizontal: dimensions.padding.md,
  },
  
  paddingVertical: {
    paddingVertical: dimensions.padding.md,
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: dimensions.margin.md,
  },
  
  dividerThick: {
    height: 2,
    backgroundColor: colors.border,
    marginVertical: dimensions.margin.md,
  },
});

// Utility functions for dynamic styles
export const createShadow = (elevation = 5) => ({
  shadowColor: colors.shadow,
  shadowOffset: {
    width: 0,
    height: Math.floor(elevation / 2),
  },
  shadowOpacity: 0.1 + (elevation * 0.02),
  shadowRadius: elevation,
  elevation,
});

export const createSpacing = (size) => ({
  margin: dimensions.margin[size] || size,
  padding: dimensions.padding[size] || size,
});

export const createBorderRadius = (size) => ({
  borderRadius: dimensions.borderRadius[size] || size,
});

// Screen-specific style creators
export const createScreenStyles = (customStyles = {}) => StyleSheet.create({
  ...baseStyles,
  ...customStyles,
});

export default {
  colors,
  dimensions,
  baseStyles,
  createShadow,
  createSpacing,
  createBorderRadius,
  createScreenStyles,
};
