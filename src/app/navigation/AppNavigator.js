import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

// Core imports
import { useAuth } from "../../contexts/AuthContext";
import { useThemeContext } from "../../contexts/ThemeContext";

// Screen fallbacks
import {
  AuthFlowSkeleton,
  CaregiverDashboardSkeleton,
  ManagementScreenSkeleton,
  MessagingScreenSkeleton,
  ParentDashboardSkeleton,
  ProfileScreenSkeleton,
  WizardScreenSkeleton,
} from "../../components/navigation/ScreenFallbacks";

// Main screen imports
import CaregiverProfileComplete from "../../screens/CaregiverProfileComplete";
import VerificationSuccessScreen from "../../screens/VerificationSuccessScreen";
import WelcomeScreen from "../../screens/WelcomeScreen";

// Auth screen imports
import EmailVerificationScreen from "../../screens/EmailVerificationScreen";

// Chat screen imports
import CaregiverReviewsScreen from "../../screens/CaregiverReviewsScreen";

// Debug screen imports
import FacebookAuthTest from "../../components/debug/FacebookAuthTest";

// Legacy screen imports (to be migrated)
import EmailVerificationPendingScreen from "../../screens/EmailVerificationPendingScreen";
import JobSearchScreen from "../../screens/JobSearchScreen";
import OnboardingScreen from "../../screens/OnboardingScreen";

// Utils
import DeepLinkHandler from "../../components/navigation/DeepLinkHandler";
import { hasSeenOnboarding } from "../../utils/onboarding";

const Stack = createNativeStackNavigator();

const CenteredSpinner = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <ActivityIndicator size="large" />
  </View>
);

