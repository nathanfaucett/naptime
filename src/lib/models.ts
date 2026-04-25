export type NoiseType = 'white' | 'pink' | 'brown';
export type RoutineActionType = 'noise' | 'media' | 'wait';
export type NoiseTiming = 'forever' | 'timed';
export type MediaPlayback = 'loop' | 'till-end' | 'timed';

export interface NoiseAction {
	type: 'noise';
	noise: NoiseType;
	volume: number;
	timing: NoiseTiming;
	duration?: number;
}

export interface MediaAction {
	type: 'media';
	id: string;
	playback: MediaPlayback;
	volume?: number;
	duration?: number;
}

export interface WaitAction {
	type: 'wait';
	duration: number;
}

export type RoutineAction = NoiseAction | MediaAction | WaitAction;

export interface Routine {
	id: string;
	profileId: string;
	name: string;
	steps: RoutineAction[];
	createdAt: number;
	updatedAt: number;
}

export interface Profile {
	id: string;
	name: string;
	color?: string;
	createdAt: number;
	updatedAt: number;
}
