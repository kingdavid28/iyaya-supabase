import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

const ModalWrapper = ({ visible, onClose, children, animationType = 'slide', style }) => (
  <Modal visible={visible} animationType={animationType} transparent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.content, style]}>
        {children}
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
});

export default ModalWrapper;