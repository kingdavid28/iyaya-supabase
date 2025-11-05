import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services';
import { formatAddress } from '../utils/addressUtils';

export const useParentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    children: [],
    imageUrl: null
  });
  const [jobs, setJobs] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load profile data
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const profileResponse = await apiService.auth.getProfile();
      const profileData = profileResponse?.data || profileResponse || {};

      if (profileData) {
        const rawAddress = profileData.address || profileData.location || '';
        const addressString = typeof rawAddress === 'string' ? rawAddress : (rawAddress.street || rawAddress.city || '');

        const resolveProfileImage = (profileData) => {
          return profileData.profileImage || profileData.profile_image || profileData.avatar || profileData.imageUrl || null;
        };

        const resolveLocation = (profileData) => {
          return profileData.location || addressString;
        };

        setProfile({
          ...profileData,
          name: profileData.name || profileData.displayName || '',
          email: profileData.email || '',
          phone: profileData.phone || profileData.contact || '',
          address: addressString,
          location: resolveLocation(profileData),
          children: profileData.children || [],
          profileImage: resolveProfileImage(profileData),
          imageUrl: resolveProfileImage(profileData)
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [user?.id]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.jobs.getMy();
      console.log('📋 Jobs API response:', res);

      const jobsList = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res) ? res : []);

      console.log('📋 Jobs list (normalized):', jobsList);
      setJobs(jobsList);
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchApplications = useCallback(async () => {
    if (!user?.id) return;
    setApplicationsLoading(true);
    try {
      const { supabaseService } = await import('../services/supabase');
      const list = await supabaseService.applications.getParentApplications(user.id);
      setApplications(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('❌ Error fetching applications:', error);
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  }, [user?.id]);

  // Fetch caregivers
  const fetchCaregivers = useCallback(async () => {
    if (!user?.id) return;
    try {
      console.log('🔍 Fetching caregivers...');
      const res = await apiService.caregivers.getAll();
      console.log('🔍 Raw API response:', res);

      const caregiversList = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res) ? res : []);
      console.log('🔍 Caregivers list:', caregiversList);

      if (!Array.isArray(caregiversList)) {
        console.warn('⚠️ Caregivers response is not an array:', typeof caregiversList);
        setCaregivers([]);
        return;
      }

      const parseExperience = (caregiver) => {
        const sources = [
          caregiver.experience,
          caregiver.experience_years,
          caregiver.experienceYears,
          caregiver.profile?.experience,
          caregiver.metadata?.experience
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
          description: description || undefined
        };
      };

      const parseVerification = (caregiver) => {
        const trustScoreSources = [
          caregiver.trustScore,
          caregiver.trust_score,
          caregiver.verification?.trustScore,
          caregiver.verification?.trust_score,
          caregiver.trust?.score
        ];

        const trustScore = trustScoreSources
          .map((value) => Number(value))
          .find((value) => Number.isFinite(value));

        const verified = [
          caregiver.verified,
          caregiver.isVerified,
          caregiver.is_verified,
          caregiver.verification?.verified,
          caregiver.verification_status === 'verified'
        ].some(Boolean);

        return {
          trustScore: Number.isFinite(trustScore) ? trustScore : 0,
          verified,
          backgroundCheck: Boolean(caregiver.verification?.backgroundCheck ?? caregiver.background_check_passed),
          certifications: caregiver.verification?.certifications || caregiver.certifications || [],
          documentsVerified: Boolean(caregiver.verification?.documentsVerified ?? caregiver.documents_verified)
        };
      };

      const transformedCaregivers = caregiversList.map(caregiver => {
        const experience = parseExperience(caregiver);
        const verification = parseVerification(caregiver);

        return {
          id: caregiver.id,
          _id: caregiver.id,
          name: caregiver.name || 'Caregiver',
          rating: Number(caregiver.rating ?? caregiver.average_rating ?? 0) || 0,
          reviewCount: caregiver.reviewCount ?? caregiver.review_count ?? 0,
          hourlyRate: Number(caregiver.hourly_rate ?? caregiver.hourlyRate ?? 0) || 0,
          experience: {
            years: experience.years,
            months: experience.months,
            description: experience.description
          },
          skills: Array.isArray(caregiver.skills) ? caregiver.skills : (Array.isArray(caregiver.specialties) ? caregiver.specialties : ['Childcare', 'First Aid']),
          location: caregiver.address || caregiver.location || 'Cebu City',
          avatar: caregiver.profile_image || caregiver.avatar,
          profileImage: caregiver.profile_image || caregiver.avatar,
          bio: caregiver.bio || 'Experienced caregiver',
          createdAt: caregiver.created_at || new Date().toISOString(),

          // Trust score and verification data
          trustScore: verification.trustScore,
          verified: verification.verified,
          verification: {
            trustScore: verification.trustScore,
            verified: verification.verified,
            backgroundCheck: verification.backgroundCheck,
            certifications: verification.certifications,
            documentsVerified: verification.documentsVerified
          },

          // Additional caregiver profile data for enhanced display
          completedJobs: caregiver.completedJobs || caregiver.completed_jobs || 0,
          responseRate: caregiver.responseRate || caregiver.response_rate || '0%',
          hasCompletedJobs: Boolean(caregiver.completedJobs || caregiver.completed_jobs)
        };
      });

      console.log('✅ Transformed caregivers:', transformedCaregivers.length);
      setCaregivers(transformedCaregivers);
    } catch (error) {
      console.error('❌ Error fetching caregivers:', error);
      setCaregivers([]);
    }
  }, [user?.id]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!user?.id || user?.role !== 'parent') return;

    try {
      console.log('📅 Fetching bookings for parent:', user?.id);

      // Import bookingService dynamically to avoid circular imports
      const { default: bookingService } = await import('../services/bookingService');
      const bookingsList = await bookingService.getBookings();

      console.log('📅 Bookings from service:', bookingsList);

      const normalized = bookingsList.map((booking, idx) => ({
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
        updatedAt: booking.updated_at || booking.updatedAt || new Date().toISOString()
      }));

      console.log('📅 Normalized bookings:', normalized);
      setBookings(normalized);
    } catch (error) {
      console.error('❌ Error fetching bookings:', {
        message: error?.message,
        status: error?.status,
        statusCode: error?.statusCode,
        code: error?.code,
        originalError: error?.originalError,
        stack: error?.stack
      });
      setBookings([]);
      throw error;
    }
  }, [user?.id, user?.role]);

  // Fetch children
  const fetchChildren = useCallback(async () => {
    if (!user?.id || user?.role !== 'parent') return;

    try {
      console.log('👶 Fetching children for parent:', user?.id);
      const list = await apiService.children.getChildren(user.id);
      console.log('👶 Children from getChildren:', list);

      const normalized = (list || []).map((child, idx) => ({
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
        updatedAt: child.updated_at || child.updatedAt || new Date().toISOString()
      }));

      console.log('👶 Normalized children:', normalized);
      setChildren(normalized);
    } catch (error) {
      console.error('❌ Error fetching children:', error);
      setChildren([]);
    }
  }, [user?.id, user?.role]);

  // Load essential data once on mount; defer bookings until tab visit
  useEffect(() => {
    if (!dataLoaded && user?.id) {
      Promise.all([
        loadProfile(),
        fetchJobs(),
        fetchApplications(),
        fetchCaregivers(),
        fetchChildren()
      ]).finally(() => setDataLoaded(true));
    }
  }, [user?.id, dataLoaded, fetchApplications, fetchChildren, fetchCaregivers, fetchJobs, loadProfile]);

  // Refresh data when tabs become active
  useEffect(() => {
    if (activeTab === 'jobs' && user?.id) {
      fetchJobs();
    }
    if (activeTab === 'applications' && user?.id) {
      fetchApplications();
    }
    if (activeTab === 'bookings' && user?.id) {
      fetchBookings();
    }
  }, [activeTab, fetchJobs, fetchApplications, fetchBookings, user?.id]);

  // Prefetch bookings once after initial render when user is idle
  useEffect(() => {
    if (user?.id && dataLoaded && activeTab !== 'bookings' && bookings.length === 0) {
      const timeout = setTimeout(() => {
        fetchBookings().catch(() => { });
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [user?.id, dataLoaded, activeTab, bookings.length, fetchBookings]);

  return {
    activeTab,
    setActiveTab,
    profile,
    setProfile,
    jobs,
    caregivers,
    bookings,
    children,
    loading,
    loadProfile,
    fetchJobs,
    applications,
    setApplications,
    applicationsLoading,
    fetchApplications,
    fetchCaregivers,
    fetchBookings,
    fetchChildren,
    dataLoaded,
    bookingsLoaded: useMemo(() => bookings.length > 0, [bookings])
  };
};