// src/components/forms/ValidatedInput.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

const ValidatedInput = ({
  label,
  value,
  onChangeText,
  validator,
  errorMessage,
  style,
  ...props
}) => {
  const [error, setError] = useState('');
  const [isTouched, setIsTouched] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    if (isTouched) {
      validateInput(value);
    }
  }, [value, isTouched]);

  const validateInput = (text) => {
    try {
      if (validator) {
        validator(text);
      }
      setError('');
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const handleBlur = () => {
    setIsTouched(true);
    validateInput(value);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={handleBlur}
        style={[
          styles.input,
          { borderColor: error ? theme.colors.error : theme.colors.border },
        ]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 4,
    fontSize: 14,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
});

export default ValidatedInput;
