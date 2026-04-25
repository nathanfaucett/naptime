<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	const { children } = $props();

	const state = $state({
		navOpen: false
	});

	const profileId = $derived(page.params.profileId ?? '');
	const profilePath = $derived(profileId ? `/profiles/${profileId}` : '/');
	const hasProfile = $derived(profileId.length > 0);

	function toggleNav() {
		state.navOpen = !state.navOpen;
	}

	function closeNav() {
		state.navOpen = false;
	}

	function goBack() {
		if (typeof window === 'undefined') {
			return;
		}

		if (window.history.length > 1) {
			window.history.back();
			return;
		}

		window.location.href = '/';
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
	<div
		class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8"
	>
		<div class="flex flex-wrap items-center gap-3">
			<a href={resolve('/')} class="text-lg font-semibold text-slate-900">Nap Time</a>
			<div class="hidden items-center gap-2 sm:flex">
				<a
					href={resolve('/')}
					class="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
					>Home</a
				>
				{#if hasProfile}
					<a
						href={resolve(profilePath)}
						class="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
						>Profile</a
					>
					<a
						href={resolve(`${profilePath}/routines/new`)}
						class="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
						>New routine</a
					>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={goBack}
				class="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
			>
				Back
			</button>
			<button
				type="button"
				onclick={toggleNav}
				class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 sm:hidden"
			>
				<span class="sr-only">Toggle navigation</span>
				{state.navOpen ? '✕' : '☰'}
			</button>
		</div>
	</div>

	{#if state.navOpen}
		<div class="border-t border-slate-200 bg-white px-4 pb-4 sm:hidden">
			<div class="space-y-2 pt-3">
				{#if hasProfile}
					<a
						href={resolve(profilePath)}
						onclick={closeNav}
						class="block rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
					>
						Profile
					</a>
					<a
						href={resolve(`${profilePath}/routines/new`)}
						onclick={closeNav}
						class="block rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
					>
						New routine
					</a>
				{/if}
			</div>
		</div>
	{/if}
</header>

{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
