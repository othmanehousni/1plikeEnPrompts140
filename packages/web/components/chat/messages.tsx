import type { Message as TMessage } from "ai";
import { Message } from "./message";
import React, { useEffect, useRef } from "react";

export const Messages = ({
  messages,
  isLoading,
  status,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="w-full space-y-4 pt-20 pb-32">
      <div className="max-w-3xl mx-auto pt-8 px-4">
        {messages.map((m) => (
          <Message
            key={m.id || `message-${m.role}-${m.content}`}
            isLatestMessage={m === messages[messages.length - 1]}
            isLoading={isLoading}
            message={m}
            status={status}
          />
        ))}
        <div className="h-1" ref={endRef} />
      </div>
    </div>
  );
};
