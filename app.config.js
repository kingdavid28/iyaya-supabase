export default ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    name: "iYaya",
    slug: "iyaya-caregiver-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
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
      jsEngine: "hermes",
      associatedDomains: [
        "applinks:iyaya-app.page.link"
      ],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLName: "iyaya-app",
            CFBundleURLSchemes: ["iyaya-app"]
          },
          {
            CFBundleURLName: "google-signin",
            CFBundleURLSchemes: ["com.googleusercontent.apps.998196800470-mguo8sj1ke7iv604mo1qmuq2565dnhv9"]
          }
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.iyaya.app",
      jsEngine: "hermes",
      usesCleartextTraffic: true,
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ],
      intentFilters: [
        {
          action: "VIEW",
          category: ["DEFAULT", "BROWSABLE"],
          data: { scheme: "iyaya-app" }
        }
      ]
    },
    web: {
      favicon: "./assets/iconaa.png"
    },
    plugins: [
      "expo-secure-store",
      "expo-font",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.998196800470-mguo8sj1ke7iv604mo1qmuq2565dnhv9"
        }
      ]
    ],
    scheme: "iyaya-app",
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://myiyrmiiywwgismcpith.supabase.co",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "998196800470-k3los9p540onooj79g69q9urln8lqbn3.apps.googleusercontent.com",
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "998196800470-cng01lpqeq3ogq77mibb11psk1udedm8.apps.googleusercontent.com",
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "998196800470-mguo8sj1ke7iv604mo1qmuq2565dnhv9.apps.googleusercontent.com",
      eas: {
        projectId: "583f6598-db53-4667-af75-fdd1f8104fab"
      }
    }
  }
});