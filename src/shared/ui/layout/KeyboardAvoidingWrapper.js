import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';

const KeyboardAvoidingWrapper = ({ 
  children, 
  style, 
  scrollEnabled = true,
  keyboardVerticalOffset = 0,
  behavior,
  ...props 
}) => {
  const defaultBehavior = Platform.select({
    ios: 'padding',
    android: 'height',
    web: undefined,
  });

  const defaultOffset = Platform.select({
    ios: keyboardVerticalOffset || 64,
    android: keyboardVerticalOffset || 0,
    web: 0,
  });

  if (Platform.OS === 'web') {
    // Web doesn't need keyboard avoidance
    return scrollEnabled ? (
      <ScrollView style={[styles.container, style]} {...props}>
        {children}
      </ScrollView>
    ) : (
      <>{children}</>
    );
  }

  const WrapperComponent = scrollEnabled ? ScrollView : React.Fragment;
  const wrapperProps = scrollEnabled ? {
    contentContainerStyle: styles.scrollContent,
    keyboardShouldPersistTaps: 'handled',
    showsVerticalScrollIndicator: false,
    ...props
  } : {};

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={behavior || defaultBehavior}
      keyboardVerticalOffset={defaultOffset}
    >
      <WrapperComponent {...wrapperProps}>
        {children}
      </WrapperComponent>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default KeyboardAvoidingWrapper;
