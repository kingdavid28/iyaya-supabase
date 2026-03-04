// Week 5: Admin Points Management
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { supabase } from '../services/supabase';

export function PointsManagement({ caregiverId }: { caregiverId: string }) {
    const [adjustment, setAdjustment] = useState('');
    const [reason, setReason] = useState('');
    
    const addPointsAdjustment = async () => {
        const delta = parseInt(adjustment);
        if (!delta || !reason) return;
        
        await supabase.from('caregiver_points_ledger').insert({
            caregiver_id: caregiverId,
            metric: 'admin_adjustment',
            delta,
            reason: `Admin: ${reason}`
        });
        
        await fetch('/api/points/recalculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caregiverId })
        });
        
        setAdjustment('');
        setReason('');
    };
    
    return (
        <View style={{ margin: 16 }}>
            <Text>Manual Points Adjustment</Text>
            <TextInput
                placeholder="Points (+/-)"
                value={adjustment}
                onChangeText={setAdjustment}
                keyboardType="numeric"
                style={{ marginBottom: 8 }}
            />
            <TextInput
                placeholder="Reason"
                value={reason}
                onChangeText={setReason}
                multiline
                style={{ marginBottom: 8 }}
            />
            <Button title="Apply Adjustment" onPress={addPointsAdjustment} />
        </View>
    );
}