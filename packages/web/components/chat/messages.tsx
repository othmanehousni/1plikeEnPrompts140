import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import React from "react";

export const Messages = ({
  messages,
  isLoading,
  status,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
}) => {
  const [containerRef, endRef] = useScrollToBottom();
  return (
    <div
      className="flex-1 h-full space-y-4 overflow-y-auto py-8"
      ref={containerRef}
    >
      <div className="max-w-xl mx-auto pt-8">
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
