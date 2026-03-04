// Week 4: Simple Payment Test Screen
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, SafeAreaView } from 'react-native';

export default function PaymentTestScreen() {
    const [paying, setPaying] = useState(false);
    
    const handlePayment = async () => {
        setPaying(true);
        
        try {
            // Mock payment data
            const mockSignature = 'mock-payment-' + Date.now();
            const caregiverId = '123e4567-e89b-12d3-a456-426614174000';
            
            // Send to backend
            const response = await fetch('http://localhost:3000/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature: mockSignature,
                    bookingId: 'booking-' + Date.now(),
                    expected: {
                        token: 'SOL',
                        amount: 10000000, // 0.01 SOL in lamports
                        caregiverId,
                        rating: 5,
                        payer: 'mock-customer-wallet',
                        caregiver: '11111111111111111111111111111112'
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'confirmed') {
                Alert.alert(
                    'Payment Successful! 🎉',
                    `Points awarded: ${result.points?.totalPoints || 0}\\nTier: ${result.points?.tier || 'Bronze'}`,
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Payment Failed', 'Please try again');
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            Alert.alert('Error', 'Make sure backend server is running on localhost:3000');
        } finally {
            setPaying(false);
        }
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Week 4: Payment Test</Text>
                <Text style={styles.subtitle}>Test mobile payment integration</Text>
                
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Mock Payment</Text>
                    <Text style={styles.amount}>0.01 SOL</Text>
                    <Text style={styles.description}>
                        This will send a mock payment to the backend and award points to the test caregiver.
                    </Text>
                    
                    <TouchableOpacity 
                        style={[styles.button, paying && styles.buttonDisabled]}
                        onPress={handlePayment}
                        disabled={paying}
                    >
                        <Text style={styles.buttonText}>
                            {paying ? 'Processing...' : 'Pay Caregiver'}
                        </Text>
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.note}>
                    Make sure backend server is running: node server.js
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        color: '#666',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    amount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 15,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 25,
        color: '#666',
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 25,
        minWidth: 200,
        alignItems: 'center',
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
        fontSize: 12,
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
    },
});