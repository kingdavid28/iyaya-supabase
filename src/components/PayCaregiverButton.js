// Week 4: Mobile Payment Component
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

export function PayCaregiverButton({ 
    caregiverAddress = '11111111111111111111111111111112',
    caregiverId = '123e4567-e89b-12d3-a456-426614174000',
    amount = 0.01 // 0.01 SOL for testing
}) {
    const [paying, setPaying] = useState(false);
    
    const handlePayment = async () => {
        setPaying(true);
        
        try {
            // Simulate wallet connection and payment
            const mockSignature = 'mock-payment-' + Date.now();
            
            // Send to backend
            const response = await fetch('http://localhost:3000/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature: mockSignature,
                    bookingId: 'booking-' + Date.now(),
                    expected: {
                        token: 'SOL',
                        amount: amount * 1000000000, // Convert to lamports
                        caregiverId,
                        rating: 5,
                        payer: 'mock-customer-wallet',
                        caregiver: caregiverAddress
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'confirmed') {
                Alert.alert(
                    'Payment Successful! 🎉',
                    `Points awarded: ${result.points?.totalPoints || 0}\nTier: ${result.points?.tier || 'Bronze'}`,
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Payment Failed', 'Please try again');
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            Alert.alert('Error', 'Payment failed: ' + error.message);
        } finally {
            setPaying(false);
        }
    };
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Week 4: Mobile Payment</Text>
            <Text style={styles.amount}>Pay {amount} SOL</Text>
            <Text style={styles.address}>To: {caregiverAddress.slice(0, 8)}...</Text>
            
            <TouchableOpacity 
                style={[styles.button, paying && styles.buttonDisabled]}
                onPress={handlePayment}
                disabled={paying}
            >
                <Text style={styles.buttonText}>
                    {paying ? 'Processing...' : 'Pay Caregiver'}
                </Text>
            </TouchableOpacity>
            
            <Text style={styles.note}>
                Mock payment - connects to Week 3 points system
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        margin: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    amount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 5,
    },
    address: {
        fontSize: 12,
        color: '#666',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    note: {
        fontSize: 10,
        color: '#999',
        textAlign: 'center',
    },
});