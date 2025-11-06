import * as ImagePicker from "expo-image-picker";
import { Camera, User, X } from "lucide-react-native";
import React, { useState } from "react";
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { Button, FormInput } from '../../../shared/ui';

const ProfileModal = ({
  visible,
  onClose,
  profileName,
  setProfileName,
  profileContact,
  setProfileContact,
  profileLocation,
  setProfileLocation,
  profileImage,
  setProfileImage,
  handleSaveProfile,
}) => {
  const [loading, setLoading] = useState(false);
  const [tempImageUri, setTempImageUri] = useState(null);

  const handleImageSelection = async (type) => {
    try {
      const isCamera = type === 'camera';
      const { status } = isCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          `Please grant ${isCamera ? 'camera' : 'camera roll'} permissions to ${isCamera ? 'take' : 'upload'} a profile picture.`
        );
        return;
      }

      const options = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result = isCamera 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        setTempImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error(`Error ${type === 'camera' ? 'taking photo' : 'picking image'}:`, error);
      Alert.alert("Error", `Failed to ${type === 'camera' ? 'take photo' : 'pick image'}`);
    }
  };

  const pickImage = () => handleImageSelection('gallery');
  const takePhoto = () => handleImageSelection('camera');

  const showImageOptions = () => {
    Alert.alert("Profile Picture", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    if (!profileName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    if (profileContact && profileContact.trim() && !/^[\d\s\-+()]+$/.test(profileContact.trim())) {
      Alert.alert("Error", "Please enter a valid contact number");
      return;
    }

    setLoading(true);
    try {
      await handleSaveProfile(tempImageUri);
      setTempImageUri(null);
    } catch (error) {
      console.error("ProfileModal save error:", error);
      Alert.alert("Error", error.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTempImageUri(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={profileModalStyles.topOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={profileModalStyles.topModalContent} activeOpacity={1}>
          <View style={profileModalStyles.modalHeader}>
            <Text style={profileModalStyles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              style={profileModalStyles.closeButton}
              onPress={handleCancel}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={profileModalStyles.modalBody}>
            {/* Profile Image Section */}
            <View style={profileModalStyles.imageSection}>
              <Text style={profileModalStyles.imageLabel}>Profile Picture</Text>
              <TouchableOpacity
                style={profileModalStyles.imageContainer}
                onPress={showImageOptions}
              >
                {tempImageUri || profileImage ? (
                  <Image
                    source={{ uri: tempImageUri || profileImage }}
                    style={profileModalStyles.profileImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={profileModalStyles.defaultImage}>
                    <User size={40} color="#db2777" />
                  </View>
                )}
                <View style={profileModalStyles.cameraIcon}>
                  <Camera size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            <FormInput
              label="Full Name"
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Enter your full name"
              autoCapitalize="words"
            />

            <FormInput
              label="Contact Number"
              value={profileContact}
              onChangeText={setProfileContact}
              placeholder="Enter your contact number"
              keyboardType="phone-pad"
            />

            <FormInput
  label="Location"
  value={profileLocation}
  onChangeText={setProfileLocation}
  placeholder="Enter your location"
  
/>
          </ScrollView>

          <View style={profileModalStyles.modalActions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleCancel}
              disabled={loading}
              style={{ width: 100 }}
            />
            <Button
              title="Save"
              variant="primary"
              onPress={handleSave}
              loading={loading}
              style={{ width: 100 }}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const profileModalStyles = {
  modalContainer: {
    flex: 1,
    marginBottom: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(107, 114, 128, 0.1)",
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  imageLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  imageContainer: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 60,
    overflow: "hidden",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 60,
  },
  defaultImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(219, 39, 119, 0.1)",
    borderWidth: 2,
    borderColor: "#db2777",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#db2777",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#1f2937",
    minHeight: 48,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 16,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  topModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '95%',
    maxWidth: 400,
    maxHeight: '80%',
  },
};

export default ProfileModal;