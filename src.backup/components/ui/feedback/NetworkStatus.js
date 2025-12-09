import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { configureNetwork, getNetworkStatus, testConnection } from '../../../utils/networkConfig';

const NetworkStatus = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    loadNetworkInfo();
  }, []);

  const loadNetworkInfo = () => {
    const info = getNetworkStatus();
    setNetworkInfo(info);
  };

  const handleTestConnection = async () => {
    if (!networkInfo) return;
    
    try {
      setTesting(true);
      const isConnected = await testConnection(networkInfo.currentIP, 3000);
      setConnected(isConnected);
      
      if (isConnected) {
        Alert.alert('Success', 'Backend connection is working!');
      } else {
        Alert.alert('Connection Failed', 'Cannot reach backend server');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const handleAutoConfig = async () => {
    try {
      setTesting(true);
      const result = await configureNetwork();
      
      if (result.success) {
        Alert.alert('Success', `Auto-configured for IP: ${result.ip}`);
        loadNetworkInfo();
        setConnected(true);
      } else {
        Alert.alert('Auto-Config Failed', 'Please configure manually');
      }
    } catch (error) {
      Alert.alert('Error', 'Auto-configuration failed');
    } finally {
      setTesting(false);
    }
  };

  if (!networkInfo) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="wifi" size={24} color="#3b82f6" />
        <Text style={styles.title}>Network Status</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>Backend IP:</Text>
        <Text style={styles.value}>{networkInfo.currentIP}</Text>
        <View style={[styles.indicator, { 
          backgroundColor: connected === true ? '#10b981' : 
                          connected === false ? '#ef4444' : '#6b7280' 
        }]} />
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>API URL:</Text>
        <Text style={styles.valueSmall}>{networkInfo.currentAPI}</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleTestConnection}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={handleAutoConfig}
          disabled={testing}
        >
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            Auto Configure
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = {
  container: { 
    backgroundColor: '#f9fafb', 
    padding: 16, 
    borderRadius: 8, 
    margin: 16 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginLeft: 8 
  },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '500', 
    width: 80 
  },
  value: { 
    fontSize: 14, 
    flex: 1 
  },
  valueSmall: { 
    fontSize: 12, 
    flex: 1, 
    color: '#6b7280' 
  },
  indicator: { 
    width: 12, 
    height: 12, 
    borderRadius: 6 
  },
  buttons: { 
    flexDirection: 'row', 
    marginTop: 12, 
    gap: 8 
  },
  button: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 6, 
    backgroundColor: '#e5e7eb', 
    alignItems: 'center' 
  },
  primaryButton: { 
    backgroundColor: '#3b82f6' 
  },
  buttonText: { 
    fontSize: 14, 
    fontWeight: '500' 
  },
  primaryButtonText: { 
    color: '#fff' 
  }
};

export default NetworkStatus;