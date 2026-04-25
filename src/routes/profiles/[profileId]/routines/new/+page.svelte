<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import type {
		NoiseType,
		NoiseTiming,
		MediaPlayback,
		RoutineAction,
		RoutineActionType,
		Profile
	} from '$lib/models';
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
		noiseTiming: 'timed' as NoiseTiming,
		duration: 30,
		volume: 0.6,
		mediaId: 'song-123',
		mediaPlayback: 'loop' as MediaPlayback,
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
	let previewType: RoutineActionType | null = null;
	let previewMode: string | null = null;
	let previewSource: string | null = null;
	let previewDuration = 0;
	let previewVolume: number | null = null;
	let previewTimeout: number | null = null;

	function clearPreviewTimeout() {
		if (previewTimeout !== null) {
			clearTimeout(previewTimeout);
			previewTimeout = null;
		}
	}

	function schedulePreviewStop() {
		clearPreviewTimeout();

		if (state.newStepType === 'noise' && state.noiseTiming === 'timed') {
			previewTimeout = window.setTimeout(stopPreview, state.duration * 1000);
			return;
		}

		if (state.newStepType === 'media' && state.mediaPlayback === 'timed') {
			previewTimeout = window.setTimeout(stopPreview, state.duration * 1000);
		}
	}

	function stopPreview() {
		previewGenerator?.stop();
		previewGenerator = null;
		previewType = null;
		previewMode = null;
		previewSource = null;
		previewDuration = 0;
		previewVolume = null;
		clearPreviewTimeout();
		state.previewing = false;
	}

	function createPreviewGenerator() {
		if (!browser) {
			return null;
		}

		if (!previewEngine) {
			previewEngine = new NapTimeAudioEngine();
		}

		if (state.newStepType === 'noise') {
			return previewEngine.createNoiseGenerator(state.noiseType, state.volume);
		}

		if (state.newStepType === 'media') {
			return previewEngine.createMediaPlayer(
				state.mediaId,
				state.volume,
				state.mediaPlayback === 'loop'
			);
		}

		return null;
	}

	function startPreview() {
		if (!browser) {
			return;
		}

		stopPreview();

		previewGenerator = createPreviewGenerator();
		if (!previewGenerator) {
			return;
		}

		previewGenerator.start();
		previewType = state.newStepType;
		previewMode =
			state.newStepType === 'noise'
				? state.noiseTiming
				: state.newStepType === 'media'
					? state.mediaPlayback
					: null;
		previewSource =
			state.newStepType === 'noise'
				? state.noiseType
				: state.newStepType === 'media'
					? state.mediaId
					: null;
		previewDuration = previewMode === 'timed' ? state.duration : 0;
		previewVolume = state.volume;
		schedulePreviewStop();
		state.previewing = true;
	}

	$effect(() => {
		if (!state.previewing || !browser) {
			return;
		}

		if (state.newStepType === 'wait') {
			stopPreview();
			return;
		}

		const currentMode =
			state.newStepType === 'noise'
				? state.noiseTiming
				: state.newStepType === 'media'
					? state.mediaPlayback
					: null;
		const currentSource =
			state.newStepType === 'noise'
				? state.noiseType
				: state.newStepType === 'media'
					? state.mediaId
					: null;
		const currentDuration = currentMode === 'timed' ? state.duration : 0;
		const currentVolume = state.volume;

		if (
			!previewGenerator ||
			state.newStepType !== previewType ||
			currentMode !== previewMode ||
			currentSource !== previewSource ||
			currentDuration !== previewDuration
		) {
			stopPreview();
			previewGenerator = createPreviewGenerator();
			if (previewGenerator) {
				previewGenerator.start();
				previewType = state.newStepType;
				previewMode = currentMode;
				previewSource = currentSource;
				previewDuration = currentDuration;
				previewVolume = currentVolume;
				schedulePreviewStop();
			}
			return;
		}

		if (previewGenerator && previewVolume !== null && currentVolume !== previewVolume) {
			previewGenerator.setVolume(currentVolume);
			previewVolume = currentVolume;
		}
	});

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
				timing: state.noiseTiming,
				duration: state.noiseTiming === 'timed' ? state.duration : undefined
			});
		} else if (state.newStepType === 'media') {
			state.steps.push({
				type: 'media',
				id: state.mediaId,
				playback: state.mediaPlayback,
				volume: state.volume,
				duration: state.mediaPlayback === 'timed' ? state.duration : undefined
			});
		} else {
			state.steps.push({
				type: 'wait',
				duration: state.duration
			});
		}
	}

	async function handleSave(event: SubmitEvent) {
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

	function removeStep(index: number) {
		state.steps.splice(index, 1);
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
							<label class="block text-sm font-medium text-slate-700" for="noise-timing"
								>Timing</label
							>
							<select
								id="noise-timing"
								class="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
								bind:value={state.noiseTiming}
							>
								<option value="timed">Timed</option>
								<option value="forever">Forever</option>
							</select>
						</div>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
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
					{#if state.noiseTiming === 'timed'}
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
						</div>
					{/if}
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
						<div>
							<label class="block text-sm font-medium text-slate-700" for="media-playback"
								>Playback</label
							>
							<select
								id="media-playback"
								class="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
								bind:value={state.mediaPlayback}
							>
								<option value="loop">Loop</option>
								<option value="till-end">Till end</option>
								<option value="timed">Timed</option>
							</select>
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
					</div>
					{#if state.mediaPlayback === 'timed'}
						<div class="grid gap-3 sm:grid-cols-2">
							<div>
								<label class="block text-sm font-medium text-slate-700" for="media-duration"
									>Duration (seconds)</label
								>
								<input
									id="media-duration"
									type="number"
									min="1"
									class="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
									bind:value={state.duration}
								/>
							</div>
						</div>
					{/if}
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
												Noise {step.noise} · {Math.round(step.volume * 100)}% · {step.timing ===
												'forever'
													? 'forever'
													: `${step.duration}s`}
											{:else if step.type === 'media'}
												{#if step.playback === 'loop'}
													Media {step.id} · loop
												{:else if step.playback === 'till-end'}
													Media {step.id} · till end
												{:else}
													Media {step.id} · timed {step.duration}s
												{/if}
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
