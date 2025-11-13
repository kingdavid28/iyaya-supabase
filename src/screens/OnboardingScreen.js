import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '../contexts/ThemeContext';

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
  {
    id: '2',
    title: 'For Parents',
    subtitle: 'Find & book trusted caregivers easily',
    description: 'Browse verified profiles, post jobs, manage bookings, and communicate securely with background-checked caregivers.',
    icon: 'people-outline',
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
  {
    id: '3',
    title: 'Parent Features',
    subtitle: 'Complete childcare management',
    description: 'Add children profiles, track booking history, upload payment confirmations, and rate your experience with caregivers.',
    icon: 'shield-checkmark-outline',
    color: '#EC4899',
    backgroundColor: '#FCE7F3',
  },
  {
    id: '4',
    title: 'For Caregivers',
    subtitle: 'Find rewarding childcare opportunities',
    description: 'Browse jobs, showcase certifications, manage availability, build relationships with families, and grow your career.',
    icon: 'briefcase-outline',
    color: '#5bbafa',
    backgroundColor: '#e0f2fe',
  },
  {
    id: '5',
    title: 'Start Earning Today',
    subtitle: 'Join our community of trusted caregivers',
    description: 'Turn your passion for childcare into a rewarding career. Flexible schedules, competitive rates, and meaningful work await you.',
    icon: 'star-outline',
    color: '#b672ff',
    backgroundColor: '#f3e8ff',
  },
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const { theme } = useThemeContext();
  const backgroundColor = theme?.colors?.background ?? '#FFFFFF';
  const isDarkTheme = theme?.dark ?? false;

  const slideWidth = Math.max(windowWidth, 1);
  const clampedIndex = Math.min(Math.max(currentIndex, 0), onboardingData.length - 1);
  const currentSlide = onboardingData[clampedIndex] ?? onboardingData[0];
  const iconSize = isWeb ? 96 : 60;
  const logoSize = isWeb ? 220 : 150;

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: clampedIndex * slideWidth,
        animated: false,
      });
    }
  }, [slideWidth, clampedIndex]);

  const handleNext = () => {
    if (clampedIndex < onboardingData.length - 1) {
      const nextIndex = clampedIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * slideWidth,
        animated: true,
      });
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
    if (clampedIndex > 0) {
      const prevIndex = clampedIndex - 1;
      setCurrentIndex(prevIndex);
      flatListRef.current?.scrollToOffset({
        offset: prevIndex * slideWidth,
        animated: true,
      });
    }
  };

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / slideWidth);

    if (newIndex >= 0 && newIndex < onboardingData.length && newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  const renderOnboardingItem = ({ item }) => (
    <View
      style={[
        styles.slide,
        isWeb && styles.webSlide,
        {
          backgroundColor: item.backgroundColor,
          width: slideWidth,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        {item.showLogo ? (
          <Image
            source={require('../../assets/icon.png')}
            style={[
              styles.logoImage,
              { width: logoSize, height: logoSize }
            ]}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
            <Ionicons
              name={item.icon}
              size={iconSize}
              color="white"
            />
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
      {onboardingData.map((_, index) => {
        const isActive = clampedIndex === index;
        return (
          <View
            key={`dot-${index}`}
            style={[
              styles.paginationDot,
              {
                backgroundColor: isActive ? currentSlide.color : '#E0E0E0',
                width: isActive ? 24 : 8,
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        isWeb && styles.webContainer,
        { backgroundColor },
      ]}
    >
      <StatusBar
        barStyle={isDarkTheme ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
        translucent
      />

      {/* Skip Button */}
      <TouchableOpacity
        style={[styles.skipButton, { backgroundColor: currentSlide.color }]}
        onPress={handleSkip}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Onboarding Content */}
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderOnboardingItem}
        horizontal
        pagingEnabled
        snapToInterval={slideWidth}
        snapToAlignment="center"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleScroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: slideWidth,
          offset: slideWidth * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToOffset({
              offset: slideWidth * index,
              animated: true,
            });
          });
        }}
      />

      {/* Pagination */}
      {renderPagination()}

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {clampedIndex > 0 && (
          <TouchableOpacity
            style={styles.previousButton}
            onPress={handlePrevious}
          >
            <Ionicons name="chevron-back" size={24} color="#666" />
            <Text style={styles.previousText}>Previous</Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: currentSlide.color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>
            {clampedIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={clampedIndex === onboardingData.length - 1 ? 'checkmark' : 'chevron-forward'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webContainer: {
    minHeight: '100vh',
    width: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  skipText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  webSlide: {
    minHeight: '100vh',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logoImage: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
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
    transition: 'width 0.3s ease',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  nextText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
});

export default OnboardingScreen;