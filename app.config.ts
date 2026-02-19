import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "SmoothSailor",
  slug: "smooth-sailor",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: false,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  plugins: [
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "SmoothSailor uses your location to center the map and tag reports at your current position.",
      },
    ],
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.cmpeavlerjr72.smoothsailor",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "SmoothSailor uses your location to center the map and tag reports at your current position.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.cmpeavlerjr72.boatrideapp",
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
      },
    },
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
  },
  updates: {
    url: "https://u.expo.dev/0ce7b5c0-910a-4947-9243-3d1f0b1610bf",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    eas: {
      projectId: "0ce7b5c0-910a-4947-9243-3d1f0b1610bf",
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
});
