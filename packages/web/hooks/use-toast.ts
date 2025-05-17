import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface UseToastReturn {
  toasts: Toast[];
  toast: (message: string, type?: ToastType, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => Math.random().toString(36).substring(2, 9), []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = generateId();
    const newToast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);
    
    if (duration !== Number.POSITIVE_INFINITY) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
    
    return id;
  }, [generateId, dismiss]);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const error = useCallback((message: string, duration?: number) => {
    return toast(message, 'error', duration);
  }, [toast]);

  const success = useCallback((message: string, duration?: number) => {
    return toast(message, 'success', duration);
  }, [toast]);

  const info = useCallback((message: string, duration?: number) => {
    return toast(message, 'info', duration);
  }, [toast]);

  const warning = useCallback((message: string, duration?: number) => {
    return toast(message, 'warning', duration);
  }, [toast]);

  return {
    toasts,
    toast,
    error,
    success,
    info,
    warning,
    dismiss,
    dismissAll
  };
} 