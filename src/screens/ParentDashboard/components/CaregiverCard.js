import { LinearGradient } from "expo-linear-gradient";
import {
  Award,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  MessageCircle,
  Shield,
  Star,
  User,
} from "lucide-react-native";
import PropTypes from "prop-types";
import React, { memo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card, TrustScoreBadge } from '../../../shared/ui';

import { formatAddress } from "../../../utils/addressUtils";
import { getImageSource } from "../../../utils/imageUtils";

import {
  colors,
  spacing,
  styles,
  typography,
} from "../../styles/ParentDashboard.styles";
import PesoSign from "@/components/ui/feedback/PesoSign";

/**
 * CaregiverCard Component
 * Displays a card with caregiver information and action buttons.
 *
 * @param {Object} props - Component props
 * @param {Object} props.caregiver - Caregiver data object
 * @param {Function} props.onPress - Callback when card is pressed
 * @param {Function} props.onMessagePress - Callback when message button is pressed
 * @param {string} [props.testID] - Test ID for testing frameworks
 * @returns {JSX.Element} Rendered CaregiverCard component
 */
const CaregiverCardComponent = ({ caregiver = {}, onPress, onMessagePress, onViewReviews, onRequestInfo, testID, style }) => {


  // Safe defaults
  const name = caregiver?.name || "Caregiver";
  const avatarRaw =
    caregiver?.avatar ||
    caregiver?.profileImage ||
    caregiver?.user?.profileImage ||
    "";
  const showRatings = caregiver?.showRatings !== false;
  const rating = showRatings && typeof caregiver?.rating === "number" ? caregiver.rating : null;
  const reviewCount = showRatings && typeof caregiver?.reviewCount === "number" ? caregiver.reviewCount : 0;
  const trustScoreSource = showRatings
    ? caregiver?.trustScore ?? caregiver?.verification?.trustScore
    : null;
  const trustScore = Number.isFinite(Number(trustScoreSource)) ? Number(trustScoreSource) : 0;
  const verified = Boolean(caregiver?.verified ?? caregiver?.verification?.verified);

  // Use centralized address formatting
  const getLocationString = (location) => {
    const formatted = formatAddress(location);
    return formatted === 'Location not specified' ? '—' : formatted;
  };

  // Get the location from various possible locations in the object
  const locationSource =
    caregiver?.location ||
    caregiver?.address ||
    caregiver?.user?.location ||
    caregiver?.user?.address ||
    caregiver?.requestInfoTarget;

  const hourlyRate =
    typeof caregiver?.hourlyRate === "number" ? caregiver.hourlyRate : 0;
  const specialties = Array.isArray(caregiver?.specialties)
    ? caregiver.specialties
    : caregiver?.skills
      ? caregiver.skills
      : [];

  // Handle experience which could be a number or an object
  const experience =
    typeof caregiver?.experience === "number"
      ? caregiver.experience
      : caregiver?.experience?.years || 0;
  const completedSessions =
    caregiver?.completedBookings ??
    caregiver?.completedJobs ??
    caregiver?.stats?.completed ??
    caregiver?.bookingsCount ??
    0;
  const responseRateRaw =
    caregiver?.responseRate ??
    caregiver?.stats?.responseRate ??
    caregiver?.metrics?.responseRate;
  const availabilityStatus =
    caregiver?.availabilityStatus ||
    caregiver?.availability ||
    caregiver?.status ||
    "";
  const availabilityIsLimited =
    typeof availabilityStatus === "string" &&
    availabilityStatus.toLowerCase().includes("unavailable");

  // Track image load failure for graceful fallback
  const [imageError, setImageError] = useState(false);

  // Use centralized image URL handling
  const avatar = avatarRaw || caregiver?.profileImage || caregiver?.user?.profileImage;

  const allowDirectMessages = caregiver?.allowDirectMessages !== false;
  const accessibilityLabel = `${name}${specialties.length ? `, ${specialties.join(", ")}` : ""}, ${rating} star rating`;
  const bookButtonLabel = `Book ${name} for a session`;
  const messageButtonLabel = allowDirectMessages
    ? `Message ${name}`
    : `${name} is not accepting direct messages`;

  // Format the location before rendering
  const locationText = getLocationString(locationSource);
  const ratingValue = Number.isFinite(Number(rating)) ? Number(rating).toFixed(1) : null;
  const hasReviews = reviewCount > 0;
  const ratingLabel = showRatings
    ? (hasReviews && ratingValue != null
      ? `${ratingValue} • ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
      : "New caregiver")
    : "Ratings hidden";
  const experienceLabel = `${typeof experience === "number" && !Number.isNaN(experience) ? experience : 0} yrs exp`;
  const hourlyRateLabel = hourlyRate ? `₱${hourlyRate}/hr` : "Rate TBD";
  const displaySpecialties = specialties.slice(0, 3);
  const remainingSpecialties = specialties.length - displaySpecialties.length;
  const responseRateLabel =
    Number.isFinite(Number(responseRateRaw)) && Number(responseRateRaw) > 0
      ? `Response ${Math.round(Number(responseRateRaw))}%`
      : null;
  const statTiles = [
    { icon: Clock, label: "Experience", value: experienceLabel },
    { icon: PesoSign, label: "Hourly Rate", value: hourlyRateLabel },
    
  ];
  const canMessage = typeof onMessagePress === "function";
  const canViewReviews = typeof onViewReviews === "function" && hasReviews;
  const canRequestInfo = typeof onRequestInfo === "function";
  const RatingComponent = canViewReviews ? TouchableOpacity : View;

  const handleMessagePress = () => {
    if (!canMessage) {
      return;
    }

    onMessagePress({
      ...caregiver,
      allowDirectMessages,
      privacySettings: {
        ...caregiver?.privacySettings,
        allowDirectMessages,
      },
    });
  };

  const handleViewReviews = () => {
    if (canViewReviews) {
      onViewReviews(caregiver);
    }
  };

  const handleRequestInfo = () => {
    if (canRequestInfo) {
      onRequestInfo(caregiver);
    }
  };

  return (
    <Card
      style={[caregiverCardStyles.card, { marginBottom: spacing.md }, style]}
      variant="elevated"
    >
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={caregiverCardStyles.wrapper}
      >
        <LinearGradient
          colors={['#ca85b1ff', '#a094f2ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={caregiverCardStyles.gradientHeader}
        >
          <View style={caregiverCardStyles.headerRow}>
            <View style={caregiverCardStyles.avatarRing}>
              {avatar && !imageError ? (
                <Image
                  source={getImageSource(avatar)}
                  style={caregiverCardStyles.avatarImage}
                  resizeMode="cover"
                  accessible={false}
                  onError={(error) => {
                    const errorMessage = error?.nativeEvent?.error || error;
                    if (errorMessage && !errorMessage.includes("couldn't be opened because there is no such file")) {
                      console.warn('Failed to load caregiver image:', errorMessage);
                    }
                    setImageError(true);
                  }}
                />
              ) : (
                <View style={caregiverCardStyles.avatarFallback}>
                  <User size={32} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={caregiverCardStyles.headerInfo}>
              <View style={caregiverCardStyles.nameRow}>
                <Text style={[typography.subtitle1, caregiverCardStyles.nameText]}>
                  {name}
                </Text>
                {verified && (
                  <View style={caregiverCardStyles.verifiedBadge}>
                    <CheckCircle size={16} color={colors.surface} />
                  </View>
                )}
              </View>

              <View style={caregiverCardStyles.badgesRow}>
                {showRatings ? (
                  <RatingComponent
                    style={caregiverCardStyles.ratingRow}
                    accessibilityRole={canViewReviews ? "button" : undefined}
                    accessibilityLabel={canViewReviews ? `View reviews for ${name}` : undefined}
                    onPress={canViewReviews ? handleViewReviews : undefined}
                  >
                    <Star
                      size={14}
                      color={hasReviews ? '#FDE68A' : 'rgba(255,255,255,0.9)'}
                      fill={hasReviews ? '#FDE68A' : 'transparent'}
                    />
                    <Text style={caregiverCardStyles.ratingText}>{ratingLabel}</Text>
                  </RatingComponent>
                ) : (
                  <View style={[caregiverCardStyles.ratingRow, caregiverCardStyles.ratingHiddenBadge]}>
                    <Star size={14} color='rgba(255,255,255,0.6)' />
                    <Text style={caregiverCardStyles.ratingText}>Hidden by caregiver</Text>
                  </View>
                )}

                {showRatings ? (
                  <TrustScoreBadge
                    trustScore={trustScore}
                    verified={verified}
                    size="small"
                    onPress={canViewReviews ? handleViewReviews : undefined}
                    style={caregiverCardStyles.trustBadgeSpacing}
                  />
                ) : null}
              </View>

              <View style={caregiverCardStyles.headerMetaRow}>
                {availabilityStatus ? (
                  <View
                    style={[
                      caregiverCardStyles.availabilityChip,
                      availabilityIsLimited && caregiverCardStyles.availabilityChipMuted,
                    ]}
                  >
                    <CheckCircle
                      size={14}
                      color={availabilityIsLimited ? 'rgba(255,255,255,0.85)' : '#10B981'}
                    />
                    <Text style={caregiverCardStyles.chipText} numberOfLines={1}>
                      {availabilityStatus}
                    </Text>
                  </View>
                ) : null}
                {responseRateLabel ? (
                  <View style={caregiverCardStyles.responseChip}>
                    <Clock size={14} color="#6366F1" />
                    <Text style={caregiverCardStyles.responseText} numberOfLines={1}>
                      {responseRateLabel}
                    </Text>
                  </View>
                ) : null}
              </View>

              {locationText ? (
                <View style={caregiverCardStyles.locationRow}>
                  <MapPin size={14} color="rgba(255,255,255,0.85)" />
                  <Text
                    style={caregiverCardStyles.locationText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {locationText}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <View style={caregiverCardStyles.body}>
          <View style={caregiverCardStyles.statGrid}>
            {statTiles.map(({ icon: StatIcon, label, value }) => (
              <View key={label} style={caregiverCardStyles.statCard}>
                <View style={caregiverCardStyles.statIconWrap}>
                  <StatIcon size={16} color={colors.primary} />
                </View>
                <Text style={caregiverCardStyles.statLabel}>{label}</Text>
                <Text style={caregiverCardStyles.statValue}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={caregiverCardStyles.divider} />

          {displaySpecialties.length > 0 && (
            <View style={caregiverCardStyles.specialtiesSection}>
              <View style={caregiverCardStyles.sectionHeaderRow}>
                <Text style={caregiverCardStyles.sectionLabel}>Focus Areas</Text>
                {remainingSpecialties > 0 && (
                  <Text style={caregiverCardStyles.sectionBadge}>+{remainingSpecialties} more</Text>
                )}
              </View>
              <View style={caregiverCardStyles.specialtiesRow}>
                {displaySpecialties.map((specialty, index) => (
                  <View
                    key={index}
                    style={[styles.tag, caregiverCardStyles.specialtyTag]}
                  >
                    <Text style={[typography.caption, caregiverCardStyles.specialtyText]}>
                      {specialty}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {(canMessage || canViewReviews || canRequestInfo) && (
            <View style={caregiverCardStyles.actionsRow}>
              {typeof onMessagePress === "function" && (
                <TouchableOpacity
                  style={[
                    caregiverCardStyles.secondaryButton,
                    caregiverCardStyles.messageButton,
                    !allowDirectMessages && caregiverCardStyles.messageButtonDisabled,
                  ]}
                  onPress={handleMessagePress}
                  accessibilityLabel={messageButtonLabel}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !allowDirectMessages }}
                  activeOpacity={allowDirectMessages ? 0.92 : 1}
                >
                  <MessageCircle size={18} color={allowDirectMessages ? colors.primary : colors.textSecondary} />
                  <Text style={[
                    caregiverCardStyles.secondaryButtonText,
                    !allowDirectMessages && caregiverCardStyles.messageButtonTextDisabled,
                  ]}>
                    Message
                  </Text>
                </TouchableOpacity>
              )}
              {canRequestInfo && (
                <TouchableOpacity
                  style={[caregiverCardStyles.secondaryButton, caregiverCardStyles.requestInfoButton]}
                  onPress={handleRequestInfo}
                  accessibilityLabel={`Request info from ${name}`}
                  accessibilityRole="button"
                  activeOpacity={0.92}
                >
                  <Shield size={18} color={colors.primaryDark} />
                  <Text style={caregiverCardStyles.secondaryButtonText}>Request Info</Text>
                </TouchableOpacity>
              )}
              {showRatings && canViewReviews && (
                <TouchableOpacity
                  style={[caregiverCardStyles.secondaryButton, caregiverCardStyles.reviewButton]}
                  onPress={handleViewReviews}
                  accessibilityLabel={`View reviews for ${name}`}
                  accessibilityRole="button"
                  activeOpacity={0.92}
                >
                  <Star size={18} color={colors.accent} fill={colors.accent} />
                  <Text style={caregiverCardStyles.secondaryButtonText}>Reviews</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            style={caregiverCardStyles.primaryButton}
            onPress={() => onPress(caregiver)}
            accessibilityLabel={bookButtonLabel}
            accessibilityRole="button"
          >
            <Calendar
              size={18}
              color={colors.textInverse}
              style={caregiverCardStyles.primaryButtonIcon}
            />
            <Text style={caregiverCardStyles.primaryButtonText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
};

CaregiverCardComponent.propTypes = {
  caregiver: PropTypes.shape({
    experience: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.shape({
        years: PropTypes.number,
        months: PropTypes.number,
        description: PropTypes.string,
      }),
    ]),
  }).isRequired,
  onRequestInfo: PropTypes.func,
};

const CaregiverCard = memo(CaregiverCardComponent);
CaregiverCard.displayName = 'CaregiverCard';

export default CaregiverCard;

const caregiverCardStyles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: colors.secondaryLight,
    overflow: 'hidden',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  wrapper: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: 'rgba(8, 184, 128, 0.15)',
  },
  gradientHeader: {
    borderRadius: 22,
    height: 128,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: spacing.xxs,
    marginBottom: spacing.md,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 4,
    marginRight: spacing.md,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 16,
    color: colors.text,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16,185,129,0.85)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ratingHiddenBadge: {
    opacity: 0.8,
    borderStyle: 'dashed',
  },
  ratingText: {
    marginLeft: spacing.xs,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  locationText: {
    marginLeft: spacing.xs,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderRadius: 22,
    //backgroundColor: 'rgba(16,185,129,0.15)',
  },
  headerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.xs,
  },
  availabilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    //backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
  },
  availabilityChipMuted: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  chipText: {
    marginLeft: spacing.xs,
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '600',
  },
  responseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.35)',
  },
  responseText: {
    marginLeft: spacing.xs,
    color: '#E0E7FF',
    fontSize: 12,
    fontWeight: '600',
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
    shadowColor: '#00000012',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(15,23,42,0.08)',
    marginVertical: spacing.md,
  },
  specialtiesSection: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specialtyTag: {
    backgroundColor: `${colors.primary}12`,
    borderColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  specialtyText: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(219,39,119,0.2)',
    backgroundColor: '#ffffff',
    shadowColor: '#00000012',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    minHeight: 48,
    flexGrow: 1,
    flexBasis: '48%',
  },
  secondaryButtonText: {
    marginLeft: spacing.xs,
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 14,
  },
  messageButton: {
    borderColor: 'rgba(59,130,246,0.25)',
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  requestInfoButton: {
    borderColor: 'rgba(219,39,119,0.45)',
    backgroundColor: 'rgba(219,39,119,0.12)',
  },
  reviewButtonText: {
    marginLeft: spacing.xs,
    color: colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonIcon: {
    marginRight: spacing.xs,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
