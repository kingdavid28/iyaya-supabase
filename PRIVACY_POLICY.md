# iYaya Privacy Policy

**Effective Date:** October 20, 2025
**Last Updated:** October 20, 2025

## 1. Introduction

Welcome to iYaya ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services for connecting parents with caregivers for childcare services.

## 2. Information We Collect

### 2.1 Information You Provide
- **Account Information:** Name, email address, phone number, profile picture
- **Profile Information:** User role (parent/caregiver), location, availability preferences
- **Childcare Information:** Details about children, care requirements, special needs
- **Payment Information:** Processed securely through our payment partners (we do not store payment details)
- **Communication Data:** Messages exchanged between parents and caregivers

### 2.2 Information Collected Automatically
- **Device Information:** Device type, operating system, app version
- **Usage Data:** App interactions, features used, time spent
- **Location Data:** General location for matching purposes (with your permission)
- **Log Data:** IP address, browser type, pages visited, timestamps

## 3. How We Use Your Information

We use collected information to:
- **Provide Services:** Connect parents with suitable caregivers
- **Account Management:** Create and manage user accounts
- **Communication:** Facilitate messaging between users
- **Safety:** Verify identities and maintain platform security
- **Improvement:** Analyze usage patterns to improve our services
- **Legal Compliance:** Meet legal obligations and enforce terms

## 4. Information Sharing and Disclosure

We may share your information in the following circumstances:
- **With Other Users:** Parents and caregivers can see relevant profile information
- **Service Providers:** With trusted third-party services (payment processing, notifications)
- **Legal Requirements:** When required by law or to protect rights/safety
- **Business Transfers:** In case of merger, acquisition, or asset sale
- **With Consent:** When you explicitly agree to sharing

## 5. Data Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
- Encryption of data in transit and at rest
- Secure server infrastructure
- Regular security assessments
- Access controls and authentication

## 6. Data Retention

We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law.

## 7. Your Rights and Choices

Depending on your location, you may have the following rights:
- **Access:** Request information about your data
- **Correction:** Update inaccurate information
- **Deletion:** Request deletion of your account and data
- **Portability:** Receive your data in a structured format
- **Restriction:** Limit how we process your data
- **Objection:** Object to certain data processing

## 8. Children's Privacy

Our service is designed for adults seeking childcare services. We do not knowingly collect personal information from children under 13 without parental consent.

## 9. International Data Transfers

Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers.

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy and updating the effective date.

## 11. Contact Us

If you have questions about this Privacy Policy or our data practices, please contact us:

**Email:** privacy@iyaya.com
**Address:** [Your Business Address]
**Phone:** [Your Contact Number]

---

*This privacy policy was last updated on October 20, 2025.*


import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, StatusBar, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: '1',
    title: 'Welcome to iYaya',
    subtitle: 'Connect families with trusted caregivers',
    description: 'The platform that brings together parents seeking quality childcare and experienced caregivers.',
    showLogo: true,
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
  // ...
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      navigation.replace('Welcome');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      navigation.replace('Welcome');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderOnboardingItem = ({ item }) => (
    <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
      <View style={styles.iconContainer}>
        {item.showLogo ? (
          <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
            <Ionicons name={item.icon} size={60} color="white" />
          </View>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {onboardingData.map((_, index) => (
        <View key={index} style={[styles.paginationDot, { backgroundColor: index === currentIndex ? onboardingData[currentIndex].color : '#E0E0E0', width: index === currentIndex ? 24 : 8 }]} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <TouchableOpacity style={[styles.skipButton, { backgroundColor: onboardingData[currentIndex].color }]} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderOnboardingItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />
      {renderPagination()}
      <View style={styles.buttonContainer}>
        {currentIndex > 0 && (
          <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
            <Ionicons name="chevron-back" size={24} color="#666" />
            <Text style={styles.previousText}>Previous</Text>
          </TouchableOpacity>
        )}
        <View style={styles.spacer} />
        <TouchableOpacity style={[styles.nextButton, { backgroundColor: onboardingData[currentIndex].color }]} onPress={handleNext}>
          <Text style={styles.nextText}>{currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}</Text>
          <Ionicons name={currentIndex === onboardingData.length - 1 ? "checkmark" : "chevron-forward"} size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  textContainer: {
    flex: 0.4,
    alignItems: 'center',
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previousText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  spacer: {
    flex: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 25,
  },
  nextText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
});

export default OnboardingScreen;
