import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { Shield, CheckCircle } from 'lucide-react-native';

const SCORE_TIERS = {
  high: { color: '#10B981', background: '#D1FAE5' },
  medium: { color: '#F59E0B', background: '#FEF3C7' },
  low: { color: '#6B7280', background: '#F3F4F6' },
};

const selectTier = (score) => {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

const TrustScoreBadge = ({ trustScore = 0, verified = false, size = 'medium', showLabel = true, onPress }) => {
  const numericScore = Number.isFinite(Number(trustScore)) ? Number(trustScore) : 0;
  const score = Math.max(0, Math.round(numericScore));
  const tier = selectTier(score);
  const theme = SCORE_TIERS[tier];

  const Wrapper = typeof onPress === 'function' ? Pressable : View;
  const wrapperProps = typeof onPress === 'function'
    ? {
        onPress,
        accessibilityRole: 'button',
        accessibilityHint: 'Opens caregiver ratings and reviews',
        hitSlop: { top: 6, right: 6, bottom: 6, left: 6 },
      }
    : { accessibilityRole: 'text' };

  const isSmall = size === 'small';
  const badgeStyles = [isSmall ? styles.smallBadge : styles.badge];
  if (!isSmall) {
    badgeStyles.push({ backgroundColor: theme.background });
  }

  return (
    <Wrapper
      {...wrapperProps}
      accessibilityLabel={`Trust score ${score}${verified ? ', verified caregiver' : ''}`}
      style={badgeStyles}
    >
      <Shield size={isSmall ? 12 : 14} color={theme.color} />
      <Text style={[isSmall ? styles.smallText : styles.text, { color: theme.color }]}>
        {showLabel && !isSmall ? `${score} Trust Score` : score}
      </Text>
      {verified && <CheckCircle size={isSmall ? 10 : 12} color={theme.color} />}
    </Wrapper>
  );
};

TrustScoreBadge.propTypes = {
  trustScore: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  verified: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium']),
  showLabel: PropTypes.bool,
  onPress: PropTypes.func,
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default TrustScoreBadge;