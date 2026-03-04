// Week 4: Test Screen for Mobile Payment
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PayCaregiverButton } from '../components/PayCaregiverButton';

export default function Week4TestScreen() {
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Week 4: Mobile Payment Integration</Text>
            
            <Text style={styles.description}>
                This demonstrates the mobile payment flow that connects to our Week 3 points system.
                When you tap "Pay Caregiver", it will:
            </Text>
            
            <View style={styles.steps}>
                <Text style={styles.step}>1. Simulate wallet payment</Text>
                <Text style={styles.step}>2. Send transaction to backend</Text>
                <Text style={styles.step}>3. Award points to caregiver</Text>
                <Text style={styles.step}>4. Update tier if needed</Text>
                <Text style={styles.step}>5. Show success with points earned</Text>
            </View>
            
            <PayCaregiverButton 
                caregiverAddress="11111111111111111111111111111112"
                caregiverId="123e4567-e89b-12d3-a456-426614174000"
                amount={0.01}
            />
            
            <Text style={styles.footer}>
                Backend server must be running on localhost:3000
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 20,
        color: '#666',
    },
    steps: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    step: {
        fontSize: 14,
        marginBottom: 5,
        color: '#495057',
    },
    footer: {
        fontSize: 12,
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
    },
});