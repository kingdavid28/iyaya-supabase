import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabase';
import { reviewService } from '../services/supabase/reviewService';
import { normalizeCaregiverReviewsForList } from '../utils/reviews';

const EARTH_RADIUS_KM = 6371;

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const extractCoordinates = (input) => {
  if (!input) return null;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      return extractCoordinates(JSON.parse(trimmed));
    } catch (error) {
      const parts = trimmed.split(',').map((part) => part.trim());
      if (parts.length >= 2) {
        const latitude = toFiniteNumber(parts[0]);
        const longitude = toFiniteNumber(parts[1]);
        if (latitude !== null && longitude !== null) {
          return { latitude, longitude };
        }
      }
      return null;
    }
  }

  if (Array.isArray(input)) {
    if (input.length >= 2) {
      const latitude = toFiniteNumber(input[0]);
      const longitude = toFiniteNumber(input[1]);
      if (latitude !== null && longitude !== null) {
        return { latitude, longitude };
      }
    }
    return null;
  }

  if (typeof input === 'object') {
    const coordinatesValue = Object.prototype.hasOwnProperty.call(input, 'coordinates')
      ? extractCoordinates(input.coordinates)
      : null;

    if (coordinatesValue) {
      return coordinatesValue;
    }

    const latitude = toFiniteNumber(input.latitude ?? input.lat ?? input.x ?? input[0]);
    const longitude = toFiniteNumber(input.longitude ?? input.lng ?? input.lon ?? input.y ?? input[1]);

    if (latitude !== null && longitude !== null) {
      return { latitude, longitude };
    }
  }

  return null;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistanceKm = (pointA, pointB) => {
  if (!pointA || !pointB) return null;

  const latitude1 = toFiniteNumber(pointA.latitude ?? pointA.lat);
  const longitude1 = toFiniteNumber(pointA.longitude ?? pointA.lng ?? pointA.lon);
  const latitude2 = toFiniteNumber(pointB.latitude ?? pointB.lat);
  const longitude2 = toFiniteNumber(pointB.longitude ?? pointB.lng ?? pointB.lon);

  if (latitude1 === null || longitude1 === null || latitude2 === null || longitude2 === null) {
    return null;
  }

  const dLat = toRadians(latitude2 - latitude1);
  const dLon = toRadians(longitude2 - longitude1);
  const lat1Rad = toRadians(latitude1);
  const lat2Rad = toRadians(latitude2);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const distance = EARTH_RADIUS_KM * c;

  return Number.isFinite(distance) ? distance : null;
};

const normalizeLocationTokens = (value) => {
  if (!value) return [];

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeLocationTokens(entry));
  }

  if (typeof value === 'object') {
    const candidates = [value.formatted, value.city, value.province, value.street, value.region, value.state];
    return normalizeLocationTokens(candidates);
  }

  return [];
};

const annotateJobWithProximity = (job, caregiverLocation, caregiverCoordinates) => {
  if (!job || typeof job !== 'object') {
    return job;
  }

  const existingDistance = toFiniteNumber(job.distance ?? job.distanceKm);
  const jobCoordinates = extractCoordinates(
    job.locationCoordinates ??
      job.location_coordinates ??
      job.coordinates ??
      job.raw?.location_coordinates ??
      job.raw?.coordinates ??
      job?.locationDetails?.coordinates
  );

  let distanceKm = null;

  if (jobCoordinates && caregiverCoordinates) {
    distanceKm = calculateDistanceKm(jobCoordinates, caregiverCoordinates);
  }

  let isNearby = Boolean(job.isNearby);
  let distanceValue = existingDistance;

  if (Number.isFinite(distanceKm)) {
    isNearby = distanceKm <= 10;
    distanceValue = distanceKm;
  } else if (Number.isFinite(distanceValue)) {
    isNearby = isNearby || distanceValue <= 10;
  } else {
    const caregiverTokens = normalizeLocationTokens(caregiverLocation);
    const jobTokens = normalizeLocationTokens(
      job.location || job.address || job.raw?.location || job.raw?.address || job.familyLocation
    );

    if (caregiverTokens.length && jobTokens.some((token) => caregiverTokens.includes(token))) {
      isNearby = true;
      distanceValue = 5;
    }
  }

  const roundedDistance = Number.isFinite(distanceValue)
    ? Math.round(distanceValue * 10) / 10
    : null;

  return {
    ...job,
    distance: roundedDistance,
    distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm * 10) / 10 : job.distanceKm,
    isNearby,
  };
};

