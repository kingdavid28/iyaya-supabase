import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../contexts/AuthContext";
import { trackEvent } from '../utils/analytics';

/**
 * WelcomeScreen displays the landing page for the Iyaya app.
 * Users can select their role (Parent or Caregiver) and view app features.
 * Accessibility labels and roles are provided for improved usability.
 */
export default function WelcomeScreen() {
  const navigation = useNavigation();
  const { user, signOut, isLoading } = useAuth();
  const isLoggedIn = !!user;
  const role = user?.role;
  const hasNavigated = React.useRef(false);
  
  // Debug: log auth state when it changes
  React.useEffect(() => {
    console.log('[Welcome] Auth state:', { 
      hasUser: !!user, 
      userEmail: user?.email, 
      userRole: user?.role,
      isLoggedIn,
      role,
      isLoading
    });
    
    // Navigate immediately when user becomes authenticated
    if (user && user.role && !isLoading) {
      const dashboardRoute = user.role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
      console.log('[Welcome] User authenticated, navigating to:', dashboardRoute);
      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: dashboardRoute }],
      }));
    }
  }, [user, isLoggedIn, role, isLoading, navigation]);

  // Reset navigation flag when user logs out
  React.useEffect(() => {
    if (!isLoggedIn) {
      hasNavigated.current = false;
    }
  }, [isLoggedIn]);

  // Navigation is now handled by AppNavigator, no need for automatic redirect

  // Navigation handlers
  const handleParentPress = React.useCallback(() => {
    console.log('[Welcome] Parent card pressed', { isLoggedIn, role });
    
    // Track user interaction
    trackEvent('welcome_card_clicked', { 
      card_type: 'parent',
      user_logged_in: isLoggedIn,
      user_role: role
    });
    
    // Only handle navigation for non-logged-in users
    if (!isLoggedIn) {
      navigation.dispatch(CommonActions.navigate('ParentAuth'));
    }
    // For logged-in users, AppNavigator handles navigation automatically
  }, [isLoggedIn, role, navigation]);

  const handleCaregiverPress = React.useCallback(() => {
    console.log('[Welcome] Caregiver card pressed', { isLoggedIn, role });
    
    // Track user interaction
    trackEvent('welcome_card_clicked', { 
      card_type: 'caregiver',
      user_logged_in: isLoggedIn,
      user_role: role
    });
    
    // Only handle navigation for non-logged-in users
    if (!isLoggedIn) {
      navigation.dispatch(CommonActions.navigate('CaregiverAuth'));
    }
    // For logged-in users, AppNavigator handles navigation automatically
  }, [isLoggedIn, role, navigation]);

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#db2777" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }



  // Gradient colors reused throughout the component
  const backgroundGradient = ["#fce8f4", "#e0f2fe", "#f3e8ff"];
  const parentGradient = ["#fce7f3", "#fbcfe8"];
  const caregiverGradient = ["#e0f2fe", "#bae6fd"];
  const logoGradient = ["#fbcfe8", "#f9a8d4"];

  const features = [
    {
      icon: "checkmark-circle-outline",
      color: "#16a34a",
      bgColor: "#dcfce7",
      title: "Verified Profiles",
      description: "All caregivers undergo background checks and verification"
    },
    {
      icon: "people-outline",
      color: "#d97706",
      bgColor: "#fef3c7",
      title: "Trusted Community",
      description: "Join thousands of happy families and caregivers"
    },
    {
      icon: "heart-outline",
      color: "#9333ea",
      bgColor: "#f3e8ff",
      title: "Made with Love",
      description: "Built by parents, for parents and caregivers"
    }
  ];

  return (
    <LinearGradient 
      colors={backgroundGradient} 
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer} accessibilityLabel="Iyaya logo">
              <LinearGradient 
                colors={logoGradient}
                style={styles.logoBackground}
              >
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="Iyaya app logo"
                />
              </LinearGradient>
            </View>

            <Text style={styles.tagline}>Connecting families with trusted caregivers</Text>
            <Text style={styles.subtitle}>
              Find the perfect caregiver for your child or discover amazing families to work with.
              {"\n"}
              Safe, secure, and built with love.
            </Text>
          </View>

          {/* Role Selection Cards */}
          <View style={styles.cardsContainer}>
            {/* Parent Card */}
            <Pressable
              style={({ pressed }) => [
                styles.card, 
                styles.parentCard,
                pressed && styles.cardPressed
              ]}
              onPress={handleParentPress}
              android_ripple={{ color: "rgba(219, 39, 119, 0.1)" }}
              accessibilityRole="button"
              accessibilityLabel="I'm a Parent. Find trusted caregivers for your little ones. Get Started."
              accessibilityHint="Double tap to select parent role"
            >
              <View style={styles.cardContent}>
                <LinearGradient 
                  colors={parentGradient}
                  style={[styles.iconContainer, styles.parentIconContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="happy-outline" size={40} color="#db2777" accessibilityLabel="Parent icon" />
                </LinearGradient>

                <Text style={styles.cardTitle}>I'm a Parent</Text>
                <Text style={styles.cardDescription}>
                  Find trusted caregivers for your little ones.
                  {"\n"}
                  Browse profiles, read reviews, and book services with confidence.
                </Text>

                <View style={[styles.getStartedButton, styles.parentButton]}>
                  <Text style={[styles.buttonText, styles.parentButtonText]}>Get Started</Text>
                  <View style={styles.buttonDot} />
                </View>
              </View>
            </Pressable>

            {/* Caregiver Card */}
            <Pressable
              style={({ pressed }) => [
                styles.card, 
                styles.caregiverCard,
                pressed && styles.cardPressed
              ]}
              onPress={handleCaregiverPress}
              android_ripple={{ color: "rgba(37, 99, 235, 0.1)" }}
              accessibilityRole="button"
              accessibilityLabel="I'm a Child Caregiver. Join our community of trusted caregivers. Get Started."
              accessibilityHint="Double tap to select caregiver role"
            >
              <View style={styles.cardContent}>
                <LinearGradient 
                  colors={caregiverGradient}
                  style={[styles.iconContainer, styles.caregiverIconContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person-outline" size={40} color="#2563eb" accessibilityLabel="Caregiver icon" />
                </LinearGradient>

                <Text style={styles.cardTitle}>I'm a Child Caregiver</Text>
                <Text style={styles.cardDescription}>
                  Join our community of trusted caregivers.
                  {"\n"}
                  Create your profile, showcase your skills, and connect with families.
                </Text>

                <View style={[styles.getStartedButton, styles.caregiverButton]}>
                  <Text style={[styles.buttonText, styles.caregiverButtonText]}>Get Started</Text>
                  <View style={[styles.buttonDot, styles.caregiverButtonDot]} />
                </View>
              </View>
            </Pressable>
          </View>

          {/* Features Section */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View 
                key={index} 
                style={styles.feature}
                accessibilityLabel={`${feature.title}: ${feature.description}`}
                accessibilityRole="text"
              >
                <View style={[styles.featureIcon, { backgroundColor: feature.bgColor }]}>
                  <Ionicons 
                    name={feature.icon} 
                    size={24} 
                    color={feature.color} 
                    accessibilityLabel={`${feature.title} icon`} 
                  />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.select({
      web: 60,
      default: 40
    }),
    paddingBottom: Platform.select({
      web: 40,
      default: 20
    }),
    maxWidth: Platform.select({
      web: 1200,
      default: '100%',
    }),
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: "center",
    marginBottom: Platform.select({
      web: 40,
      default: 30
    }),
    paddingHorizontal: 16,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBackground: {
    width: Platform.select({
      web: 180,
      default: 150
    }),
    height: Platform.select({
      web: 180,
      default: 150
    }),
    borderRadius: Platform.select({
      web: 40,
      default: 30
    }),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#db2777",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: Platform.select({
      web: 150,
      default: 120
    }),
    height: Platform.select({
      web: 150,
      default: 120
    }),
  },
  tagline: {
    fontSize: Platform.select({
      web: 20,
      default: 18
    }),
    fontWeight: "600",
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: Platform.select({
      web: 16,
      default: 14
    }),
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  cardsContainer: {
    flexDirection: Platform.select({
      web: 'row',
      default: 'column'
    }),
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: Platform.select({
      web: 50,
      default: 30
    }),
    gap: 16,
    width: '100%',
    maxWidth: Platform.select({
      web: 1200,
      default: '100%',
    }),
    paddingHorizontal: 16,
  },
  card: {
    flex: Platform.select({
      web: 1,
      default: undefined
    }),
    width: Platform.select({
      web: 'auto',
      default: '100%'
    }),
    maxWidth: Platform.select({
      web: 400,
      default: '100%'
    }),
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: Platform.select({
      web: 40,
      default: 24
    }),
    shadowColor: "#000",
    shadowOffset: { 
      width: 0, 
      height: Platform.select({
        web: 4,
        default: 2
      }) 
    },
    shadowOpacity: Platform.select({
      web: 0.1,
      default: 0.05
    }),
    shadowRadius: Platform.select({
      web: 12,
      default: 8
    }),
    elevation: Platform.select({
      web: 8,
      default: 3
    }),
    minHeight: Platform.select({
      web: 320,
      default: 280
    }),
    borderWidth: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  parentCard: {
    borderColor: "#fbcfe8",
  },
  caregiverCard: {
    borderColor: "#bfdbfe",
  },
  cardContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  parentIconContainer: {
    backgroundColor: "#fce7f3",
  },
  caregiverIconContainer: {
    backgroundColor: "#e0f2fe",
  },
  cardTitle: {
    fontSize: Platform.select({
      web: 22,
      default: 20
    }),
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  cardDescription: {
    fontSize: Platform.select({
      web: 14,
      default: 13
    }),
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    flex: 1,
  },
  getStartedButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
  },
  parentButton: {
    backgroundColor: "transparent",
    borderColor: "#db2777",
  },
  caregiverButton: {
    backgroundColor: "transparent",
    borderColor: "#2563eb",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  parentButtonText: {
    color: "#db2777",
  },
  caregiverButtonText: {
    color: "#2563eb",
  },
  buttonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#db2777",
  },
  caregiverButtonDot: {
    backgroundColor: "#2563eb",
  },
  featuresContainer: {
    flexDirection: Platform.select({
      web: 'row',
      default: 'column'
    }),
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 24,
    width: '100%',
    paddingHorizontal: 16,
    maxWidth: Platform.select({
      web: 1200,
      default: '100%',
    }),
  },
  feature: {
    alignItems: 'center',
    paddingHorizontal: 8,
    flex: Platform.select({
      web: 1,
      default: undefined
    }),
    width: Platform.select({
      web: undefined,
      default: '100%'
    }),
    marginBottom: Platform.select({
      web: 0,
      default: 16
    }),
    maxWidth: Platform.select({
      web: 300,
      default: '100%'
    }),
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: Platform.select({
      web: 16,
      default: 15
    }),
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: Platform.select({
      web: 12,
      default: 11
    }),
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 16,
  },
});