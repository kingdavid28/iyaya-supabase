export const applyFilters = (caregiversList, currentFilters) => {
  if (!caregiversList || !caregiversList.length) return [];
  
  return caregiversList.filter(caregiver => {
    if (currentFilters.rating > 0 && (caregiver.rating || 0) < currentFilters.rating) {
      return false;
    }
    
    if ((caregiver.experience || 0) < currentFilters.experience.min) {
      return false;
    }
    
    if (caregiver.hourlyRate > currentFilters.rate.max) {
      return false;
    }
    
    if (currentFilters.certifications.length > 0) {
      const caregiverCerts = Array.isArray(caregiver.certifications) 
        ? caregiver.certifications.map(c => c.toLowerCase())
        : [];
        
      const hasAllCerts = currentFilters.certifications.every(cert => 
        caregiverCerts.includes(cert.toLowerCase())
      );
      
      if (!hasAllCerts) {
        return false;
      }
    }
    
    if (currentFilters.availability.availableNow) {
      // Availability filtering logic
    }
    
    return true;
  });
};

export const countActiveFilters = (filters) => {
  return (
    (filters.availability.availableNow ? 1 : 0) +
    (filters.availability.days.length > 0 ? 1 : 0) +
    (filters.location.distance < 50 ? 1 : 0) +
    (filters.location.location ? 1 : 0) +
    (filters.rate.max < 1000 ? 1 : 0) +
    (filters.experience.min > 0 ? 1 : 0) +
    (filters.certifications.length > 0 ? 1 : 0) +
    (filters.rating > 0 ? 1 : 0)
  );
};

export const getCaregiverDisplayName = (caregiver) => {
  console.log('getCaregiverDisplayName input:', caregiver);
  
  if (!caregiver) return 'No caregiver assigned';
  if (typeof caregiver === 'string') return caregiver;
  
  // Try multiple possible name fields
  const name = caregiver?.name || 
               caregiver?.firstName || 
               caregiver?.fullName || 
               caregiver?.displayName ||
               caregiver?.user?.name ||
               caregiver?.user?.firstName ||
               caregiver?.userId?.name;
               
  console.log('Extracted name:', name);
  return name || 'Unknown Caregiver';
};

export const normalizeStatus = (status) => {
  return status || 'pending';
};

export const getStatusColor = (status) => {
  const colors = {
    'pending': '#F59E0B',
    'confirmed': '#3B82F6', 
    'in_progress': '#10B981',
    'completed': '#8B5CF6',
    'paid': '#059669'
  };
  return colors[status] || '#6B7280';
};
