import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, NativeModules, Platform, View } from "react-native";

// Core imports
import { useAuth } from "../../contexts/AuthContext";
import { useThemeContext } from "../../contexts/ThemeContext";

// Main screen imports
import CaregiverProfileComplete from "../../screens/CaregiverProfileComplete";
import VerificationSuccessScreen from "../../screens/VerificationSuccessScreen";
import WelcomeScreen from "../../screens/WelcomeScreen";

// Auth screen imports
import EmailVerificationScreen from "../../screens/EmailVerificationScreen";

// Chat screen imports
import CaregiverReviewsScreen from "../../screens/CaregiverReviewsScreen";
import Chat from "../../screens/Chat";

// Legacy screen imports (to be migrated)
import AppealScreen from "../../screens/AppealScreen";
import CreateReportScreen from "../../screens/CreateReportScreen";
import EmailVerificationPendingScreen from "../../screens/EmailVerificationPendingScreen";
import JobSearchScreen from "../../screens/JobSearchScreen";
import MyReportsScreen from "../../screens/MyReportsScreen";
import OnboardingScreen from "../../screens/OnboardingScreen";
import AuthCallbackScreen from "../../screens/AuthCallbackScreen";

// Primary screens
import AvailabilityManagementScreen from "../../screens/AvailabilityManagementScreen";
import BookingManagementScreen from "../../screens/BookingManagementScreen";
import CaregiverAuth from "../../screens/CaregiverAuth";
import CaregiverDashboard from "../../screens/CaregiverDashboard";
import ChildrenManagementScreen from "../../screens/ChildrenManagementScreen";
import EnhancedCaregiverProfileWizard from "../../screens/EnhancedCaregiverProfileWizard";
import ParentAuth from "../../screens/ParentAuth";
import ParentDashboard from "../../screens/ParentDashboard/ParentDashboard";
import ParentProfile from "../../screens/ParentProfile";
import PaymentConfirmationScreen from "../../screens/PaymentConfirmationScreen";
import ProfileScreen from "../../screens/profile/ProfileScreen";

// Utils
import DeepLinkHandler from "../../components/navigation/DeepLinkHandler";
import StatusGuard from "../../components/auth/StatusGuard";
import { hasSeenOnboarding } from "../../utils/onboarding";

const ensureGlobalLocationPolyfill = () => {
  if (Platform.OS === "web") {
    return;
  }

  const existingLocation = global?.location;
  if (existingLocation && typeof existingLocation === "object" && typeof existingLocation.href === "string") {
    return;
  }

  const normalizeCandidate = (candidate) => {
    if (typeof candidate !== "string" || !candidate.trim()) {
      return null;
    }

    const trimmed = candidate.trim();

    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("file://")) {
      return trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
    }

    if (trimmed.startsWith("exp://")) {
      return `http://${trimmed.slice("exp://".length)}`;
    }

    if (trimmed.startsWith("exps://")) {
      return `https://${trimmed.slice("exps://".length)}`;
    }

    if (trimmed.startsWith("devtools://")) {
      return `https://${trimmed.slice("devtools://".length)}`;
    }

    return `https://${trimmed.replace(/^\/+/, "")}`;
  };

  const createLocationFromURL = (parsedURL) => {
    const { protocol, host, hostname, port, pathname, search, hash } = parsedURL;
    const origin = `${protocol}//${host}`;

    return {
      href: parsedURL.href,
      origin,
      protocol,
      host,
      hostname,
      port,
      pathname,
      search,
      hash
    };
  };

  const rawCandidates = [
    NativeModules?.SourceCode?.scriptURL,
    Constants?.expoConfig?.hostUri,
    Constants?.expoConfig?.extra?.expoGo?.hostUri,
    Constants?.expoConfig?.extra?.expoGo?.linkingUri,
    Constants?.expoConfig?.extra?.expoClient?.hostUri,
    Constants?.expoConfig?.extra?.expoClient?.publishedUrl,
    Constants?.expoConfig?.extra?.expoClient?.url,
    Constants?.linkingUrl,
    Constants?.initialUri
  ];

  let loopbackFallback = null;

  for (const candidate of rawCandidates) {
    const normalized = normalizeCandidate(candidate);
    if (!normalized) {
      continue;
    }

    try {
      const parsedURL = new URL(normalized);
      const hostname = parsedURL.hostname?.toLowerCase() || "";
      const isLoopbackHost =
        hostname === "localhost" ||
        hostname === "0.0.0.0" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("127.");

      if (isLoopbackHost) {
        if (!loopbackFallback) {
          loopbackFallback = parsedURL;
        }
        continue;
      }

      global.location = createLocationFromURL(parsedURL);
      return;
    } catch (error) {
      console.warn("Failed to parse candidate for global.location polyfill", { candidate: normalized, error });
    }
  }

  if (loopbackFallback) {
    console.warn("Using loopback bundle host for global.location polyfill", { host: loopbackFallback.host });
    global.location = createLocationFromURL(loopbackFallback);
    return;
  }

  console.warn("Falling back to localhost for global.location polyfill");
  const fallbackOrigin = "http://localhost";
  global.location = {
    href: `${fallbackOrigin}/`,
    origin: fallbackOrigin,
    protocol: "http:",
    host: "localhost",
    hostname: "localhost",
    port: "",
    pathname: "/",
    search: "",
    hash: ""
  };
};

