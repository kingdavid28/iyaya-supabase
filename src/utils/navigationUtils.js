import { CommonActions } from '@react-navigation/native';

export const navigateToUserDashboard = (navigation, userRole) => {
  console.log('🧭 Navigation called with role:', userRole, 'type:', typeof userRole);
  
  const normalizedRole = String(userRole).toLowerCase().trim();
  console.log('🧭 Normalized role:', normalizedRole);
  
  const dashboardRoute = normalizedRole === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
  
  console.log(`🧭 Role comparison: '${normalizedRole}' === 'caregiver' = ${normalizedRole === 'caregiver'}`);
  console.log(`🧭 Final dashboard route: ${dashboardRoute}`);
  
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: dashboardRoute }],
    })
  );
};