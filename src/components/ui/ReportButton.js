import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const ReportButton = ({ onPress, userId, userName, style }) => {
  const handlePress = () => {
    onPress({
      reportedUserId: userId,
      reportedUserName: userName
    })
  }

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={handlePress}>
      <Ionicons name="flag-outline" size={16} color="#f44336" />
      <Text style={styles.text}>Report</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f44336',
    backgroundColor: 'transparent'
  },
  text: {
    marginLeft: 4,
    fontSize: 12,
    color: '#f44336',
    fontWeight: '500'
  }
})

export default ReportButton