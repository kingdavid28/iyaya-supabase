export default {
  expo: {
    name: "iYaya",
    slug: "iyaya-caregiver-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.iyaya.app",
      jsEngine: "hermes",
      associatedDomains: [
        "applinks:iyaya-app.page.link"
      ],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icona.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.iyaya.app",
      jsEngine: "hermes",
      usesCleartextTraffic: true, // Allow HTTP traffic (for development/debugging)
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/iconaa.png"
    },
    plugins: [
      "expo-secure-store",
      "expo-font"
    ],
    scheme: "com.iyaya.app",
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? null,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null,
      eas: {
        projectId: "583f6598-db53-4667-af75-fdd1f8104fab"
      }
    }
  }
};