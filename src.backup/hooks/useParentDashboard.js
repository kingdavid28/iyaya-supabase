import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { apiService, bookingsAPI } from '../services';
import { supabaseService } from '../services/supabase';
import { formatAddress } from '../utils/addressUtils';

const CAREGIVERS_CACHE_KEY = 'parent-dashboard:caregivers';

export const QUERY_KEYS = {
  profile: (userId) => ['parentDashboard', userId, 'profile'],
  jobs: (userId) => ['parentDashboard', userId, 'jobs'],
  caregivers: (userId) => ['parentDashboard', userId, 'caregivers'],
  bookings: (userId) => ['parentDashboard', userId, 'bookings'],
  applications: (userId) => ['parentDashboard', userId, 'applications'],
  children: (userId) => ['parentDashboard', userId, 'children'],
  caregiverAssets: (viewerId, caregiverId) => ['parentDashboard', viewerId, 'caregiverAssets', caregiverId],
};

const EMPTY_PROFILE = {
  name: '',
  email: '',
  phone: '',
  address: '',
  location: '',
  children: [],
  imageUrl: null,
  profileImage: null,
};

const normalizeProfile = (profileData = {}) => {
  const rawAddress = profileData.address || profileData.location || '';
  const addressString = typeof rawAddress === 'string' ? rawAddress : (rawAddress?.street || rawAddress?.city || '');
  const profileImage = profileData.profileImage || profileData.profile_image || profileData.avatar || profileData.imageUrl || null;
  const location = profileData.location || addressString;

  return {
    ...profileData,
    name: profileData.name || profileData.displayName || '',
    email: profileData.email || '',
    phone: profileData.phone || profileData.contact || '',
    address: addressString,
    location,
    children: profileData.children || [],
    profileImage,
    imageUrl: profileImage,
  };
};

