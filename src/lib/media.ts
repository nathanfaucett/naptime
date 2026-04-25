export interface MediaItem {
	id: string;
	title: string;
	src: string;
}

export const mediaLibrary: MediaItem[] = [
	{
		id: 'song-123',
		title: 'Sample melody',
		src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3'
	}
];

export function getMediaItemById(id: string): MediaItem | undefined {
	return mediaLibrary.find((item) => item.id === id);
}
