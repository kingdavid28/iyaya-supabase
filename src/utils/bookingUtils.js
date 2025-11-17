import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCaregiverDisplayName, normalizeStatus } from './caregiverUtils';
import { buildSchedule } from './dateUtils';
import { logger } from './logger';

/**
 * Consolidated Booking Utilities
 * Handles booking data normalization, caregiver fetching, and processing
 */

/**
 * Extract bookings array from various API response formats
 */
export const extractBookingsFromResponse = (response) => {
  let list = [];
  
  if (response?.bookings && Array.isArray(response.bookings)) {
    // Handle direct { bookings: [] } format (current API response)
    list = response.bookings;
  } else if (response?.data?.data?.bookings) {
    // Handle the new format with pagination { data: { data: { bookings: [] } } }
    list = response.data.data.bookings;
  } else if (response?.data?.bookings) {
    // Handle format with { data: { bookings: [] } }
    list = response.data.bookings;
  } else if (Array.isArray(response?.data)) {
    // Handle direct array response in data
    list = response.data;
  } else if (Array.isArray(response)) {
    // Fallback for direct array response
    list = response;
  }
  
  return list;
};

/**
 * Fetch fresh caregiver data for a booking
 */
export const fetchCaregiverData = async (caregiverId) => {
  try {
    if (!caregiverId) return null;
    
    // Normalize caregiver ID
    const id = typeof caregiverId === 'object' 
      ? caregiverId._id 
      : caregiverId;
    
    if (!id) return null;
    
    const token = await AsyncStorage.getItem('userToken');
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    
    const response = await fetch(`${apiUrl}/api/caregivers/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      logger.warn(`Failed to fetch caregiver ${id}:`, await response.text());
      return null;
    }
    
    const caregiverData = await response.json();
    return caregiverData.data || caregiverData;
  } catch (error) {
    logger.error('Error fetching caregiver data:', error);
    return null;
  }
};

/**
 * Enrich bookings with fresh caregiver data
 */
export const enrichBookingsWithCaregiverData = async (bookings) => {
  return await Promise.all(bookings.map(async (booking) => {
    try {
      console.log('Enriching booking:', booking._id, 'caregiverId:', booking.caregiverId);
      
      // If we don't have a caregiver ID, return the booking as is
      if (!booking.caregiverId) {
        console.log('No caregiverId found for booking:', booking._id);
        return booking;
      }
      
      const freshCaregiverData = await fetchCaregiverData(booking.caregiverId);
      console.log('Fresh caregiver data:', freshCaregiverData);
      
      if (!freshCaregiverData) {
        console.log('No fresh caregiver data found');
        return booking;
      }
      
      // Merge the fresh caregiver data with the existing booking data
      const enrichedBooking = {
        ...booking,
        caregiver: {
          ...(booking.caregiver || {}), // Keep existing caregiver data as fallback
          ...freshCaregiverData, // Add/override with fresh data
          _id: typeof booking.caregiverId === 'object' 
            ? booking.caregiverId._id
            : booking.caregiverId
        }
      };
      
      console.log('Enriched booking caregiver:', enrichedBooking.caregiver);
      return enrichedBooking;
    } catch (error) {
      logger.error('Error enriching booking with caregiver data:', error);
      return booking; // Return original booking if there's an error
    }
  }));
};

/**
 * Extract caregiver information from booking data
 */
export const extractCaregiverInfo = (booking) => {
  // Get caregiver info - prioritize the embedded caregiver data
  let caregiverInfo = booking.caregiver || booking.caregiverId || booking.user || {};
  let caregiverName = 'No caregiver assigned';
  let caregiverId = null;
  
  // If we have embedded caregiver data, use it directly
  if (booking.caregiver && (booking.caregiver.name || booking.caregiver._id)) {
    caregiverInfo = booking.caregiver;
    caregiverName = booking.caregiver.name || 'Unknown Caregiver';
    caregiverId = booking.caregiver._id;
  } 
  // Fallback to other possible sources
  else if (booking.caregiverId) {
    if (typeof booking.caregiverId === 'object') {
      caregiverName = booking.caregiverId.name || 'Unknown Caregiver';
      caregiverId = booking.caregiverId._id;
    } else {
      // If it's just an ID, we can't get the name
      caregiverName = 'Unknown Caregiver';
      caregiverId = booking.caregiverId;
    }
  }
  
  // If we still don't have a name, try the getCaregiverDisplayName function
  if (caregiverName === 'Unknown Caregiver' || caregiverName === 'No caregiver assigned') {
    caregiverName = getCaregiverDisplayName(caregiverInfo);
  }
  
  return { caregiverInfo, caregiverName, caregiverId };
};

/**
 * Process children array from booking data
 */
export const processChildrenList = (children) => {
  const childrenList = [];
  
  if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        childrenList.push(child);
      } else if (child?.name || child?.childName || child?._id) {
        childrenList.push(child.name || child.childName || child._id);
      }
    });
  }
  
  return childrenList;
};

/**
 * Generate schedule string with error handling
 */
export const generateScheduleString = (date, startTime, endTime) => {
  let scheduleStr = '';
  
  try {
    scheduleStr = buildSchedule(date, startTime, endTime);
  } catch (e) {
    logger.warn('Error building schedule string, using raw values', e);
    scheduleStr = `${date} • ${startTime || ''} - ${endTime || ''}`.replace(/\s*-\s*$/, '');
  }
  
  return scheduleStr;
};

/**
 * Sort bookings by date and time (newest first)
 */
export const sortBookingsByDate = (bookings) => {
  return [...bookings].sort((a, b) => {
    const dateA = new Date(a.date + 'T' + (a.startTime || '00:00'));
    const dateB = new Date(b.date + 'T' + (b.startTime || '00:00'));
    return dateB - dateA; // Sort in descending order (newest first)
  });
};

/**
 * Normalize a single booking object
 */
export const normalizeBooking = (booking) => {
  const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'paid'];
  const status = validStatuses.includes(booking.status) ? booking.status : 'pending';
  
  return {
    _id: booking._id,
    caregiver: booking.caregiver || booking.caregiverId,
    caregiverId: booking.caregiverId,
    status: status,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    children: booking.children || [],
    totalCost: booking.totalCost,
    address: booking.address,
    depositPaid: booking.depositPaid || false,
    finalPaymentPaid: booking.finalPaymentPaid || false
  };
};

/**
 * Process and normalize an array of bookings
 */
export const processBookings = (bookings) => {
  const sortedBookings = sortBookingsByDate(bookings);
  return sortedBookings.map(normalizeBooking);
};

/**
 * Main function to fetch and process bookings with all optimizations
 */
export const fetchAndProcessBookings = async (bookingsAPI) => {
  try {
    logger.info('Fetching bookings...');
    
    // Fetch bookings from API
    const response = await bookingsAPI.getMyBookings?.() || await bookingsAPI.getMy?.();
    logger.debug('Bookings API response:', response);
    
    // Extract bookings from response
    let bookingsList = extractBookingsFromResponse(response);
    logger.info(`Extracted ${bookingsList.length} bookings`);
    
    // Enrich with fresh caregiver data
    bookingsList = await enrichBookingsWithCaregiverData(bookingsList);
    
    // Process and normalize bookings
    const processedBookings = processBookings(bookingsList);
    
    logger.info(`Successfully processed ${processedBookings.length} bookings`);
    return processedBookings;
    
  } catch (error) {
    logger.error('Error fetching and processing bookings:', error);
    return [];
  }
};

export default {
  extractBookingsFromResponse,
  fetchCaregiverData,
  enrichBookingsWithCaregiverData,
  extractCaregiverInfo,
  processChildrenList,
  generateScheduleString,
  sortBookingsByDate,
  normalizeBooking,
  processBookings,
  fetchAndProcessBookings,
};
