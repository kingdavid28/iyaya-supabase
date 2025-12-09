import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/ParentDashboard.styles';
import QuickActions from './QuickActions';


import {
  SkeletonBlock,
  SkeletonCard,
  SkeletonCircle,
  SkeletonPill
} from '../../../components/common/SkeletonPlaceholder';
import CaregiverCard from './CaregiverCard';
import MobileProfileSection from './MobileProfileSection';

const HomeTab = ({
  bookings,
  children,
  quickActions,
  onAddChild,
  onEditChild,
  onDeleteChild,
  onViewBookings,
  onViewAllChildren,
  showAllChildren,
  greetingName,
  profileImage,
  profileContact,
  profileLocation,
  userData,
  caregivers = [],
  onBookCaregiver,
  onMessageCaregiver,
  onViewReviews,
  onRequestInfo,
  navigation,
  refreshing = false,
  onRefresh,
  loading = false,
  setActiveTab
}) => {

  // Get latest 3 registered caregivers (sorted by creation date)
  const featuredCaregivers = useMemo(() =>
    caregivers
      .sort((a, b) => new Date(b.createdAt || b.registeredAt || 0) - new Date(a.createdAt || a.registeredAt || 0))
      .slice(0, 3),
    [caregivers]
  );

  console.log('🎯 HomeTab - Caregivers received:', caregivers.length);
  console.log('🎯 HomeTab - Featured caregivers:', featuredCaregivers.length, featuredCaregivers.map(c => c.name));

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.homeSkeletonContainer}>
        <SkeletonCard style={styles.homeSkeletonProfile}>
          <View style={styles.homeSkeletonProfileContent}>
            <SkeletonCircle size={64} />
            <View style={styles.homeSkeletonProfileInfo}>
              <SkeletonBlock width="60%" height={20} />
              <SkeletonBlock width="40%" height={16} />
              <SkeletonBlock width="50%" height={14} />
            </View>
          </View>
        </SkeletonCard>

        <SkeletonCard style={styles.homeSkeletonActions}>
          <View style={styles.homeSkeletonActionRow}>
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={`quick-skeleton-${index}`} style={styles.homeSkeletonActionItem}>
                <SkeletonCircle size={48} />
                <SkeletonBlock width="70%" height={12} />
              </View>
            ))}
          </View>
        </SkeletonCard>

        <SkeletonCard style={styles.homeSkeletonSection}>
          <SkeletonBlock width="50%" height={18} style={styles.homeSkeletonSectionTitle} />
          <View style={styles.homeSkeletonChildrenList}>
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={`child-skeleton-${index}`} style={styles.homeSkeletonChildCard}>
                <SkeletonCircle size={40} />
                <View style={styles.homeSkeletonChildInfo}>
                  <SkeletonBlock width="60%" height={16} />
                  <SkeletonBlock width="45%" height={14} />
                  <SkeletonPill width="35%" height={12} />
                </View>
              </View>
            ))}
          </View>
        </SkeletonCard>

        <SkeletonCard style={styles.homeSkeletonSection}>
          <SkeletonBlock width="60%" height={18} style={styles.homeSkeletonSectionTitle} />
          <View style={styles.homeSkeletonCaregivers}>
            {Array.from({ length: 2 }).map((_, index) => (
              <View key={`caregiver-skeleton-${index}`} style={styles.homeSkeletonCaregiverCard}>
                <SkeletonCircle size={48} />
                <View style={styles.homeSkeletonCaregiverInfo}>
                  <SkeletonBlock width="70%" height={16} />
                  <SkeletonBlock width="50%" height={14} />
                  <SkeletonPill width="45%" height={12} />
                </View>
                <SkeletonPill width="30%" height={14} />
              </View>
            ))}
          </View>
        </SkeletonCard>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.dashboardContent}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#db2777']}
            tintColor="#db2777"
          />
        }
      >


        <MobileProfileSection
          greetingName={greetingName}
          profileImage={profileImage}
          profileContact={profileContact}
          profileLocation={profileLocation}
          activeTab="home"
          userData={userData}
          navigation={navigation}
        />
        <QuickActions actions={quickActions} />

        {/* Children Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>My Children ({children.length})</Text>
            </View>
          </View>

          {children.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No children added yet</Text>
              <Text style={styles.emptyStateSubtext}>Use the "Add Child" quick action above</Text>
            </View>
          ) : (
            <View style={styles.childrenList}>
              {(showAllChildren ? children : children.slice(0, 3)).map((child, index) => (
                <View key={child._id || child.id || index} style={styles.childItemCard}>
                  <View style={styles.topRightButtons}>
                    <TouchableOpacity
                      style={styles.editButtonX}
                      onPress={() => onEditChild(child)}
                    >
                      <Text style={styles.editButtonXText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButtonX}
                      onPress={() => onDeleteChild(child)}
                    >
                      <Text style={styles.deleteButtonXText}>×</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.childContentLeft}>
                    <View style={styles.childIcon}>
                      <Text style={{ fontSize: 20, color: '#db2777' }}>👶</Text>
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{child.name}</Text>
                      <Text style={styles.childDetails}>Age: {child.age} years old</Text>
                      {child.allergies && (
                        <Text style={styles.childAllergies}>⚠️ {child.allergies}</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {children.length > 3 && (
            <TouchableOpacity
              style={{ padding: 12, alignItems: 'center' }}
              onPress={onViewAllChildren}
            >
              <Text style={styles.linkText}>
                {showAllChildren ? 'Show Less' : `View All ${children.length} Children`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Featured Caregivers Section */}
        <View style={{ paddingHorizontal: 8, marginBottom: 20, overflow: 'visible' }}>
          <Text style={[styles.sectionTitle, { marginBottom: 12, marginLeft: 8 }]}>Featured Caregivers ({featuredCaregivers.length})</Text>
          {featuredCaregivers.length > 0 ? (
            featuredCaregivers.map((caregiver) => (
              <CaregiverCard
                key={caregiver.id || caregiver._id}
                caregiver={caregiver}
                onPress={onBookCaregiver}
                onMessagePress={onMessageCaregiver}
                onViewReviews={onViewReviews}
                onRequestInfo={onRequestInfo}
              />
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No caregivers available yet</Text>
              <Text style={styles.emptyStateSubtext}>Check back later for featured caregivers</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeTab;
