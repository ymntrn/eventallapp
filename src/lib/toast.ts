import { useSyncExternalStore } from 'react';

let message: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Shows a short status message at the bottom of the screen. */
export function showToast(text: string, ms = 3500) {
  message = text;
  clearTimeout(timer);
  timer = setTimeout(() => {
    message = null;
    emit();
  }, ms);
  emit();
}

export function useToast(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => message,
    () => null,
  );
}
