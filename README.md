# Biometric Playground

## Google Play Store description

### Short description
Test and learn Android biometrics: enroll, verify, and manage keys.

### Full description
Biometric Playground is an open‑source demo app that helps developers and curious users explore Android's BiometricPrompt and Keystore‑backed public‑key authentication. Enroll a key with your device biometrics, validate with a secure challenge, inspect status logs, and clean up keys — all in one place.

### Highlights
- Enroll: Create a device‑protected key pair (Android Keystore) gated by biometrics or device credentials.
- Validate: Use BiometricPrompt to authenticate and sign a server‑provided challenge.
- Delete keys: Remove previously enrolled keys from secure storage.
- Configure endpoint: Point the app at your own demo API to test real challenge/response flows.
- Inspect logs: See step‑by‑step status messages for each action.
- Works offline for local‑only flows (enroll, delete, basic validation against a static challenge).

### How it works
- The app generates a hardware‑backed key pair (where available) and stores it in the Android Keystore.
- When validating, the app prompts for biometrics and signs a challenge. If you configure a server endpoint, the public key and signatures are sent to that server for verification.
- No raw biometric data ever leaves your device — only cryptographic material and metadata needed to perform verification.

### Privacy and data
- No ads. No analytics. No tracking.
- Biometric templates never leave the device; the OS handles them.
- Keys live in the Android Keystore and can be deleted at any time from within the app.
- If you use a custom server, only the public key and signed challenges are transmitted.

### Permissions
- Uses the system BiometricPrompt. No special runtime permissions are required beyond enabling biometrics or device credentials on your device.

### Requirements
- Android 8.1 (API 27) or higher recommended for BiometricPrompt.
- A device with fingerprint, face, or device credential enabled.

### Open source
This app is open source. Clone the repo to inspect the code, run tests, or adapt it to your needs.

## Changelog

### 1.0.0 — Initial release
- First public demo of biometric enrollment and validation flows.
- Endpoint configuration for challenge/response verification.
- Status log UI and error reporting.
- Key deletion and recovery handling.
- Basic tests and documentation.