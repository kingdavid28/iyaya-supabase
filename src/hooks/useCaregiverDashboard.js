import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabaseService } from '../services/supabase';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatAddress } from '../utils/addressUtils';

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
  const [jobsLoading, setJobsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const loadingRef = useRef(false);

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
        rating: prev.rating, // Keep existing rating
        reviews: prev.reviews, // Keep existing reviews
        completedJobs: prev.completedJobs, // Keep existing completed jobs
        responseRate: prev.responseRate, // Keep existing response rate
      }));
      
      console.log('✅ Profile updated from Supabase');
    } catch (error) {
      console.error('❌ Error loading profile:', error?.message || error);
    } finally {
      loadingRef.current = false;
    }
  }, [user?.id]);

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

      const normalized = applications.map(a => ({
        id: a.id,
        _id: a.id,
        jobId: a.job_id,
        jobTitle: a.jobs?.title || 'Childcare Position',
        employerName: a.jobs?.users?.name || 'Family',
        parentId: a.jobs?.parent_id,
        family: a.jobs?.users?.name || 'Family',
        status: a.status || 'pending',
        appliedDate: a.applied_at || a.created_at,
        hourlyRate: a.jobs?.hourly_rate || 200,
        location: a.jobs?.location || 'Location not specified',
        jobDate: a.jobs?.date,
        message: a.message || ''
      }));

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
      setBookings(normalized);
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      setBookings([]);
    }
  }, [user?.id, user?.role]);

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
    dataLoaded
  };
};