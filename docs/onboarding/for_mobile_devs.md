# Onboarding Guide: Mobile Developer

Welcome! This guide is tailored for React Native and mobile platform engineers.

## Setup

Follow the [main onboarding guide](./README.md) first, then:

### iOS Development
```bash
# Install CocoaPods
sudo gem install cocoapods

# Setup iOS simulator
cd apps/contractor-app/ios
pod install
cd ../..

# Start development
cd apps/contractor-app
npm start    # Metro bundler
# In another terminal:
npm run ios  # Open iOS simulator
```

### Android Development
```bash
# Install Android SDK (via Android Studio)
# Set ANDROID_HOME environment variable
export ANDROID_HOME=~/Library/Android/SDK  # macOS
export ANDROID_HOME=~/Android/Sdk          # Linux

# Setup emulator
android avd  # Create virtual device

# Start development
cd apps/contractor-app
npm start    # Metro bundler
# In another terminal:
npm run android  # Open Android emulator
```

### Windows/React Native Windows (RNW)
Refer to [Windows Support Spike](../../spikes/windows/rnw-sample/README.md) for current status.

## Stack

- **Framework** — React Native 0.72+
- **Package Manager** — pnpm (workspaces)
- **State Management** — Redux / Context API (check app/src/store)
- **API Client** — Axios / Fetch (see @tfx/shared-auth)
- **Navigation** — React Navigation (or similar)
- **Testing** — Jest + Detox (E2E)

## File Structure

```
apps/contractor-app/
├── src/
│   ├── App.tsx              # Root component + observability
│   ├── screens/             # Screen components
│   ├── components/          # Reusable components
│   ├── services/            # API and utility services
│   ├── store/               # State management
│   ├── types/               # TypeScript interfaces
│   ├── hooks/               # Custom React hooks
│   └── styles/              # Shared styles/theme
├── e2e/                     # Detox E2E tests
├── ios/                     # iOS native code
├── android/                 # Android native code
├── app.json                 # App configuration
└── package.json
```

## Common Tasks

### Run Tests
```bash
# Unit tests
pnpm --filter @tfx/contractor-app test

# E2E tests (iOS)
pnpm --filter e2e-detox test:ios

# E2E tests (Android)
pnpm --filter e2e-detox test:android
```

### Debug

```bash
# Metro debug menu
# Shake device (cmd+D on iOS simulator, RR on Android emulator)
# Select "Debug" option

# Chrome DevTools
# Open http://localhost:8081/debugger-ui
```

### Native Modules

If you need native code:
1. Find native file: `ios/ContractorApp.xcodeproj/...`
2. Open in Xcode: `xed ios`
3. Make changes and rebuild

For Android, use Android Studio:
```bash
# Install Android Studio plugins for React Native
# Then open android/ folder in Android Studio
```

## Performance Tips

- **Minimize re-renders** — Use React.memo and useMemo
- **LazyLoad screens** — React Navigation code splitting
- **Optimize images** — Use appropriate sizes and formats
- **Avoid large state** — Keep Redux store normalized
- **Profile with DevTools** — React Native DevTools in Metro menu

## Deployment

See [Release Process](../guides/release_process.md) for:
- Building APKs/IPAs
- Fastlane automation
- App Store / Play Store submission
- Beta releases via Firebase Test Lab / App Center

## Useful Commands

```bash
# Clear Metro cache
pnpm run metro -- --reset-cache

# Rebuild native modules
cd apps/contractor-app
rm -rf ios/Pods
pod install  # iOS

# gradlew clean  # Android

# Run linter
pnpm --filter @tfx/contractor-app lint

# Format code
pnpm --filter @tfx/contractor-app format
```

## Troubleshooting

### Metro bundler hangs
```bash
# Clear cache and restart
pnpm run metro -- --reset-cache
# Kill Metro process and restart
lsof -i :8081
kill -9 <PID>
npm start
```

### Simulator doesn't recognize changes
```bash
# Full rebuild
cd apps/contractor-app
rm -rf node_modules
pnpm install
npm run ios  # or npm run android
```

### Native build fails
```bash
# iOS
cd ios
pod install --repo-update
xcodebuild clean -scheme ContractorApp

# Android
./gradlew clean
./gradlew build
```

## Resources

- [React Native Docs](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [Detox E2E](https://wix.github.io/Detox)
- [TypeScript + React Native](https://www.typescriptlang.org/docs/handbook/react.html)

---

Happy coding! Questions? Slack #tfx-hub-mobile