// Run the polyfill
ensureGlobalLocationPolyfill();

const Stack = createNativeStackNavigator();

// Create a wrapper component that handles auth state
const AppNavigatorWithAuth = () => {
  const { user, isLoading } = useAuth();
  const { theme } = useThemeContext();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigationRef = useRef(null);
  const fallbackTimeoutRef = useRef(null);

  // Check if user has seen onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const hasSeenOnboardingBefore = await hasSeenOnboarding();
        setShowOnboarding(!hasSeenOnboardingBefore);
      } catch (error) {
        console.error('Error checking onboarding:', error);
        setShowOnboarding(false);
      } finally {
        setOnboardingChecked(true);
      }
    };

    checkOnboarding();
  }, []);

  // Handle splash screen timeout
// Handle splash screen with platform-specific logic and robust error handling
useEffect(() => {
  // Don't set up timeout if still loading or onboarding not checked
  if (isLoading || !onboardingChecked || fallbackTimeoutRef.current) {
    return;
  }

  // Platform-specific splash screen handling
  const handleSplashScreen = async () => {
    try {
      // Always hide splash screen immediately for web deployment
      await SplashScreen.hideAsync();
      
      if (Platform.OS !== 'web') {
        // Native: Set a fallback timeout to ensure splash screen is hidden
        const timeoutId = setTimeout(async () => {
          console.warn('⚠️ SplashScreen fallback triggered - forcing hide after timeout', { 
            platform: Platform.OS,
            isLoading,
            onboardingChecked
          });
          try {
            await SplashScreen.hideAsync();
          } catch (error) {
            console.error('Failed to hide splash screen in fallback:', error);
          }
        }, 3000); // 3 second timeout for native platforms

        fallbackTimeoutRef.current = timeoutId;

        // Clean up the timeout if the component unmounts
        return () => {
          if (fallbackTimeoutRef.current === timeoutId) {
            clearTimeout(timeoutId);
            fallbackTimeoutRef.current = null;
          }
        };
      }
    } catch (error) {
      console.error('Error in splash screen handling:', error);
    }
  };

  handleSplashScreen();

  // Cleanup function
  return () => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  };
}, [isLoading, onboardingChecked]);

  // Handle navigation when user is authenticated
  useEffect(() => {
    if (!navigationRef.current) return;
    
    const unsubscribe = navigationRef.current.addListener('state', () => {
      if (!isLoading && user && user.role) {
        const currentRoute = navigationRef.current.getCurrentRoute()?.name;
        const dashboardRoute = user.role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
        
        if (currentRoute !== dashboardRoute) {
          console.log('[AppNavigator] Auto-navigating to dashboard:', dashboardRoute);
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: dashboardRoute }],
          });
        }
      }
    });
    
    return unsubscribe;
  }, [user, isLoading]);
  
  // Also handle immediate navigation
  useEffect(() => {
    if (!isLoading && user && user.role && navigationRef.current) {
      const dashboardRoute = user.role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
      console.log('[AppNavigator] User authenticated, navigating to:', dashboardRoute);
      
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: dashboardRoute }],
      });
    }
  }, [user?.id, isLoading]);

  // Show loading screen while checking auth and onboarding
  if (isLoading || !onboardingChecked) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Determine initial route based on onboarding and auth state
  const getInitialRouteName = () => {
    if (showOnboarding) {
      return "Onboarding";
    }
    // Always start with Welcome for OAuth flows to work properly
    return "Welcome";
  };

  return (
    <NavigationContainer
      theme={theme}
      ref={navigationRef}
      linking={{
        prefixes: [
          'iyaya://', 
          'https://iyaya-supabase.vercel.app',
          'exp://192.168.1.100:8081/--/',
          'exp://localhost:8081/--/'
        ],
        config: {
          screens: {
            ContractView: 'contract/:contractId',
            AuthCallback: 'auth/callback',
            Welcome: '',
            Onboarding: 'onboarding',
            ParentAuth: 'auth/parent',
            CaregiverAuth: 'auth/caregiver',
            ParentDashboard: 'dashboard/parent',
            CaregiverDashboard: 'dashboard/caregiver',
          },
        },
      }}
      onReady={() => {
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        SplashScreen.hideAsync().catch(console.warn);
      }}
      fallback={
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      }
    >
      <StatusGuard>
        {navigationRef.current && <DeepLinkHandler navigation={navigationRef.current} />}
        <Stack.Navigator
          initialRouteName={getInitialRouteName()}
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.primary,
            headerTitleStyle: {
              fontWeight: "bold",
            },
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
            animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
          }}
        >
          {/* Onboarding & Welcome */}
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen} 
            options={{ 
              headerShown: false,
              gestureEnabled: false 
            }} 
          />
          <Stack.Screen 
            name="Welcome" 
            component={WelcomeScreen} 
            options={{ 
              headerShown: false,
              gestureEnabled: false
            }} 
          />
          
          {/* Auth Screens */}
          <Stack.Screen 
            name="ParentAuth" 
            component={ParentAuth} 
            options={{ 
              title: "Parent Login", 
              headerShown: false, 
              headerBackTitle: "Back",
              animation: 'slide_from_right'
            }} 
          />
          <Stack.Screen 
            name="CaregiverAuth" 
            component={CaregiverAuth} 
            options={{ 
              title: "Caregiver Login", 
              headerShown: false, 
              headerBackTitle: "Back",
              animation: 'slide_from_right'
            }} 
          />
          <Stack.Screen 
            name="AuthCallback" 
            component={AuthCallbackScreen} 
            options={{ 
              headerShown: false,
              gestureEnabled: false
            }} 
          />
          
          {/* Dashboard Screens */}
          <Stack.Screen 
            name="ParentDashboard" 
            component={ParentDashboard} 
            options={{ 
              headerShown: false,
              gestureEnabled: false
            }} 
          />
          <Stack.Screen 
            name="CaregiverDashboard" 
            component={CaregiverDashboard} 
            options={{ 
              headerShown: false,
              gestureEnabled: false
            }} 
          />
          
          {/* Profile Screens */}
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{ 
              title: "Edit Profile", 
              headerBackTitle: "Back" 
            }} 
          />
          <Stack.Screen 
            name="ParentProfile" 
            component={ParentProfile} 
            options={{ 
              title: "My Profile", 
              headerBackTitle: "Back", 
              headerShown: false 
            }} 
          />
          <Stack.Screen 
            name="CaregiverProfile" 
            component={CaregiverProfileComplete} 
            options={{ 
              title: "Caregiver Profile", 
              headerShown: false, 
              headerBackTitle: "Back" 
            }} 
          />
          
          {/* Verification Screens */}
          <Stack.Screen 
            name="EmailVerification" 
            component={EmailVerificationScreen} 
            options={{ 
              title: "Verifying Email", 
              headerShown: false,
              gestureEnabled: false
            }} 
          />
          <Stack.Screen 
            name="VerificationSuccess" 
            component={VerificationSuccessScreen} 
            options={{ 
              title: "Verification Complete", 
              headerShown: false,
              gestureEnabled: false
            }} 
          />
          <Stack.Screen 
            name="EmailVerificationPending" 
            component={EmailVerificationPendingScreen} 
            options={{ 
              title: "Verify Your Email", 
              headerShown: false,
              gestureEnabled: false
            }} 
          />
          
          {/* Management Screens */}
          <Stack.Screen 
            name="ChildrenManagement" 
            component={ChildrenManagementScreen} 
            options={{ 
              title: "Manage Children", 
              headerBackTitle: "Back" 
            }} 
          />
          <Stack.Screen 
            name="AvailabilityManagement" 
            component={AvailabilityManagementScreen} 
            options={{ 
              title: "Manage Availability", 
              headerBackTitle: "Back" 
            }} 
          />
          <Stack.Screen 
            name="BookingManagement" 
            component={BookingManagementScreen} 
            options={{ 
              title: "Manage Bookings", 
              headerBackTitle: "Back" 
            }} 
          />
          
          {/* Wizard & Profile Creation */}
          <Stack.Screen 
            name="EnhancedCaregiverProfileWizard" 
            component={EnhancedCaregiverProfileWizard} 
            options={{ 
              title: "Complete Your Profile", 
              headerBackTitle: "Back",
              gestureEnabled: false
            }} 
          />
          <Stack.Screen 
            name="CaregiverProfileComplete" 
            component={CaregiverProfileComplete} 
            options={{ 
              headerShown: false,
              gestureEnabled: false
            }} 
          />
          
          {/* Job & Booking */}
          <Stack.Screen 
            name="JobSearch" 
            component={JobSearchScreen} 
            options={{ 
              title: "Find Jobs", 
              headerBackTitle: "Back" 
            }} 
          />
          <Stack.Screen 
            name="PaymentConfirmation" 
            component={PaymentConfirmationScreen} 
            options={{ 
              title: "Confirm Payment", 
              headerBackTitle: "Back" 
            }} 
          />
          
          {/* Chat & Reviews */}
          <Stack.Screen 
            name="Chat" 
            component={Chat} 
            options={{ 
              headerShown: false 
            }} 
          />
          <Stack.Screen 
            name="CaregiverReviews" 
            component={CaregiverReviewsScreen} 
            options={{ 
              title: "Caregiver Reviews", 
              headerShown: false 
            }} 
          />
          
          {/* Reports & Appeals */}
          <Stack.Screen 
            name="Appeal" 
            component={AppealScreen} 
            options={{ 
              title: "Appeal Suspension", 
              headerBackTitle: "Back" 
            }} 
          />
          <Stack.Screen 
            name="CreateReport" 
            component={CreateReportScreen} 
            options={{ 
              title: "Report User", 
              headerBackTitle: "Back" 
            }} 
          />
          <Stack.Screen 
            name="MyReports" 
            component={MyReportsScreen} 
            options={{ 
              title: "My Reports", 
              headerBackTitle: "Back" 
            }} 
          />
        </Stack.Navigator>
      </StatusGuard>
    </NavigationContainer>
  );
};

// Main AppNavigator component
const AppNavigator = () => {
  return <AppNavigatorWithAuth />;
};

export default AppNavigator;