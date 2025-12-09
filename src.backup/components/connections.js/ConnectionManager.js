// src/components/connections/ConnectionManager.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  FlatList,
  TouchableOpacity 
} from 'react-native';
import { listenToConnections, updateConnectionStatus } from '../../services/connectionService';
import { Ionicons } from '@expo/vector-icons';

const ConnectionManager = ({ userId }) => {
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe;

    const setupConnectionListener = async () => {
      try {
        setLoading(true);
        setError(null);
        
        unsubscribe = await listenToConnections(userId, (connectionData) => {
          if (connectionData) {
            setConnections(prev => ({
              ...prev,
              [connectionData.id]: connectionData
            }));
          }
          setLoading(false);
        });
      } catch (err) {
        console.error('Connection listener error:', err);
        setError('Failed to load connections. Please try again.');
        setLoading(false);
      }
    };

    setupConnectionListener();

    // Clean up listener on unmount
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [userId]);

  const handleConnectionUpdate = async (targetUserId, newStatus) => {
    try {
      await updateConnectionStatus(userId, targetUserId, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      // You might want to show a success message here
    } catch (error) {
      console.error('Failed to update connection status:', error);
      setError('Failed to update connection. Please try again.');
    }
  };

  const renderConnectionItem = ({ item }) => {
    const connection = connections[item];
    if (!connection) return null;

    return (
      <View style={styles.connectionItem}>
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionName}>{connection.displayName || 'Unknown User'}</Text>
          <Text style={styles.connectionStatus}>
            Status: {connection.status || 'No status'}
          </Text>
        </View>
        <View style={styles.connectionActions}>
          {connection.status !== 'connected' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.connectButton]}
              onPress={() => handleConnectionUpdate(item, 'connected')}
            >
              <Ionicons name="checkmark" size={20} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => handleConnectionUpdate(item, 'removed')}
          >
            <Ionicons name="trash" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Connections</Text>
      {Object.keys(connections).length > 0 ? (
        <FlatList
          data={Object.keys(connections)}
          renderItem={renderConnectionItem}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.centered}>
          <Text>No connections found</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
  },
  listContainer: {
    paddingBottom: 20,
  },
  connectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  connectionStatus: {
    fontSize: 14,
    color: '#6B7280',
  },
  connectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  connectButton: {
    backgroundColor: '#10B981', // green
  },
  removeButton: {
    backgroundColor: '#EF4444', // red
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    margin: 16,
  },
});

export default ConnectionManager;