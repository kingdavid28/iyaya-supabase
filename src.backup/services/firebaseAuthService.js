import { supabase } from '../config/supabase';

export const refreshToken = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      console.log('No user authenticated - returning null silently');
      return null;
    }
    return session.access_token;
  } catch (error) {
    console.warn('Token refresh failed:', error.message);
    return null;
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.warn('Get current user failed:', error.message);
    return null;
  }
};

export const onAuthStateChangedSafe = (callback) => {
  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
    return () => subscription.unsubscribe();
  } catch (error) {
    console.error('onAuthStateChanged failed:', error);
    return () => {};
  }
};

export const firebaseAuthService = {
  async signup(userData) {
    try {
      const { email, password, name, role } = userData;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            first_name: userData.firstName,
            last_name: userData.lastName,
            middle_initial: userData.middleInitial,
            birth_date: userData.birthDate,
            phone: userData.phone,
            role: role || 'parent'
          }
        }
      });

      if (error) throw error;

      // Insert user profile into users table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name,
            first_name: userData.firstName,
            last_name: userData.lastName,
            middle_initial: userData.middleInitial,
            birth_date: userData.birthDate,
            phone: userData.phone,
            role: role || 'parent',
            email_verified: data.user.email_confirmed_at ? true : false
          });

        if (profileError) {
          console.warn('Failed to create user profile:', profileError.message);
        }
      }

      return {
        success: true,
        requiresVerification: !data.user?.email_confirmed_at,
        message: 'Account created successfully. Please check your email to verify your account.'
      };
    } catch (error) {
      console.error('Supabase signup error:', error);
      throw error;
    }
  },

  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (!data.user?.email_confirmed_at) {
        throw new Error('Please verify your email before logging in.');
      }

      // Get user profile from users table
      let profile = { role: 'parent' };
      try {
        const { data: userProfiles, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id);

        if (!profileError && userProfiles && userProfiles.length > 0) {
          profile = userProfiles[0];
        }
      } catch (error) {
        console.warn('Failed to get user profile:', error.message);
      }

      return {
        success: true,
        token: data.session?.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: profile.name,
          emailVerified: data.user.email_confirmed_at ? true : false,
          role: profile.role || 'parent',
          firstName: profile.first_name,
          lastName: profile.last_name,
          phone: profile.phone,
          profileImage: profile.profile_image
        }
      };
    } catch (error) {
      console.error('Supabase login error:', error);
      throw error;
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Supabase signOut error:', error);
      throw error;
    }
  },

  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      return {
        success: true,
        message: 'Password reset link sent to your email.'
      };
    } catch (error) {
      console.error('Supabase resetPassword error:', error);
      throw error;
    }
  },

  // Safe current user getter
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get current user failed:', error);
      return null;
    }
  },

  // Safe auth state listener
  onAuthStateChanged(callback) {
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null);
      });
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('onAuthStateChanged failed:', error);
      return () => {};
    }
  }
};