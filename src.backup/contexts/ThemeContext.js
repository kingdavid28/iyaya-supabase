import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { DefaultTheme, DarkTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe theme fallback values
const defaultColors = {
  primary: '#6200ee',
  accent: '#03dac4',
  background: '#f6f6f6',
  surface: '#ffffff',
  text: '#000000',
  disabled: '#9e9e9e',
  placeholder: '#9e9e9e',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  error: '#b00020',
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3',
  border: '#e0e0e0',
};

// Helper function to safely create theme objects
const createTheme = (baseTheme, colors) => ({
  ...baseTheme,
  colors: {
    ...(baseTheme?.colors || {}),
    ...colors
  }
});

// Define themes with safe defaults
const lightTheme = createTheme(DefaultTheme || {}, {
  ...defaultColors,
  // Light theme overrides
  primary: '#6200ee',
  background: '#f6f6f6',
  surface: '#ffffff',
  text: '#000000',
});

const darkTheme = createTheme(DarkTheme || {}, {
  ...defaultColors,
  // Dark theme overrides
  primary: '#bb86fc',
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  disabled: '#666666',
  placeholder: '#888888',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  error: '#cf6679',
  border: '#333333',
});

// Define a default theme to prevent undefined access
const defaultTheme = createTheme(DefaultTheme || {}, defaultColors);

// Create the context with a proper default value
const ThemeContext = createContext({
  theme: defaultTheme,
  themeMode: 'light',
  isDark: false,
  setThemeMode: () => {},
  toggleTheme: () => {},
  setThemePreference: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme() || 'light';
  const [themeMode, setThemeMode] = useState('system');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Calculate initial theme based on mode and system scheme
  const getInitialTheme = () => {
    try {
      const shouldUseDark = themeMode === 'dark' || 
                          (themeMode === 'system' && systemColorScheme === 'dark');
      return shouldUseDark ? darkTheme : lightTheme;
    } catch (error) {
      console.error('Error getting initial theme:', error);
      return defaultTheme;
    }
  };
  
  const [currentTheme, setCurrentTheme] = useState(getInitialTheme);
  const [isDark, setIsDark] = useState(false);
  
  // Update theme when mode or system scheme changes
  useEffect(() => {
    try {
      const newIsDark = themeMode === 'dark' || 
                       (themeMode === 'system' && systemColorScheme === 'dark');
      
      setIsDark(newIsDark);
      
      // Set the appropriate theme
      const newTheme = newIsDark ? darkTheme : lightTheme;
      setCurrentTheme(prevTheme => ({
        ...newTheme,
        colors: {
          ...defaultTheme.colors, // Ensure all required color properties exist
          ...newTheme.colors,     // Apply theme-specific colors
        }
      }));
    } catch (error) {
      console.error('Error updating theme:', error);
      setCurrentTheme(defaultTheme);
    }
  }, [themeMode, systemColorScheme]);

  // Initialize theme and load saved preference
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Load saved theme preference if available
        const savedTheme = await AsyncStorage.getItem('themeMode');
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.error('Error initializing theme:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeTheme();
  }, []);

  const toggleTheme = useCallback(() => {
    try {
      setThemeMode(prevMode => {
        const newMode = prevMode === 'system' 
          ? (systemColorScheme === 'dark' ? 'light' : 'dark')
          : prevMode === 'light' ? 'dark' : 'light';
        
        // Save preference
        AsyncStorage.setItem('themeMode', newMode).catch(console.error);
        return newMode;
      });
    } catch (error) {
      console.error('Error toggling theme:', error);
    }
  }, [systemColorScheme]);
  
  const setThemePreference = useCallback((preference) => {
    if (['light', 'dark', 'system'].includes(preference)) {
      setThemeMode(preference);
      AsyncStorage.setItem('themeMode', preference).catch(console.error);
    }
  }, []);

  // Only render children once theme is initialized
  if (!isInitialized) {
    return null; // or return a loading indicator
  }

  return (
    <ThemeContext.Provider value={{
      theme: currentTheme,
      themeMode,
      isDark,
      setThemeMode,
      toggleTheme,
      setThemePreference,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
