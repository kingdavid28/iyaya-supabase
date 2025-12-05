export const STATUS_TYPES = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'inactive'
}

export const SUSPENSION_REASONS = {
  MISCONDUCT: 'misconduct',
  POLICY_VIOLATION: 'policy_violation',
  SAFETY_CONCERN: 'safety_concern',
  FRAUD: 'fraud',
  SPAM: 'spam',
  OTHER: 'other'
}

export const formatSuspensionReason = (reason) => {
  const reasonMap = {
    [SUSPENSION_REASONS.MISCONDUCT]: 'Misconduct reported',
    [SUSPENSION_REASONS.POLICY_VIOLATION]: 'Policy violation',
    [SUSPENSION_REASONS.SAFETY_CONCERN]: 'Safety concern',
    [SUSPENSION_REASONS.FRAUD]: 'Fraudulent activity',
    [SUSPENSION_REASONS.SPAM]: 'Spam or inappropriate content',
    [SUSPENSION_REASONS.OTHER]: 'Terms of service violation'
  }
  
  return reasonMap[reason] || 'Account violation'
}

export const calculateSuspensionDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return null
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return '1 day'
  if (diffDays < 7) return `${diffDays} days`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`
  return `${Math.ceil(diffDays / 30)} months`
}

export const isTemporarySuspension = (suspensionData) => {
  return suspensionData?.endDate && !suspensionData?.isPermanent
}

export const getSuspensionTimeRemaining = (endDate) => {
  if (!endDate) return null
  
  const now = new Date()
  const end = new Date(endDate)
  const diffMs = end.getTime() - now.getTime()
  
  if (diffMs <= 0) return 'Expired'
  
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  
  if (diffDays > 1) return `${diffDays} days remaining`
  if (diffHours > 1) return `${diffHours} hours remaining`
  return 'Less than 1 hour remaining'
}

export const canAppealSuspension = (suspensionData) => {
  return suspensionData?.appealable !== false && !suspensionData?.isPermanent
}