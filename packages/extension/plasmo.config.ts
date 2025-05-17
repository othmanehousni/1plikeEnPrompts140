export default {
	manifest: {
		name: "Ask ED Token Extractor",
		version: "0.1.0",
		description: "Extracts your Ed token for use with Ask ED.",
		author: "1plikéEnPrompts140",
		content_scripts: [
			{
				matches: ["*://*.edstem.org/*", "http://localhost/*", "*://*.localhost/*", "*://*.ask-ed.ch/*", "*://ask-ed.ch/*"],
				js: ["src/content.ts"],
				run_at: "document_end"
			}
		]
	},
	// Prevent filenames starting with underscores
	build: {
		emptyOutDir: true,
		assetFileNames: "assets/[name].[hash][extname]",
		chunkFileNames: "chunks/[name].[hash].js",
	}
};
