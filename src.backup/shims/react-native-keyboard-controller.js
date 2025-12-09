// Expo Go shim for react-native-keyboard-controller
// Provides no-op implementations to allow bundling on Expo Go.
import React from "react";
import { View } from "react-native";

export const KeyboardProvider = ({ children }) => children;

export const KeyboardController = {
  setInputMode: () => {},
  setNavigationBarColor: () => {},
  setDefaultMode: () => {},
};

export const KeyboardToolbar = ({ children }) => <View>{children}</View>;
export const KeyboardAvoidingView = ({ children, style }) => (
  <View style={style}>{children}</View>
);
export const useKeyboard = () => ({
  height: 0,
  state: "unknown",
  visible: false,
  animation: {
    height: 0,
    progress: 0,
  },
});

export default {
  KeyboardProvider,
  KeyboardController,
  KeyboardToolbar,
  KeyboardAvoidingView,
  useKeyboard,
};
