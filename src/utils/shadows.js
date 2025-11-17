import { Platform } from "react-native"

// Cross-platform shadow utility
export const createShadow = (elevation = 2) => {
  if (Platform.OS === "web") {
    // Use boxShadow for web
    const shadowOpacity = Math.min(elevation * 0.05, 0.3)
    const shadowRadius = elevation * 2
    const shadowOffset = elevation

    return {
      boxShadow: `0px ${shadowOffset}px ${shadowRadius}px rgba(0, 0, 0, ${shadowOpacity})`,
    }
  } else {
    // Use React Native shadow properties for mobile
    return {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: elevation,
      },
      shadowOpacity: Math.min(elevation * 0.05, 0.3),
      shadowRadius: elevation * 2,
      elevation: elevation, // Android elevation
    }
  }
}

// Predefined shadow styles
export const shadows = {
  none: Platform.OS === "web" ? { boxShadow: "none" } : { elevation: 0 },
  small: createShadow(2),
  medium: createShadow(4),
  large: createShadow(8),
  xl: createShadow(12),
}

// Helper function to remove any existing shadow properties
export const removeShadows = {
  shadowColor: undefined,
  shadowOffset: undefined,
  shadowOpacity: undefined,
  shadowRadius: undefined,
  elevation: undefined,
  boxShadow: Platform.OS === "web" ? "none" : undefined,
}
