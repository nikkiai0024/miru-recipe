// Expo CLIが.envを自動的に読み込む（dotenv不要）
// EASビルド時はEAS SecretsのYOUTUBE_API_KEYを使用

module.exports = {
  expo: {
    name: "ミルレシピ",
    slug: "miru-recipe",
    version: "1.0.7",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "mirurecipe",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#FFF8F0",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mirurecipe.app",
      buildNumber: "14",
      privacyPolicyUrl: "https://nikki-apps.com/mirurecipe/privacy.html",
      marketingUrl: "https://nikki-apps.com/mirurecipe/",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#FF6B35",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      package: "com.mirurecipe.app",
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    extra: {
      // 環境変数から読み込む（.envまたはEAS Secrets）
      youtubeApiKey: process.env.YOUTUBE_API_KEY || "",
      appSecret: process.env.APP_SECRET || "",
      sentryDsn: process.env.SENTRY_DSN || "",
      eas: {
        projectId: "eea450bd-aaf6-4ccb-801b-882b9a185429",
      },
    },
    plugins: [
      "expo-router",
      "expo-sharing",
      "expo-font",
      "expo-iap",
      "expo-secure-store",
      [
        "@sentry/react-native/expo",
        {
          organization: "takahiro-onishi",
          project: "react-native",
        },
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-1198964108696763~9247723338",
          iosAppId: "ca-app-pub-1198964108696763~1772220628",
        },
      ],
    ],
  },
};