const withSuspense = (LazyComponent, FallbackComponent) => {
  const Wrapped = (props) => (
    <Suspense fallback={FallbackComponent ? <FallbackComponent /> : <CenteredSpinner />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  Wrapped.displayName = `WithSuspense(${LazyComponent.displayName || LazyComponent.name || "Component"})`;
  return Wrapped;
};

const ParentDashboardLazy = React.lazy(() => import("../../screens/ParentDashboard/ParentDashboard"));
const CaregiverDashboardLazy = React.lazy(() => import("../../screens/CaregiverDashboard"));
const ParentAuthLazy = React.lazy(() => import("../../screens/ParentAuth"));
const CaregiverAuthLazy = React.lazy(() => import("../../screens/CaregiverAuth"));
const ParentProfileLazy = React.lazy(() => import("../../screens/ParentProfile"));
const ProfileScreenLazy = React.lazy(() => import("../../screens/profile/ProfileScreen"));
const ChatLazy = React.lazy(() => import("../../screens/Chat"));
const BookingManagementLazy = React.lazy(() => import("../../screens/BookingManagementScreen"));
const AvailabilityManagementLazy = React.lazy(() => import("../../screens/AvailabilityManagementScreen"));
const ChildrenManagementLazy = React.lazy(() => import("../../screens/ChildrenManagementScreen"));
const EnhancedCaregiverProfileWizardLazy = React.lazy(() => import("../../screens/EnhancedCaregiverProfileWizard"));
const PaymentConfirmationLazy = React.lazy(() => import("../../screens/PaymentConfirmationScreen"));

const ParentDashboardScreen = withSuspense(ParentDashboardLazy, ParentDashboardSkeleton);
const CaregiverDashboardScreen = withSuspense(CaregiverDashboardLazy, CaregiverDashboardSkeleton);
const ParentAuthScreen = withSuspense(ParentAuthLazy, AuthFlowSkeleton);
const CaregiverAuthScreen = withSuspense(CaregiverAuthLazy, AuthFlowSkeleton);
const ParentProfileScreen = withSuspense(ParentProfileLazy, ProfileScreenSkeleton);
const ProfileScreenWithFallback = withSuspense(ProfileScreenLazy, ProfileScreenSkeleton);
const ChatScreen = withSuspense(ChatLazy, MessagingScreenSkeleton);
const BookingManagementScreen = withSuspense(BookingManagementLazy, ManagementScreenSkeleton);
const AvailabilityManagementScreen = withSuspense(AvailabilityManagementLazy, ManagementScreenSkeleton);
const ChildrenManagementScreen = withSuspense(ChildrenManagementLazy, ManagementScreenSkeleton);
const EnhancedCaregiverProfileWizardScreen = withSuspense(EnhancedCaregiverProfileWizardLazy, WizardScreenSkeleton);
const PaymentConfirmationScreen = withSuspense(PaymentConfirmationLazy, ManagementScreenSkeleton);

// Create a wrapper component that handles auth state
const AppNavigatorWithAuth = () => {
  const { user, loading } = useAuth();
  const { theme } = useThemeContext();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigationRef = useRef(null);

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
        prefixes: ['iyaya://'],
        config: {
          screens: {
            ContractView: 'contract/:contractId',
          },
        },
      }}
      onReady={() => {
        SplashScreen.hideAsync().catch(console.warn);
      }}
    >
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
        <Stack.Screen name="ParentAuth" component={ParentAuthScreen} options={{ title: "Parent Login", headerBackTitle: "Back" }} />
        <Stack.Screen name="CaregiverAuth" component={CaregiverAuthScreen} options={{ title: "Caregiver Login", headerBackTitle: "Back" }} />
        <Stack.Screen name="ParentDashboard" component={ParentDashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CaregiverDashboard" component={CaregiverDashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreenWithFallback} options={{ title: "Edit Profile", headerBackTitle: "Back" }} />
        <Stack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} options={{ title: "Confirm Payment", headerBackTitle: "Back" }} />
        <Stack.Screen name="JobSearch" component={JobSearchScreen} options={{ title: "Find Jobs", headerBackTitle: "Back" }} />
        <Stack.Screen name="BookingFlow" component={BookingManagementScreen} options={{ title: "Book Caregiver", headerBackTitle: "Back" }} />
        <Stack.Screen name="BookingManagement" component={BookingManagementScreen} options={{ title: "Manage Bookings", headerBackTitle: "Back" }} />
        <Stack.Screen name="ChildrenManagement" component={ChildrenManagementScreen} options={{ title: "Manage Children", headerBackTitle: "Back" }} />
        <Stack.Screen name="AvailabilityManagement" component={AvailabilityManagementScreen} options={{ title: "Manage Availability", headerBackTitle: "Back" }} />
        <Stack.Screen name="EnhancedCaregiverProfileWizard" component={EnhancedCaregiverProfileWizardScreen} options={{ title: "Complete Your Profile", headerBackTitle: "Back" }} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: "Verifying Email", headerShown: false }} />
        <Stack.Screen name="VerificationSuccess" component={VerificationSuccessScreen} options={{ title: "Verification Complete", headerShown: false }} />
        <Stack.Screen name="EmailVerificationPending" component={EmailVerificationPendingScreen} options={{ title: "Verify Your Email", headerShown: false }} />
        <Stack.Screen name="CaregiverProfileComplete" component={CaregiverProfileComplete} options={{ headerShown: false }} />
        <Stack.Screen name="ParentProfile" component={ParentProfileScreen} options={{ title: "My Profile", headerBackTitle: "Back" }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CaregiverReviews" component={CaregiverReviewsScreen} options={{ title: "Caregiver Reviews" }} />
        <Stack.Screen name="FacebookAuthTest" component={FacebookAuthTest} options={{ title: "Facebook Auth Test", headerShown: false }} />
        <Stack.Screen name="CaregiverProfile" component={CaregiverProfileComplete} options={{ title: "Caregiver Profile", headerBackTitle: "Back" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Main AppNavigator component that doesn't use useAuth directly
const AppNavigator = () => {
  return <AppNavigatorWithAuth />;
};

export default AppNavigator;