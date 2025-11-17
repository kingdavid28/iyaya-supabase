import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { ModalWrapper } from '../../../shared/ui';
import KeyboardAvoidingWrapper from '../../../shared/ui/layout/KeyboardAvoidingWrapper';
import { Button } from "react-native-paper";

const ChildModal = ({
  visible = false,
  onClose = () => {},
  childName = "",
  setChildName = () => {},
  childAge = "",
  setChildAge = () => {},
  childAllergies = "",
  setChildAllergies = () => {},
  childNotes = "",
  setChildNotes = () => {},
  onSave = () => {},
  editing = false,
}) => {
  const handleSave = () => {
    if (!childName.trim()) {
      return; // Don't save if name is empty
    }
    onSave();
  };

  return (
    <ModalWrapper
      visible={visible}
      onClose={onClose}
      animationType="slide"
      style={styles.modalContent}
    >
      <KeyboardAvoidingWrapper>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.modalTitle}>
            {editing ? "Edit Child" : "Add Child"}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={childName}
              onChangeText={setChildName}
              placeholder="Enter child's name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={String(childAge)}
              onChangeText={(value) => {
                // Only allow numbers
                const numValue = value.replace(/[^0-9]/g, "");
                setChildAge(numValue);
              }}
              placeholder="Enter child's age"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Allergies (Optional)</Text>
            <TextInput
              style={styles.input}
              value={childAllergies}
              onChangeText={setChildAllergies}
              placeholder="Enter any allergies (e.g., Peanuts, Dairy)"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Special Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={childNotes}
              onChangeText={setChildNotes}
              placeholder="Enter any special notes, allergies, etc."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              contentStyle={styles.buttonContent}
              disabled={!childName.trim()}
            >
              {editing ? "Save Changes" : "Add Child"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingWrapper>
    </ModalWrapper>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "200%",
    minHeight: 400,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    color: "#111827",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    width: '100%',
    maxWidth: '100%',
  },
  textArea: {
    maxHeight: 50,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export default ChildModal;
