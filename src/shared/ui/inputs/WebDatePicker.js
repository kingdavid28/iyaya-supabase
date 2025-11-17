import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  Text,
  View,
} from 'react-native';

const formatDate = (date, format = 'default') => {
  if (!date) return '';

  const dateObj = new Date(date);

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    default:
      return dateObj.toLocaleDateString('en-US');
  }
};

const formatTime = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatDateTime = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  return `${formatDate(dateObj)} ${formatTime(dateObj)}`;
};

const WebDatePicker = ({
  value,
  mode = 'date',
  onDateChange,
  minimumDate,
  maximumDate,
  placeholder = 'Select date',
  label,
  error,
  disabled = false,
  style,
  textStyle,
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (value) {
      let formattedValue = '';
      switch (mode) {
        case 'time': {
          // For HTML5 time input, use 24-hour format (HH:mm)
          const timeObj = new Date(value);
          const hours = timeObj.getHours();
          const minutes = timeObj.getMinutes();
          formattedValue = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          break;
        }
        case 'datetime':
          formattedValue = new Date(value).toISOString().slice(0, 16);
          break;
        default: {
          // For HTML5 date input, use yyyy-MM-dd format
          const dateObj = new Date(value);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          formattedValue = `${year}-${month}-${day}`;
          break;
        }
      }
      setInputValue(formattedValue);
    } else {
      setInputValue('');
    }
  }, [value, mode]);

  const handleInputChange = (event) => {
    let newValue;

    // Handle React Native Web event structure
    if (event.nativeEvent?.target?.value !== undefined) {
      newValue = event.nativeEvent.target.value;
    } else if (event.target?.value !== undefined) {
      newValue = event.target.value;
    } else if (event.nativeEvent?.text !== undefined) {
      newValue = event.nativeEvent.text;
    } else {
      newValue = event.target?.value || '';
    }

    setInputValue(newValue);

    if (!newValue) {
      onDateChange?.(null);
      return;
    }

    let parsedDate;
    try {
      switch (mode) {
        case 'time': {
          // Parse time string like "02:30 PM" or "14:30"
          const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
          const match = newValue.match(timeRegex);

          if (match) {
            let [_, hours, minutes, period] = match;
            hours = parseInt(hours);
            minutes = parseInt(minutes);

            if (period) {
              period = period.toUpperCase();
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
            }

            parsedDate = new Date();
            parsedDate.setHours(hours, minutes, 0, 0);
          }
          break;
        }
        case 'datetime':
          parsedDate = new Date(newValue);
          break;
        default:
          // For date inputs, ensure it's parsed as local date
          parsedDate = new Date(newValue + 'T00:00:00');
          break;
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        // Validate against min/max dates
        if (minimumDate && parsedDate < minimumDate) {
          parsedDate = minimumDate;
        }
        if (maximumDate && parsedDate > maximumDate) {
          parsedDate = maximumDate;
        }
        onDateChange?.(parsedDate);
      }
    } catch (error) {
      console.warn('Invalid date input:', newValue, error);
    }
  };

  const getInputType = () => {
    switch (mode) {
      case 'time':
        return 'time';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'date';
    }
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'time':
        return 'Select time';
      case 'datetime':
        return 'Select date and time';
      default:
        return placeholder;
    }
  };

  const formatMinMax = (date) => {
    if (!date) return undefined;
    // For HTML5 date input, use yyyy-MM-dd format
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getIcon = () => {
    switch (mode) {
      case 'time':
        return 'time-outline';
      case 'datetime':
        return 'calendar-clock-outline';
      default:
        return 'calendar-outline';
    }
  };

  // For web platform, render HTML5 input
  if (Platform.OS === 'web') {
    return (
      <View style={[{ marginBottom: 16 }, style]}>
        {label && (
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: error ? '#EF4444' : '#374151',
            marginBottom: 6,
          }}>
            {label}
          </Text>
        )}

        <View style={{
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: disabled ? '#F3F4F6' : '#F9FAFB',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: error ? '#EF4444' : disabled ? '#D1D5DB' : '#E5E7EB',
          opacity: disabled ? 0.6 : 1,
          paddingHorizontal: 12,
          minHeight: 48,
        }}>
          <input
            type={getInputType()}
            value={inputValue}
            onChange={handleInputChange}
            min={minimumDate ? formatMinMax(minimumDate) : undefined}
            max={maximumDate ? formatMinMax(maximumDate) : undefined}
            disabled={disabled}
            placeholder={getPlaceholder()}
            style={{
              flex: 1,
              fontSize: 16,
              color: disabled ? '#9CA3AF' : '#111827',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '12px 0',
              fontFamily: 'inherit',
            }}
          />

          <Ionicons
            name={getIcon()}
            size={20}
            color={disabled ? '#9CA3AF' : error ? '#EF4444' : '#6B7280'}
            style={{ marginLeft: 8, pointerEvents: 'none' }}
          />
        </View>

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
      </View>
    );
  }

  // Fallback for non-web platforms (should not be reached due to parent component logic)
  return null;
};

export default WebDatePicker;
