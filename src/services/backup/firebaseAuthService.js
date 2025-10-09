import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { getFirebaseAuth } from '../../config/supabase';

export const firebaseAuthService = {
  async signup(userData) {
    try {
      const { email, password, name, role } = userData;

      const auth = await getFirebaseAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Send Firebase verification email
      await sendEmailVerification(user);
    } catch (error) {
      console.error('Firebase signup error:', error);
      throw error;
    }

    // Sync complete profile with MongoDB
    try {
      const token = await user.getIdToken();
      const profileData = {
        firebaseUid: user.uid,
        email: user.email,
        name: user.displayName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        middleInitial: userData.middleInitial,
        birthDate: userData.birthDate,
        phone: userData.phone,
        role: role || 'parent',
        userType: role || 'parent',
        emailVerified: user.emailVerified
      };

      await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:5000'}/api/auth/firebase-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
    } catch (error) {
      console.warn('Failed to sync with MongoDB:', error.message);
    }

    return {
      success: true,
      requiresVerification: !user.emailVerified,
      message: 'Account created successfully. Please check your email to verify your account.'
    };
  },

  async login(email, password) {
    const auth = await getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      throw new Error('Please verify your email before logging in.');
    }

    const token = await user.getIdToken();

    // Get complete user profile from MongoDB
    let profile = { role: 'parent' };
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.10:5000'}/api/auth/firebase-profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        profile = await response.json();
      }
    } catch (error) {
      console.warn('Failed to get MongoDB profile:', error.message);
    }

    return {
      success: true,
      token,
      user: {
        id: user.uid,
        email: user.email,
        name: user.displayName,
        emailVerified: user.emailVerified,
        role: profile.role || 'parent',
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        profileImage: profile.profileImage,
        caregiverProfile: profile.caregiverProfile
      }
    };
  },

  async signOut() {
    try {
      const auth = await getFirebaseAuth();
      await signOut(auth);
    } catch (error) {
      console.error('Firebase signOut error:', error);
      throw error;
    }
  },

  async resetPassword(email) {
    try {
      const auth = await getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Password reset link sent to your email.'
      };
    } catch (error) {
      console.error('Firebase resetPassword error:', error);
      throw error;
    }
  },

  getCurrentUser() {
    return getFirebaseAuth().then(auth => auth.currentUser);
  },

  onAuthStateChanged(callback) {
    return getFirebaseAuth().then(auth => auth.onAuthStateChanged(callback));
  }
};