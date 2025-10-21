import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { formatAddress } from '../../utils';
import { getProfileImageUrl } from '../../../utils/imageUtils';

const CaregiverCard = ({ caregiver, onPress, onMessage, onBook, onPressRatings, showActions = true }) => {

  const {
    name,
    profileImage,
    hourlyRate,
    rating,
    reviewCount,
    experience,
    location,
    availability,
    skills,
    verified,
    distance
  } = caregiver;

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#fbbf24" />);
    }

    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={14} color="#fbbf24" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#d1d5db" />);
    }

    return stars;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.imageContainer}>
            {profileImage ? (
              <Image source={{ uri: getProfileImageUrl(caregiver) }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="person" size={24} color="#6b7280" />
              </View>
            )}
            {verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.name}>{name}</Text>
            <TouchableOpacity
              style={styles.ratingRow}
              onPress={onPressRatings}
              disabled={!onPressRatings}
              accessibilityRole={onPressRatings ? 'button' : undefined}
              accessibilityLabel={onPressRatings ? 'View ratings and reviews' : undefined}
              activeOpacity={onPressRatings ? 0.7 : 1}
            >
              {reviewCount > 0 ? (
                <>
                  <View style={styles.stars}>
                    {renderStars(rating)}
                  </View>
                  <Text style={styles.reviewText}>({reviewCount})</Text>
                </>
              ) : (
                <Text style={[styles.reviewText, { fontStyle: 'italic' }]}>New caregiver</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rateSection}>
          <Text style={styles.rate}>₱{hourlyRate}</Text>
          <Text style={styles.rateLabel}>/hour</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="briefcase" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{experience} years experience</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {formatAddress(location)} {distance && `• ${distance}km away`}
          </Text>
        </View>

        {availability && (
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{availability}</Text>
          </View>
        )}
      </View>

      {skills && skills.length > 0 && (
        <View style={styles.skillsSection}>
          {skills.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {skills.length > 3 && (
            <Text style={styles.moreSkills}>+{skills.length - 3} more</Text>
          )}
        </View>
      )}

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.messageButton} onPress={onMessage}>
            <Ionicons name="chatbubble" size={16} color="#3b82f6" />
            <Text style={styles.messageText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bookButton} onPress={onBook}>
            <Text style={styles.bookText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileSection: {
    flexDirection: 'row',
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  placeholderImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameSection: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  reviewText: {
    fontSize: 12,
    color: '#6b7280',
  },
  rateSection: {
    alignItems: 'flex-end',
  },
  rate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
  },
  rateLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  skillsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  skillBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 12,
    color: '#6b7280',
    alignSelf: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  messageText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
};

export default CaregiverCard;