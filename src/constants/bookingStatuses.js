// Better booking statuses with improved payment flow
export const BOOKING_STATUSES = {
  PENDING: 'pending',           // Booking created, no payment
  CONFIRMED: 'confirmed',       // Deposit paid (optional)
  IN_PROGRESS: 'in_progress',   // Service started
  COMPLETED: 'completed',       // Service finished
  PAID: 'paid'                  // Final payment processed
};

export const STATUS_LABELS = {
  [BOOKING_STATUSES.PENDING]: 'Pending',
  [BOOKING_STATUSES.CONFIRMED]: 'Confirmed',
  [BOOKING_STATUSES.IN_PROGRESS]: 'In Progress',
  [BOOKING_STATUSES.COMPLETED]: 'Completed',
  [BOOKING_STATUSES.PAID]: 'Paid'
};

export const STATUS_COLORS = {
  [BOOKING_STATUSES.PENDING]: '#F59E0B',
  [BOOKING_STATUSES.CONFIRMED]: '#3B82F6',
  [BOOKING_STATUSES.IN_PROGRESS]: '#10B981',
  [BOOKING_STATUSES.COMPLETED]: '#8B5CF6',
  [BOOKING_STATUSES.PAID]: '#059669'
};

// Payment flow configuration
export const PAYMENT_CONFIG = {
  DEPOSIT_PERCENTAGE: 20,       // 20% deposit to confirm booking
  ESCROW_ENABLED: true,         // Use escrow system
  PAYMENT_ON_COMPLETION: true   // Final payment after service completion
};