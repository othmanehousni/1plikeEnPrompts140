import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId) {
	console.error("CRITICAL: GOOGLE_CLIENT_ID environment variable is not set. Google authentication will likely fail.");
	// Consider throwing an error here if Google auth is essential for the app to function
	// throw new Error("Missing GOOGLE_CLIENT_ID");
}
if (!googleClientSecret) {
	console.error("CRITICAL: GOOGLE_CLIENT_SECRET environment variable is not set. Google authentication will likely fail.");
	// Consider throwing an error here
	// throw new Error("Missing GOOGLE_CLIENT_SECRET");
}

export const auth = betterAuth({
	user: {
		deleteUser: {
			enabled: true,
		}
	},
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	socialProviders: {
		google: {
			prompt: "select_account", 
			clientId: googleClientId as string,
			clientSecret: googleClientSecret as string,
			allowedDomains: ["epfl.ch"],
		},
	},
});

