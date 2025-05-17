"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Toast as ToastType } from "@/hooks/use-toast";

export function ToastContainer({
	toasts,
	onDismiss,
}: {
	toasts: ToastType[];
	onDismiss: (id: string) => void;
}) {
	if (!toasts.length) return null;

	return (
		<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
			<AnimatePresence>
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
				))}
			</AnimatePresence>
		</div>
	);
}

function ToastItem({
	toast,
	onDismiss,
}: {
	toast: ToastType;
	onDismiss: (id: string) => void;
}) {
	useEffect(() => {
		if (
			toast.duration !== Number.POSITIVE_INFINITY &&
			toast.duration !== undefined
		) {
			const timer = setTimeout(() => {
				onDismiss(toast.id);
			}, toast.duration);

			return () => clearTimeout(timer);
		}
	}, [toast, onDismiss]);

	const bgColorClass = {
		success: "bg-green-100 border-green-500 dark:bg-green-900/30",
		error: "bg-red-100 border-red-500 dark:bg-red-900/30",
		warning: "bg-yellow-100 border-yellow-500 dark:bg-yellow-900/30",
		info: "bg-blue-100 border-blue-500 dark:bg-blue-900/30",
	};

	const textColorClass = {
		success: "text-green-800 dark:text-green-300",
		error: "text-red-800 dark:text-red-300",
		warning: "text-yellow-800 dark:text-yellow-300",
		info: "text-blue-800 dark:text-blue-300",
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 20, scale: 0.95 }}
			transition={{ duration: 0.2 }}
			className={cn(
				"rounded-md border px-4 py-3 shadow-md",
				bgColorClass[toast.type],
				"flex items-center justify-between",
			)}
		>
			<span className={cn("text-sm font-medium", textColorClass[toast.type])}>
				{toast.message}
			</span>
			<button
				type="button"
				onClick={() => onDismiss(toast.id)}
				className={cn(
					"ml-4 rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700",
					textColorClass[toast.type],
				)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M18 6L6 18" />
					<path d="M6 6L18 18" />
				</svg>
			</button>
		</motion.div>
	);
}
