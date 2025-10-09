import { CommonActions } from '@react-navigation/native';

export const navigateToUserDashboard = (navigation, userRole) => {
  console.log('🧭 Navigation called with role:', userRole, 'type:', typeof userRole);
  
  const dashboardRoute = userRole === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
  
  console.log(`🧭 Role comparison: '${userRole}' === 'caregiver' = ${userRole === 'caregiver'}`);
  console.log(`🧭 Final dashboard route: ${dashboardRoute}`);
  
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: dashboardRoute }],
    })
  );
};