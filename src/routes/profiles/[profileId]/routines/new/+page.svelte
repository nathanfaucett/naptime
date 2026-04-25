<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import type { NoiseType, RoutineAction, RoutineActionType, Profile } from '$lib/models';
	import { createRoutine, getProfileById } from '$lib/storage';
	import { NapTimeAudioEngine } from '$lib/audio/engine';
	import type { NoiseGenerator } from '$lib/audio/engine';
	const state = $state({
		profile: null as Profile | null,
		profileId: '',
		error: '',
		routineName: '',
		steps: [] as RoutineAction[],
		newStepType: 'noise' as RoutineActionType,
		noiseType: 'white' as NoiseType,
		duration: 30,
		volume: 0.6,
		fade: 5,
		mediaId: 'song-123',
		loop: false,
		previewing: false
	});

	$effect(() => {
		if (!browser) {
			return;
		}

		state.profileId = page.params.profileId ?? '';
		const profile = getProfileById(state.profileId);
		if (!profile) {
			state.profile = null;
			state.error = 'Profile not found.';
			return;
		}
		state.profile = profile;
		state.error = '';
	});

	let previewEngine: NapTimeAudioEngine | null = null;
	let previewGenerator: NoiseGenerator | null = null;

	function stopPreview() {
		previewGenerator?.stop();
		previewGenerator = null;
		state.previewing = false;
	}

	function startPreview() {
		if (!browser) {
			return;
		}

		if (!previewEngine) {
			previewEngine = new NapTimeAudioEngine();
		}

		stopPreview();

		if (state.newStepType === 'noise') {
			previewGenerator = previewEngine.createNoiseGenerator(state.noiseType, state.volume);
		} else if (state.newStepType === 'media') {
			previewGenerator = previewEngine.createMediaPlayer(state.mediaId, state.volume);
		} else {
			return;
		}

		previewGenerator.start();
		state.previewing = true;
	}

	function togglePreview() {
		if (state.previewing) {
			stopPreview();
			return;
		}

		startPreview();
	}

	onDestroy(stopPreview);

	function addStep() {
		if (state.newStepType === 'noise') {
			state.steps.push({
				type: 'noise',
				noise: state.noiseType,
				volume: state.volume,
				duration: state.duration,
				fade: state.fade
			});
		} else if (state.newStepType === 'media') {
			state.steps.push({
				type: 'media',
				id: state.mediaId,
				loop: state.loop,
				volume: state.volume,
				fade: state.fade
			});
		} else {
			state.steps.push({
				type: 'wait',
				duration: state.duration
			});
		}
	}

	function removeStep(index: number) {
		state.steps.splice(index, 1);
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();

		if (!browser || !state.profile) {
			return;
		}

		if (!state.routineName.trim()) {
			state.error = 'Routine name is required.';
			return;
		}

		if (state.steps.length === 0) {
			state.error = 'Add at least one step.';
			return;
		}

		const routine = {
			id: `routine-${Date.now()}`,
			profileId: state.profileId,
			name: state.routineName,
			steps: state.steps,
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		await createRoutine(routine);
		await goto(`/profiles/${state.profileId}`);
	}

	const canSave = $derived(state.routineName.trim().length > 0 && state.steps.length > 0);
</script>

<section class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="space-y-6">
		<div class="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
			<h1 class="text-3xl font-semibold text-slate-900">New routine</h1>
			<p class="mt-2 text-sm text-slate-600">
				Create a nap routine for {state.profile?.name ?? 'this profile'}.
			</p>
		</div>

		{#if state.error}
			<div class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
				{state.error}
			</div>
		{/if}

		<form
			class="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
			onsubmit={handleSave}
		>
			<div>
				<label class="block text-sm font-medium text-slate-700" for="routine-name"
					>Routine name</label
				>
				<input
					id="routine-name"
					type="text"
					class="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
					bind:value={state.routineName}
					placeholder="Quiet nap sequence"
				/>
			</div>

			<section class="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block text-sm font-medium text-slate-700" for="step-type">Step type</label>
					<select
						id="step-type"
						class="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
						bind:value={state.newStepType}
					>
						<option value="noise">Noise</option>
						<option value="media">Media</option>
						<option value="wait">Wait</option>
					</select>
				</div>

				{#if state.newStepType === 'noise'}
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label class="block text-sm font-medium text-slate-700" for="noise-type"
								>Noise type</label
							>
							<select
								id="noise-type"
								class="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
								bind:value={state.noiseType}
							>
								<option value="white">White</option>
								<option value="pink">Pink</option>
								<option value="brown">Brown</option>
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700" for="noise-volume"
								>Volume</label
							>
							<input
								id="noise-volume"
								type="range"
								min="0"
								max="1"
								step="0.05"
								bind:value={state.volume}
								class="mt-2 w-full"
							/>
							<p class="mt-2 text-sm text-slate-600">{(state.volume * 100).toFixed(0)}%</p>
						</div>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label class="block text-sm font-medium text-slate-700" for="noise-duration"
								>Duration (seconds)</label
							>
							<input
								id="noise-duration"
								type="number"
								min="1"
								class="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
								bind:value={state.duration}
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700" for="noise-fade"
								>Fade (seconds)</label
							>
							<input
								type="number"
								min="0"
								class="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
								bind:value={state.fade}
							/>
						</div>
					</div>
				{:else if state.newStepType === 'media'}
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label class="block text-sm font-medium text-slate-700" for="media-id">Media ID</label
							>
							<input
								id="media-id"
								type="text"
								class="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
								bind:value={state.mediaId}
							/>
						</div>
						<div class="flex flex-col gap-3">
							<label class="block text-sm font-medium text-slate-700" for="media-loop">Loop</label>
							<label class="inline-flex items-center gap-2 text-sm text-slate-700" for="media-loop">
								<input id="media-loop" type="checkbox" bind:checked={state.loop} />
								Loop media
							</label>
						</div>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label class="block text-sm font-medium text-slate-700" for="media-volume"
								>Volume</label
							>
							<input
								id="media-volume"
								type="range"
								min="0"
								max="1"
								step="0.05"
								bind:value={state.volume}
								class="mt-2 w-full"
							/>
							<p class="mt-2 text-sm text-slate-600">{(state.volume * 100).toFixed(0)}%</p>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700" for="media-fade"
								>Fade (seconds)</label
							>
							<input
								id="media-fade"
								type="number"
								min="0"
								class="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
								bind:value={state.fade}
							/>
						</div>
					</div>
				{:else}
					<div>
						<label class="block text-sm font-medium text-slate-700" for="duration"
							>Duration (seconds)</label
						>
						<input
							id="duration"
							type="number"
							min="1"
							class="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
							bind:value={state.duration}
						/>
					</div>
				{/if}

				{#if state.newStepType !== 'wait'}
					<button
						type="button"
						onclick={togglePreview}
						class="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
					>
						{state.previewing ? 'Stop preview' : 'Preview'}
					</button>
				{/if}

				<button
					type="button"
					onclick={addStep}
					class="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
				>
					Add step
				</button>
			</section>

			{#if state.steps.length > 0}
				<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 class="text-lg font-semibold text-slate-900">Steps</h2>
					<div class="mt-4 space-y-4">
						{#each state.steps as step, index}
							<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex items-center justify-between gap-4">
									<div>
										<p class="font-semibold text-slate-900">{step.type}</p>
										<p class="text-sm text-slate-600">
											{#if step.type === 'noise'}
												Noise {step.noise} · {Math.round(step.volume * 100)}% · {step.duration}s
											{:else if step.type === 'media'}
												Media {step.id} · {step.loop ? 'loop' : 'one-time'}
											{:else}
												Wait {step.duration}s
											{/if}
										</p>
									</div>
									<button
										class="rounded-full border border-rose-500 px-3 py-1 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
										onclick={() => removeStep(index)}
									>
										Remove
									</button>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<a
					href={`/profiles/${state.profileId}`}
					class="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
				>
					Back to routines
				</a>
				<button
					type="submit"
					class="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
					disabled={!canSave}
				>
					Save routine
				</button>
			</div>
		</form>
	</div>
</section>
