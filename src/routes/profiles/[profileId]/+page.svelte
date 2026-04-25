<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { setActiveProfileId } from '$lib/activeProfile';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	onMount(() => {
		const id = get(page).params.profileId ?? '';
		if (id) {
			setActiveProfileId(id);
		}
		// redirect to the new canonical, paramless profile page
		goto(resolve('/profiles'));
	});
</script>

<p>Redirecting…</p>
