import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider, useThemeContext } from '../contexts/ThemeContext';
import { PaperProvider } from 'react-native-paper';
import { AppProvider as CoreAppProvider } from '../contexts/AppContext';

// Wrapper component to access theme context
const ThemeWrapper = ({ children }) => {
  const { theme } = useThemeContext();
  
  // If theme is not available yet, show a loading indicator
  if (!theme) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
};

export const AppProvider = ({ children }) => {
  return (
    <ThemeProvider>
      <ThemeWrapper>
        <CoreAppProvider>
          {children}
        </CoreAppProvider>
      </ThemeWrapper>
    </ThemeProvider>
  );
};

export default AppProvider;
