import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebDatePicker from '../WebDatePicker';
import { styles } from './styles';

const TimePicker = ({
  value,
  onTimeChange,
  label,
  error,
  disabled = false,
  style,
  format24Hour = false,
  minuteInterval = 15, // 15, 30, or 60
  placeholder = 'Select time',
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(() => {
    if (!value) return format24Hour ? 9 : 9;
    const time = typeof value === 'string' ? value : value.toTimeString().slice(0, 5);
    const hour = parseInt(time.split(':')[0]);
    
    if (format24Hour) {
      return Math.max(0, Math.min(23, hour));
    } else {
      // Convert 24-hour to 12-hour for display
      if (hour === 0) return 12;
      if (hour > 12) return hour - 12;
      return hour;
    }
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (!value) return 0;
    const time = typeof value === 'string' ? value : value.toTimeString().slice(0, 5);
    return parseInt(time.split(':')[1]);
  });
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    if (format24Hour) return null;
    if (!value) return 'AM';
    const hour = typeof value === 'string' ? parseInt(value.split(':')[0]) : value.getHours();
    return hour >= 12 ? 'PM' : 'AM';
  });

  const generateHours = () => {
    if (format24Hour) {
      return Array.from({ length: 24 }, (_, i) => i);
    } else {
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
  };

  const generateMinutes = () => {
    const minutes = [];
    for (let i = 0; i < 60; i += minuteInterval) {
      minutes.push(i);
    }
    return minutes;
  };

  const formatTime = (hour, minute, period) => {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');

    if (format24Hour) {
      return `${h}:${m}`;
    } else {
      return `${hour}:${m} ${period}`;
    }
  };

  const formatDisplayTime = () => {
    if (!value) return placeholder;

    if (typeof value === 'string') {
      if (format24Hour) return value;

      const [time] = value.split(' ');
      const [hour, minute] = time.split(':');
      const h = parseInt(hour);
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      return `${displayHour}:${minute} ${period}`;
    }

    return value.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !format24Hour
    });
  };

  const handleConfirm = () => {
    let finalHour = selectedHour;

    if (!format24Hour && selectedPeriod) {
      if (selectedPeriod === 'PM' && selectedHour !== 12) {
        finalHour = selectedHour + 12;
      } else if (selectedPeriod === 'AM' && selectedHour === 12) {
        finalHour = 0;
      }
    }

    // Validate hour is within bounds
    finalHour = Math.max(0, Math.min(23, finalHour));
    const validMinute = Math.max(0, Math.min(59, selectedMinute));

    const timeString = `${finalHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
    onTimeChange(timeString);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  const renderPicker = () => (
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
            <Text style={styles.modalTitle}>Select Time</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.modalConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            {/* Hours */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerColumnTitle}>Hour</Text>
              <ScrollView
                style={styles.pickerScroll}
                showsVerticalScrollIndicator={false}
              >
                {generateHours().map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      selectedHour === hour && styles.pickerItemSelected
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selectedHour === hour && styles.pickerItemTextSelected
                    ]}>
                      {format24Hour ? hour.toString().padStart(2, '0') : hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Minutes */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerColumnTitle}>Minute</Text>
              <ScrollView
                style={styles.pickerScroll}
                showsVerticalScrollIndicator={false}
              >
                {generateMinutes().map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.pickerItem,
                      selectedMinute === minute && styles.pickerItemSelected
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selectedMinute === minute && styles.pickerItemTextSelected
                    ]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM */}
            {!format24Hour && (
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerColumnTitle}>Period</Text>
                <ScrollView
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {['AM', 'PM'].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.pickerItem,
                        selectedPeriod === period && styles.pickerItemSelected
                      ]}
                      onPress={() => setSelectedPeriod(period)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        selectedPeriod === period && styles.pickerItemTextSelected
                      ]}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  if (Platform.OS === 'web') {
    return (
      <WebDatePicker
        value={value}
        mode="time"
        onDateChange={onTimeChange}
        placeholder={placeholder}
        label={label}
        error={error}
        disabled={disabled}
        style={style}
      />
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
          styles.timeButton,
          error && styles.timeButtonError,
          disabled && styles.timeButtonDisabled
        ]}
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
      >
        <Text style={[
          styles.timeButtonText,
          !value && styles.placeholderText,
          disabled && styles.disabledText
        ]}>
          {formatDisplayTime()}
        </Text>

        <Ionicons
          name="time-outline"
          size={20}
          color={disabled ? '#ccc' : error ? '#ff4444' : '#666'}
        />
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {renderPicker()}
    </View>
  );
};

export default TimePicker;
