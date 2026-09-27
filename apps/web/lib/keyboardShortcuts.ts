// Keyboard shortcuts engine

export interface SearchBarHandle {
  focus(): void;
  blur(): void;
  clear(): void;
}

interface ShortcutAction {
  keys: string;
  description: string;
  handler: () => void;
  /** When true, the shortcut is ignored if an input/textarea/select is focused. */
  ignoreInInput?: boolean;
}

export interface ShortcutConfig {
  actions: ShortcutAction[];
}

// ─── Prefix state for multi-key sequences (e.g. G+H) ──────────────────────

let prefixKey: string | null = null;
let prefixTimer: ReturnType<typeof setTimeout> | null = null;

const PREFIX_TIMEOUT_MS = 800;

export function cleanupPrefixState(): void {
  if (prefixTimer) {
    clearTimeout(prefixTimer);
    prefixTimer = null;
  }
  prefixKey = null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function isInputElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable === true
  );
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createDefaultShortcuts(
  navigate: (path: string) => void,
  focusSearch: () => void,
  closeTopModal: () => void,
  toggleHelp: () => void
): ShortcutConfig {
  return {
    actions: [
      {
        keys: "?",
        description: "Show this help",
        handler: toggleHelp,
        ignoreInInput: true,
      },
      {
        keys: "/",
        description: "Focus search",
        handler: focusSearch,
        ignoreInInput: true,
      },
      {
        keys: "Esc",
        description: "Close modal / Cancel",
        handler: closeTopModal,
        ignoreInInput: false,
      },
      {
        keys: "G + H",
        description: "Go to Home",
        handler: () => navigate("/"),
        ignoreInInput: true,
      },
      {
        keys: "G + C",
        description: "Go to Create Hunt",
        handler: () => navigate("/hunty"),
        ignoreInInput: true,
      },
      {
        keys: "G + D",
        description: "Go to Dashboard",
        handler: () => navigate("/dashboard"),
        ignoreInInput: true,
      },
      {
        keys: "Ctrl + K",
        description: "Open hunt search",
        handler: focusSearch,
        ignoreInInput: true,
      },
    ],
  };
}

// ─── Keydown handler ───────────────────────────────────────────────────────

export function createKeyboardHandler(config: ShortcutConfig) {
  return (e: KeyboardEvent) => {
    const target = e.target as Element | null;

    // Always allow Escape
    if (e.key === "Escape") {
      cleanupPrefixState();
      const escapeAction = config.actions.find((a) => a.keys === "Esc");
      if (escapeAction) {
        e.preventDefault();
        escapeAction.handler();
      }
      return;
    }

    // Skip shortcuts when an input is focused (except Esc, handled above)
    if (isInputElement(target)) {
      cleanupPrefixState();
      return;
    }

    const key = e.key;

    // Ctrl+K for command palette
    if ((e.ctrlKey || e.metaKey) && key === "k") {
      e.preventDefault();
      const ctrlKAction = config.actions.find((a) => a.keys === "Ctrl + K");
      if (ctrlKAction) ctrlKAction.handler();
      return;
    }

    // Handle multi-key prefix sequences (G+H, G+C, G+D)
    if (prefixKey === "g") {
      cleanupPrefixState();
      const sequenceMap: Record<string, string> = {
        h: "/",
        c: "/hunty",
        d: "/dashboard",
      };
      const path = sequenceMap[key.toLowerCase()];
      if (path) {
        const action = config.actions.find(
          (a) => a.keys === `G + ${key.toUpperCase()}`
        );
        if (action) {
          e.preventDefault();
          action.handler();
        }
      }
      return;
    }

    // Single-key shortcuts
    const match = config.actions.find((a) => a.keys === key);
    if (match) {
      if (match.ignoreInInput && isInputElement(target)) return;
      e.preventDefault();
      match.handler();
      return;
    }

    // Start prefix for "g"
    if (key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey) {
      prefixKey = "g";
      prefixTimer = setTimeout(cleanupPrefixState, PREFIX_TIMEOUT_MS);
      return;
    }
  };
}
