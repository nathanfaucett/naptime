import { createCollection, MemoryAdapter } from '@aicacia/db';
import type { Profile, Routine } from './models';

const PROFILE_STORAGE_KEY = 'naptime:profiles';
const ROUTINE_STORAGE_KEY = 'naptime:routines';

const defaultProfiles: Profile[] = [
	{
		id: 'profile-1',
		name: 'Ava',
		color: '#7c3aed',
		createdAt: Date.now(),
		updatedAt: Date.now()
	}
];

const defaultRoutines: Routine[] = [
	{
		id: 'routine-1',
		profileId: 'profile-1',
		name: 'Short nap sequence',
		createdAt: Date.now(),
		updatedAt: Date.now(),
		steps: [
			{ type: 'noise', noise: 'white', volume: 0.6, duration: 600, fade: 5 },
			{ type: 'media', id: 'song-123', loop: true, volume: 0.8 }
		]
	}
];

function readJsonArray<T>(key: string, fallback: T[]): T[] {
	if (typeof window === 'undefined') {
		return fallback;
	}

	try {
		const raw = window.localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T[]) : fallback;
	} catch {
		return fallback;
	}
}

function writeJsonArray<T>(key: string, docs: T[]): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage.setItem(key, JSON.stringify(docs));
	} catch {
		// ignore storage failures in first pass
	}
}

const profilesAdapter = new MemoryAdapter<Profile>(
	'id',
	readJsonArray(PROFILE_STORAGE_KEY, defaultProfiles)
);
const routinesAdapter = new MemoryAdapter<Routine>(
	'id',
	readJsonArray(ROUTINE_STORAGE_KEY, defaultRoutines)
);

export const profilesCollection = createCollection({
	id: 'profiles',
	source: profilesAdapter,
	keyField: 'id',
	keyOf: (profile) => profile.id
});

export const routinesCollection = createCollection({
	id: 'routines',
	source: routinesAdapter,
	keyField: 'id',
	keyOf: (routine) => routine.id
});

function persistProfiles(): void {
	writeJsonArray(PROFILE_STORAGE_KEY, profilesAdapter.getAllDocuments());
}

function persistRoutines(): void {
	writeJsonArray(ROUTINE_STORAGE_KEY, routinesAdapter.getAllDocuments());
}

export function getAllProfiles(): Profile[] {
	return profilesAdapter.getAllDocuments();
}

export function getProfileById(id: string): Profile | undefined {
	return profilesAdapter.getAllDocuments().find((profile) => profile.id === id);
}

export function getAllRoutines(): Routine[] {
	return routinesAdapter.getAllDocuments();
}

export function getRoutinesByProfile(profileId: string): Routine[] {
	return routinesAdapter.getAllDocuments().filter((routine) => routine.profileId === profileId);
}

export function getRoutineById(id: string): Routine | undefined {
	return routinesAdapter.getAllDocuments().find((routine) => routine.id === id);
}

export async function createProfile(profile: Profile): Promise<void> {
	await profilesCollection.create(profile);
	persistProfiles();
}

export async function updateProfile(id: string, changes: Partial<Profile>): Promise<void> {
	await profilesCollection.update(id, changes);
	persistProfiles();
}

export async function deleteProfile(id: string): Promise<void> {
	await profilesCollection.delete(id);
	persistProfiles();
}

export async function createRoutine(routine: Routine): Promise<void> {
	await routinesCollection.create(routine);
	persistRoutines();
}

export async function updateRoutine(id: string, changes: Partial<Routine>): Promise<void> {
	await routinesCollection.update(id, changes);
	persistRoutines();
}

export async function deleteRoutine(id: string): Promise<void> {
	await routinesCollection.delete(id);
	persistRoutines();
}
