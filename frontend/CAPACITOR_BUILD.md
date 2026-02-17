# Capacitor Native App — Build & Distribution Guide

## Architecture Overview

The Invitees app uses **Capacitor** to wrap the existing React/Vite frontend as a native mobile app.

**Mode: Live Server** — The native app loads the production web server URL directly inside a native WebView shell. This means:
- All relative `/api` paths work as-is (same-origin — no CORS changes)
- All session cookies work as-is (no SameSite changes)
- Frontend updates deploy instantly — just deploy the web app, no app store re-publish needed
- Native plugins (status bar, back button, splash screen, keyboard) make it feel native
- Requires network connectivity

---

## Prerequisites

### Android (can build on Windows)
- **Android Studio** (latest) — https://developer.android.com/studio
- **JDK 17+** (bundled with Android Studio)
- **Android SDK** (API 34+, installed via Android Studio SDK Manager)

### iOS (requires macOS)
- **Xcode 15+** — from Mac App Store
- **CocoaPods** — `sudo gem install cocoapods`
- **Apple Developer Account** ($99/year) — for TestFlight / App Store distribution

---

## Quick Start

### 1. Build the frontend
```bash
cd frontend
npm run build
```

### 2. Sync native projects
```bash
npx cap sync
```

### 3. Open in IDE
```bash
# Android
npx cap open android    # Opens Android Studio

# iOS (Mac only)
npx cap open ios        # Opens Xcode
```

---

## Configuration

### Server URL (capacitor.config.ts)

Edit `capacitor.config.ts` and set your production URL:

```ts
server: {
  url: 'https://your-actual-domain.com',  // ← Replace with your production URL
  cleartext: true,  // Set to false if using HTTPS only (recommended for production)
},
```

**After changing the config**, run `npx cap sync` to push changes to native projects.

### App ID

The app ID is `com.cairowest.invitees`. To change it:
1. Update `appId` in `capacitor.config.ts`
2. Update `applicationId` in `android/app/build.gradle`
3. Rename the Java package directory in `android/app/src/main/java/`
4. Run `npx cap sync`

---

## Android Build

### Debug APK (for testing)

1. Open Android Studio: `npx cap open android`
2. Wait for Gradle sync to complete
3. **Build > Build Bundle(s) / APK(s) > Build APK(s)**
4. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

Or from command line:
```bash
cd android
./gradlew assembleDebug
```

### Release APK/AAB (for distribution)

#### Step 1: Create a signing keystore (one-time)
```bash
keytool -genkey -v -keystore invitees-release.keystore -alias invitees -keyalg RSA -keysize 2048 -validity 10000
```
- **Store this keystore file safely** — you need it for every future update
- Remember the password and alias

#### Step 2: Configure signing in Android Studio
1. Open `android/` in Android Studio
2. **Build > Generate Signed Bundle / APK**
3. Select **APK** or **Android App Bundle (AAB)**
   - APK: for direct distribution / sideloading
   - AAB: required for Google Play Store
4. Select your keystore, enter password and alias
5. Select **release** build variant
6. Click **Create**

#### Step 3: Or configure signing in build.gradle (automated)

