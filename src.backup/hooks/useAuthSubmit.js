import { Alert, Keyboard } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../shared/hooks/useApi';
import { navigateToUserDashboard } from '../utils/navigationUtils';
import { STRINGS } from '../constants/strings';
import { authAPI } from '../services';

export const useAuthSubmit = (navigation) => {
  const { login, signup, resetPassword, verifyEmailToken } = useAuth();
  const { loading: isSubmitting, execute } = useApi();

  const handleSubmit = async (mode, formData, validateForm) => {
    try {
      Keyboard.dismiss();
    } catch (e) {
      // Keyboard might not be available on web
    }
    
    if (!validateForm(mode)) {
      return;
    }
    
    const { email, password, firstName, lastName, middleInitial, birthDate, phone } = formData;
    const fullName = `${firstName} ${middleInitial ? middleInitial + '. ' : ''}${lastName}`.trim();
    
    return await execute(async () => {
      if (mode === 'signup') {
        const result = await signup({ 
          email, 
          password, 
          name: fullName,
          firstName,
          lastName,
          middleInitial,
          birthDate,
          phone, 
          role: formData.role || 'parent'
        });
        
        if (result?.requiresVerification) {
          Alert.alert(
            'Account Created Successfully',
            'Please check your email to verify your account.',
            [{ text: 'OK' }]
          );
        } else if (result?.success && result?.user?.role) {
          navigateToUserDashboard(navigation, result.user.role);
        }
        
        return result;
      } else if (mode === 'reset') {
        const result = await authAPI.resetPassword(email);
        Alert.alert(STRINGS.RESET_LINK_SENT, STRINGS.RESET_LINK_MESSAGE);
        return result;
      } else {
        const result = await login(email, password);
        
        if (result?.success && result?.user?.role) {
          navigateToUserDashboard(navigation, result.user.role);
        }
        
        return result;
      }
    }, {
      onError: (error) => {
        const errorMessage = error?.message || "Authentication failed";
        if (errorMessage.includes('already exists') || errorMessage.includes('duplicate') || errorMessage.includes('E11000')) {
          Alert.alert(STRINGS.EMAIL_ALREADY_EXISTS, STRINGS.EMAIL_DUPLICATE_MESSAGE);
        } else if (errorMessage.includes('verify your email') || errorMessage.includes('verification')) {
          Alert.alert(STRINGS.EMAIL_NOT_VERIFIED, STRINGS.VERIFICATION_REQUIRED);
        } else {
          Alert.alert("Error", errorMessage);
        }
      }
    });
  };



  return {
    handleSubmit,
    isSubmitting
  };
};