import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { PayCaregiver } from './PayCaregiver';
import { PointsDashboard } from './PointsDashboard';

interface BookingPaymentProps {
  booking: {
    id: string;
    caregiverId: string;
    caregiverAddress: string;
    amount: number;
    token: 'SOL' | 'USDC';
    caregiverName: string;
  };
  onPaymentComplete: () => void;
}

export function BookingPaymentScreen({ booking, onPaymentComplete }: BookingPaymentProps) {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed'>('pending');
  const [signature, setSignature] = useState<string>('');

  const handlePaymentSuccess = (txSignature: string) => {
    setSignature(txSignature);
    setPaymentStatus('completed');
    onPaymentComplete();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pay Caregiver</Text>
      
      <View style={styles.bookingInfo}>
        <Text style={styles.caregiverName}>{booking.caregiverName}</Text>
        <Text style={styles.amount}>
          {booking.amount} {booking.token}
        </Text>
      </View>

      {paymentStatus === 'pending' && (
        <PayCaregiver
          caregiverAddress={booking.caregiverAddress}
          tokenType={booking.token}
          amountSol={booking.token === 'SOL' ? booking.amount : undefined}
          amountUsdc={booking.token === 'USDC' ? booking.amount : undefined}
          bookingId={booking.id}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {paymentStatus === 'completed' && (
        <View style={styles.success}>
          <Text style={styles.successText}>✅ Payment Confirmed</Text>
          <Text style={styles.signature}>Signature: {signature.slice(0, 20)}...</Text>
          
          <PointsDashboard caregiverId={booking.caregiverId} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  bookingInfo: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 20 },
  caregiverName: { fontSize: 18, fontWeight: '600' },
  amount: { fontSize: 16, color: '#666', marginTop: 5 },
  success: { alignItems: 'center', marginTop: 20 },
  successText: { fontSize: 18, color: 'green', fontWeight: 'bold' },
  signature: { fontSize: 12, color: '#666', marginTop: 10 }
});