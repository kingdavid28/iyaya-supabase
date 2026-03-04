import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { DefaultTheme, DarkTheme } from 'react-native-paper';

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3B82F6',    // Blue-500
    accent: '#F59E0B',     // Amber-500
    background: '#F9FAFB', // Gray-50
    surface: '#FFFFFF',    // White
    text: '#1F2937',       // Gray-800
    error: '#EF4444',      // Red-500
    success: '#10B981',    // Emerald-500
    warning: '#F59E0B',    // Amber-500
    disabled: '#9CA3AF',   // Gray-400
    placeholder: '#9CA3AF',// Gray-400
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  roundness: 8,
};

const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#60A5FA',    // Blue-400
    accent: '#FBBF24',     // Amber-400
    background: '#111827',  // Gray-900
    surface: '#1F2937',    // Gray-800
    text: '#F9FAFB',       // Gray-50
    error: '#F87171',      // Red-400
    success: '#34D399',    // Emerald-400
    warning: '#FBBF24',    // Amber-400
    disabled: '#6B7280',   // Gray-500
    placeholder: '#6B7280',// Gray-500
    backdrop: 'rgba(0, 0, 0, 0.7)',
  },
  roundness: 8,
};

const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};