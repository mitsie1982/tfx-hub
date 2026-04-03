# Release Automation and Secrets

This document explains the CI release automation placeholders and required secrets.

## Required CI secrets (GitHub Actions repository secrets)

- ANDROID_KEYSTORE_BASE64  (base64-encoded keystore file)
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD
- FASTLANE_USER
- MATCH_PASSWORD
- FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD
- MSIX_SIGNING_CERT_BASE64 (optional for Windows packaging)
- MSIX_SIGNING_CERT_PASSWORD
- TFX_ADMIN_USERNAME
- TFX_ADMIN_EMAIL
- TFX_ADMIN_PASSWORD

## Required admin runtime entries

Admin access now depends on three runtime values in every deployed environment:

1. `TFX_ADMIN_USERNAME`
2. `TFX_ADMIN_EMAIL`
3. `TFX_ADMIN_PASSWORD`

Use `TFX_ADMIN_USERNAME` as the admin sign-in username. Use `TFX_ADMIN_EMAIL` as the contact email address and `TFX_ADMIN_PASSWORD` as the admin password value.

Admin WhatsApp access remains disabled, and admin browser/mobile access is enforced only during 08:00-17:00 Africa/Johannesburg.

## How to create ANDROID_KEYSTORE_BASE64

1. Encode your keystore:
   base64 my-release-key.jks | pbcopy
2. Add the base64 string to GitHub Secrets as ANDROID_KEYSTORE_BASE64.

## iOS signing

- Use Fastlane match or App Store Connect API to manage provisioning profiles and certificates.
- Store credentials in GitHub Secrets and configure Fastlane lanes to use them.

## Windows signing

- Use a code signing certificate and store it as MSIX_SIGNING_CERT_BASE64.
- Use a self-hosted Windows runner with Visual Studio for MSIX packaging if required.

## Notes

- Never commit keystore files or certificates to the repository.
- Replace placeholder Fastlane lanes with your real build and upload steps.