const normalizeCaregivers = (caregiversList = []) => {
  const parseExperience = (caregiver) => {
    const sources = [
      caregiver.experience,
      caregiver.experience_years,
      caregiver.experienceYears,
      caregiver.profile?.experience,
      caregiver.metadata?.experience,
    ];

    let years = 0;
    let months = 0;
    let description = '';

    for (const source of sources) {
      if (source == null) continue;

      if (typeof source === 'number' && Number.isFinite(source)) {
        years = source;
        break;
      }

      if (typeof source === 'string') {
        const numericMatch = source.match(/(\d+(?:\.\d+)?)/);
        if (numericMatch) {
          years = Number(numericMatch[1]);
          description = source.trim();
          break;
        }
        continue;
      }

      if (typeof source === 'object') {
        const candidateYears = Number(source.years ?? source.years_of_experience ?? source.experienceYears);
        const candidateMonths = Number(source.months ?? source.months_of_experience ?? source.experienceMonths);

        if (Number.isFinite(candidateYears)) {
          years = candidateYears;
        }
        if (Number.isFinite(candidateMonths)) {
          months = candidateMonths;
        }
        if (!description && typeof source.description === 'string') {
          description = source.description;
        }

        if (years || months) {
          break;
        }
      }
    }

    return {
      years,
      months,
      description: description || undefined,
    };
  };

  const parseVerification = (caregiver) => {
    const trustScoreSources = [
      caregiver.trustScore,
      caregiver.trust_score,
      caregiver.verification?.trustScore,
      caregiver.verification?.trust_score,
      caregiver.trust?.score,
    ];

    const trustScore = trustScoreSources
      .map((value) => Number(value))
      .find((value) => Number.isFinite(value));

    const verified = [
      caregiver.verified,
      caregiver.isVerified,
      caregiver.is_verified,
      caregiver.verification?.verified,
      caregiver.verification_status === 'verified',
    ].some(Boolean);

    const profileData = caregiver.profile_data || caregiver.profileData || caregiver.verification?.profileData;
    const backgroundCheckStatus =
      profileData?.background_check?.status ||
      profileData?.backgroundCheck?.status ||
      caregiver.background_check_status ||
      caregiver.backgroundCheckStatus;

    const backgroundCheck = Boolean(
      (typeof backgroundCheckStatus === 'string' && backgroundCheckStatus.toLowerCase() === 'approved') ||
      caregiver.verification?.backgroundCheck ||
      caregiver.background_check_passed,
    );

    return {
      trustScore: Number.isFinite(trustScore) ? trustScore : 0,
      verified,
      backgroundCheck,
      certifications: caregiver.verification?.certifications || caregiver.certifications || [],
      documentsVerified: Boolean(caregiver.verification?.documentsVerified ?? caregiver.documents_verified),
    };
  };

  return caregiversList.map((caregiver) => {
    const experience = parseExperience(caregiver);
    const verification = parseVerification(caregiver);
    const privacySettings = {
      profileVisibility: caregiver.privacySettings?.profileVisibility ?? caregiver.privacySettings?.profile_visibility ?? true,
      showOnlineStatus: caregiver.privacySettings?.showOnlineStatus ?? caregiver.privacySettings?.show_online_status ?? true,
      allowDirectMessages: caregiver.privacySettings?.allowDirectMessages ?? caregiver.privacySettings?.allow_direct_messages ?? true,
      showRatings: caregiver.privacySettings?.showRatings ?? caregiver.privacySettings?.show_ratings ?? true,
    };

    const showRatings = privacySettings.showRatings !== false;
    const allowDirectMessages = privacySettings.allowDirectMessages !== false;
    const ratingRaw = caregiver.rating ?? caregiver.average_rating;
    const normalizedRating = showRatings && Number.isFinite(Number(ratingRaw))
      ? Math.round(Number(ratingRaw) * 10) / 10
      : null;
    const reviewCountRaw = caregiver.reviewCount ?? caregiver.review_count ?? 0;
    const reviewCount = showRatings ? reviewCountRaw : 0;
    const trustScoreValue = showRatings ? verification.trustScore : null;

    const verificationData = {
      ...verification,
      trustScore: trustScoreValue,
    };

    return {
      id: caregiver.id,
      _id: caregiver.id,
      name: caregiver.name || 'Caregiver',
      rating: normalizedRating,
      reviewCount,
      hourlyRate: Number(caregiver.hourly_rate ?? caregiver.hourlyRate ?? 0) || 0,
      experience: {
        years: experience.years,
        months: experience.months,
        description: experience.description,
      },
      skills: Array.isArray(caregiver.skills)
        ? caregiver.skills
        : (Array.isArray(caregiver.specialties) ? caregiver.specialties : ['Childcare', 'First Aid']),
      location: caregiver.address || caregiver.location || 'Cebu City',
      avatar: caregiver.profile_image || caregiver.avatar,
      profileImage: caregiver.profile_image || caregiver.avatar,
      bio: caregiver.bio || 'Experienced caregiver',
      createdAt: caregiver.created_at || new Date().toISOString(),
      trustScore: trustScoreValue,
      verified: verification.verified,
      verification: verificationData,
      completedJobs: caregiver.completedJobs || caregiver.completed_jobs || 0,
      responseRate: caregiver.responseRate || caregiver.response_rate || '0%',
      hasCompletedJobs: Boolean(caregiver.completedJobs || caregiver.completed_jobs),
      privacySettings,
      allowDirectMessages,
      showRatings,
      showOnlineStatus: privacySettings.showOnlineStatus !== false,
    };
  });
};

