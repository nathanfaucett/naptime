export type MediaArtwork = { src: string; sizes?: string; type?: string };

export function setMediaSessionMetadata(meta: {
	title?: string;
	artist?: string;
	album?: string;
	artwork?: MediaArtwork[];
}) {
	if (!('mediaSession' in navigator)) return;
	try {
		// @ts-ignore - lib.dom.d.ts may not expose MediaMetadata in all TS targets
		navigator.mediaSession.metadata = new (window as any).MediaMetadata({
			title: meta.title || '',
			artist: meta.artist || '',
			album: meta.album || '',
			artwork: meta.artwork || []
		});
	} catch (e) {
		// ignore
	}
}

export function setMediaSessionPlaybackState(state: 'none' | 'paused' | 'playing') {
	if (!('mediaSession' in navigator)) return;
	try {
		// @ts-ignore
		navigator.mediaSession.playbackState = state;
	} catch (e) {
		// ignore
	}
}

export function registerMediaSessionHandlers(handlers: {
	play?: () => void;
	pause?: () => void;
	seekbackward?: (details?: any) => void;
	seekforward?: (details?: any) => void;
	previoustrack?: () => void;
	nexttrack?: () => void;
}) {
	if (!('mediaSession' in navigator)) return;
	const ms = (navigator as any).mediaSession;
	try {
		if (handlers.play) ms.setActionHandler('play', handlers.play);
		if (handlers.pause) ms.setActionHandler('pause', handlers.pause);
		if (handlers.seekbackward) ms.setActionHandler('seekbackward', handlers.seekbackward);
		if (handlers.seekforward) ms.setActionHandler('seekforward', handlers.seekforward);
		if (handlers.previoustrack) ms.setActionHandler('previoustrack', handlers.previoustrack);
		if (handlers.nexttrack) ms.setActionHandler('nexttrack', handlers.nexttrack);
	} catch (e) {
		// some browsers throw when handlers are not supported
	}
}
