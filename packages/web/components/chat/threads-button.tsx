"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command } from "cmdk";
import { Search, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";

interface Thread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface ThreadsButtonProps {
  onThreadSelect: (threadId: string) => void;
}

export function ThreadsButton({ onThreadSelect }: ThreadsButtonProps) {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchThreads();
    }
  }, [open]);

  // Add keyboard shortcut for cmd+k
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const fetchThreads = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/threads', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error('Error fetching threads:', error);
      setError('Failed to load conversations. Please try again.');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleThreadSelect = (threadId: string) => {
    onThreadSelect(threadId);
    setOpen(false);
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Remove thread from local state
      setThreads(prev => prev.filter(thread => thread.id !== threadId));
    } catch (error) {
      console.error('Error deleting thread:', error);
      setError('Failed to delete conversation. Please try again.');
    }
  };

  const handleRenameThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    
    setEditingThread(threadId);
    setEditTitle(thread.title);
  };

  const handleSaveRename = async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ title: editTitle }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Update thread in local state
      setThreads(prev => prev.map(thread => 
        thread.id === threadId ? { ...thread, title: editTitle } : thread
      ));
      
      setEditingThread(null);
      setEditTitle("");
    } catch (error) {
      console.error('Error renaming thread:', error);
      setError('Failed to rename conversation. Please try again.');
    }
  };

  const handleCancelRename = () => {
    setEditingThread(null);
    setEditTitle("");
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return 'Unknown';
    }
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 transition-colors duration-200 hover:bg-accent/20"
        title="Search conversations (⌘K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="ml-2 hidden rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 transition-colors duration-200 hover:bg-accent/20"
        title="Search conversations (⌘K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="ml-2 hidden rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </Button>

      <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="search-dialog-title">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transform">
          <div className="mx-auto w-full overflow-hidden rounded-xl border bg-card shadow-2xl">
            <h2 id="search-dialog-title" className="sr-only">Search Conversations</h2>
            <Command className="w-full overflow-hidden rounded-xl border-0 bg-card">
              <div className="flex items-center border-b border-border px-4">
                <Search className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
                <Command.Input
                  placeholder="Search conversations..."
                  className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Command.List className="max-h-96 overflow-y-auto p-1">
                <Command.Empty className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-destructive">{error}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchThreads()}
                        className="mt-2"
                      >
                        Try again
                      </Button>
                    </div>
                  ) : (
                    "No conversations found."
                  )}
                </Command.Empty>
                
                {threads.length > 0 && (
                  <Command.Group>
                    {threads.map((thread) => (
                      <Command.Item
                        key={thread.id}
                        value={`${thread.title} ${thread.id}`}
                        onSelect={() => handleThreadSelect(thread.id)}
                        className="group relative flex cursor-pointer select-none items-center rounded-lg px-3 py-3 text-sm outline-none transition-colors duration-150 data-[selected=true]:bg-accent/30 hover:bg-accent/10"
                      >
                        <div className="flex items-center justify-between w-full min-w-0">
                          <div className="flex-1 min-w-0 pr-3">
                            {editingThread === thread.id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveRename(thread.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelRename();
                                  }
                                }}
                                onBlur={() => handleSaveRename(thread.id)}
                                className="w-full bg-transparent border-none outline-none font-medium text-foreground"
                                autoFocus
                              />
                            ) : (
                              <div className="font-medium truncate text-foreground">
                                {thread.title}
                              </div>
                            )}
                          </div>
                          
                          <div className="relative flex h-6 w-20 shrink-0 items-center justify-end">
                            {/* Date: visible by default, hides on hover */}
                            <span className="text-xs text-muted-foreground transition-opacity group-hover:opacity-0">
                              {formatDate(thread.updatedAt)}
                            </span>

                            {/* Actions: hidden by default, appear on hover */}
                            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Rename conversation"
                                onClick={(e) => handleRenameThread(thread.id, e)}
                                className="h-6 w-6 p-0 hover:bg-accent-foreground/10"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete conversation"
                                onClick={(e) => handleDeleteThread(thread.id, e)}
                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
              
              <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-background border rounded">↑↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-background border rounded">↵</kbd>
                      select
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-background border rounded">esc</kbd>
                    close
                  </span>
                </div>
              </div>
            </Command>
          </div>
        </div>
      </div>
    </>
  );
} 