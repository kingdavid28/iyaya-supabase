import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

// Core imports
import { useAuth } from "../../contexts/AuthContext";
import { useThemeContext } from "../../contexts/ThemeContext";

// Main screen imports
import CaregiverDashboard from "../../screens/CaregiverDashboard";
import CaregiverProfileComplete from "../../screens/CaregiverProfileComplete";
import ParentDashboard from "../../screens/ParentDashboard/ParentDashboard";
import VerificationSuccessScreen from "../../screens/VerificationSuccessScreen";
import WelcomeScreen from "../../screens/WelcomeScreen";

// Auth screen imports
import CaregiverAuth from "../../screens/CaregiverAuth";
import EmailVerificationScreen from "../../screens/EmailVerificationScreen";
import ParentAuth from "../../screens/ParentAuth";

// Profile screen imports
import ParentProfile from "../../screens/ParentProfile";

// Chat screen imports
import CaregiverReviewsScreen from "../../screens/CaregiverReviewsScreen";
import ChatScreen from "../../screens/ChatScreen";

// Debug screen imports
import FacebookAuthTest from "../../components/debug/FacebookAuthTest";

// Legacy screen imports (to be migrated)
import AvailabilityManagementScreen from "../../screens/AvailabilityManagementScreen";
import BookingManagementScreen from "../../screens/BookingManagementScreen";
import ChildrenManagementScreen from "../../screens/ChildrenManagementScreen";
import EmailVerificationPendingScreen from "../../screens/EmailVerificationPendingScreen";
import EnhancedCaregiverProfileWizard from "../../screens/EnhancedCaregiverProfileWizard";
import JobSearchScreen from "../../screens/JobSearchScreen";
import OnboardingScreen from "../../screens/OnboardingScreen";
import PaymentConfirmationScreen from "../../screens/PaymentConfirmationScreen";
import ProfileScreen from "../../screens/profile/ProfileScreen";

import CaregiverChat from "../../screens/CaregiverChat";

// Utils
import DeepLinkHandler from "../../components/navigation/DeepLinkHandler";
import { hasSeenOnboarding } from "../../utils/onboarding";

const Stack = createNativeStackNavigator();

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
        <Stack.Screen name="ParentAuth" component={ParentAuth} options={{ title: "Parent Login", headerBackTitle: "Back" }} />
        <Stack.Screen name="CaregiverAuth" component={CaregiverAuth} options={{ title: "Caregiver Login", headerBackTitle: "Back" }} />
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
        <Stack.Screen name="ParentProfile" component={ParentProfile} options={{ title: "My Profile", headerBackTitle: "Back" }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CaregiverChat" component={CaregiverChat} options={{ title: "Chat with Caregiver" }} />
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