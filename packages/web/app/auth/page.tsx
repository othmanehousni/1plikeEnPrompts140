"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Loading component for the auth page
const AuthPageLoader = () => (
	<div className="flex h-screen w-screen items-center justify-center">
		<div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
	</div>
);

export default function AuthPage() {
	const router = useRouter();
	const { toasts, error: showError, dismiss } = useToast();
	const [mounted, setMounted] = useState<boolean>(false);
	const { isAuthenticated, isLoading: authLoading } = useAuth();

	useEffect(() => {
		setMounted(true);
	}, []);

	// Redirect to main app if already authenticated (only after auth check is complete)
	useEffect(() => {
		if (!authLoading && isAuthenticated) {
			router.push('/');
		}
	}, [authLoading, isAuthenticated, router]);

	const handleGoogleSignIn = async () => {
		try {
			await authClient.signIn.social({
				provider: "google"
			});
		} catch (error) {
			console.error("Google sign-in failed:", error);
			showError("Authentication failed. Please try again.");
		}
	};

	if (authLoading) {
		return <AuthPageLoader />;
	}

	// If already authenticated, redirect is handled in useEffect
	if (isAuthenticated) {
		return <AuthPageLoader />;
	}

	return (
		<>
			{/* App title - Top Left */}
			<div className="fixed top-4 left-4 flex flex-col gap-2 z-50">
				<div className="text-4xl font-bold text-primary dark:text-primary tracking-tight hover:opacity-80 transition-opacity cursor-default font-title-rounded">
					AskED
				</div>
			</div>

			{/* Theme Toggle Button - Top Right */}
			<div className="fixed top-4 right-4 z-50">
				<ThemeToggle />
			</div>

			{/* Main authentication content */}
			<div className="flex h-screen items-center justify-center">
				<div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg shadow-md bg-card max-w-md animate-in fade-in duration-700">
					<h2 className="text-2xl font-semibold mb-3">Authentication Required</h2>
					<div className="text-muted-foreground mb-2">
						You must sign in with your EPFL Google account to use AskED.
					</div>
					<div className="text-muted-foreground font-medium mb-6">
						Only email addresses with <span className="text-primary">.epfl.ch</span> domain are allowed.
					</div>
					<Button 
						onClick={handleGoogleSignIn} 
						variant="default" 
						className="w-full max-w-xs flex items-center justify-center gap-2"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 186.69 190.5" aria-hidden="true">
							<g transform="translate(1184.583 765.171)">
								<path d="M-1089.333-687.239v36.888h51.262c-2.251 11.863-9.006 21.908-19.137 28.662l30.913 23.986c18.011-16.625 28.402-41.044 28.402-70.052 0-6.754-.606-13.249-1.732-19.483z" fill="#4285f4"/>
								<path d="M-1142.714-651.791l-6.972 5.337-24.679 19.223h0c15.673 31.086 47.796 52.561 85.03 52.561 25.717 0 47.278-8.486 63.038-23.033l-30.913-23.986c-8.486 5.715-19.31 9.179-32.125 9.179-24.765 0-45.806-16.712-53.34-39.226z" fill="#34a853"/>
								<path d="M-1174.365-712.61c-6.494 12.815-10.217 27.276-10.217 42.689s3.723 29.874 10.217 42.689c0 .086 31.693-24.592 31.693-24.592-1.905-5.715-3.031-11.776-3.031-18.098s1.126-12.383 3.031-18.098z" fill="#fbbc05"/>
								<path d="M-1089.333-727.244c14.028 0 26.497 4.849 36.455 14.201l27.276-27.276c-16.539-15.413-38.013-24.852-63.731-24.852-37.234 0-69.359 21.388-85.032 52.561l31.692 24.592c7.533-22.514 28.575-39.226 53.34-39.226z" fill="#ea4335"/>
							</g>
						</svg>
						Sign in with Google
					</Button>
				</div>
			</div>

			<ToastContainer toasts={toasts} onDismiss={dismiss} />
		</>
	);
} 