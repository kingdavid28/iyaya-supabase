import { StyleSheet } from 'react-native';

export const createThemedStyles = (theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 16,
      margin: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    text: {
      color: theme.colors.text,
    },
    textSecondary: {
      color: theme.colors.secondaryText || theme.colors.text,
      opacity: 0.7,
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    buttonText: {
      color: theme.colors.onPrimary || '#FFFFFF',
      fontWeight: '600',
    },
    // Add more common styles as needed
  });
};