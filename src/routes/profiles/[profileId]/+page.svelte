<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import type { Profile, Routine } from '$lib/models';
	import { getProfileById, getRoutinesByProfile, deleteRoutine } from '$lib/storage';

	const state = $state({
		profile: null as Profile | null,
		routines: [] as Routine[],
		profileId: '',
		error: ''
	});

	$effect(() => {
		if (!browser) {
			return;
		}

		state.profileId = page.params.profileId ?? '';
		const profile = getProfileById(state.profileId);

		if (!profile) {
			state.profile = null;
			state.routines = [];
			state.error = 'Profile not found.';
			return;
		}

		state.profile = profile;
		state.routines = getRoutinesByProfile(state.profileId);
		state.error = '';
	});

	async function handleDeleteRoutine(routineId: string) {
		await deleteRoutine(routineId);
		state.routines = getRoutinesByProfile(state.profileId);
	}

	const hasRoutines = $derived(state.routines.length > 0);
</script>

<section class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
	{#if state.profile}
		<div class="space-y-6">
			<div class="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 class="text-3xl font-semibold text-slate-900">{state.profile.name}</h1>
						<p class="mt-2 text-sm text-slate-600">
							Routines for {state.profile.name}. Add, edit, and run nap sequences.
						</p>
					</div>
					<a
						href={`/profiles/${state.profileId}/routines/new`}
						class="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
					>
						Create routine
					</a>
				</div>
			</div>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between gap-4">
					<h2 class="text-xl font-semibold text-slate-900">Routines</h2>
					<p class="text-sm text-slate-600">Manage routines for this profile.</p>
				</div>

				{#if !hasRoutines}
					<div
						class="mt-6 rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500"
					>
						<p class="text-sm">No routines yet. Start by creating a routine.</p>
					</div>
				{:else}
					<div class="mt-6 grid gap-4 sm:grid-cols-2">
						{#each state.routines as routine (routine.id)}
							<article class="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
								<div class="flex items-start justify-between gap-4">
									<div>
										<h3 class="text-lg font-semibold text-slate-900">{routine.name}</h3>
										<p class="mt-1 text-sm text-slate-600">{routine.steps.length} step(s)</p>
									</div>
									<div class="space-x-2">
										<button
											class="rounded-full bg-rose-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-rose-600"
											onclick={() => handleDeleteRoutine(routine.id)}
										>
											Delete
										</button>
									</div>
								</div>
								<p class="mt-4 text-sm text-slate-600">
									Created on {new Date(routine.createdAt).toLocaleDateString()}
								</p>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	{:else}
		<div
			class="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-sm"
		>
			<p>{state.error}</p>
			<a
				href="/"
				class="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
			>
				Back to home
			</a>
		</div>
	{/if}
</section>