const normalizeBookings = (bookingsList = []) => (
  bookingsList.map((booking, idx) => ({
    id: booking.id || booking._id || idx + 1,
    _id: booking.id || booking._id,
    jobId: booking.job_id || booking.jobId || booking.job?.id || null,
    parentId: booking.parent_id || booking.parentId,
    caregiver: booking.caregiverId || booking.caregiver,
    caregiverName: booking.caregiverId?.name || booking.caregiver?.name || booking.caregiver_name || 'Caregiver',
    date: booking.date || booking.startDate || new Date().toISOString(),
    startTime: booking.startTime || booking.start_time,
    endTime: booking.endTime || booking.end_time,
    time: booking.time || booking.time_display || (booking.startTime && booking.endTime ? `${booking.startTime} - ${booking.endTime}` : ''),
    status: booking.status || 'pending',
    children: booking.selectedChildren || booking.selected_children || booking.children || [],
    address: booking.address || booking.location,
    location: formatAddress(booking.location || booking.address),
    totalCost: booking.totalAmount || booking.total_amount || booking.totalCost || booking.amount,
    hourlyRate: booking.hourlyRate || booking.hourly_rate || booking.rate || 300,
    contactPhone: booking.contactPhone || booking.contact_phone,
    specialInstructions: booking.specialInstructions || booking.special_instructions,
    emergencyContact: booking.emergencyContact || booking.emergency_contact,
    depositPaid: typeof booking.deposit_paid === 'boolean'
      ? booking.deposit_paid
      : Boolean(booking.depositPaid || booking.depositPaidAt || booking.deposit_paid_at),
    depositPaidAt: booking.deposit_paid_at || booking.depositPaidAt || null,
    finalPaymentPaid: typeof booking.final_payment_paid === 'boolean'
      ? booking.final_payment_paid
      : Boolean(booking.finalPaymentPaid || booking.finalPaymentPaidAt || booking.final_payment_paid_at),
    finalPaymentPaidAt: booking.final_payment_paid_at || booking.finalPaymentPaidAt || null,
    paymentStatus: booking.payment_status || booking.paymentStatus || null,
    contract: booking.contract || booking.latestContract || null,
    createdAt: booking.created_at || booking.createdAt || new Date().toISOString(),
    updatedAt: booking.updated_at || booking.updatedAt || new Date().toISOString(),
  }))
);

const normalizeChildren = (childrenList = []) => (
  (childrenList || []).map((child, idx) => ({
    id: child.id || child._id || idx + 1,
    _id: child.id || child._id,
    name: child.name || child.firstName || 'Child',
    firstName: child.firstName || child.name,
    lastName: child.lastName || '',
    middleInitial: child.middleInitial || '',
    age: child.age || (child.birthdate ? new Date().getFullYear() - new Date(child.birthdate).getFullYear() : 0),
    birthDate: child.birthdate || child.dateOfBirth,
    gender: child.gender || 'Not specified',
    specialNeeds: child.specialNeeds || [],
    allergies: child.allergies || '',
    notes: child.notes || '',
    preferences: child.notes || '',
    profileImage: child.profileImage || child.avatar,
    createdAt: child.created_at || child.createdAt || new Date().toISOString(),
    updatedAt: child.updated_at || child.updatedAt || new Date().toISOString(),
  }))
);

