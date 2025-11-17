import { useState } from 'react';
import { validateForm as validate, validationRules } from '../utils/validation';
import { STRINGS } from '../constants/strings';

export const useAuthForm = (initialData = {}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    middleInitial: '',
    birthDate: '',
    phone: '',
    confirmPassword: '',
    ...initialData
  });
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = (mode) => {
    let rules = {};
    
    if (mode === 'login') {
      rules = validationRules.userLogin;
    } else if (mode === 'signup') {
      rules = {
        email: validationRules.userRegistration.email,
        password: validationRules.userRegistration.password,
        phone: validationRules.userRegistration.phone,
        firstName: (value) => !value?.trim() ? STRINGS.FIRST_NAME_ERROR : null,
        lastName: (value) => !value?.trim() ? STRINGS.LAST_NAME_ERROR : null,
        birthDate: (value) => {
          if (!value) return STRINGS.BIRTH_DATE_ERROR;
          const date = new Date(value);
          if (isNaN(date.getTime())) return STRINGS.INVALID_BIRTH_DATE;
          if (date > new Date()) return STRINGS.FUTURE_BIRTH_DATE;
          return null;
        },
        confirmPassword: (value) => {
          if (value !== formData.password) return STRINGS.PASSWORDS_NO_MATCH;
          return null;
        }
      };
    } else if (mode === 'reset') {
      rules = { email: validationRules.userRegistration.email };
    }
    
    const errors = validate(formData, rules);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      middleInitial: '',
      birthDate: '',
      phone: '',
      confirmPassword: ''
    });
    setFormErrors({});
  };

  return {
    formData,
    formErrors,
    handleChange,
    validateForm,
    resetForm
  };
};