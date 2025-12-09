import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles, colors } from '../../styles/ParentDashboard.styles';

/**
 * QuickAction Component
 * A reusable button component for quick actions in the dashboard.
 * 
 * @param {Object} props - Component props
 * @param {React.Component} props.icon - Icon component to display
 * @param {string} props.label - Text label for the action
 * @param {string} [props.color=colors.primary] - Color for the icon and text
 * @param {string} [props.bgColor=colors.primaryLight] - Background color
 * @param {Function} props.onPress - Callback when the action is pressed
 * @param {string} [props.accessibilityHint] - Accessibility hint for screen readers
 * @param {string} [props.testID] - Test ID for testing frameworks
 * @returns {JSX.Element} Rendered QuickAction component
 */
const QuickAction = ({ 
  icon: Icon, 
  label, 
  color = colors.primary, 
  bgColor = colors.primaryLight, 
  onPress,
  accessibilityHint,
  testID
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.quickAction, { backgroundColor: bgColor, borderColor: color }]}
    activeOpacity={0.8}
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint={accessibilityHint || `Tap to ${label.toLowerCase()}`}
    testID={testID}
  >
    <View 
      style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}
      accessible={false}
      importantForAccessibility="no"
    >
      <Icon size={24} color={color} />
    </View>
    <Text 
      style={[styles.quickActionText, { color }]}
      accessible={false}
      importantForAccessibility="no"
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default QuickAction;
