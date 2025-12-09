import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

const Button = ({ title, onPress, variant = 'primary', loading, disabled, style, ...props }) => {
  const buttonStyle = [
    styles.button,
    styles[variant],
    disabled && styles.disabled,
    style
  ];

  const textStyle = [
    styles.text,
    styles[`${variant}Text`]
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#db2777'} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#db2777',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#db2777',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: '#db2777',
  },
});

export default Button;