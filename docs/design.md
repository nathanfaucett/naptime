# Nap Time App

Short, local-first PWA that helps parents manage nap time using noise generation and playlists. Designed for offline reliability, low power, and simple routine automation.

## Goals

- Provide reliable background audio with accurate timers (offline-first).
- Make routine creation simple: chains of timed audio and noise actions.
- Protect privacy: keep data local by default.
- Ship a tiny, responsive PWA for mobile devices.

## Key features

- Multiple profiles (children) with per-profile settings and routines.
- Routines composed of ordered actions (play media, start noise, wait, crossfade, stop).
- Built-in noise generators: white, pink, brown; adjustable volume and fade.
- Upload and manage custom songs/playlists (stored locally).
- Triggers: on end, after duration, at schedule time; conditionals (optional).
- Background playback and strict low-power behavior for mobile.

## Routine model

A routine is an ordered list of actions. Each action is an object with a type and params. Example:

```json
{
	"id": "routine-1",
	"name": "Short nap sequence",
	"steps": [
		{ "type": "noise", "noise": "white", "volume": 0.6, "duration": 600 },
		{ "type": "media", "id": "song-123", "loop": true }
	]
}
```

Action types include:

- `noise` — start a noise generator (`white`|`pink`|`brown`) with volume/fade/duration.
- `media` — play an uploaded or bundled audio track with optional loop/fade.

Transitions:

- All transitions between actions use `crossfade`.
- `media` actions default to transitioning to the next step on end unless looping, with optional loop duration.

## UX notes

- Quick-create routine flow: pick profile → add step → preview → save.
- Provide sensible defaults (e.g., 30m noise) and one-tap "start now".
- Preview mode to simulate the routine without persisting timers.
- Accessibility: controls reachable by screen readers; large tappable controls.
- Guidance for quiet wake-ups and safe volume defaults.

## Tech

- Frontend: Svelte (existing project) as a responsive PWA.
- Audio: Web Audio API for noise generation, crossfades, and precise scheduling.
- Data: Local-first using `@aicacia/db` MemoryAdapter (see ../libs/db/github-pages).
- Storage: IndexedDB (or the MemoryAdapter) for metadata; File System API for user-uploaded audio.
- Background: Use Service Worker + Media Session API for consistent background playback and lockscreen controls.

## Non-functional requirements

- Offline-first: core playback and timers work without network.
- Low power & reliable: avoid busy loops; leverage Web Audio scheduling.
- Privacy: user data stays local unless opt-in sync is added later.

## Acceptance criteria (Minimal Version)

- Create/edit/delete profiles.
- Create routines composed of noise/media/timer actions.
- Play noise generators and uploaded songs; supports loop and fades.
- Routine triggers (on-end, duration) function while app in background.
- Uploaded songs persist locally and are selectable in routines.

## Pages (Minimal Version)

1. **Home/Dashboard**
   - List of profiles with quick access to their routines.
   - "Start Routine" button for each profile.
   - Add new profile button.

2. **Profile Management**
   - Create, edit, and delete profiles.

3. **Routine List**
   - View routines for a selected profile.
   - Create, edit, and delete routines.

4. **Routine Editor**
   - Add actions (noise, media, wait, etc.).
   - Configure action parameters (e.g., noise type, duration, volume).
   - Save or discard changes.

5. **Routine Player**
   - Play and control routines.
   - Playback controls (play, pause, stop).
   - Skip to next/previous step.

## Next steps

1. Define runtime routine schema and implement the audio engine.
2. Add UI screens: Profiles list, Routine editor, Player controls.
3. Wire local data storage using `@aicacia/db` MemoryAdapter.
4. Add tests for scheduling accuracy and background playback behavior.
