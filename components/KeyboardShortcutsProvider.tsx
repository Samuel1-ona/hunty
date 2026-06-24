// Global keyboard shortcuts provider - wraps the app to enable shortcuts everywhere

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import KeyboardShortcutsModal from './KeyboardShortcuts';
import SearchBar from './SearchBar';
import {
  createDefaultShortcuts,
  createKeyboardHandler,
  cleanupPrefixState,
  SearchBarHandle,
} from '../lib/keyboardShortcuts';

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export default function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const searchBarRef = useRef<SearchBarHandle>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [modalStack, setModalStack] = useState<(() => void)[]>([]);

  // Register a modal's close function so Escape can close the topmost modal
  const registerModal = useCallback((closeFn: () => void) => {
    setModalStack((prev) => [...prev, closeFn]);
    return () => {
      setModalStack((prev) => prev.filter((fn) => fn !== closeFn));
    };
  }, []);

  // Close the topmost modal
  const closeTopModal = useCallback(() => {
    setModalStack((prev) => {
      if (prev.length === 0) {
        // If no modals are open, close help if it's open
        if (helpOpen) {
          setHelpOpen(false);
        }
        return prev;
      }
      const newStack = [...prev];
      const closeFn = newStack.pop();
      closeFn?.();
      return newStack;
    });
  }, [helpOpen]);

  // Toggle help modal
  const toggleHelp = useCallback(() => {
    setHelpOpen((prev) => !prev);
  }, []);

  // Focus search
  const focusSearch = useCallback(() => {
    searchBarRef.current?.focus();
  }, []);

  // Navigate wrapper
  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  // Set up global keyboard listener
  useEffect(() => {
    const config = createDefaultShortcuts(
      navigate,
      focusSearch,
      closeTopModal,
      toggleHelp
    );

    const handler = createKeyboardHandler(config);
    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
      cleanupPrefixState();
    };
  }, [navigate, focusSearch, closeTopModal, toggleHelp]);

  // Expose registerModal via context if needed by other components
  // For simplicity, this example uses a global approach

  return (
    <>
      {children}
      <KeyboardShortcutsModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

// Hook for components to register their modals
export function useModalKeyboard() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}