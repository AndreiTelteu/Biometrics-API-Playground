# Privacy Policy — Biometric Playground

Last updated: 2025-08-09

## Summary

- This repository contains a demo React Native application that showcases biometric enrollment and validation flows.
- The demo app does not collect personal information nor transmit biometric data off the device by default.
- Any data handling beyond on-device processing happens only if you (a developer integrating this project) connect the app to your own backend or third-party services.

## Scope

This policy describes the data practices of the demo application included in this repository ("Biometric Playground", "the App") when used as provided, without custom backend integrations. If you ship a product built from this code, you must supply your own privacy policy that reflects your specific data flows, jurisdictions, and contractual obligations.

## Data we do not collect by default

- Biometric templates or raw biometric data (e.g., fingerprint images, face images) are never read by or accessible to this App.
- Personally identifiable information (PII) is not requested, stored, or transmitted by default.
- Location data is not collected.
- Advertising identifiers are not used.

## Data processed on your device

The App uses the biometric capabilities provided by your device operating system (for example, Android Keystore/StrongBox and iOS Secure Enclave via platform APIs). Typical operations include:

- Creating and storing cryptographic keys within the secure hardware-backed keystore/keychain.
- Performing biometric user presence/verification checks requested by the OS.
- Signing short, ephemeral challenges locally on the device when you explicitly trigger an enrollment or validation action.

No raw biometric data is accessible to this App; biometric matching is performed by the operating system. The App receives only pass/fail signals or cryptographic results provided by the OS APIs.

## Optional network communications (developer-configured)

Out of the box, the App does not send data over the network. If you connect the App to a backend (for example, through the EndpointConfiguration component and your own server), the App may transmit:

- A public key associated with the device-generated key pair.
- A signed challenge or assertion proving possession of the private key after a successful biometric verification.
- Minimal metadata necessary for request routing (such as a device-generated identifier or timestamp).

If you enable such communications, you are responsible for:

- Describing those data flows in your own privacy policy and notices.
- Using TLS (HTTPS) and modern security best practices.
- Applying appropriate legal bases (e.g., consent, legitimate interests) where required by applicable laws (GDPR, CCPA/CPRA, etc.).
- Honoring user rights requests and data retention limits as applicable to your deployment.

## Local logs and analytics

- The App may display local status logs on-screen solely to help you understand the demo flow. These logs are not transmitted by default.
- No third-party analytics SDKs are included by default. If you add analytics, you must document and govern them in your own policy.

## Data retention

- Cryptographic keys remain in the device keystore/keychain until you delete them via the App or uninstall the App.
- No server-side retention occurs unless you implement and operate a backend.

## Security

- On-device biometrics and key storage rely on platform security features (Android Keystore/StrongBox, iOS Secure Enclave).
- If you add a backend, use HTTPS, follow secure coding practices, and protect keys and challenges appropriately.

## Children’s privacy

This demo App is not directed to children and is intended for developer testing and evaluation. If you adapt it for consumer use that targets children, you must implement appropriate safeguards and update your own privacy disclosures accordingly.

## International transfers

The maintainers of this open-source repository do not operate any backend for this demo. If you deploy a backend, you are responsible for compliance with cross-border transfer requirements and for selecting appropriate transfer mechanisms where required.

## Your rights

As shipped, the demo App does not collect personal data. If you ship a product based on this code that does collect personal data, your users may have rights under laws such as GDPR or CCPA/CPRA. You must provide mechanisms to exercise those rights (e.g., access, deletion, correction) and reflect them in your own policy.

## Changes to this policy

We may update this document to clarify behaviors or reflect changes in the demo code. Material changes should be versioned in your distribution and documented in your own product privacy policy when you ship to end users.

## Contact

For questions about this repository’s demo privacy posture, open an issue in the project or contact the maintainer of your distribution. If you publish a product based on this code, replace this section with your contact details:

- Organization name
- Contact email
- Postal address (if required by your jurisdiction)

## Notice for integrators and distributors

- This repository is provided for demonstration purposes. The maintainers do not operate a production service for this App.
- If you fork, modify, or distribute this code, you are solely responsible for your own privacy policy, notices, and compliance with applicable laws.

## Definitions

- Biometric data: Personal data resulting from specific technical processing relating to the physical, physiological or behavioral characteristics of a natural person which allow or confirm the unique identification of that person.
- Cryptographic keys: Public/private key material generated on-device and stored using platform security mechanisms.