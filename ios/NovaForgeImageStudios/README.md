# NovaForge Image Studios for iOS

Native SwiftUI client for the NovaForge Image Studios orchestration core.

## Included in v0.1

- Studio workflow for prompts, presets, output requirements and provider preferences.
- PhotosPicker reference import into protected app storage.
- Explicit identity/face/pose/composition/object roles with hard or soft locks.
- Local-only, remote-redacted and remote-allowed privacy modes.
- Human-readable final request review before execution.
- Device-owner authentication before generation, cost decisions, connection changes, project deletion and cache deletion.
- API tokens stored only in Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`.
- Local project and job persistence with iOS complete-file protection.
- Forward-only job status, cost-approval controls and honest provider-retention display.
- Adaptive native layouts for iPhone and iPad, Dynamic Type, VoiceOver labels and dark cosmic styling.

## Requirements

- Xcode 15.4 or newer.
- iOS 17 or newer.
- A configured NovaForge Core endpoint for generation. The app remains useful offline for building and saving request contracts.

Open `NovaForgeImageStudios.xcodeproj`, select the `NovaForgeImageStudios` scheme, then run on a simulator or device.
Simulator builds need no signing. For a physical iPhone or iPad, select the app target and choose an Apple development team before running.

## Security boundary

- Remote endpoints must use HTTPS and a Keychain bearer token. Plain HTTP and tokenless development are accepted only for `localhost`, `127.0.0.1`, or `::1`.
- Provider API keys do not belong in this app. The optional NovaForge bearer token is stored in Keychain.
- Reference files are addressed in requests by `novaforge-asset://` opaque IDs; local filesystem paths are never serialized into generation payloads.
- Reference media upload remains a trusted NovaForge Core integration responsibility. The current core API accepts generation contracts but does not yet expose an asset-ingestion endpoint.
- Certificate pinning should be enabled only after the production NovaForge Core hostname and rotation pins are fixed. ATS remains strict meanwhile.
- A provider marked mandatory cannot silently fall back. Over-budget jobs pause for a separate owner approval.
- Deleting a local cache never claims to delete a remote provider copy.

## Verification

```bash
xcodebuild \
  -project NovaForgeImageStudios.xcodeproj \
  -scheme NovaForgeImageStudios \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  CODE_SIGNING_ALLOWED=NO \
  clean test
```

Unit tests cover request/lock compilation, path redaction, endpoint security, API behaviour, persisted lock/date fidelity, and the rule that settings never persist an API-token field.
