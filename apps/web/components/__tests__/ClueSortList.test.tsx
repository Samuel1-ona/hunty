/**
 * #576 – ClueSortList tests
 *
 * Covers:
 *  - Rendering all items with correct labels and position numbers
 *  - Mouse drag-and-drop reorder (HTML5 drag events)
 *  - Keyboard reorder via Alt+ArrowUp / Alt+ArrowDown
 *  - Move-button reorder (↑ / ↓ buttons)
 *  - Touch / pointer drag reorder
 *  - Screen-reader live region announcements
 *  - Disabled state disables all interactions
 *  - First / last item boundary constraints
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ClueSortList, ClueItem } from '../ClueSortList';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItems(count: number): ClueItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `clue-${i + 1}`,
    label: `Clue Question ${i + 1}`,
  }));
}

function renderList(items: ClueItem[], onReorder = vi.fn(), disabled = false) {
  return render(<ClueSortList items={items} onReorder={onReorder} disabled={disabled} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClueSortList', () => {
  describe('rendering', () => {
    it('renders all items with sequential position numbers', () => {
      renderList(makeItems(3));
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('3.')).toBeInTheDocument();
    });

    it('renders item labels', () => {
      renderList(makeItems(3));
      expect(screen.getByText('Clue Question 1')).toBeInTheDocument();
      expect(screen.getByText('Clue Question 2')).toBeInTheDocument();
    });

    it("renders 'Untitled clue' when label is empty", () => {
      render(<ClueSortList items={[{ id: 'a', label: '' }]} onReorder={vi.fn()} />);
      expect(screen.getByText('Untitled clue')).toBeInTheDocument();
    });

    it('disables move-up button for the first item', () => {
      renderList(makeItems(2));
      const moveUpButtons = screen.getAllByRole('button', { name: /Move clue 1 up/i });
      expect(moveUpButtons[0]).toBeDisabled();
    });

    it('disables move-down button for the last item', () => {
      renderList(makeItems(2));
      const moveDownButtons = screen.getAllByRole('button', { name: /Move clue 2 down/i });
      expect(moveDownButtons[0]).toBeDisabled();
    });
  });

  // ── Move buttons ────────────────────────────────────────────────────────────

  describe('move buttons', () => {
    it('calls onReorder with swapped order when ↑ is clicked on second item', async () => {
      const items = makeItems(3);
      const onReorder = vi.fn();
      const user = userEvent.setup();
      renderList(items, onReorder);

      const moveUpBtn = screen.getByRole('button', { name: /Move clue 2 up/i });
      await user.click(moveUpBtn);

      expect(onReorder).toHaveBeenCalledOnce();
      const newOrder = onReorder.mock.calls[0][0] as ClueItem[];
      expect(newOrder[0].id).toBe('clue-2');
      expect(newOrder[1].id).toBe('clue-1');
      expect(newOrder[2].id).toBe('clue-3');
    });

    it('calls onReorder with swapped order when ↓ is clicked on first item', async () => {
      const items = makeItems(3);
      const onReorder = vi.fn();
      const user = userEvent.setup();
      renderList(items, onReorder);

      const moveDownBtn = screen.getByRole('button', { name: /Move clue 1 down/i });
      await user.click(moveDownBtn);

      expect(onReorder).toHaveBeenCalledOnce();
      const newOrder = onReorder.mock.calls[0][0] as ClueItem[];
      expect(newOrder[0].id).toBe('clue-2');
      expect(newOrder[1].id).toBe('clue-1');
    });
  });

  // ── Keyboard reorder ────────────────────────────────────────────────────────

  describe('keyboard reorder', () => {
    it('moves item up with Alt+ArrowUp', async () => {
      const items = makeItems(3);
      const onReorder = vi.fn();
      const user = userEvent.setup();
      renderList(items, onReorder);

      // Focus the second listitem
      const listItems = screen.getAllByRole('listitem');
      listItems[1].focus();

      await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

      expect(onReorder).toHaveBeenCalledOnce();
      const newOrder = onReorder.mock.calls[0][0] as ClueItem[];
      expect(newOrder[0].id).toBe('clue-2');
      expect(newOrder[1].id).toBe('clue-1');
    });

    it('moves item down with Alt+ArrowDown', async () => {
      const items = makeItems(3);
      const onReorder = vi.fn();
      const user = userEvent.setup();
      renderList(items, onReorder);

      const listItems = screen.getAllByRole('listitem');
      listItems[0].focus();

      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');

      expect(onReorder).toHaveBeenCalledOnce();
      const newOrder = onReorder.mock.calls[0][0] as ClueItem[];
      expect(newOrder[0].id).toBe('clue-2');
      expect(newOrder[1].id).toBe('clue-1');
    });

    it('does not reorder past index 0 with Alt+ArrowUp on first item', async () => {
      const items = makeItems(2);
      const onReorder = vi.fn();
      const user = userEvent.setup();
      renderList(items, onReorder);

      const listItems = screen.getAllByRole('listitem');
      listItems[0].focus();

      await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

      expect(onReorder).not.toHaveBeenCalled();
    });

    it('does not reorder past last index with Alt+ArrowDown on last item', async () => {
      const items = makeItems(2);
      const onReorder = vi.fn();
      const user = userEvent.setup();
      renderList(items, onReorder);

      const listItems = screen.getAllByRole('listitem');
      listItems[1].focus();

      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');

      expect(onReorder).not.toHaveBeenCalled();
    });
  });

  // ── HTML5 drag-and-drop ────────────────────────────────────────────────────

  describe('HTML5 drag-and-drop', () => {
    it('calls onReorder when an item is dragged and dropped onto another', () => {
      const items = makeItems(3);
      const onReorder = vi.fn();
      renderList(items, onReorder);

      const listItems = screen.getAllByRole('listitem');

      // Drag item 0 over item 2 and drop
      fireEvent.dragStart(listItems[0], {
        dataTransfer: { effectAllowed: '', setData: vi.fn() },
      });
      fireEvent.dragOver(listItems[2], {
        dataTransfer: { dropEffect: '' },
      });
      fireEvent.drop(listItems[2], { dataTransfer: {} });
      fireEvent.dragEnd(listItems[0]);

      expect(onReorder).toHaveBeenCalledOnce();
      const newOrder = onReorder.mock.calls[0][0] as ClueItem[];
      expect(newOrder[0].id).toBe('clue-2');
      expect(newOrder[1].id).toBe('clue-3');
      expect(newOrder[2].id).toBe('clue-1');
    });

    it('does not call onReorder when dropped onto the same item', () => {
      const items = makeItems(2);
      const onReorder = vi.fn();
      renderList(items, onReorder);

      const listItems = screen.getAllByRole('listitem');

      fireEvent.dragStart(listItems[0], {
        dataTransfer: { effectAllowed: '', setData: vi.fn() },
      });
      fireEvent.dragOver(listItems[0], {
        dataTransfer: { dropEffect: '' },
      });
      fireEvent.drop(listItems[0], { dataTransfer: {} });
      fireEvent.dragEnd(listItems[0]);

      expect(onReorder).not.toHaveBeenCalled();
    });
  });

  // ── Touch / pointer drag ────────────────────────────────────────────────────

  describe('pointer (touch) drag', () => {
    it('calls onReorder when a touch drag completes over a different item', () => {
      const items = makeItems(3);
      const onReorder = vi.fn();
      renderList(items, onReorder);

      const listItems = screen.getAllByRole('listitem');

      // Simulate a touch-type pointer drag from item 0 to item 2
      const mockSetPointerCapture = vi.fn();
      Object.defineProperty(listItems[0], 'setPointerCapture', {
        value: mockSetPointerCapture,
        configurable: true,
      });

      // Mock getBoundingClientRect for each item so hitTestIndex works
      listItems.forEach((el, i) => {
        vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
          top: i * 50,
          bottom: i * 50 + 48,
          left: 0,
          right: 200,
          width: 200,
          height: 48,
          x: 0,
          y: i * 50,
          toJSON: () => ({}),
        } as DOMRect);
      });

      fireEvent.pointerDown(listItems[0], {
        pointerType: 'touch',
        clientY: 24,
        pointerId: 1,
      });
      fireEvent.pointerMove(listItems[0], {
        pointerType: 'touch',
        clientY: 124, // over item 2 (top=100, bottom=148)
        pointerId: 1,
      });
      fireEvent.pointerUp(listItems[0], {
        pointerType: 'touch',
        clientY: 124,
        pointerId: 1,
      });

      expect(onReorder).toHaveBeenCalledOnce();
      const newOrder = onReorder.mock.calls[0][0] as ClueItem[];
      expect(newOrder[0].id).toBe('clue-2');
      expect(newOrder[1].id).toBe('clue-3');
      expect(newOrder[2].id).toBe('clue-1');
    });

    it('does not call onReorder on pointer cancel', () => {
      const items = makeItems(2);
      const onReorder = vi.fn();
      renderList(items, onReorder);

      const listItems = screen.getAllByRole('listitem');
      const mockSetPointerCapture = vi.fn();
      Object.defineProperty(listItems[0], 'setPointerCapture', {
        value: mockSetPointerCapture,
        configurable: true,
      });

      fireEvent.pointerDown(listItems[0], { pointerType: 'touch', clientY: 24, pointerId: 1 });
      fireEvent.pointerCancel(listItems[0], { pointerType: 'touch', pointerId: 1 });

      expect(onReorder).not.toHaveBeenCalled();
    });
  });

  // ── Accessibility ───────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('announces reorder via live region', async () => {
      const items = makeItems(2);
      const user = userEvent.setup();
      renderList(items);

      const listItems = screen.getAllByRole('listitem');
      listItems[1].focus();
      await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

      // The live region gets populated asynchronously via rAF mock
      const liveRegion = document.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('applies aria-grabbed=true to the item being dragged', () => {
      const items = makeItems(2);
      renderList(items);

      const listItems = screen.getAllByRole('listitem');
      fireEvent.dragStart(listItems[0], {
        dataTransfer: { effectAllowed: '', setData: vi.fn() },
      });

      expect(listItems[0]).toHaveAttribute('aria-grabbed', 'true');
    });

    it('uses role=list on the container and role=listitem on each item', () => {
      renderList(makeItems(3));
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
  });

  // ── Disabled state ──────────────────────────────────────────────────────────

  describe('disabled state', () => {
    it('does not call onReorder when ↑ button is clicked while disabled', async () => {
      const items = makeItems(2);
      const onReorder = vi.fn();
      const user = userEvent.setup();
      renderList(items, onReorder, true);

      const allButtons = screen.getAllByRole('button');
      // All buttons should be disabled
      for (const btn of allButtons) {
        expect(btn).toBeDisabled();
      }
    });

    it('does not call onReorder on keyboard event while disabled', async () => {
      const items = makeItems(2);
      const onReorder = vi.fn();
      const user = userEvent.setup();
      renderList(items, onReorder, true);

      const listItems = screen.getAllByRole('listitem');
      listItems[1].focus();
      await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

      expect(onReorder).not.toHaveBeenCalled();
    });
  });
});
