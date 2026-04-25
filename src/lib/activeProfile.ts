import { writable, get } from 'svelte/store';

const ACTIVE_PROFILE_KEY = 'naptime:activeProfile';

function readInitial(): string {
	if (typeof window === 'undefined') return '';
	try {
		return window.localStorage.getItem(ACTIVE_PROFILE_KEY) ?? '';
	} catch {
		return '';
	}
}

export const activeProfileId = writable<string>(readInitial());

// Default: persist via localStorage. If `runed`'s persisted-state rune is available
// we'll wire it up and stop using the manual localStorage persistence below.
let useRuned = false;

// localStorage backup persistence (removed once runed is active)
const localSub = activeProfileId.subscribe((value) => {
	if (useRuned) return;
	if (typeof window === 'undefined') return;
	try {
		if (!value) window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
		else window.localStorage.setItem(ACTIVE_PROFILE_KEY, value);
	} catch {
		// ignore storage failures
	}
});

// Try to wire up runed's persisted-state rune if available at runtime.
(async () => {
	try {
		// dynamic import so build won't fail if runed isn't installed yet
		const mod: any = await import('runed');

		// detect a persisted-state factory among likely export names
		const persistedFactory =
			mod?.persistedState ||
			mod?.persist ||
			mod?.persisted ||
			mod?.usePersistedState ||
			mod?.persisted_store;

		if (typeof persistedFactory === 'function') {
			// call factory with the same key and initial value; many runtimes
			// return a store-like object with `subscribe` and `set`.
			const externalStore: any = persistedFactory(ACTIVE_PROFILE_KEY, readInitial());

			if (externalStore && typeof externalStore.subscribe === 'function') {
				useRuned = true;
				// stop localStorage subscriber to avoid duplicate writes
				try {
					localSub();
				} catch {
					// ignore
				}

				// keep track of last seen external value to avoid echo loops
				let lastExternal: any = undefined;

				externalStore.subscribe((v: any) => {
					lastExternal = v ?? '';
					// update our svelte store if different
					if (get(activeProfileId) !== (v ?? '')) {
						activeProfileId.set(v ?? '');
					}
				});

				// propagate changes from our svelte store to external store
				activeProfileId.subscribe((v) => {
					const next = v ?? '';
					if (!useRuned) return; // if runed got disabled somehow
					if (typeof externalStore.set === 'function') {
						if (lastExternal !== next) {
							try {
								externalStore.set(next);
								lastExternal = next;
							} catch {
								// ignore
							}
						}
					}
				});
			}
		}
	} catch {
		// runed not available — silently keep localStorage fallback
	}
})();

export function setActiveProfileId(id: string | null) {
	activeProfileId.set(id ?? '');
}

export function getActiveProfileId(): string {
	return get(activeProfileId) ?? '';
}

export const ACTIVE_PROFILE_KEY_CONST = ACTIVE_PROFILE_KEY;
