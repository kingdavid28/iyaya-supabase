import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from './styles';

const CustomDateTimePicker = ({
  value,
  mode = 'date',
  onDateChange,
  minimumDate,
  maximumDate,
  placeholder,
  label,
  error,
  disabled = false,
  style,
  textStyle,
  format = 'default',
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const currentDate = value || new Date();

  const formatDate = (date) => {
    if (!date) return placeholder || 'Select date';
    
    switch (mode) {
      case 'date':
        switch (format) {
          case 'short':
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            });
          case 'long':
            return date.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            });
          default:
            return date.toLocaleDateString();
        }
      case 'time':
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      case 'datetime':
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })}`;
      default:
        return date.toLocaleDateString();
    }
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

  const handleCancel = () => {
    setShowPicker(false);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      if (event?.type === 'dismissed') {
        setShowPicker(false);
        return;
      }

      if (selectedDate && onDateChange) {
        setShowPicker(false);
        onDateChange(selectedDate);
      }
      return;
    }

    if (selectedDate && onDateChange) {
      setShowPicker(false);
      onDateChange(selectedDate);
    }
  };

  const getWebInputType = () => {
    switch (mode) {
      case 'time':
        return 'time';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'date';
    }
  };

  const formatDateForWeb = (date) => {
    if (!date) return '';
    
    switch (mode) {
      case 'time':
        return date.toTimeString().slice(0, 5);
      case 'datetime':
        return date.toISOString().slice(0, 16);
      default:
        return date.toISOString().slice(0, 10);
    }
  };

  const handleWebDateChange = (event) => {
    const value = event.nativeEvent?.target?.value || event.target?.value;
    if (!value) return;
    
    let newDate;
    try {
      switch (mode) {
        case 'time': {
          newDate = new Date();
          const [hours, minutes] = value.split(':');
          newDate.setHours(parseInt(hours), parseInt(minutes));
          break;
        }
        case 'datetime':
          newDate = new Date(value);
          break;
        default:
          newDate = new Date(value + 'T00:00:00');
          break;
      }
      
      // Check if date is valid before calling onDateChange
      if (newDate && !isNaN(newDate.getTime())) {
        onDateChange(newDate);
      }
    } catch (error) {
      console.warn('Invalid date value:', value, error);
    }
  };

  const renderIOSModal = () => (
    <Modal
      visible={showPicker}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {mode === 'date' ? 'Select Date' : 
               mode === 'time' ? 'Select Time' : 
               'Select Date & Time'}
            </Text>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.modalConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <DateTimePicker
            value={currentDate}
            mode={mode}
            display="spinner"
            onChange={handleDateChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            style={styles.picker}
          />
        </View>
      </View>
    </Modal>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {label && (
          <Text style={[styles.label, error && styles.labelError]}>
            {label}
          </Text>
        )}
        
        <View style={[
          styles.dateButton,
          error && styles.dateButtonError,
          disabled && styles.dateButtonDisabled
        ]}>
          <TextInput
            style={[
              styles.webDateInput,
              disabled && styles.disabledText,
              textStyle
            ]}
            value={formatDateForWeb(value)}
            onChange={handleWebDateChange}
            {...(Platform.OS === 'web' && {
              type: getWebInputType(),
              min: minimumDate ? formatDateForWeb(minimumDate) : undefined,
              max: maximumDate ? formatDateForWeb(maximumDate) : undefined,
            })}
            editable={!disabled}
            placeholder={placeholder || 'Select date'}
          />
          
          <Ionicons 
            name={getIcon()} 
            size={20} 
            color={disabled ? '#ccc' : error ? '#ff4444' : '#666'} 
            style={styles.webDateIcon}
          />
        </View>
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.dateButton,
          error && styles.dateButtonError,
          disabled && styles.dateButtonDisabled
        ]}
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
      >
        <Text style={[
          styles.dateButtonText,
          !value && styles.placeholderText,
          disabled && styles.disabledText,
          textStyle
        ]}>
          {formatDate(value)}
        </Text>
        
        <Ionicons 
          name={getIcon()} 
          size={20} 
          color={disabled ? '#ccc' : error ? '#ff4444' : '#666'} 
        />
      </TouchableOpacity>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {Platform.OS === 'ios' ? (
        renderIOSModal()
      ) : (
        showPicker && (
          <DateTimePicker
            value={currentDate}
            mode={mode}
            display="default"
            onChange={handleDateChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )
      )}
    </View>
  );
};

export default CustomDateTimePicker;
