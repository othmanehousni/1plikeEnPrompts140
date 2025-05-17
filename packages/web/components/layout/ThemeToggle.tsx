"use client";

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from '@/components/icons'; // Assuming these will be correctly exported
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Avoid SSR mismatch by rendering a placeholder or null until mounted
    return <div className="h-9 w-9 rounded-lg bg-card animate-pulse" />;
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={theme === 'light' ? 'Activate dark mode' : 'Activate light mode'}
      title={theme === 'light' ? 'Activate dark mode' : 'Activate light mode'}
      className={cn(
        "h-9 w-9 rounded-lg p-2 transition-all duration-200 ease-in-out",
        "bg-card hover:bg-card/80 text-primary dark:text-primary", // Themed background and icon color
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      {theme === 'light' ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
    </button>
  );
}; 