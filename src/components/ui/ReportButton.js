import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

const ReportButton = ({ reportedUserId, bookingId, onReportSubmitted, style }) => {
  const navigation = useNavigation()

  const handlePress = () => {
    navigation.navigate('CreateReport', {
      reportedUserId,
      bookingId,
      onReportSubmitted
    })
  }

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handlePress}
      accessibilityLabel="Report user"
      accessibilityRole="button"
    >
      <Ionicons name="flag-outline" size={18} color="#FFFFFF" />
      <Text style={styles.text}>Report</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    marginLeft: 6,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600'
  }
})

export default ReportButton