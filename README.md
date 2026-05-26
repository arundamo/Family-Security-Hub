# Family Security Hub

Family Security Hub, branded in the UI as **Howl**, is a real-time family safety coordination app built with React, Vite, Firebase, and Google Maps. It helps small trusted groups share live location, coordinate in chat, define safe zones, and trigger emergency SOS alerts.

## What the app does

- **Live family location tracking** with real-time updates
- **Circle-based coordination** using invite codes
- **Emergency SOS alerts** with message and last known position
- **Safe zone management** for home, school, work, and other geofences
- **Circle chat** for quick coordination
- **Sandbox mode** when Firebase or Maps credentials are unavailable

## Key user flows

1. Sign in with Google
2. Create a circle or join one with a 6-character invite code
3. Share location with the active circle
4. Monitor members on the map
5. Add safe zones and watch entry/exit status
6. Send chat updates
7. Trigger and resolve SOS alerts

## Tech stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **State management:** React Context
- **Auth + database:** Firebase Auth + Firestore
- **Maps:** `@vis.gl/react-google-maps`
- **Icons / motion:** `lucide-react`, `motion`

## Project structure

```text
src/
  App.tsx                            Main app shell and dashboard layout
  firebase.ts                        Firebase initialization and Firestore error handling
  types.ts                           Shared data types
  components/
    FamilyStateContext.tsx           Core app state, realtime listeners, sandbox simulation
    MapContainer.tsx                 Google Maps / simulated map rendering
    CircleManager.tsx                Create, join, switch, and leave circles
    MemberSection.tsx                Member list, diagnostics, admin actions
    ChatSection.tsx                  Circle chat UI
    SafeZoneSection.tsx              Safe zone creation and removal
firestore.rules                      Firestore access control rules
security_spec.md                     Security model and malicious payload matrix
firebase-blueprint.json              Firestore schema blueprint
firebase-applet-config.json          Firebase app configuration
```

## Runtime modes

### Connected mode

When valid Firebase configuration is available, the app uses:

- Google sign-in
- Firestore realtime listeners
- persistent circles, members, chats, SOS alerts, and safe zones

### Sandbox mode

If Firebase initialization fails or mock credentials are used, the app falls back to local simulation:

- mock family members
- localStorage-backed circles and state
- simulated movement and SOS controls
- no backend dependency

This makes the project easy to demo and easier for agents to work with safely.

## Local development

### Prerequisites

- Node.js 20+ recommended
- npm

### Install

```bash
npm ci
```

### Run

```bash
npm run dev
```

The Vite dev server runs on `http://0.0.0.0:3000`.

## Environment variables

Create a local env file if you need to override defaults:

```bash
cp .env.example .env.local
```

Available variables:

- `GEMINI_API_KEY`: Gemini API key for AI Studio integrations
- `APP_URL`: app base URL for hosted environments
- `GOOGLE_MAPS_PLATFORM_KEY`: optional Google Maps Platform key

If no valid Google Maps key is present, the app uses the built-in simulated map view.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run clean
```

### Validated commands

The repository currently validates successfully with:

- `npm run lint`
- `npm run build`

## Data model

Main Firestore paths:

- `users/{userId}`
- `circles/{circleId}`
- `circles/{circleId}/members/{memberId}`
- `circles/{circleId}/chats/{chatId}`
- `circles/{circleId}/sos/{sosId}`
- `circles/{circleId}/safezones/{zoneId}`

The schema details live in:

- `firebase-blueprint.json`
- `src/types.ts`

## Security model

This project already includes a strong Firestore security layer.

Highlights:

- default-deny Firestore rules
- circle membership gates access to circle subcollections
- identity spoofing protections
- role escalation protections
- timestamp validation against `request.time`
- field and ID validation

See:

- `firestore.rules`
- `security_spec.md`

## Architecture notes

`FamilyStateContext.tsx` is the operational core of the app. It handles:

- auth state
- realtime subscriptions
- active circle switching
- chat, SOS, and safe zone operations
- geolocation updates
- sandbox simulation state

`MapContainer.tsx` renders either:

- a Google Maps-backed experience when a valid key exists, or
- a simulated SVG map for demos and fallback use

## Agent readiness

This repository is now prepared for GitHub Copilot cloud agent workflows with:

- a detailed README covering setup and architecture
- deterministic dependency installation via `.github/workflows/copilot-setup-steps.yml`
- validation commands that are easy for agents to run (`npm run lint`, `npm run build`)
- a sandbox mode that lets agents explore the UX even without backend access

### Copilot cloud agent setup

The repository includes a `copilot-setup-steps` workflow that:

- checks out the repository
- installs Node.js 20
- caches npm dependencies
- runs `npm ci`

This reduces setup time and makes agent sessions more reliable.

## Known limitations

- No automated test suite is currently configured
- Production behavior depends on valid Firebase project access
- Google Maps features are limited without a platform key
- The production bundle is large enough to trigger Vite chunk-size warnings

## Suggested next improvements

- add unit and integration tests
- add CI for lint/build on pull requests
- split large UI/state files into smaller modules
- document deployment and Firebase environment provisioning

## License

Apache-2.0
