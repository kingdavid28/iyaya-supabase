const isWeb = process.env.EXPO_PLATFORM === 'web';

const plugins = [
  "expo-secure-store",
  "expo-font"
];

// Only add Google Sign-In plugin for native builds
if (!isWeb) {
  plugins.push([
    "@react-native-google-signin/google-signin",
    {
      iosUrlScheme: "com.googleusercontent.apps.998196800470-mguo8sj1ke7iv604mo1qmuq2565dnhv9"
    }
  ]);
}

module.exports = {
  expo: {
    name: "iYaya",
    slug: "iyaya-caregiver-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.iyaya.app",
      jsEngine: "hermes"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/logo.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.iyaya.app",
      jsEngine: "hermes"
    },
    web: {
      favicon: "./assets/logo.png"
    },
    plugins,
    scheme: "iyaya-app",
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://myiyrmiiywwgismcpith.supabase.co",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || null,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "998196800470-k3los9p540onooj79g69q9urln8lqbn3.apps.googleusercontent.com",
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "998196800470-cng01lpqeq3ogq77mibb11psk1udedm8.apps.googleusercontent.com",
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "998196800470-mguo8sj1ke7iv604mo1qmuq2565dnhv9.apps.googleusercontent.com",
      eas: {
        projectId: "583f6598-db53-4667-af75-fdd1f8104fab"
      }
    }
  }
};