export const useCaregiverDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    rating: 0,
    reviews: 0,
    hourlyRate: 0,
    experience: '',
    bio: '',
    location: '',
    skills: [],
    ageCareRanges: [],
    certifications: [],
    completedJobs: 0,
    responseRate: '0%',
    profileImage: null,
    imageUrl: null,
    image: null,
    verification: null
  });
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [bookings, setBookings] = useState([]);
  const bookingsRef = useRef([]);
  const reviewsCacheRef = useRef([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const loadingRef = useRef(false);

  const computeStats = useCallback((bookingsList = [], reviewsList = []) => {
    const normalizedBookings = Array.isArray(bookingsList) ? bookingsList : [];
    const normalizedReviews = Array.isArray(reviewsList) ? reviewsList : [];

    const completedJobs = normalizedBookings.filter(booking =>
      (booking.status || '').toLowerCase() === 'completed'
    ).length;

    const respondedCount = normalizedBookings.filter(booking => {
      const status = (booking.status || '').toLowerCase();
      return status === 'confirmed' || status === 'completed' || status === 'cancelled';
    }).length;
    const totalBookings = normalizedBookings.length;
    const responseRate = totalBookings === 0
      ? '0%'
      : `${Math.round((respondedCount / totalBookings) * 100)}%`;

    const ratingValues = normalizedReviews.map(review => {
      const raw = review?.rating ?? 0;
      return raw > 5 ? raw / 10 : raw;
    });
    const averageRating = ratingValues.length
      ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length
      : 0;

    return {
      rating: Number(averageRating.toFixed(1)) || 0,
      reviewCount: ratingValues.length,
      completedJobs,
      responseRate
    };
  }, []);

  const updateProfileStats = useCallback(async ({
    bookingsList,
    reviewsList,
    fetchReviews = false
  } = {}) => {
    if (!user?.id) return;

    let effectiveBookings = Array.isArray(bookingsList) ? bookingsList : bookingsRef.current;
    let effectiveReviews = Array.isArray(reviewsList) ? reviewsList : reviewsCacheRef.current;

    if (!Array.isArray(effectiveBookings)) {
      effectiveBookings = [];
    }
    bookingsRef.current = effectiveBookings;

    if (fetchReviews || !Array.isArray(effectiveReviews) || effectiveReviews.length === 0) {
      try {
        const reviewsResponse = await reviewService.getReviews(user.id, 100, 0);
        effectiveReviews = normalizeCaregiverReviewsForList(reviewsResponse || []);
      } catch (error) {
        console.warn('Failed to load caregiver reviews for stats:', error);
        effectiveReviews = reviewsCacheRef.current || [];
      }
    }

    if (!Array.isArray(effectiveReviews)) {
      effectiveReviews = [];
    }
    reviewsCacheRef.current = effectiveReviews;

    const stats = computeStats(effectiveBookings, effectiveReviews);

    setProfile(prev => ({
      ...prev,
      rating: stats.rating,
      reviews: stats.reviewCount,
      reviewCount: stats.reviewCount,
      completedJobs: stats.completedJobs,
      responseRate: stats.responseRate
    }));
  }, [computeStats, setProfile, user?.id]);

  const refreshStats = useCallback(async (options = {}) => {
    const { fetchReviews = true, ...rest } = options || {};
    await updateProfileStats({ fetchReviews, ...rest });
  }, [updateProfileStats]);

  // Load profile data from Supabase
  const loadProfile = useCallback(async () => {
    if (!user?.id || loadingRef.current) return;

    try {
      loadingRef.current = true;
      console.log('🔄 Loading profile data from Supabase...');

      const targetUserId = user?.id;
      if (!targetUserId) {
        console.warn('⚠️ Auth context not ready. Delaying profile fetch.');
        loadingRef.current = false;
        return;
      }

      // Get user profile from users table
      const userProfile = await supabaseService.getProfile(targetUserId);
      
      // Get caregiver-specific profile from caregiver_profiles table
      let caregiverProfile = null;
      try {
        const { data } = await supabase
          .from('caregiver_profiles')
          .select('*')
          .eq('user_id', targetUserId)
          .single();
        caregiverProfile = data;
      } catch (error) {
        console.log('🔍 No caregiver profile found:', error.message);
      }

      // Combine user and caregiver profile data
      const combinedProfile = {
        // User table data
        name: userProfile?.name || user?.name,
        email: userProfile?.email || user?.email,
        phone: userProfile?.phone || user?.phone,
        bio: userProfile?.bio,
        profile_image: userProfile?.profile_image,
        address: userProfile?.address,
        location: userProfile?.location,
        hourly_rate: userProfile?.hourly_rate,
        skills: userProfile?.skills || [],
        experience: userProfile?.experience,
        
        // Caregiver profile data (if exists)
        ...(caregiverProfile && {
          hourly_rate: caregiverProfile.hourly_rate || userProfile?.hourly_rate,
          skills: caregiverProfile.skills || userProfile?.skills || [],
          certifications: caregiverProfile.certifications || [],
          availability: caregiverProfile.availability,
          background_check_status: caregiverProfile.background_check_status,
        })
      };

      setProfile(prev => ({
        ...prev,
        name: combinedProfile.name || prev.name,
        email: combinedProfile.email || prev.email,
        phone: combinedProfile.phone || prev.phone,
        location: combinedProfile.location || prev.location,
        address: combinedProfile.address || prev.address,
        profileImage: combinedProfile.profile_image || prev.profileImage,
        hourlyRate: combinedProfile.hourly_rate || prev.hourlyRate,
        experience: combinedProfile.experience || prev.experience,
        bio: combinedProfile.bio || prev.bio,
        skills: combinedProfile.skills || prev.skills || [],
        certifications: combinedProfile.certifications || prev.certifications || [],
        availability: combinedProfile.availability || prev.availability,
        rating: prev.rating,
        reviews: prev.reviews,
        completedJobs: prev.completedJobs,
        responseRate: prev.responseRate,
      }));

      await updateProfileStats({ fetchReviews: true });

      console.log('✅ Profile updated from Supabase');
    } catch (error) {
      console.error('❌ Error loading profile:', error?.message || error);
    } finally {
      loadingRef.current = false;
    }
  }, [updateProfileStats, user?.id]);

  // Fetch jobs from Supabase
  const fetchJobs = useCallback(async () => {
    if (!user?.id || user?.role !== 'caregiver') return;

    setJobsLoading(true);
    try {
      console.log('📋 Fetching available jobs from Supabase...');
      const jobsList = await supabaseService.getJobs({ status: 'active' });
      console.log('📋 Available jobs from Supabase:', jobsList);

      const normalizedJobs = Array.isArray(jobsList) ? jobsList : [];
      setJobs(normalizedJobs);
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, [user?.id, user?.role]);

  const fetchApplications = useCallback(async () => {
    if (!user?.id || user?.role !== 'caregiver') return;

    try {
      console.log('📋 Fetching applications from Supabase...');
      const applications = await supabaseService.getMyApplications(user.id);
      console.log('📋 Applications from Supabase:', applications);

      const normalized = applications.map(application => {
        const job = application.jobs || {};

        const hourlyRateRaw = job?.hourly_rate ?? job?.hourlyRate ?? job?.rate ?? null;
        const hourlyRate = Number.isFinite(Number(hourlyRateRaw)) ? Number(hourlyRateRaw) : null;

        const proposedRateRaw = application.proposed_rate ?? application.proposedRate ?? application.rate;
        const proposedRate = Number.isFinite(Number(proposedRateRaw)) ? Number(proposedRateRaw) : null;

        const childrenSummary = (() => {
          if (Array.isArray(job?.children) && job.children.length) {
            const count = job.children.length;
            return `${count} child${count > 1 ? 'ren' : ''}`;
          }
          const count = job?.children_count ?? job?.childrenCount;
          if (typeof count === 'number') {
            return `${count} child${count > 1 ? 'ren' : ''}`;
          }
          return null;
        })();

        const schedule = job?.schedule || job?.time || (job?.start_time && job?.end_time
          ? `${job.start_time} - ${job.end_time}`
          : null);

        return {
          id: application.id,
          _id: application.id,
          jobId: application.job_id,
          jobTitle: job?.title || 'Childcare Position',
          employerName: job?.users?.name || 'Family',
          parentId: job?.parent_id,
          family: job?.users?.name || 'Family',
          status: application.status || 'pending',
          appliedDate: application.applied_at || application.created_at,
          hourlyRate,
          hourlyRateLabel: hourlyRate !== null ? `₱${hourlyRate}/hr` : null,
          proposedRate,
          proposedRateLabel: proposedRate !== null ? `₱${proposedRate}/hr` : null,
          location: job?.location || job?.address || 'Location not specified',
          jobDate: job?.date,
          schedule,
          childrenSummary,
          message: application.message || application.cover_letter || '',
          job
        };
      });

      console.log('📋 Normalized applications:', normalized);
      setApplications(normalized);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    }
  }, [user?.id, user?.role]);

  // Fetch bookings from Supabase
  const fetchBookings = useCallback(async () => {
    console.log('📅 fetchBookings called with user:', { id: user?.id, role: user?.role });
    if (!user?.id || user?.role !== 'caregiver') {
      console.log('🚫 Skipping bookings - not caregiver');
      return;
    }

    try {
      console.log('📅 Fetching bookings from Supabase...');
      const bookingsList = await supabaseService.getMyBookings(user.id, 'caregiver');
      console.log('📅 Bookings from Supabase:', bookingsList);

      const normalized = bookingsList.map((b, idx) => {
        const rawChildren =
          (Array.isArray(b.selected_children) && b.selected_children) ||
          (Array.isArray(b.selectedChildren) && b.selectedChildren) ||
          (Array.isArray(b.childrenDetails) && b.childrenDetails) ||
          (Array.isArray(b.children) && b.children) ||
          [];

        const childrenDetails = rawChildren;
        const childrenCount = childrenDetails.length ||
          (typeof b.children === 'number' ? b.children : (Array.isArray(b.selected_children) ? b.selected_children.length : 0));

        const rawCaregiver =
          (b.caregiverId && typeof b.caregiverId === 'object') ? b.caregiverId :
          (b.caregiver && typeof b.caregiver === 'object') ? b.caregiver :
          null;

        const caregiverDetails = rawCaregiver || {
          _id: b.caregiver_id,
          id: b.caregiver_id,
          name: b.caregiver_name || user?.name || 'Caregiver',
          email: b.caregiver_email || null,
          profileImage: b.caregiver_avatar || null,
          avatar: b.caregiver_avatar || null
        };

        const rawParent =
          (b.clientId && typeof b.clientId === 'object') ? b.clientId :
          (b.parent && typeof b.parent === 'object') ? b.parent :
          null;

        const parentDetails = rawParent || {
          _id: b.parent_id,
          id: b.parent_id,
          name: b.parent?.name || b.family || 'Parent',
          email: b.parent?.email || null,
          phone: b.parent?.phone || b.contact_phone || null,
          address: b.parent?.address || null,
          location: b.parent?.location || null
        };

        const requirements = Array.isArray(b.requirements)
          ? b.requirements
          : Array.isArray(b.skills)
            ? b.skills
            : [];

        const contactPhone = b.contact_phone || b.contactPhone || parentDetails?.phone || null;
        const contactEmail = b.contact_email || b.contactEmail || parentDetails?.email || null;

        const specialInstructions = b.special_instructions || b.specialInstructions || null;
        const emergencyContact = b.emergency_contact || b.emergencyContact || null;
        const notes = b.notes || null;

        const timeRange = b.time || (b.start_time && b.end_time
          ? `${b.start_time} - ${b.end_time}`
          : (b.startTime && b.endTime ? `${b.startTime} - ${b.endTime}` : ''));

        const totalAmount = b.total_amount ?? b.totalAmount ?? 0;
        const hourlyRate = b.hourly_rate ?? b.hourlyRate ?? 0;
        const totalHours = b.total_hours ?? b.totalHours ?? null;

        return {
          id: b.id || idx + 1,
          _id: b.id,
          ...b,
          family: parentDetails?.name || b.family || 'Family',
          caregiver: caregiverDetails?.name || 'Caregiver',
          caregiverName: caregiverDetails?.name || 'Caregiver',
          caregiverDetails,
          caregiverId: caregiverDetails,
          clientId: parentDetails,
          parent: parentDetails,
          parentId: parentDetails?._id || parentDetails?.id || b.parent_id,
          parentName: parentDetails?.name || 'Parent',
          date: b.date,
          time: timeRange,
          status: b.status || 'pending',
          children: childrenCount > 0 ? childrenCount : 1,
          childrenDetails,
          selectedChildren: childrenDetails,
          location: b.location || b.address || parentDetails?.location || 'Location TBD',
          address: b.address || parentDetails?.address || null,
          contactPhone,
          contactEmail,
          specialInstructions,
          emergencyContact,
          requirements,
          notes,
          totalAmount,
          hourlyRate,
          totalHours
        };
      });

      console.log('📅 Normalized bookings:', normalized);
      bookingsRef.current = normalized;
      setBookings(normalized);
      await updateProfileStats({ bookingsList: normalized, fetchReviews: false });
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      setBookings([]);
      bookingsRef.current = [];
      await updateProfileStats({ bookingsList: [], fetchReviews: false });
    }
  }, [updateProfileStats, user?.id, user?.role]);

  // Load data only once on mount
  useEffect(() => {
    if (!dataLoaded && user?.id) {
      Promise.all([
        loadProfile(),
        fetchJobs(),
        fetchApplications(),
        fetchBookings()
      ]).finally(() => setDataLoaded(true));
    }
  }, [user?.id, dataLoaded, loadProfile, fetchJobs, fetchApplications, fetchBookings]);

  // Refresh data when tabs become active
  useEffect(() => {
    if (activeTab === 'jobs' && user?.id) {
      fetchJobs();
    }
    if (activeTab === 'bookings' && user?.id) {
      fetchBookings();
    }
    if (activeTab === 'applications' && user?.id) {
      fetchApplications();
    }
  }, [activeTab, fetchJobs, fetchBookings, fetchApplications, user?.id]);

  return {
    activeTab,
    setActiveTab,
    profile,
    setProfile,
    jobs,
    applications,
    setApplications,
    bookings,
    jobsLoading,
    loadProfile,
    fetchJobs,
    fetchApplications,
    fetchBookings,
    refreshStats,
    dataLoaded
  };
};