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

  const validateForm = (mode, role = 'parent') => {
    let rules = {};

    // Common rules for all modes
    const commonRules = {
      email: validationRules.userRegistration.email,
      password: mode === 'signup' 
        ? validationRules.userRegistration.password 
        : validationRules.userLogin.password,
      firstName: (value) => !value?.trim() ? STRINGS.FIRST_NAME_ERROR : null,
      lastName: (value) => !value?.trim() ? STRINGS.LAST_NAME_ERROR : null,
    };

    // Role-specific rules
    const roleRules = {
      caregiver: {
        birthDate: (value) => {
          if (!value) return STRINGS.BIRTH_DATE_ERROR;
          const date = new Date(value);
          if (isNaN(date.getTime())) return STRINGS.INVALID_BIRTH_DATE;
          if (date > new Date()) return STRINGS.FUTURE_BIRTH_DATE;
          return null;
        },
        phone: validationRules.userRegistration.phone,
      },
      parent: {
        phone: validationRules.userRegistration.phone,
      }
    };

    // Mode-specific rules
    if (mode === 'login') {
      rules = {
        email: validationRules.userLogin.email,
        password: validationRules.userLogin.password
      };
    } else if (mode === 'signup') {
      rules = {
        ...commonRules,
        ...(roleRules[role] || {}),
        confirmPassword: (value) => {
          if (value !== formData.password) return STRINGS.PASSWORDS_NO_MATCH;
          return null;
        },
        // Add role-specific required fields
        ...(role === 'caregiver' ? {
          middleInitial: (value) => value && value.length > 1 ? 'Middle initial should be 1 character or empty' : null,
          birthDate: roleRules.caregiver.birthDate
        } : {})
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