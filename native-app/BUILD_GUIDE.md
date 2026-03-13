# Honeycomb Native App Build Guide

## Overview
The native apps use **Capacitor v8** to wrap the Honeycomb web app in a native shell for both the Apple App Store and Google Play Store. The app loads from your live server (`honeycomb-sj2s.onrender.com`) so web updates deploy instantly without app store review.

## Prerequisites

### For Android (Google Play)
- **Android Studio** (latest version)
- **JDK 21+** (required by the Gradle config)
- **Google Play Developer Account** ($25 one-time fee)

### For iOS (App Store)
- **macOS** with **Xcode 15+**
- **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer Program** ($99/year)

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/Beehavedev/honeycomb-protocol.git
cd honeycomb-protocol
npm install
```

### 2. Build web assets and sync native projects
```bash
npm run build
npx cap sync
```

### 3. Build Android
```bash
npx cap open android
```
This opens the project in Android Studio. Then:
1. Wait for Gradle sync to complete
2. Go to **Build → Generate Signed Bundle / APK**
3. Create a keystore (save it securely — you need it for every update)
4. Select **Android App Bundle (.aab)** for Play Store
5. Build the release variant

### 4. Build iOS
```bash
npx cap open ios
```
This opens the `ios/App/App.xcworkspace` in Xcode. Then:
1. Select the **App** target
2. Set your **Team** in Signing & Capabilities
3. Set the **Bundle Identifier** to `social.honeycomb.app`
4. Select **Any iOS Device (arm64)** as the build target
5. Go to **Product → Archive**
6. Upload to App Store Connect via the Organizer

## App Store Submission

### Google Play Store
1. Go to [play.google.com/console](https://play.google.com/console)
2. Create a new app
3. Fill in the store listing (name: Honeycomb, category: Social / Finance)
4. Upload the `.aab` file from Android Studio
5. Complete the content rating questionnaire
6. Set up pricing (Free)
7. Submit for review

### Apple App Store
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create a new app with bundle ID `social.honeycomb.app`
3. Fill in the app information
4. Upload the build from Xcode
5. Add screenshots (6.7" iPhone, 6.5" iPhone, 12.9" iPad)
6. Submit for review

## App Icons

Replace the placeholder icons before submitting:

### Android
Place icons in `android/app/src/main/res/`:
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

### iOS
Replace icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Use a 1024x1024 source image
- Xcode will generate all required sizes

## Deep Linking (Optional)
To handle `honeycomb://` links, add to `capacitor.config.ts`:
```ts
plugins: {
  App: {
    appUrlScheme: 'honeycomb'
  }
}
```

## Updating the App
Since the app loads from the live server, most updates are instant. Only update the native shell when:
- You need new native plugins
- You want to change the splash screen or app icon
- Apple/Google requires SDK updates

To update:
```bash
npm run build
npx cap sync
npx cap open android  # or ios
# Build and upload new version
```

## Security Note
The app loads its UI from the remote server URL configured in `capacitor.config.ts`. This means web updates are instant, but it also means server security is critical — a server compromise would affect the native app. For maximum security, you can switch to bundled mode by removing the `server.url` from the Capacitor config and relying on the built web assets in `dist/public` instead (trade-off: every web update requires a new app store submission).

## Configuration
- **App ID**: `social.honeycomb.app`
- **Capacitor**: v8.x platform packages, v7.x CLI (upgrade CLI to v8 on Node 22+ for full alignment)
- **Server URL**: `https://honeycomb-sj2s.onrender.com`
- **Theme**: Dark (#0F0F23) with amber accent (#F59E0B)
- **iOS**: arm64, deployment target iOS 14.0
- **Android**: JDK 21, targetSdk per Gradle config
