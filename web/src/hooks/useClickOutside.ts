/**
 * useClickOutside Hook
 * 
 * Detects clicks outside a referenced element and triggers a callback.
 * Useful for closing dropdowns, modals, and other overlay components.
 */

import { useEffect, RefObject } from 'react';

/**
 * Hook to detect clicks outside a referenced element
 * 
 * @param ref - React ref to the element to monitor
 * @param handler - Callback function to execute when click outside is detected
 * @param enabled - Whether the hook is active (default: true)
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or its descendants
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    // Add listeners for both mouse and touch events
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}

