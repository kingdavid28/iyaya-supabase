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
import RoleSelectionScreen from "../../screens/RoleSelectionScreen";

// Primary screens (formerly lazy-loaded)
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

ensureGlobalLocationPolyfill();

const Stack = createNativeStackNavigator();

const CenteredSpinner = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <ActivityIndicator size="large" />
  </View>
);

// Create a wrapper component that handles auth state
const AppNavigatorWithAuth = () => {
  const { user, loading } = useAuth();
  const { theme } = useThemeContext();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigationRef = useRef(null);
  const fallbackTimeoutRef = useRef(null);

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

  useEffect(() => {
    if (__DEV__ || loading || !onboardingChecked || fallbackTimeoutRef.current) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      console.warn('⚠️ SplashScreen fallback triggered — forcing hide after timeout.', { platform: Platform.OS });
      SplashScreen.hideAsync().catch((err) =>
        console.warn('⚠️ SplashScreen.hideAsync fallback failed', err)
      );
    }, 8000);

    fallbackTimeoutRef.current = timeoutId;

    return () => {
      clearTimeout(timeoutId);
      if (fallbackTimeoutRef.current === timeoutId) {
        fallbackTimeoutRef.current = null;
      }
    };
  }, [loading, onboardingChecked]);

  if (loading || !onboardingChecked) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={theme}
      ref={navigationRef}
      linking={{
        prefixes: ['iyaya://', 'https://iyaya-supabase.vercel.app'],
        config: {
          screens: {
            ContractView: 'contract/:contractId',
            AuthCallback: 'auth/callback',
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
    >
      <StatusGuard>
        {navigationRef.current && <DeepLinkHandler navigation={navigationRef.current} />}
        <Stack.Navigator
        initialRouteName={
          showOnboarding
            ? "Onboarding"
            : user && user.emailVerified
              ? (user.role === "caregiver" || user.caregiverProfile)
                ? "CaregiverDashboard"
                : "ParentDashboard"
              : "Welcome"
        }
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
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ParentAuth" component={ParentAuth} options={{ title: "Parent Login", headerShown: false, headerBackTitle: "Back" }} />
        <Stack.Screen name="CaregiverAuth" component={CaregiverAuth} options={{ title: "Caregiver Login", headerShown: false, headerBackTitle: "Back" }} />
        <Stack.Screen name="ParentDashboard" component={ParentDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="CaregiverDashboard" component={CaregiverDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Edit Profile", headerBackTitle: "Back" }} />
        <Stack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} options={{ title: "Confirm Payment", headerBackTitle: "Back" }} />
        <Stack.Screen name="JobSearch" component={JobSearchScreen} options={{ title: "Find Jobs", headerBackTitle: "Back" }} />
        <Stack.Screen name="BookingFlow" component={BookingManagementScreen} options={{ title: "Book Caregiver", headerBackTitle: "Back" }} />
        <Stack.Screen name="BookingManagement" component={BookingManagementScreen} options={{ title: "Manage Bookings", headerBackTitle: "Back" }} />
        <Stack.Screen name="ChildrenManagement" component={ChildrenManagementScreen} options={{ title: "Manage Children", headerBackTitle: "Back" }} />
        <Stack.Screen name="AvailabilityManagement" component={AvailabilityManagementScreen} options={{ title: "Manage Availability", headerBackTitle: "Back" }} />
        <Stack.Screen name="EnhancedCaregiverProfileWizard" component={EnhancedCaregiverProfileWizard} options={{ title: "Complete Your Profile", headerBackTitle: "Back" }} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: "Verifying Email", headerShown: false }} />
        <Stack.Screen name="VerificationSuccess" component={VerificationSuccessScreen} options={{ title: "Verification Complete", headerShown: false }} />
        <Stack.Screen name="EmailVerificationPending" component={EmailVerificationPendingScreen} options={{ title: "Verify Your Email", headerShown: false }} />
        <Stack.Screen name="CaregiverProfileComplete" component={CaregiverProfileComplete} options={{ headerShown: false }} />
        <Stack.Screen name="ParentProfile" component={ParentProfile} options={{ title: "My Profile", headerBackTitle: "Back", headerShown: false }} />
        <Stack.Screen name="Chat" component={Chat} options={{ headerShown: false }} />
        <Stack.Screen name="CaregiverReviews" component={CaregiverReviewsScreen} options={{ title: "Caregiver Reviews", headerShown: false, headerTitleStyle: { marginTop: 18 }, contentStyle: { paddingTop: 50 }, }} />
        <Stack.Screen name="CaregiverProfile" component={CaregiverProfileComplete} options={{ title: "Caregiver Profile", headerShown: false, headerBackTitle: "Back", contentStyle: { paddingTop: 16 }, }} />
        <Stack.Screen name="Appeal" component={AppealScreen} options={{ title: "Appeal Suspension", headerBackTitle: "Back" }} />
        <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ title: "Report User", headerBackTitle: "Back" }} />
        <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: "My Reports", headerBackTitle: "Back" }} />
        <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
      </StatusGuard>
    </NavigationContainer>
  );
};

// Main AppNavigator component that doesn't use useAuth directly
const AppNavigator = () => {
  return <AppNavigatorWithAuth />;
};

export default AppNavigator;