import adapter from '@sveltejs/adapter-static';

// Read BASE_PATH from the environment (set by CI) and normalize it.
const basePath = process.env.BASE_PATH ? process.env.BASE_PATH.replace(/\/+$/g, '') : '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({ strict: false, fallback: 'index.html' }),
		// Ensure SvelteKit knows the base path when deployed to a subpath (e.g., GitHub Pages)
		paths: {
			base: basePath
		}
		,
		prerender: {
			// Some dynamic routes (e.g. `/profiles/routines/[routineId]`) are
			// intentionally not discoverable during the crawler. Don't fail the
			// build when such routes are marked prerenderable but not found.
			handleUnseenRoutes: 'ignore'
		}
	}
};

export default config;
