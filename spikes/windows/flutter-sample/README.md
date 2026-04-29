# Flutter Spike

Purpose:
- Validate Windows support using Flutter (single codebase for mobile + desktop).
- Build a minimal screen and measure developer productivity and Windows parity.

Prerequisites (Windows dev machine):
- Flutter SDK (stable channel)
- Visual Studio 2022 with "Desktop development with C++"
- Windows 10/11 SDK

Quick steps (on Windows machine):
1. From repo root:
   cd spikes/windows/flutter-sample
   # Create a new Flutter app (if you want a fresh sample)
   flutter create --platforms=windows flutter_spike
   cd flutter_spike
2. Run the app on Windows:
   flutter run -d windows
3. Build release:
   flutter build windows

Notes:
- Flutter uses Dart; migrating shared JS/TS logic requires rewrite or bridging.
- Document UI parity, plugin availability, and packaging complexity in docs/windows_spike_report.md.
