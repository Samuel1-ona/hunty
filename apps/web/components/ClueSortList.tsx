'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

export interface ClueItem {
  id: string;
  label: string;
}

interface ClueSortListProps {
  /** The ordered list of clue items. */
  items: ClueItem[];
  /** Called with the new order after a reorder. */
  onReorder: (newItems: ClueItem[]) => void;
  /** Whether the list is disabled (e.g. while saving). */
  disabled?: boolean;
  /** Whether mouse drag-and-drop is enabled. When false, only keyboard/button reordering works. */
  enableDrag?: boolean;
}

/**
 * Accessible, keyboard-navigable drag-and-drop clue list.
 *
 * Supports:
 * - Mouse drag-and-drop with visual feedback (HTML5 drag events)
 * - Touch / pointer drag for mobile browsers (pointer events)
 * - Mouse drag-and-drop with visual feedback (can be disabled via enableDrag prop)
 * - Keyboard reordering via Alt+ArrowUp / Alt+ArrowDown
 * - Touch-friendly ↑ / ↓ move buttons
 * - Smooth CSS transition animations during reorder
 * - Screen-reader live region announcements
 */
export function ClueSortList({
  items,
  onReorder,
  disabled = false,
  enableDrag = true,
}: ClueSortListProps) {
  // ─── State ───────────────────────────────────────────────────────────
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // ─── Refs ────────────────────────────────────────────────────────────
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Pointer-drag state. We track this in a ref rather than state so that
   * pointermove handlers can read/write it without causing extra renders.
   */
  const pointerDrag = useRef<{
    active: boolean;
    fromIndex: number;
    startY: number;
    currentY: number;
  } | null>(null);

  // ─── Helpers ─────────────────────────────────────────────────────────

  const announce = useCallback((message: string) => {
    const region = liveRegionRef.current;
    if (region) {
      region.textContent = '';
      // Flush then set so identical messages are still announced.
      requestAnimationFrame(() => {
        if (region) region.textContent = message;
      });
    }
  }, []);

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;
      const newItems = [...items];
      const [moved] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, moved);
      onReorder(newItems);
      announce(`Moved clue ${fromIndex + 1} to position ${toIndex + 1}`);
    },
    [items, onReorder, announce]
  );

  // ─── HTML5 Mouse drag handlers ────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (disabled) return;
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (disabled) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverIndex(index);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear overIndex when truly leaving the item (not entering a child).
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
      setOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = draggedIndex;
      setDraggedIndex(null);
      setOverIndex(null);
      if (fromIndex === null || fromIndex === toIndex) return;
      moveItem(fromIndex, toIndex);
    },
    [draggedIndex, moveItem]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setOverIndex(null);
  }, []);

  // ─── Pointer (touch) drag handlers ───────────────────────────────────
  //
  // HTML5 drag events are unreliable on mobile. We implement an overlay-free
  // pointer-event approach instead: on pointerdown we capture the pointer and
  // track vertical movement, highlighting the drop target via hit-testing.

  const hitTestIndex = useCallback((clientY: number): number | null => {
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const { top, bottom } = el.getBoundingClientRect();
      if (clientY >= top && clientY <= bottom) return i;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      // Only handle touch/pen; mouse is covered by HTML5 drag events.
      if (disabled || e.pointerType === 'mouse') return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerDrag.current = {
        active: true,
        fromIndex: index,
        startY: e.clientY,
        currentY: e.clientY,
      };
      setDraggedIndex(index);
    },
    [disabled]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerDrag.current?.active) return;
      pointerDrag.current.currentY = e.clientY;
      const idx = hitTestIndex(e.clientY);
      setOverIndex(idx !== pointerDrag.current.fromIndex ? idx : null);
    },
    [hitTestIndex]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerDrag.current?.active) return;
      const { fromIndex } = pointerDrag.current;
      pointerDrag.current = null;
      const toIndex = hitTestIndex(e.clientY);
      setDraggedIndex(null);
      setOverIndex(null);
      if (toIndex !== null && toIndex !== fromIndex) {
        moveItem(fromIndex, toIndex);
      }
    },
    [hitTestIndex, moveItem]
  );

  const handlePointerCancel = useCallback(() => {
    pointerDrag.current = null;
    setDraggedIndex(null);
    setOverIndex(null);
  }, []);

  // ─── Keyboard handlers ────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (disabled) return;
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        moveItem(index, index - 1);
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        moveItem(index, index + 1);
      }
    },
    [disabled, moveItem]
  );

  // ─── Move button handlers ─────────────────────────────────────────────

  const handleMoveUp = useCallback((index: number) => moveItem(index, index - 1), [moveItem]);

  const handleMoveDown = useCallback((index: number) => moveItem(index, index + 1), [moveItem]);

  // ─── Keep itemRefs array in sync with items length ────────────────────

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-1" role="list" aria-label="Clue order">
      {/* Screen-reader live region */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        role="status"
      />

      {items.map((item, index) => {
        const isDragged = draggedIndex === index;
        const isOver = overIndex === index && draggedIndex !== index;

        return (
          <div
            key={item.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role="listitem"
            onPointerDown={(e) => handlePointerDown(e, index)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            draggable={enableDrag && !disabled}
            onDragStart={enableDrag ? (e) => handleDragStart(e, index) : undefined}
            onDragOver={enableDrag ? (e) => handleDragOver(e, index) : undefined}
            onDragLeave={enableDrag ? handleDragLeave : undefined}
            onDrop={enableDrag ? (e) => handleDrop(e, index) : undefined}
            onDragEnd={enableDrag ? handleDragEnd : undefined}
            onKeyDown={(e) => handleKeyDown(e, index)}
            aria-roledescription={enableDrag ? 'sortable clue' : 'clue'}
            aria-label={`Clue ${index + 1}: ${item.label}`}
            tabIndex={disabled ? -1 : 0}
            className={`
              group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
              transition-all duration-200 ease-in-out
              ${disabled ? 'opacity-50 cursor-not-allowed' : enableDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
              ${isDragged ? 'opacity-40 scale-[0.98]' : ''}
              ${isOver ? 'border-[#3737A4] bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50'}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4] focus-visible:ring-offset-1
            `}
          >
            {/* Drag handle (only shown when drag is enabled) */}
            {enableDrag && (
              <div
                className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                aria-hidden
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}

            {/* Clue number + label */}
            <div className="flex-1 min-w-0">
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500 mr-1.5">
                {index + 1}.
              </span>
              <span className="text-slate-700 dark:text-slate-300 truncate">
                {item.label || 'Untitled clue'}
              </span>
            </div>

            {/* Move buttons — always visible on touch, hover/focus on desktop */}
            <div className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={disabled || index === 0}
                aria-label={`Move clue ${index + 1} up`}
                aria-hidden="false"
                tabIndex={-1}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={disabled || index === items.length - 1}
                aria-label={`Move clue ${index + 1} down`}
                aria-hidden="false"
                tabIndex={-1}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
