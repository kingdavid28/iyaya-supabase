import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';

export const Toast = ({ visible, message, type = 'success', onHide, duration = 2000 }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer;
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        timer = setTimeout(() => {
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
            onHide && onHide();
          });
        }, duration);
      });
    }
    return () => timer && clearTimeout(timer);
  }, [visible, duration, onHide, opacity]);

  if (!visible) return null;

  const bg = type === 'error' ? '#ef4444' : type === 'info' ? '#2563eb' : '#10b981';

  return (
    <Animated.View style={[styles.container, { opacity }]}> 
      <View style={[styles.toast, { backgroundColor: bg }]}> 
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    color: 'white',
    fontWeight: '600',
  },
});

export default Toast;
