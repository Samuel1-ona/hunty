// Search input with programmatic focus support for keyboard shortcuts

'use client';

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import KeyboardShortcutsProvider from '../components/KeyboardShortcutsProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Hunty - Cross-Platform Scavenger Hunt Platform',
  description: 'Create, play, and earn rewards from location-based scavenger hunts.',
};

export interface SearchBarHandle {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(
  ({ placeholder = 'Search hunts...', onSearch, className = '' }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');

    // Expose methods via ref for keyboard shortcut integration
    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
        // Place cursor at end of text
        const length = inputRef.current?.value.length || 0;
        inputRef.current?.setSelectionRange(length, length);
      },
      blur: () => {
        inputRef.current?.blur();
      },
      clear: () => {
        setQuery('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        onSearch?.('');
      },
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      onSearch?.(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow Escape to blur the search input
      if (e.key === 'Escape') {
        inputRef.current?.blur();
      }
    };

    export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <KeyboardShortcutsProvider>
          {children}
        </KeyboardShortcutsProvider>
      </body>
    </html>
  );
}

    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200"
          aria-label="Search"
        />
        {/* Keyboard hint */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            /
          </kbd>
        </div>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;