Add to `android/app/build.gradle`:
```groovy
android {
    signingConfigs {
        release {
            storeFile file('../../invitees-release.keystore')
            storePassword 'YOUR_STORE_PASSWORD'
            keyAlias 'invitees'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

Then build from command line:
```bash
cd android
./gradlew assembleRelease    # APK
./gradlew bundleRelease      # AAB for Play Store
```

---

## Google Play Protect — Avoiding Warnings

When users sideload an APK (install from outside Play Store), Google Play Protect may show a warning: "Blocked by Play Protect" or "Unknown app".

### Solutions (pick one):

#### Option A: Publish to Google Play Internal Testing (recommended for orgs)
1. Create a Google Play Developer account ($25 one-time fee)
2. Create a new app in Google Play Console
3. Upload your signed AAB to **Internal Testing** track
4. Add your team's email addresses as testers
5. Users install from Play Store — **no Play Protect warnings**

#### Option B: Google Play Managed (for enterprise/MDM)
- If your organization uses Google Workspace with device management
- Deploy the app via Managed Google Play
- No Play Protect warnings, fully controlled

#### Option C: Sideload with user approval
- Users can tap "Install anyway" when Play Protect warns
- Not ideal but works for small internal teams

### Key: Proper Signing
- **Always sign release APKs** with your keystore (not debug)
- Use the same keystore for all future updates
- Signed releases get fewer Play Protect warnings

---

## iOS Build

> **Requires a Mac with Xcode installed**

### TestFlight Distribution (recommended)

1. **Open Xcode**: `npx cap open ios`
2. **Set Team**: In Xcode, select the project > Signing & Capabilities > select your Apple Developer Team
3. **Set Bundle ID**: Should match `com.cairowest.invitees`
4. **Archive**: Product > Archive
5. **Distribute**: Window > Organizer > select archive > Distribute App > App Store Connect
6. **TestFlight**: In App Store Connect, add internal testers by email
7. Users download TestFlight app from App Store, then install your app

### Ad-Hoc Distribution
- Register device UDIDs in Apple Developer portal
- Create provisioning profile
- Build and export IPA
- Distribute via email, MDM, or web link

### Apple App Store (if needed later)
- Fill out app metadata, screenshots, privacy policy
- Submit for review (Apple reviews all apps, even internal ones on the public store)

---

## App Icons

The app uses the existing PWA icons from `public/icons/`. To generate proper native icons:

### Android
Replace files in `android/app/src/main/res/mipmap-*` directories:
- `mipmap-mdpi/`: 48×48
- `mipmap-hdpi/`: 72×72
- `mipmap-xhdpi/`: 96×96
- `mipmap-xxhdpi/`: 144×144
- `mipmap-xxxhdpi/`: 192×192

Use Android Studio's **Image Asset Studio**: right-click `res` > New > Image Asset

### iOS
Replace `ios/App/App/Assets.xcassets/AppIcon.appiconset/` contents.
Use Xcode's Asset Catalog editor.

### Recommended tool
Use https://icon.kitchen or https://www.appicon.co to generate all sizes from your 512×512 icon.

---

## Splash Screen

The splash screen is configured in `capacitor.config.ts`:
```ts
plugins: {
  SplashScreen: {
    launchShowDuration: 1500,
    backgroundColor: '#0f172a',
    showSpinner: true,
    spinnerColor: '#818cf8',
  }
}
```

The Android splash screen uses `android/app/src/main/res/drawable/splash.xml`.
The iOS splash screen uses the Xcode LaunchScreen storyboard.

For a custom splash image, replace the respective platform files.

---

## Updating the App

### Web-only changes (most common)
Since the app uses Live Server mode, just deploy the web app to your server:
```bash
npm run build
# Copy dist/ to your IIS server as usual
```
The native app will load the updated version on next open. **No app store update needed.**

### Native changes (rare — only if plugins/config change)
```bash
npm run build
npx cap sync
# Then rebuild in Android Studio / Xcode
```

---

## Version Management

Before each native release, update version in `android/app/build.gradle`:
```groovy
defaultConfig {
    versionCode 2        // Increment for every release (integer)
    versionName "1.1"    // Human-readable version
}
```

For iOS, update in Xcode: target > General > Version and Build.

---

## Troubleshooting

### App shows blank white screen
- Check `server.url` in `capacitor.config.ts` — is the URL correct and reachable?
- Run `npx cap sync` after any config change
- Check Android Logcat / Xcode console for errors

### Cookies/sessions not working
- Live Server mode: cookies work same-origin, no issues
- If you switch to embedded mode: update backend CORS and cookie SameSite settings

### Android build fails with Gradle error
- File > Sync Project with Gradle Files in Android Studio
- Check SDK version matches `variables.gradle`

### Play Protect blocks installation
- Sign the APK with a release keystore (not debug)
- Publish to Google Play Internal Testing for zero warnings

---

## File Structure

```
frontend/
├── capacitor.config.ts          # Capacitor configuration
├── android/                     # Android native project
│   └── app/
│       ├── build.gradle         # Android build config + signing
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── res/             # Icons, splash, colors
│           └── assets/public/   # Web assets (auto-synced)
├── ios/                         # iOS native project (build on Mac)
│   └── App/
│       └── App/
│           ├── public/          # Web assets (auto-synced)
│           └── Assets.xcassets/ # Icons
└── src/
    └── utils/
        └── capacitor.ts         # Native platform utilities
```
