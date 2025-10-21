import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export function QuickStat({
  icon,
  value,
  label,
  color = '#2563EB',
  bgColor = '#EFF6FF',
  styles,
  onPress,
  subtitle,
  ctaLabel,
  accessibilityHint
}) {
  const baseTileStyle = [styles.quickTile, { backgroundColor: '#fff' }, onPress && styles.quickTileInteractive];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [...baseTileStyle, pressed && styles.quickTilePressed]}
      >
        <View style={[styles.quickIconWrap, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.quickValue}>{value ?? '-'}</Text>
        <Text style={styles.quickLabel}>{label}</Text>
        {subtitle ? <Text style={styles.quickStatSubtitle}>{subtitle}</Text> : null}
        {ctaLabel ? (
          <View style={styles.quickStatCTA}>
            <Text style={styles.quickStatCTAText}>{ctaLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color={color} />
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={baseTileStyle}>
      <View style={[styles.quickIconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.quickValue}>{value ?? '-'}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
      {subtitle ? <Text style={styles.quickStatSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function QuickAction({ icon, label, onPress, gradientColors, styles }) {
  const colors = gradientColors || ['#60a5fa', '#6366f1'];
  return (
    <Pressable onPress={onPress} style={styles.quickActionTile} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.quickActionContent}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickActionGradient}>
          <View style={styles.quickActionIconWrap}>
            <Ionicons name={icon} size={20} color="#ffffff" />
          </View>
          <Text style={[styles.quickActionLabel, { color: '#ffffff' }]}>{label}</Text>
        </LinearGradient>
      </View>
    </Pressable>
  );
}