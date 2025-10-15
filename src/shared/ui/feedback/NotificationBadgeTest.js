import React from 'react';
import { View, Text } from 'react-native';
import NotificationBadge from '../NotificationBadge';

const NotificationBadgeTest = () => {
  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Notification Badge Test
      </Text>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
        <View style={{ position: 'relative', backgroundColor: '#3b82f6', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Messages</Text>
          <NotificationBadge count={5} />
        </View>
        
        <View style={{ position: 'relative', backgroundColor: '#10b981', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Bookings</Text>
          <NotificationBadge count={12} />
        </View>
        
        <View style={{ position: 'relative', backgroundColor: '#f59e0b', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Applications</Text>
          <NotificationBadge count={99} />
        </View>
        
        <View style={{ position: 'relative', backgroundColor: '#ef4444', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Jobs</Text>
          <NotificationBadge count={150} />
        </View>
      </View>
      
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
        Different Sizes:
      </Text>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <View style={{ position: 'relative', backgroundColor: '#8b5cf6', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Small</Text>
          <NotificationBadge count={3} size="small" />
        </View>
        
        <View style={{ position: 'relative', backgroundColor: '#06b6d4', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Default</Text>
          <NotificationBadge count={7} size="default" />
        </View>
        
        <View style={{ position: 'relative', backgroundColor: '#84cc16', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Large</Text>
          <NotificationBadge count={25} size="large" />
        </View>
      </View>
    </View>
  );
};

export default NotificationBadgeTest;