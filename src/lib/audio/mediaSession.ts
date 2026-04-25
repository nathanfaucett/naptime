export type MediaArtwork = { src: string; sizes?: string; type?: string };

export function setMediaSessionMetadata(meta: {
	title?: string;
	artist?: string;
	album?: string;
	artwork?: MediaArtwork[];
}) {
	if (!('mediaSession' in navigator)) return;
	try {
		// @ts-expect-error TS does not expose MediaMetadata in this target
		const MediaMetadataClass = (
			window as unknown as { MediaMetadata?: new (init?: unknown) => unknown }
		).MediaMetadata;
		if (MediaMetadataClass) {
			navigator.mediaSession.metadata = new MediaMetadataClass({
				title: meta.title || '',
				artist: meta.artist || '',
				album: meta.album || '',
				artwork: meta.artwork || []
			});
		}
	} catch (_e) {
		void _e;
	}
}

export function setMediaSessionPlaybackState(state: 'none' | 'paused' | 'playing') {
	if (!('mediaSession' in navigator)) return;
	try {
		// @ts-expect-error TS does not expose playbackState in this target
		navigator.mediaSession.playbackState = state;
	} catch (_e) {
		void _e;
	}
}

export function registerMediaSessionHandlers(handlers: {
	play?: () => void;
	pause?: () => void;
	seekbackward?: (details?: MediaSessionActionDetails) => void;
	seekforward?: (details?: MediaSessionActionDetails) => void;
	previoustrack?: () => void;
	nexttrack?: () => void;
}) {
	if (!('mediaSession' in navigator)) return;
	const ms = (
		navigator as unknown as {
			mediaSession: {
				setActionHandler: (type: string, handler: (...args: unknown[]) => void) => void;
			};
		}
	).mediaSession;
	try {
		if (handlers.play) ms.setActionHandler('play', handlers.play);
		if (handlers.pause) ms.setActionHandler('pause', handlers.pause);
		if (handlers.seekbackward) ms.setActionHandler('seekbackward', handlers.seekbackward);
		if (handlers.seekforward) ms.setActionHandler('seekforward', handlers.seekforward);
		if (handlers.previoustrack) ms.setActionHandler('previoustrack', handlers.previoustrack);
		if (handlers.nexttrack) ms.setActionHandler('nexttrack', handlers.nexttrack);
	} catch (_e) {
		void _e;
	}
}
