import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/ParentDashboard.styles';

// Reusable Tab Button Component with Notification Badge
const TabButton = React.memo(({
  activeTab,
  tabName,
  iconName,
  label,
  setActiveTab,
  notificationCount = 0,
  showBadge = true
}) => {
  const handlePress = useCallback(() => setActiveTab(tabName), [setActiveTab, tabName]);
  
  return (
    <TouchableOpacity
      style={[styles.navItem, activeTab === tabName && styles.activeNavItem]}
      onPress={handlePress}
    >
      <View style={{ position: 'relative' }}>
        <Ionicons 
          name={iconName} 
          size={20} 
          color={activeTab === tabName ? colors.secondary : colors.textTertiary} 
        />
        {showBadge && notificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.navText, activeTab === tabName && styles.activeNavText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const NavigationTabs = React.memo(({
  activeTab,
  setActiveTab,
  onProfilePress,
  navigation,
  tabNotificationCounts = {}
}) => {
  // Destructure notification counts with default values
  const {
    messages: messagesCount = 0,
    bookings: bookingsCount = 0,
    jobs: jobsCount = 0,
    applications: applicationsCount = 0,
    reviews: reviewsCount = 0,
    notifications: otherNotifications = 0
  } = tabNotificationCounts;

  return (
    <View style={styles.tabContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScrollContent}
      >
        <TabButton
          activeTab={activeTab}
          tabName="home"
          iconName="home-outline"
          label="Home"
          setActiveTab={setActiveTab}
        />

        <TabButton
          activeTab={activeTab}
          tabName="search"
          iconName="search-outline"
          label="Search"
          setActiveTab={setActiveTab}
        />

        <TabButton
          activeTab={activeTab}
          tabName="bookings"
          iconName="calendar-outline"
          label="Bookings"
          notificationCount={bookingsCount}
          setActiveTab={setActiveTab}
        />

        <TabButton
          activeTab={activeTab}
          tabName="messages"
          iconName="chatbubble-ellipses-outline"
          label="Messages"
          notificationCount={messagesCount}
          setActiveTab={setActiveTab}
        />

        <TabButton
          activeTab={activeTab}
          tabName="jobs"
          iconName="briefcase-outline"
          label="Jobs"
          notificationCount={jobsCount}
          setActiveTab={setActiveTab}
        />

        <TabButton
          activeTab={activeTab}
          tabName="applications"
          iconName="people-outline"
          label="Applications"
          notificationCount={applicationsCount}
          setActiveTab={setActiveTab}
        />

        <TabButton
          activeTab={activeTab}
          tabName="reviews"
          iconName="star-outline"
          label="My Reviews"
          notificationCount={reviewsCount}
          setActiveTab={setActiveTab}
        />

        <TabButton
          activeTab={activeTab}
          tabName="alerts"
          iconName="notifications-outline"
          label="Alerts"
          notificationCount={otherNotifications}
          setActiveTab={setActiveTab}
          showBadge={true}
        />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  tabsScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navItem: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 4,
    minWidth: 60,
  },
  activeNavItem: {
    backgroundColor: '#f5f3ff',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default NavigationTabs;
