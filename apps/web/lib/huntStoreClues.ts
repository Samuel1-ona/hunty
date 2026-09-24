import type { Clue } from "./huntStoreCore";
import { MAX_CLUES_PER_HUNT, readClues, readHunts, writeClues, writeHunts } from "./huntStoreCore";

export function getHuntClues(huntId: number): Clue[] {
  return readClues().filter((c) => c.huntId === huntId);
}

function validateClueDraft(clue: Omit<Clue, "id">, index: number): Omit<Clue, "id"> {
  const question = clue.question.trim();
  const answer = clue.answer.trim();
  if (!question) throw new Error(`Clue ${index + 1} question is required.`);
  if (!answer) throw new Error(`Clue ${index + 1} answer is required.`);
  if (!Number.isFinite(clue.points) || clue.points <= 0)
    throw new Error(`Clue ${index + 1} points must be greater than 0.`);
  const questionTranslations = clue.questionTranslations
    ? Object.fromEntries(
        Object.entries(clue.questionTranslations)
          .map(([locale, value]) => [locale, typeof value === "string" ? value.trim() : ""])
          .filter(([, value]) => value.length > 0)
      )
    : undefined;
  const hintTranslations = clue.hintTranslations
    ? Object.fromEntries(
        Object.entries(clue.hintTranslations)
          .map(([locale, value]) => [locale, typeof value === "string" ? value.trim() : ""])
          .filter(([, value]) => value.length > 0)
      )
    : undefined;
  return {
    ...clue,
    question,
    answer,
    questionTranslations:
      Object.keys(questionTranslations ?? {}).length > 0 ? questionTranslations : undefined,
    hintTranslations: Object.keys(hintTranslations ?? {}).length > 0 ? hintTranslations : undefined,
    hint: clue.hint?.trim() || undefined,
  };
}

export function saveClueLocally(clue: Omit<Clue, "id">): number {
  return saveCluesLocallyBatch([clue])[0];
}

export function saveCluesLocallyBatch(clues: Omit<Clue, "id">[]): number[] {
  if (clues.length === 0) return [];
  const normalized = clues.map(validateClueDraft);
  const huntId = normalized[0]?.huntId;
  if (normalized.some((clue) => clue.huntId !== huntId))
    throw new Error("All clues in a batch must belong to the same hunt.");
  if (getHuntClues(huntId).length + normalized.length > MAX_CLUES_PER_HUNT)
    throw new Error(`A hunt can have at most ${MAX_CLUES_PER_HUNT} clues.`);
  const all = readClues();
  const nextId = all.length > 0 ? Math.max(...all.map((c) => c.id)) + 1 : 1;
  const withIds = normalized.map((clue, index) => ({ ...clue, id: nextId + index }));
  writeClues([...all, ...withIds]);
  writeHunts(
    readHunts().map((hunt) =>
      hunt.id === huntId ? { ...hunt, cluesCount: hunt.cluesCount + withIds.length } : hunt
    )
  );
  return withIds.map((clue) => clue.id);
}

/** Replace a hunt's clues in one operation, used when restoring a JSON backup. */
export function replaceHuntCluesLocally(huntId: number, clues: Omit<Clue, "id">[]): void {
  if (clues.length > MAX_CLUES_PER_HUNT) {
    throw new Error(`A hunt can have at most ${MAX_CLUES_PER_HUNT} clues.`);
  }
  if (clues.some((clue) => clue.huntId !== huntId)) {
    throw new Error("All imported clues must belong to the same hunt.");
  }

  const normalized = clues.map(validateClueDraft);
  const remaining = readClues().filter((clue) => clue.huntId !== huntId);
  const nextId = remaining.length > 0 ? Math.max(...remaining.map((clue) => clue.id)) + 1 : 1;
  const imported = normalized.map((clue, index) => ({ ...clue, id: nextId + index }));
  writeClues([...remaining, ...imported]);
  writeHunts(
    readHunts().map((hunt) =>
      hunt.id === huntId ? { ...hunt, cluesCount: imported.length } : hunt
    )
  );
}

export function updateClueAnswer(huntId: number, clueId: number, answer: string): boolean {
  const all = readClues();
  const idx = all.findIndex((c) => c.huntId === huntId && c.id === clueId);
  if (idx === -1) return false;
  const updated = [...all];
  updated[idx] = { ...updated[idx], answer };
  writeClues(updated);
  return true;
}
