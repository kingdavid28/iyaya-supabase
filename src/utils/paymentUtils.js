import { BOOKING_STATUSES, PAYMENT_CONFIG } from '../constants/bookingStatuses';

/**
 * Calculate deposit amount based on total cost
 */
export const calculateDeposit = (totalCost) => {
  return (totalCost * PAYMENT_CONFIG.DEPOSIT_PERCENTAGE) / 100;
};

/**
 * Calculate remaining payment after deposit
 */
export const calculateRemainingPayment = (totalCost) => {
  return totalCost - calculateDeposit(totalCost);
};

/**
 * Get payment actions based on booking status
 */
export const getPaymentActions = (booking) => {
  const actions = [];
  
  switch (booking.status) {
    case BOOKING_STATUSES.PENDING:
      actions.push({
        type: 'deposit',
        label: 'Pay Deposit',
        amount: calculateDeposit(booking.totalCost),
        description: `Pay ${PAYMENT_CONFIG.DEPOSIT_PERCENTAGE}% deposit to confirm booking`
      });
      break;
      
    case BOOKING_STATUSES.COMPLETED:
      actions.push({
        type: 'final_payment',
        label: 'Payment',
        amount: calculateRemainingPayment(booking.totalCost),
        description: 'Pay remaining amount after service completion'
      });
      break;
      
    default:
      break;
  }
  
  return actions;
};

/**
 * Get next status after payment
 */
export const getNextStatusAfterPayment = (currentStatus, paymentType) => {
  if (paymentType === 'deposit' && currentStatus === BOOKING_STATUSES.PENDING) {
    return BOOKING_STATUSES.CONFIRMED;
  }
  
  if (paymentType === 'final_payment' && currentStatus === BOOKING_STATUSES.COMPLETED) {
    return BOOKING_STATUSES.PAID;
  }
  
  return currentStatus;
};