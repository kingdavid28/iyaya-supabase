import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { Asset } from 'expo-asset';
import { LinearGradient } from "expo-linear-gradient";
import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../contexts/AuthContext";

/**
 * WelcomeScreen displays the landing page for the Iyaya app.
 * Users can select their role (Parent or Caregiver) and view app features.
 * Accessibility labels and roles are provided for improved usability.
 */
export default function WelcomeScreen() {
  const navigation = useNavigation();
  const isWeb = Platform.OS === 'web';
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const role = user?.role;
  const hasNavigated = React.useRef(false);

  // Load logo asset for web compatibility
  React.useEffect(() => {
    const loadAsset = async () => {
      try {
        const asset = Asset.fromModule(require('../../assets/icon.png'));
        await asset.downloadAsync();
        setLogoUri(asset.uri);
      } catch (error) {
        console.error('Failed to load logo:', error);
        setLogoError(true);
      }
    };
    loadAsset();
  }, []);
  
  // Debug: log auth state when it changes
  React.useEffect(() => {
    console.log('[Welcome] Auth state:', { 
      hasUser: !!user, 
      userEmail: user?.email, 
      userRole: user?.role,
      isLoggedIn,
      role 
    });
  }, [user, isLoggedIn, role]);

  // Reset navigation flag when user logs out
  React.useEffect(() => {
    if (!isLoggedIn) {
      hasNavigated.current = false;
    }
  }, [isLoggedIn]);

  // If logged in, immediately reset to the correct dashboard based on role (only once)
  React.useEffect(() => {
    if (!isLoggedIn || !role || hasNavigated.current) return;

    const target = role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
    
    console.log(`[Welcome] User logged in as ${role}, navigating to ${target}`);
    hasNavigated.current = true;
    
    // Use setTimeout to ensure navigation happens after component mount
    const navigationTimer = setTimeout(() => {
      try {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: target }],
          })
        );
      } catch (error) {
        console.error('[Welcome] Navigation reset failed:', error);
        // Fallback to regular navigation
        try {
          navigation.dispatch(CommonActions.navigate(target));
        } catch (fallbackError) {
          console.error('[Welcome] Fallback navigation also failed:', fallbackError);
        }
      }
    }, 100);

    return () => clearTimeout(navigationTimer);
  }, [isLoggedIn, role, navigation]);

  // Navigation handlers
  const handleParentPress = React.useCallback(() => {
    console.log('[Welcome] Parent card pressed', { isLoggedIn });
    
    if (isLoggedIn) {
      navigation.dispatch(CommonActions.navigate('ParentDashboard'));
    } else {
      navigation.dispatch(CommonActions.navigate('ParentAuth'));
    }
  }, [isLoggedIn, navigation]);

  const handleCaregiverPress = React.useCallback(() => {
    console.log('[Welcome] Caregiver card pressed', { isLoggedIn });
    
    if (isLoggedIn) {
      navigation.dispatch(CommonActions.navigate('CaregiverDashboard'));
    } else {
      navigation.dispatch(CommonActions.navigate('CaregiverAuth'));
    }
  }, [isLoggedIn, navigation]);

  // Don't render the welcome screen if user is logged in
  if (isLoggedIn && role) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Redirecting to your dashboard...</Text>
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
      description: "All caregivers undergo background checks\nand verification"
    },
    {
      icon: "people-outline",
      color: "#d97706",
      bgColor: "#fef3c7",
      title: "Trusted Community",
      description: "Join thousands of happy families and\ncaregivers"
    },
    {
      icon: "heart-outline",
      color: "#9333ea",
      bgColor: "#f3e8ff",
      title: "Made with Love",
      description: "Built by parents, for parents and caregivers"
    }
  ];

  const ContainerComponent = isWeb ? View : SafeAreaView;

  console.log('[Welcome] Rendering screen', { isWeb, isLoggedIn, role });
  
  // Absolute minimal test
  return (
    <View style={{ flex: 1, backgroundColor: '#e0f2fe', padding: 20 }}>
      <Text style={{ fontSize: 24, marginTop: 100, textAlign: 'center' }}>Welcome to Iyaya</Text>
      <Pressable 
        style={{ backgroundColor: '#db2777', padding: 15, borderRadius: 8, marginTop: 20 }}
        onPress={() => navigation.navigate('ParentAuth')}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Parent Login</Text>
      </Pressable>
      <Pressable 
        style={{ backgroundColor: '#2563eb', padding: 15, borderRadius: 8, marginTop: 10 }}
        onPress={() => navigation.navigate('CaregiverAuth')}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Caregiver Login</Text>
      </Pressable>
    </View>
  );
};

/* ORIGINAL CODE BELOW - COMMENTED OUT
export default function WelcomeScreenOriginal() {
  const navigation = useNavigation();
  const isWeb = Platform.OS === 'web';
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const role = user?.role;
  const hasNavigated = React.useRef(false);
  
  console.log('[Welcome] Rendering screen original', { isWeb, isLoggedIn, role });

  return (
    <View style={styles.gradient}>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Text style={{ fontSize: 48 }}>👶</Text>
            </View>
          </View>

          <Text style={styles.tagline}>Connecting families with trusted caregivers</Text>
          <Text style={styles.subtitle}>
            Find the perfect caregiver for your child or discover amazing families to work with.{"\n"}
            Safe, secure, and built with love.
          </Text>
        </View>

        {/* Role Selection Cards */}
        <View style={styles.cardsContainer}>
          {/* Parent Card */}
          <Pressable
            style={styles.card}
            onPress={handleParentPress}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.parentIconContainer]}>
                <Ionicons name="happy-outline" size={40} color="#db2777" />
              </View>

              <Text style={styles.cardTitle}>I'm a Parent</Text>
              <Text style={styles.cardDescription}>
                Find trusted caregivers for your little ones.
                Browse profiles, read reviews, and book services with confidence.
              </Text>

              <View style={styles.getStartedButton}>
                <Text style={[styles.buttonText, { color: '#db2777' }]}>Get Started →</Text>
              </View>
            </View>
          </Pressable>

          {/* Caregiver Card */}
          <Pressable
            style={[styles.card, { borderColor: '#bfdbfe' }]}
            onPress={handleCaregiverPress}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.caregiverIconContainer]}>
                <Ionicons name="person-outline" size={40} color="#2563eb" />
              </View>

              <Text style={styles.cardTitle}>I'm a Child Caregiver</Text>
              <Text style={styles.cardDescription}>
                Join our community of trusted caregivers.
                Create your profile, showcase your skills, and connect with families.
              </Text>

              <View style={styles.getStartedButton}>
                <Text style={[styles.buttonText, { color: '#2563eb' }]}>Get Started →</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.feature}>
              <View style={[styles.featureIcon, { backgroundColor: feature.bgColor }]}>
                <Ionicons 
                  name={feature.icon} 
                  size={24} 
                  color={feature.color}
                />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#e0f2fe',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fce7f3',
    justifyContent: "center",
    alignItems: "center",
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
    alignItems: 'center',
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
    width: '100%',
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#fbcfe8",
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
  },
  getStartedButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  parentButton: {
    backgroundColor: "transparent",
  },
  caregiverButton: {
    backgroundColor: "transparent",
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

  featuresContainer: {
    flexDirection: Platform.select({
      web: 'row',
      default: 'column'
    }),
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
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