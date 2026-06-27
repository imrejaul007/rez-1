// Dynamic Expo config — imports brand constants for easy rebranding
// Deployment-specific identifiers (slug, bundleIdentifier, package, merchantIdentifier)
// are left hardcoded — they require manual store/infra changes to rebrand.

const fs = require('fs');
const path = require('path');

const BRAND_NAME = 'Rez';

// Firebase plugin requires google-services.json (Android) / GoogleService-Info.plist (iOS).
// Skip plugin when missing to prevent instant crash on app launch.
const hasFirebaseAndroid = fs.existsSync(path.join(__dirname, 'google-services.json'));
const hasFirebaseIos = fs.existsSync(path.join(__dirname, 'GoogleService-Info.plist'));
const hasFirebaseConfig = hasFirebaseAndroid || hasFirebaseIos;

module.exports = {
  expo: {
    name: BRAND_NAME,
    slug: 'rez', // App store identifier
    version: process.env.APP_VERSION || '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'rez', // Deep link scheme
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    notification: {
      vapidPublicKey: process.env.EXPO_PUBLIC_VAPID_KEY,
      serviceWorkerPath: '/expo-service-worker.js',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.rez.app', // App Store identifier
      buildNumber: process.env.BUILD_NUMBER || '1',
      infoPlist: {
        NSCameraUsageDescription: `${BRAND_NAME} needs camera access to scan QR codes for store payments`,
        NSLocationWhenInUseUsageDescription: `${BRAND_NAME} needs your location to show nearby stores and offers`,
        NSPhotoLibraryUsageDescription: `${BRAND_NAME} needs photo access to upload profile pictures and bills`,
        NSLocationAlwaysAndWhenInUseUsageDescription: `${BRAND_NAME} needs your location to show nearby stores and offers`,
        NSMicrophoneUsageDescription: `${BRAND_NAME} needs microphone access for video features`,
        NSPhotoLibraryAddUsageDescription: `${BRAND_NAME} needs permission to save media to your photo library`,
      },
    },
    android: {
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#1a3a52',
      },
      edgeToEdgeEnabled: false,
      package: 'com.rez.app', // Play Store identifier
      versionCode: parseInt(process.env.VERSION_CODE || '1'),
      permissions: [
        'android.permission.CAMERA',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.VIBRATE',
        'android.permission.RECORD_AUDIO',
        'android.permission.POST_NOTIFICATIONS',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#1a3a52',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: `Allow ${BRAND_NAME} to use your camera for QR code scanning`,
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: `Allow ${BRAND_NAME} to use your location to find nearby stores and offers`,
        },
      ],
      // expo-notifications requires Firebase/FCM on Android — skip when google-services.json missing
      ...(hasFirebaseConfig
        ? [
            [
              'expo-notifications',
              {
                color: '#1a3a52',
              },
            ],
          ]
        : []),
      [
        'expo-image-picker',
        {
          photosPermission: `Allow ${BRAND_NAME} to access your photos for profile pictures and bill uploads`,
        },
      ],
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.rez.app', // Stripe config
          enableGooglePay: true,
        },
      ],
      // Firebase plugin — only apply when google-services.json exists (prevents Android crash)
      ...(hasFirebaseConfig
        ? [
            [
              '@react-native-firebase/app',
              {
                android: { googleServicesFile: './google-services.json' },
                ios: { googleServicesFile: './GoogleService-Info.plist' },
              },
            ],
          ]
        : []),
    ],
    experiments: {
      // typedRoutes regenerates .expo/types/router.d.ts on every config load,
      // and Metro's file watcher treated each regeneration as a source change,
      // driving an infinite rebundle cycle that OOM'd at 10 GB on this project.
      // Re-enable locally (set typedRoutes: true) once the OOM is resolved.
      typedRoutes: false,
    },
    extra: {
      eas: {
        projectId: '58b80355-a254-4d4a-80ce-d2bc3272b144',
      },
      router: {
        origin: false,
      },
      // -------------------------------------------------------------------------
      // B-feature namespace (REZ → Nuqta migration, see REZ_MIGRATION_PLAN.md).
      //
      // This block is purely informational: the runtime reads feature flags
      // from `subscriptionStore.featureFlags` (Zustand) and never from
      // `Constants.expoConfig.extra`. We keep these defaults here so the build
      // config and the runtime stay in sync and so deep-link tooling can
      // discover the `/b/...` namespace without importing JS.
      // -------------------------------------------------------------------------
      bFeatures: {
        defaultsAllOn: true,
        enableDevMenu: true,
        deepLinkScheme: 'rez://b',
      },
    },
  },
};
