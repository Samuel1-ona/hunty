export interface ProgressiveHint {
  level: number;
  text: string;
  cost: number;
}

export interface HintUsage {
  clueId: number;
  hintLevel: number;
  cost: number;
  usedAt: number;
}

/**
 * Returns the next hint level that can be unlocked.
 */
export function getNextHintLevel(
  usedHintLevels: number[],
  availableHints: ProgressiveHint[]
): number | null {
  const used = new Set(usedHintLevels);

  const nextHint = availableHints.find(
    (hint) => !used.has(hint.level)
  );

  return nextHint?.level ?? null;
}

/**
 * Returns the score cost for a hint level.
 */
export function getHintCost(
  level: number,
  baseCost = 5
): number {
  if (level <= 0) return 0;

  return baseCost * level;
}

/**
 * Determines whether a player can afford a hint.
 */
export function canAffordHint(
  score: number,
  cost: number
): boolean {
  return score >= cost;
}

/**
 * Applies a hint cost to the player's score.
 */
export function applyHintCost(
  score: number,
  cost: number
): number {
  return Math.max(0, score - cost);
}

/**
 * Creates an analytics record for hint usage.
 */
export function createHintUsage(
  clueId: number,
  hintLevel: number,
  cost: number
): HintUsage {
  return {
    clueId,
    hintLevel,
    cost,
    usedAt: Date.now(),
  };
}