export const useParentDashboard = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('home');
  const [hasLoadedApplications, setHasLoadedApplications] = useState(false);
  const [hasLoadedBookings, setHasLoadedBookings] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    const hydrateCaregiversFromCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(CAREGIVERS_CACHE_KEY);
        if (!cached || !isMounted) {
          return;
        }

        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          queryClient.setQueryData(QUERY_KEYS.caregivers(userId), parsed);
        }
      } catch (error) {
        console.warn('Failed to hydrate caregivers cache:', error);
      }
    };

    hydrateCaregiversFromCache();

    return () => {
      isMounted = false;
    };
  }, [queryClient, userId]);

  const profileQuery = useQuery({
    queryKey: userId ? QUERY_KEYS.profile(userId) : QUERY_KEYS.profile('anonymous'),
    enabled: !!userId,
    queryFn: async () => {
      try {
        const profileResponse = await apiService.auth.getProfile();
        const profileData = profileResponse?.data || profileResponse || {};
        return normalizeProfile(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
        return EMPTY_PROFILE;
      }
    },
  });

  const jobsQuery = useQuery({
    queryKey: userId ? QUERY_KEYS.jobs(userId) : QUERY_KEYS.jobs('anonymous'),
    enabled: !!userId,
    queryFn: async () => {
      try {
        const res = await apiService.jobs.getMy();
        return Array.isArray(res?.data)
          ? res.data
          : (Array.isArray(res) ? res : []);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        return [];
      }
    },
  });

  const caregiversQuery = useQuery({
    queryKey: userId ? QUERY_KEYS.caregivers(userId) : QUERY_KEYS.caregivers('anonymous'),
    enabled: !!userId,
    queryFn: async () => {
      try {
        const res = await apiService.caregivers.getAll();
        const caregiversList = Array.isArray(res?.data)
          ? res.data
          : (Array.isArray(res) ? res : []);
        const normalized = normalizeCaregivers(caregiversList);

        try {
          await AsyncStorage.setItem(CAREGIVERS_CACHE_KEY, JSON.stringify(normalized));
        } catch (storageError) {
          console.warn('Failed to cache caregivers:', storageError);
        }

        return normalized;
      } catch (error) {
        console.error('Error fetching caregivers:', error);
        return [];
      }
    },
  });

  const childrenQuery = useQuery({
    queryKey: userId ? QUERY_KEYS.children(userId) : QUERY_KEYS.children('anonymous'),
    enabled: !!userId && userRole === 'parent',
    queryFn: async () => {
      try {
        const list = await apiService.children.getChildren(userId);
        return normalizeChildren(list || []);
      } catch (error) {
        console.error('Error fetching children:', error);
        return [];
      }
    },
  });

  const applicationsQuery = useQuery({
    queryKey: userId ? QUERY_KEYS.applications(userId) : QUERY_KEYS.applications('anonymous'),
    enabled: !!userId && hasLoadedApplications,
    queryFn: async () => {
      try {
        const list = await supabaseService.applications.getParentApplications(userId);
        return Array.isArray(list) ? list : [];
      } catch (error) {
        console.error('Error fetching applications:', error);
        return [];
      }
    },
  });

  const bookingsQuery = useQuery({
    queryKey: userId ? QUERY_KEYS.bookings(userId) : QUERY_KEYS.bookings('anonymous'),
    enabled: !!userId && hasLoadedBookings && userRole === 'parent',
    queryFn: async () => {
      try {
        const result = await bookingsAPI.getMy(userId, userRole);
        const bookingsList = Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []);
        return normalizeBookings(bookingsList || []);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }
    },
  });

  const profile = profileQuery.data ?? EMPTY_PROFILE;
  const jobs = jobsQuery.data ?? [];
  const caregivers = caregiversQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const children = childrenQuery.data ?? [];
  const applications = applicationsQuery.data ?? [];

  const loading = profileQuery.isLoading
    || jobsQuery.isLoading
    || caregiversQuery.isLoading
    || (userRole === 'parent' && childrenQuery.isLoading);

  const applicationsLoading = applicationsQuery.isLoading || applicationsQuery.isFetching;

  const dataLoaded = profileQuery.isSuccess
    && jobsQuery.isSuccess
    && caregiversQuery.isSuccess
    && (userRole !== 'parent' || childrenQuery.isSuccess);

  const bookingsLoaded = useMemo(() => bookings.length > 0, [bookings]);

  const setProfileState = useCallback((updater) => {
    if (!userId) return;
    queryClient.setQueryData(QUERY_KEYS.profile(userId), (existing = EMPTY_PROFILE) => (
      typeof updater === 'function' ? updater(existing) : updater
    ));
  }, [queryClient, userId]);

  const setJobsState = useCallback((updater) => {
    if (!userId) return;
    queryClient.setQueryData(QUERY_KEYS.jobs(userId), (existing = []) => (
      typeof updater === 'function' ? updater(existing) : updater
    ));
  }, [queryClient, userId]);

  const setCaregiversState = useCallback((updater) => {
    if (!userId) return;
    queryClient.setQueryData(QUERY_KEYS.caregivers(userId), (existing = []) => (
      typeof updater === 'function' ? updater(existing) : updater
    ));
  }, [queryClient, userId]);

  const setBookingsState = useCallback((updater) => {
    if (!userId) return;
    queryClient.setQueryData(QUERY_KEYS.bookings(userId), (existing = []) => (
      typeof updater === 'function' ? updater(existing) : updater
    ));
  }, [queryClient, userId]);

  const setApplicationsState = useCallback((updater) => {
    if (!userId) return;
    queryClient.setQueryData(QUERY_KEYS.applications(userId), (existing = []) => (
      typeof updater === 'function' ? updater(existing) : updater
    ));
  }, [queryClient, userId]);

  const setChildrenState = useCallback((updater) => {
    if (!userId) return;
    queryClient.setQueryData(QUERY_KEYS.children(userId), (existing = []) => (
      typeof updater === 'function' ? updater(existing) : updater
    ));
  }, [queryClient, userId]);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      return EMPTY_PROFILE;
    }

    const result = await profileQuery.refetch();
    return result.data ?? EMPTY_PROFILE;
  }, [profileQuery, userId]);

  const fetchJobs = useCallback(async () => {
    if (!userId) {
      return [];
    }

    const result = await jobsQuery.refetch();
    return result.data ?? [];
  }, [jobsQuery, userId]);

  const fetchCaregivers = useCallback(async () => {
    if (!userId) {
      return [];
    }

    const result = await caregiversQuery.refetch();
    return result.data ?? [];
  }, [caregiversQuery, userId]);

  const fetchChildren = useCallback(async () => {
    if (!userId) {
      return [];
    }

    const result = await childrenQuery.refetch();
    return result.data ?? [];
  }, [childrenQuery, userId]);

  const fetchApplications = useCallback(async ({ force = false } = {}) => {
    if (!userId) {
      return [];
    }

    if (!hasLoadedApplications) {
      setHasLoadedApplications(true);
      if (!force) {
        return [];
      }
    }

    const result = await applicationsQuery.refetch();
    return result.data ?? [];
  }, [applicationsQuery, hasLoadedApplications, userId]);

  const fetchBookings = useCallback(async ({ force = false } = {}) => {
    if (!userId || userRole !== 'parent') {
      return [];
    }

    if (!hasLoadedBookings) {
      setHasLoadedBookings(true);
      if (!force) {
        return [];
      }
    }

    const result = await bookingsQuery.refetch();
    return result.data ?? [];
  }, [bookingsQuery, hasLoadedBookings, userId, userRole]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    if (activeTab === 'jobs') {
      fetchJobs();
    }

    if (activeTab === 'applications' && !hasLoadedApplications) {
      fetchApplications();
    }

    if (activeTab === 'bookings' && userRole === 'parent' && !hasLoadedBookings) {
      fetchBookings();
    }
  }, [activeTab, fetchApplications, fetchBookings, fetchJobs, hasLoadedApplications, hasLoadedBookings, userId, userRole]);

  useEffect(() => {
    if (!userId || userRole !== 'parent') {
      return;
    }

    if (!dataLoaded || activeTab === 'bookings' || hasLoadedBookings || bookings.length > 0) {
      return;
    }

    const timeout = setTimeout(() => {
      fetchBookings().catch(() => { });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [userId, userRole, dataLoaded, activeTab, hasLoadedBookings, bookings.length, fetchBookings]);

  return {
    activeTab,
    setActiveTab,
    profile,
    setProfile: setProfileState,
    jobs,
    setJobs: setJobsState,
    caregivers,
    setCaregivers: setCaregiversState,
    bookings,
    setBookings: setBookingsState,
    children,
    setChildren: setChildrenState,
    applications,
    setApplications: setApplicationsState,
    loading,
    applicationsLoading,
    loadProfile,
    fetchJobs,
    fetchCaregivers,
    fetchApplications,
    fetchBookings,
    fetchChildren,
    dataLoaded,
    bookingsLoaded,
  };
};