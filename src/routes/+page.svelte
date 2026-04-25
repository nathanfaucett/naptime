<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import type { Profile } from '$lib/models';
	import { createProfile, deleteProfile, getAllProfiles } from '$lib/storage';
	import { setActiveProfileId } from '$lib/activeProfile';

	const state = $state({
		profiles: [] as Profile[],
		newProfileName: '',
		error: ''
	});

	if (browser) {
		state.profiles = getAllProfiles();
	}

	const canCreate = $derived(state.newProfileName.trim().length > 0);

	async function handleAddProfile(event: SubmitEvent) {
		event.preventDefault();

		const name = state.newProfileName.trim();
		if (!name) {
			state.error = 'Name is required.';
			return;
		}

		state.error = '';

		const profile: Profile = {
			id: `profile-${Date.now()}`,
			name,
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		await createProfile(profile);
		state.profiles = getAllProfiles();
		state.newProfileName = '';
	}

	async function handleDeleteProfile(profileId: string) {
		await deleteProfile(profileId);
		state.profiles = getAllProfiles();
	}
</script>

<section class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="space-y-8">
		<div class="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
			<h1 class="text-3xl font-semibold text-slate-900">Nap Time</h1>
			<p class="mt-2 max-w-2xl text-sm text-slate-600">
				Create profiles and routines for quiet nap time, then launch a sequence of noise and media
				actions.
			</p>
		</div>

		<div class="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
			<div class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex items-center justify-between gap-4">
						<div>
							<h2 class="text-xl font-semibold text-slate-900">Profiles</h2>
							<p class="mt-1 text-sm text-slate-600">Manage children and their nap routines.</p>
						</div>
					</div>

					{#if state.profiles.length === 0}
						<div
							class="mt-6 rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500"
						>
							<p class="text-sm">No profiles yet. Add one to get started.</p>
						</div>
					{:else}
						<div class="mt-6 grid gap-4 sm:grid-cols-2">
							{#each state.profiles as profile (profile.id)}
								<article class="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
									<div class="flex items-center justify-between gap-4">
										<div>
											<h3 class="text-lg font-semibold text-slate-900">{profile.name}</h3>
											<p class="text-sm text-slate-600">
												Created on {new Date(profile.createdAt).toLocaleDateString()}
											</p>
										</div>
										<div class="flex flex-wrap items-center gap-2">
											<a
												href={resolve('/profiles')}
												onclick={() => setActiveProfileId(profile.id)}
												class="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
											>
												View routines
											</a>
											<a
												href={resolve('/profiles/routines/new')}
												onclick={() => setActiveProfileId(profile.id)}
												class="rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-slate-800"
											>
												New routine
											</a>
											<button
												class="rounded-full bg-rose-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-rose-600"
												onclick={() => handleDeleteProfile(profile.id)}
											>
												Delete
											</button>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</div>

			<aside class="space-y-6">
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 class="text-xl font-semibold text-slate-900">Add a profile</h2>
					<p class="mt-1 text-sm text-slate-600">
						A profile lets you group routines per child or nap plan.
					</p>

					<form class="mt-6 space-y-4" onsubmit={handleAddProfile}>
						<div>
							<label class="block text-sm font-medium text-slate-700" for="profile-name"
								>Profile name</label
							>
							<input
								id="profile-name"
								type="text"
								class="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
								bind:value={state.newProfileName}
								placeholder="Ava, Ben, Charlie"
							/>
						</div>

						{#if state.error}
							<p class="text-sm font-medium text-rose-600">{state.error}</p>
						{/if}

						<button
							type="submit"
							class="inline-flex w-full items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
							disabled={!canCreate}
						>
							Add profile
						</button>
					</form>
				</section>
			</aside>
		</div>
	</div>
</section>
