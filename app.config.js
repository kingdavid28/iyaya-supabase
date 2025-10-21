export default {
  expo: {
    name: "iYaya",
    slug: "iyaya-supabase",
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
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "fb1976692839796722"
            ]
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
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "fb1976692839796722"
            }
          ],
          category: [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-secure-store",
      "expo-font",
      [
        "expo-facebook",
        {
          appId: "1976692839796722",
          scheme: "fb1976692839796722"
        }
      ]
    ],
    scheme: "com.iyaya.app",
    facebookScheme: "fb1976692839796722",
    facebookAppId: "1976692839796722",
    facebookDisplayName: "iYaya",
    extra: {
      eas: {
        projectId: "583f6598-db53-4667-af75-fdd1f8104fab"
      }
    }
  }
};