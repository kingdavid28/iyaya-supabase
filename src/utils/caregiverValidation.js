export const validateCaregiverProfile = (data) => {
  const errors = {};
  
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  
  if (!data.phone || data.phone.trim().length < 10) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  if (!data.bio || data.bio.trim().length < 20) {
    errors.bio = 'Bio must be at least 20 characters';
  }
  
  const rate = parseFloat(data.hourlyRate);
  if (!rate || rate < 50 || rate > 2000) {
    errors.hourlyRate = 'Hourly rate must be between ₱50 and ₱2000';
  }
  
  if (!data.experience?.years || data.experience.years < 0) {
    errors.experienceYears = 'Please enter valid years of experience';
  }
  
  if (!data.experience?.description || data.experience.description.trim().length < 50) {
    errors.experienceDescription = 'Experience description must be at least 50 characters';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};