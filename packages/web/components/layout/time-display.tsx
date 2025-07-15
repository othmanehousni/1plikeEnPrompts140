"use client";

import { useState, useEffect } from "react";

export function TimeDisplay() {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(Date.now());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [mounted]);

  const formattedTime = (() => {
    if (!mounted) return "";
    const date = new Date(currentTime);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  })();

  const formattedDate = (() => {
    if (!mounted) return "";
    const date = new Date(currentTime);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  })();

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 font-mono text-xs text-muted-foreground z-50">
      <div className="font-bold mb-1">Ask Ed</div>
      <div className="flex items-center gap-2">
        <span className="opacity-60">•</span>
        <div className="flex items-center gap-1">
          <span>{formattedDate}</span>
          <span className="text-xs opacity-60">@</span>
          <span className="font-medium">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
} 