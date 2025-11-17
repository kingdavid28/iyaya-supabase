import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import TimePicker from '../shared/ui/inputs/TimePicker';
import profileService from '../services/profileService';
import { useApi } from '../hooks/useApi';
import { styles } from './styles/AvailabilityManagementScreen.styles';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const TIME_SLOTS = [
  { key: 'morning', label: 'Morning (6AM - 12PM)', start: '06:00', end: '12:00' },
  { key: 'afternoon', label: 'Afternoon (12PM - 6PM)', start: '12:00', end: '18:00' },
  { key: 'evening', label: 'Evening (6PM - 12AM)', start: '18:00', end: '24:00' },
  { key: 'overnight', label: 'Overnight (12AM - 6AM)', start: '00:00', end: '06:00' },
];

const AvailabilityManagementScreen = ({ navigation }) => {
  const { token } = useAuth();
  const [availability, setAvailability] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  const {
    execute: fetchAvailability,
    loading: fetching
  } = useApi(profileService.getAvailability);

  const {
    execute: updateAvailability,
    loading: updating
  } = useApi(profileService.updateAvailability);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const data = await fetchAvailability(token);
      setAvailability(data.availability || {});
    } catch (error) {
      logger.error('Failed to load availability:', error);
      Alert.alert('Error', 'Failed to load availability information');
    }
  };

  const toggleTimeSlot = (day, timeSlot) => {
    const dayAvailability = availability[day] || {};
    const newDayAvailability = {
      ...dayAvailability,
      [timeSlot]: !dayAvailability[timeSlot]
    };

    setAvailability(prev => ({
      ...prev,
      [day]: newDayAvailability
    }));
    setHasChanges(true);
  };

  const updateDayTime = (day, timeType, time) => {
    const dayAvailability = availability[day] || {};
    const newDayAvailability = {
      ...dayAvailability,
      [timeType]: time
    };

    setAvailability(prev => ({
      ...prev,
      [day]: newDayAvailability
    }));
    setHasChanges(true);
  };

  const toggleFullDay = (day) => {
    const dayAvailability = availability[day] || {};
    const isFullyAvailable = TIME_SLOTS.every(slot => dayAvailability[slot.key]);
    
    const newDayAvailability = {
      ...dayAvailability,
      startTime: dayAvailability.startTime || '09:00',
      endTime: dayAvailability.endTime || '17:00'
    };
    TIME_SLOTS.forEach(slot => {
      newDayAvailability[slot.key] = !isFullyAvailable;
    });

    setAvailability(prev => ({
      ...prev,
      [day]: newDayAvailability
    }));
    setHasChanges(true);
  };

  const saveAvailability = async () => {
    try {
      await updateAvailability(availability, token);
      setHasChanges(false);
      Alert.alert('Success', 'Availability updated successfully!');
      navigation.goBack();
    } catch (error) {
      logger.error('Failed to update availability:', error);
      Alert.alert('Error', error.userMessage || 'Failed to update availability');
    }
  };

  const clearAllAvailability = () => {
    Alert.alert(
      'Clear All Availability',
      'Are you sure you want to clear all your availability?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setAvailability({});
            setHasChanges(true);
          }
        }
      ]
    );
  };

  const setFullWeekAvailability = () => {
    const fullAvailability = {};
    DAYS_OF_WEEK.forEach(day => {
      fullAvailability[day.key] = {};
      TIME_SLOTS.forEach(slot => {
        fullAvailability[day.key][slot.key] = true;
      });
    });
    setAvailability(fullAvailability);
    setHasChanges(true);
  };

  if (fetching) {
    return <LoadingSpinner message="Loading availability..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Manage Availability</Text>
        <Text style={styles.subtitle}>
          Set your availability to let parents know when you're free to work
        </Text>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={setFullWeekAvailability}
          >
            <Text style={styles.quickActionText}>Set All Available</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.clearButton]}
            onPress={clearAllAvailability}
          >
            <Text style={[styles.quickActionText, styles.clearButtonText]}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {DAYS_OF_WEEK.map(day => {
          const dayAvailability = availability[day.key] || {};
          const availableSlots = TIME_SLOTS.filter(slot => dayAvailability[slot.key]).length;
          const isFullyAvailable = availableSlots === TIME_SLOTS.length;

          return (
            <View key={day.key} style={styles.dayContainer}>
              <View style={styles.dayHeader}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayLabel}>{day.label}</Text>
                  <Text style={styles.dayStatus}>
                    {availableSlots === 0 
                      ? 'Not available' 
                      : availableSlots === TIME_SLOTS.length 
                        ? 'Available all day'
                        : `${availableSlots} time slots available`
                    }
                  </Text>
                </View>
                <Switch
                  value={isFullyAvailable}
                  onValueChange={() => toggleFullDay(day.key)}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={isFullyAvailable ? '#007AFF' : '#f4f3f4'}
                />
              </View>

              <View style={styles.timeSlotsContainer}>
                <View style={styles.timePickerRow}>
                  <TimePicker
                    label="Start Time"
                    value={dayAvailability.startTime || '09:00'}
                    onTimeChange={(time) => updateDayTime(day.key, 'startTime', time)}
                    format24Hour={false}
                    minuteInterval={30}
                    style={styles.halfWidth}
                  />
                  <TimePicker
                    label="End Time"
                    value={dayAvailability.endTime || '17:00'}
                    onTimeChange={(time) => updateDayTime(day.key, 'endTime', time)}
                    format24Hour={false}
                    minuteInterval={30}
                    style={styles.halfWidth}
                  />
                </View>
                
                {TIME_SLOTS.map(slot => (
                  <TouchableOpacity
                    key={slot.key}
                    style={[
                      styles.timeSlot,
                      dayAvailability[slot.key] && styles.timeSlotActive
                    ]}
                    onPress={() => toggleTimeSlot(day.key, slot.key)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      dayAvailability[slot.key] && styles.timeSlotTextActive
                    ]}>
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Tips for Better Bookings</Text>
          <Text style={styles.infoText}>
            • Keep your availability updated regularly{'\n'}
            • More available time slots = more booking opportunities{'\n'}
            • Parents can see your availability when booking{'\n'}
            • You can always adjust your schedule as needed
          </Text>
        </View>
      </ScrollView>

      {hasChanges && (
        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setHasChanges(false);
                loadAvailability();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveAvailability}
              disabled={updating}
            >
              <Text style={styles.saveButtonText}>
                {updating ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default AvailabilityManagementScreen;
