import { createDb } from "@ask-ed/shared";
import type { AppConfig } from "@ask-ed/shared";

// Initialize the database client
export const db = createDb();

// Store app configuration in Chrome storage
export const saveConfig = async (config: AppConfig): Promise<void> => {
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.local.set({ appConfig: config }, () => {
				resolve();
			});
		} catch (error) {
			reject(error);
		}
	});
};

// Get app configuration from Chrome storage
export const getConfig = async (): Promise<AppConfig | null> => {
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.local.get(["appConfig"], (result) => {
				resolve(
					result.appConfig || {
						theme: "system",
						language: "en",
					},
				);
			});
		} catch (error) {
			reject(error);
		}
	});
};
