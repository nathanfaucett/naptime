export type NoiseType = 'white' | 'pink' | 'brown';
export type RoutineActionType = 'noise' | 'media' | 'wait';

export interface NoiseAction {
	type: 'noise';
	noise: NoiseType;
	volume: number;
	duration: number;
	fade?: number;
}

export interface MediaAction {
	type: 'media';
	id: string;
	loop?: boolean;
	volume?: number;
	fade?: number;
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
