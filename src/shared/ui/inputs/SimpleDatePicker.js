import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import WebDatePicker from './WebDatePicker';

const SimpleDatePicker = ({ 
  label, 
  value, 
  onDateChange, 
  minimumDate, 
  maximumDate,
  error, 
  id,
  placeholder = 'Select date',
  disabled = false
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date) => {
    if (!date) return placeholder;
    
    // Handle both Date objects and date strings
    const dateObj = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dateObj.getTime())) return placeholder;
    
    return dateObj.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getPickerValue = () => {
    if (value) {
      const dateObj = value instanceof Date ? value : new Date(value);
      if (!Number.isNaN(dateObj.getTime())) {
        return dateObj;
      }
    }
    // If no valid value, use minimumDate or today
    return minimumDate || new Date();
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      // Handle dismissal or cancellation
      if (event?.type === 'dismissed' || !selectedDate) {
        setShowPicker(false);
        return;
      }

      if (!Number.isNaN(selectedDate.getTime())) {
        onDateChange(selectedDate);
      }

      setShowPicker(false);
      return;
    }

    // iOS - handle directly since we're using modal with Done button
    if (selectedDate && !Number.isNaN(selectedDate.getTime())) {
      onDateChange(selectedDate);
    }
    setShowPicker(false);
  };

  const handleOpenPicker = () => {
    if (disabled) return;
    setShowPicker(true);
  };

  if (Platform.OS === 'web') {
    return (
      <WebDatePicker
        value={value}
        mode="date"
        onDateChange={onDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        placeholder={placeholder}
        label={label}
        error={error}
        disabled={disabled}
      />
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: '#374151',
          marginBottom: 6,
        }}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: disabled ? '#F3F4F6' : '#F9FAFB',
          borderRadius: 8,
          padding: 12,
          borderWidth: 1,
          borderColor: error ? '#EF4444' : (disabled ? '#D1D5DB' : '#E5E7EB'),
          opacity: disabled ? 0.6 : 1,
        }}
        onPress={handleOpenPicker}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={{
          flex: 1,
          fontSize: 14,
          color: value ? '#111827' : '#6B7280',
        }}>
          {formatDate(value)}
        </Text>
        <Calendar
          size={20}
          color={disabled ? '#9CA3AF' : '#6B7280'}
        />
      </TouchableOpacity>

      {error && (
        <Text style={{
          color: '#EF4444',
          fontSize: 12,
          marginTop: 4,
          marginLeft: 4,
        }}>
          {error}
        </Text>
      )}

      {/* Android Date Picker */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={getPickerValue()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          testID={id}
        />
      )}

      {/* iOS Date Picker */}
      {Platform.OS === 'ios' && showPicker && (
        <DateTimePicker
          value={getPickerValue()}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          testID={id}
          style={Platform.OS === 'ios' ? { height: 200 } : {}}
        />
      )}
    </View>
  );
};

export default SimpleDatePicker;