import { useCallback, useEffect, useState } from 'react';
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
        
        setProfile({
          name: profileData.name || profileData.displayName || '',
          email: profileData.email || '',
          phone: profileData.phone || profileData.contact || '',
          address: addressString,
          location: addressString,
          children: profileData.children || [],
          imageUrl: profileData.profileImage || profileData.avatar || null,
          ...profileData
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

      const applicationsFromJobs = (jobsList || []).flatMap(job => {
        if (!Array.isArray(job?.applications)) return [];
        return job.applications.map(application => ({
          ...application,
          jobId: job.id || job._id,
          jobTitle: job.title,
          jobLocation: job.location,
          jobStatus: job.status
        }));
      });

      setApplications(applicationsFromJobs);
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      setJobs([]);
      setApplications([]);
    } finally {
      setLoading(false);
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

      const transformedCaregivers = caregiversList.map(caregiver => ({
        id: caregiver.id,
        _id: caregiver.id,
        name: caregiver.name || 'Caregiver',
        rating: caregiver.rating || 4.5,
        hourlyRate: caregiver.hourly_rate || 300,
        experience: caregiver.experience || '2+ years',
        skills: caregiver.skills || ['Childcare', 'First Aid'],
        location: caregiver.address || 'Cebu City',
        avatar: caregiver.profile_image,
        bio: caregiver.bio || 'Experienced caregiver',
        createdAt: caregiver.created_at || new Date().toISOString()
      }));

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

  // Load data only once on mount
  useEffect(() => {
    if (!dataLoaded && user?.id) {
      Promise.all([
        loadProfile(),
        fetchJobs(),
        fetchCaregivers(),
        fetchBookings(),
        fetchChildren()
      ]).finally(() => setDataLoaded(true));
    }
  }, [user?.id, dataLoaded]);

  // Refresh data when tabs become active
  useEffect(() => {
    if (activeTab === 'jobs' && user?.id) {
      fetchJobs();
    }
    if (activeTab === 'bookings' && user?.id) {
      fetchBookings();
    }
  }, [activeTab, fetchJobs, fetchBookings, user?.id]);

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
    fetchCaregivers,
    fetchBookings,
    fetchChildren,
    dataLoaded
  };
};