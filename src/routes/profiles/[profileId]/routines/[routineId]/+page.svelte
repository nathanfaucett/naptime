<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import type { Profile, Routine, RoutineAction } from '$lib/models';
	import { getProfileById, getRoutineById } from '$lib/storage';
	import { getMediaItemById } from '$lib/media';
	import { NapTimeAudioEngine } from '$lib/audio/engine';
	import type { NoiseGenerator } from '$lib/audio/engine';

	const state = $state({
		profile: null as Profile | null,
		routine: null as Routine | null,
		profileId: '',
		routineId: '',
		error: '',
		status: 'idle' as 'idle' | 'running' | 'completed',
		currentStepIndex: 0,
		currentStepLabel: ''
	});

	let engine: NapTimeAudioEngine | null = null;
	let currentGenerator: NoiseGenerator | null = null;
	let stepTimer: number | null = null;

	function clearStepTimer() {
		if (stepTimer !== null) {
			clearTimeout(stepTimer);
			stepTimer = null;
		}
	}

	function stopCurrentGenerator() {
		currentGenerator?.stop();
		currentGenerator = null;
	}

	function getStepLabel(step: RoutineAction) {
		if (step.type === 'noise') {
			const duration = step.timing === 'timed' ? ` · ${step.duration ?? 0}s` : '';
			return `Noise ${step.noise} · ${Math.round((step.volume ?? 0.5) * 100)}%${duration}`;
		}

		const media = getMediaItemById(step.id);
		const title = media ? media.title : step.id;
		return `Media ${title} · ${step.playback}`;
	}

	function resolveMediaSource(id: string) {
		const media = getMediaItemById(id);
		if (media) {
			return media.src;
		}

		if (
			id.startsWith('http://') ||
			id.startsWith('https://') ||
			id.startsWith('/') ||
			id.startsWith('./')
		) {
			return id;
		}

		return null;
	}

	async function scheduleStep(index: number) {
		if (!browser || !state.routine) {
			return;
		}

		const step = state.routine.steps[index];
		if (!step) {
			state.status = 'completed';
			return;
		}

		state.currentStepIndex = index;
		state.currentStepLabel = getStepLabel(step);
		state.status = 'running';

		if (!engine) {
			engine = new NapTimeAudioEngine();
		}

		stopCurrentGenerator();
		clearStepTimer();

		if (step.type === 'noise') {
			currentGenerator = engine.createNoiseGenerator(step.noise, step.volume ?? 0.5);
			await currentGenerator.start();

			if (step.timing === 'timed' && step.duration && step.duration > 0) {
				stepTimer = window.setTimeout(() => scheduleStep(index + 1), step.duration * 1000);
			}
			return;
		}

		const source = resolveMediaSource(step.id);
		if (!source) {
			state.error = 'No media source available for this routine step.';
			state.status = 'idle';
			return;
		}

		currentGenerator = engine.createMediaPlayer(
			source,
			step.volume ?? 0.5,
			step.playback === 'loop'
		);
		currentGenerator.setEndedCallback?.(() => {
			if (step.playback === 'till-end') {
				scheduleStep(index + 1);
			}
		});
		await currentGenerator.start();

		if (step.playback === 'timed' && step.duration && step.duration > 0) {
			stepTimer = window.setTimeout(() => scheduleStep(index + 1), step.duration * 1000);
		}
	}

	function stopRoutine() {
		clearStepTimer();
		stopCurrentGenerator();
		state.status = 'idle';
		state.currentStepIndex = 0;
		state.currentStepLabel = '';
	}

	function startRoutine() {
		if (!browser || !state.routine) {
			return;
		}

		state.error = '';
		state.currentStepIndex = 0;
		scheduleStep(0);
	}

	$effect(() => {
		if (!browser) {
			return;
		}

		state.profileId = page.params.profileId ?? '';
		state.routineId = page.params.routineId ?? '';

		const profile = getProfileById(state.profileId);
		const routine = getRoutineById(state.routineId);

		if (!profile) {
			state.profile = null;
			state.routine = null;
			state.error = 'Profile not found.';
			return;
		}

		if (!routine) {
			state.profile = profile;
			state.routine = null;
			state.error = 'Routine not found.';
			return;
		}

		state.profile = profile;
		state.routine = routine;
		state.error = '';
	});

	onDestroy(() => {
		stopRoutine();
	});
</script>

<section class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
	{#if state.error}
		<div
			class="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-sm"
		>
			<p>{state.error}</p>
			<a
				href={`/profiles/${state.profileId}`}
				class="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
			>
				Back to routines
			</a>
		</div>
	{:else if !state.profile || !state.routine}
		<div
			class="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600 shadow-sm"
		>
			<p>Loading routine...</p>
		</div>
	{:else}
		<div class="space-y-6">
			<div class="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 class="text-3xl font-semibold text-slate-900">{state.routine.name}</h1>
						<p class="mt-2 text-sm text-slate-600">
							Running routine for {state.profile.name}.
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<button
							type="button"
							onclick={startRoutine}
							class="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
						>
							Start
						</button>
						<button
							type="button"
							onclick={stopRoutine}
							class="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
						>
							Stop
						</button>
						<a
							href={`/profiles/${state.profileId}`}
							class="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
						>
							Back to routines
						</a>
					</div>
				</div>
			</div>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between gap-4">
					<div>
						<h2 class="text-xl font-semibold text-slate-900">Routine status</h2>
						<p class="mt-1 text-sm text-slate-600">
							Current step and progress for your running routine.
						</p>
					</div>
					<span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
						{state.status === 'running'
							? 'Running'
							: state.status === 'completed'
								? 'Completed'
								: 'Idle'}
					</span>
				</div>

				<div class="mt-6 space-y-4">
					<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-sm text-slate-600">Current step</p>
						<p class="mt-2 text-base font-medium text-slate-900">
							{state.currentStepLabel || 'No step started yet.'}
						</p>
					</div>

					<div>
						<h3 class="text-sm font-semibold text-slate-900">Step list</h3>
						<ul class="mt-3 space-y-2">
							{#each state.routine.steps as step, index}
								<li
									class="rounded-3xl border px-4 py-3 text-sm text-slate-700"
									class:text-slate-900={index === state.currentStepIndex}
								>
									<span class="font-medium">Step {index + 1}:</span>
									{getStepLabel(step)}
									{#if index === state.currentStepIndex}
										<span
											class="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
										>
											current
										</span>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</section>
		</div>
	{/if}
</section>
