'use client';

import { Search } from 'lucide-react';
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import type { SearchBarHandle } from '@/lib/keyboardShortcuts';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(
  ({ placeholder = 'Search hunts...', onSearch, className = '' }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
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

    return (
      <div className={`relative ${className}`}>
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
          <Search className="h-5 w-5" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 transition-all duration-200 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          aria-label="Search"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <kbd className="hidden rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700 sm:inline-flex">
            /
          </kbd>
        </div>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;
