import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  Star,
  User,
} from "lucide-react-native";
import PropTypes from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Card } from '../../../shared/ui';

import { formatAddress } from "../../../utils/addressUtils";
import { getImageSource } from "../../../utils/imageUtils";
import { userService } from "../../../services/userService";

import { bookingService } from "../../../services/bookingService";
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

  return (
    <Card
      style={[{ marginBottom: spacing.md }, style]}
      variant="elevated"
    >
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
      <View
        style={[
          styles.flexRow,
          styles.itemsCenter,
          { marginBottom: spacing.sm },
        ]}
      >
        {avatar && !imageError ? (
          <Image
            source={getImageSource(avatar)}
            style={[styles.avatarLg, { marginRight: spacing.md }]}
            accessible={false}
            onError={(error) => {
              // Reduce log noise - only log actual errors, not missing files
              const errorMessage = error?.nativeEvent?.error || error;
              if (errorMessage && !errorMessage.includes("couldn't be opened because there is no such file")) {
                console.warn('Failed to load caregiver image:', errorMessage);
              }
              setImageError(true);
            }}
          />
        ) : (
          <View
            style={[
              styles.avatarLg,
              {
                backgroundColor: colors.gray100,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              },
            ]}
          >
            <User size={32} color={colors.gray500} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View
            style={[
              styles.flexRow,
              styles.itemsCenter,
              { marginBottom: spacing.xs },
            ]}
          >
            <Text style={[typography.subtitle1, { marginRight: spacing.xs }]}>
              {name}
            </Text>
            {caregiver?.verified && (
              <CheckCircle size={20} color={colors.success} />
            )}
          </View>
          <View
            style={[
              styles.flexRow,
              styles.itemsCenter,
              { marginBottom: spacing.xxs },
            ]}
          >
            {reviewCount > 0 ? (
              <>
                <Star size={16} color={colors.warning} fill={colors.warning} />
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary, marginLeft: spacing.xxs },
                  ]}
                >
                  {rating} ({reviewCount} reviews)
                </Text>
              </>
            ) : (
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, fontStyle: 'italic' },
                ]}
              >
                New caregiver
              </Text>
            )}
          </View>
          <View
            style={[
              styles.flexRow,
              styles.itemsCenter,
              { marginBottom: spacing.xxs },
            ]}
          >
            <MapPin size={14} color={colors.textSecondary} />
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginLeft: spacing.xxs },
              ]}
            >
              {locationText}
            </Text>
          </View>
          <View style={[styles.flexRow, styles.itemsCenter]}>
            <Clock size={14} color={colors.textSecondary} />
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginLeft: spacing.xxs },
              ]}
            >
              <Text style={styles.experience}>
                Experience: {experience ?? 0} years
              </Text>
            </Text>
          </View>
        </View>
      </View>

      {specialties && specialties.length > 0 && (
        <View
          style={[
            styles.flexRow,
            styles.flexWrap,
            { marginBottom: spacing.sm },
          ]}
        >
          {specialties.map((specialty, index) => (
            <View
              key={index}
              style={[
                styles.tag,
                {
                  backgroundColor: `${colors.primary}15`,
                  borderColor: colors.primary,
                  marginRight: spacing.xs,
                  marginBottom: spacing.xs,
                },
              ]}
            >
              <Text style={[typography.caption, { color: colors.primary }]}>
                {specialty}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View
        style={[
          styles.flexRow,
          styles.justifyBetween,
          styles.itemsCenter,
          { marginTop: spacing.sm },
        ]}
      >
        <Text style={[typography.subtitle2, { color: colors.primary }]}>
          ₱{hourlyRate}/hr
        </Text>
        <View style={styles.flexRow}>
          <TouchableOpacity
            style={[styles.iconButton, { marginRight: spacing.sm }]}
            onPress={() => onMessagePress(caregiver)}
            accessibilityLabel={messageButtonLabel}
            accessibilityRole="button"
          >
            <MessageCircle size={20} color={colors.primary} />
          </TouchableOpacity>
          {caregiver?.hasCompletedJobs && onViewReviews && (
            <TouchableOpacity
              style={[styles.iconButton, { marginRight: spacing.sm }]}
              onPress={() => onViewReviews(caregiver)}
              accessibilityLabel={`View reviews for ${name}`}
              accessibilityRole="button"
            >
              <Star size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              { flexDirection: "row", alignItems: "center" },
            ]}
            onPress={() => onPress(caregiver)}
            accessibilityLabel={bookButtonLabel}
            accessibilityRole="button"
          >
            <Calendar
              size={16}
              color={colors.textInverse}
              style={{ marginRight: spacing.xs }}
            />
            <Text style={[typography.button, { color: colors.textInverse }]}>
              Book Now
            </Text>
          </TouchableOpacity>
        </View>
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
