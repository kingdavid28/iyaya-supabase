import { LinearGradient } from "expo-linear-gradient";
import {
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    MapPin,
    MessageCircle,
    Star,
    User,
} from "lucide-react-native";
import PropTypes from "prop-types";
import React, { useState } from "react";
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
const CaregiverCard = ({ caregiver = {}, onPress, onMessagePress, onViewReviews, testID, style }) => {


  // Safe defaults
  const name = caregiver?.name || "Caregiver";
  const avatarRaw =
    caregiver?.avatar ||
    caregiver?.profileImage ||
    caregiver?.user?.profileImage ||
    "";
  const rating = typeof caregiver?.rating === "number" ? caregiver.rating : 0;
  const reviewCount =
    typeof caregiver?.reviewCount === "number" ? caregiver.reviewCount : 0;
  const trustScoreSource = caregiver?.trustScore ?? caregiver?.verification?.trustScore;
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
    caregiver?.user?.address;


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

  // Track image load failure for graceful fallback
  const [imageError, setImageError] = useState(false);

  // Use centralized image URL handling
  const avatar = avatarRaw || caregiver?.profileImage || caregiver?.user?.profileImage;

  const accessibilityLabel = `${name}${specialties.length ? `, ${specialties.join(", ")}` : ""}, ${rating} star rating`;
  const bookButtonLabel = `Book ${name} for a session`;
  const messageButtonLabel = `Message ${name}`;

  // Format the location before rendering
  const locationText = getLocationString(locationSource);
  const ratingValue = Number.isFinite(Number(rating)) ? Number(rating).toFixed(1) : "0.0";
  const hasReviews = reviewCount > 0;
  const ratingLabel = hasReviews ? `${ratingValue} • ${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "New caregiver";
  const experienceLabel = `${typeof experience === "number" && !Number.isNaN(experience) ? experience : 0} yrs exp`;
  const hourlyRateLabel = hourlyRate ? `₱${hourlyRate}/hr` : "Rate TBD";
  const displaySpecialties = specialties.slice(0, 3);
  const remainingSpecialties = specialties.length - displaySpecialties.length;
  const canMessage = typeof onMessagePress === "function";
  const canViewReviews = typeof onViewReviews === "function" && hasReviews;
  const RatingComponent = canViewReviews ? TouchableOpacity : View;

  const handleMessagePress = () => {
    if (canMessage) {
      onMessagePress(caregiver);
    }
  };

  const handleViewReviews = () => {
    if (canViewReviews) {
      onViewReviews(caregiver);
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

              <RatingComponent
                style={caregiverCardStyles.ratingRow}
                accessibilityRole={canViewReviews ? "button" : undefined}
                accessibilityLabel={canViewReviews ? `View reviews for ${name}` : undefined}
                onPress={canViewReviews ? handleViewReviews : undefined}
              >
                <Star size={14} color={hasReviews ? '#FDE68A' : 'rgba(255,255,255,0.9)'} fill={hasReviews ? '#FDE68A' : 'transparent'} />
                <Text style={caregiverCardStyles.ratingText}>{ratingLabel}</Text>
              </RatingComponent>

              <TrustScoreBadge
                trustScore={trustScore}
                verified={verified}
                size="small"
                onPress={canViewReviews ? handleViewReviews : undefined}
                style={caregiverCardStyles.trustBadgeSpacing}
              />

              {locationText ? (
                <View style={caregiverCardStyles.locationRow}>
                  <MapPin size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={caregiverCardStyles.locationText}>{locationText}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <View style={caregiverCardStyles.body}>
          <View style={caregiverCardStyles.metaRow}>
            <View style={caregiverCardStyles.metaChip}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={caregiverCardStyles.metaChipText}>{experienceLabel}</Text>
            </View>
            <View style={caregiverCardStyles.metaChip}>
              <DollarSign size={14} color={colors.textSecondary} />
              <Text style={caregiverCardStyles.metaChipText}>{hourlyRateLabel}</Text>
            </View>
          </View>

          {displaySpecialties.length > 0 && (
            <View style={caregiverCardStyles.specialtiesRow}>
              {displaySpecialties.map((specialty, index) => (
                <View
                  key={index}
                  style={[styles.tag, caregiverCardStyles.specialtyTag]}
                >
                  <Text style={[typography.caption, { color: colors.primary }]}>
                    {specialty}
                  </Text>
                </View>
              ))}
              {remainingSpecialties > 0 && (
                <View style={[styles.tag, caregiverCardStyles.moreTag]}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    +{remainingSpecialties} more
                  </Text>
                </View>
              )}
            </View>
          )}

          {(canMessage || canViewReviews) && (
            <View style={caregiverCardStyles.actionsRow}>
              {canMessage && (
                <TouchableOpacity
                  style={caregiverCardStyles.secondaryButton}
                  onPress={handleMessagePress}
                  accessibilityLabel={messageButtonLabel}
                  accessibilityRole="button"
                >
                  <MessageCircle size={18} color={colors.primaryDark} />
                  <Text style={caregiverCardStyles.secondaryButtonText}>Message</Text>
                </TouchableOpacity>
              )}
              {canViewReviews && (
                <TouchableOpacity
                  style={[caregiverCardStyles.secondaryButton, caregiverCardStyles.reviewButton]}
                  onPress={handleViewReviews}
                  accessibilityLabel={`View reviews for ${name}`}
                  accessibilityRole="button"
                >
                  <Star size={18} color={colors.accent} fill={colors.accent} />
                  <Text style={caregiverCardStyles.reviewButtonText}>Reviews</Text>
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

export default CaregiverCard;

CaregiverCard.propTypes = {
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
};

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
    backgroundColor: colors.secondaryLight,
  },
  gradientHeader: {
    backgroundColor: colors.secondaryLight,
    borderRadius: 22, 
    height: 128,  
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: colors.secondaryLight,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaChipText: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  specialtyTag: {
    backgroundColor: `${colors.primary}12`,
    borderColor: colors.primary,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  moreTag: {
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    marginLeft: spacing.xs,
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
  },
  reviewButton: {
    backgroundColor: colors.accentLight,
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
    paddingVertical: 14,
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonIcon: {
    marginRight: spacing.xs,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 15,
  },
});
