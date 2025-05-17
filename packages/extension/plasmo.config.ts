export default {
	manifest: {
		name: "ED File Finder",
		version: "0.1.0",
		description: "A better Ed Search chrome extension.",
		author: "1plikéEnPrompts140",
	},
	// Prevent filenames starting with underscores
	build: {
		emptyOutDir: true,
		assetFileNames: "assets/[name].[hash][extname]",
		chunkFileNames: "chunks/[name].[hash].js",
	}
};
