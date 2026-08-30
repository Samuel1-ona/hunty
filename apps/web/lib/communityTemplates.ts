import { logger } from '@/lib/logger';
import type { HuntTemplate, HuntTemplateClue } from '@/lib/huntTemplates';

/**
 * A hunt template contributed by a community member. Community templates are
 * persisted in the browser's localStorage so creators can share and reuse
 * their own starters alongside the built-in {@link HuntTemplate} library.
 */
export interface CommunityHuntTemplate extends HuntTemplate {
  /** Marks the template as community-submitted for UI badging and lookups. */
  isCommunity: true;
  /** Display name of the contributor. */
  author: string;
  /** Unix timestamp (ms) when the template was submitted. */
  submittedAt: number;
}

/** Input shape accepted by {@link addCommunityTemplate}. */
export interface CommunityTemplateInput {
  title: string;
  description: string;
  category: string;
  estimatedDuration: string;
  author: string;
  clues: HuntTemplateClue[];
}

export const COMMUNITY_TEMPLATES_STORAGE_KEY = 'hunty:community-templates';

/** Minimum number of sample clues a template must include. */
export const MIN_TEMPLATE_CLUES = 3;

/** Converts a free-form title into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function isValidClue(clue: unknown): clue is HuntTemplateClue {
  if (!clue || typeof clue !== 'object') return false;
  const candidate = clue as Record<string, unknown>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.code === 'string'
  );
}

function isValidCommunityTemplate(value: unknown): value is CommunityHuntTemplate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.isCommunity === true &&
    typeof candidate.slug === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.estimatedDuration === 'string' &&
    typeof candidate.author === 'string' &&
    typeof candidate.submittedAt === 'number' &&
    Array.isArray(candidate.clues) &&
    candidate.clues.every(isValidClue)
  );
}

/** Reads all persisted community templates, newest first. */
export function getCommunityTemplates(): CommunityHuntTemplate[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(COMMUNITY_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidCommunityTemplate).sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (error) {
    logger.warn('Failed to read community templates from localStorage:', error);
    return [];
  }
}

export function getCommunityTemplateBySlug(slug: string): CommunityHuntTemplate | undefined {
  return getCommunityTemplates().find((template) => template.slug === slug);
}

/**
 * Validates a community submission, returning a human-readable error string
 * when the input is not publishable, or `null` when it is valid.
 */
export function validateCommunityTemplateInput(input: CommunityTemplateInput): string | null {
  if (input.title.trim().length < 4) {
    return 'Template title must be at least 4 characters.';
  }
  if (input.description.trim().length < 8) {
    return 'Template description must be at least 8 characters.';
  }
  if (input.category.trim().length === 0) {
    return 'Please choose a category.';
  }
  if (input.author.trim().length < 2) {
    return 'Please add your name so others can credit you.';
  }

  const filledClues = input.clues.filter(
    (clue) => clue.title.trim() && clue.description.trim() && clue.code.trim()
  );
  if (filledClues.length < MIN_TEMPLATE_CLUES) {
    return `Add at least ${MIN_TEMPLATE_CLUES} complete clues (title, description, and answer).`;
  }

  return null;
}

/**
 * Persists a validated community template. Returns the saved template, or
 * throws with a validation message when the input is invalid.
 */
export function addCommunityTemplate(input: CommunityTemplateInput): CommunityHuntTemplate {
  const validationError = validateCommunityTemplateInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const existing = getCommunityTemplates();
  const baseSlug = slugify(input.title) || 'community-template';

  // Guarantee a unique slug even when titles collide.
  let slug = baseSlug;
  let suffix = 2;
  const taken = new Set(existing.map((template) => template.slug));
  while (taken.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const template: CommunityHuntTemplate = {
    slug,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    estimatedDuration: input.estimatedDuration.trim() || '30-45 min',
    author: input.author.trim(),
    isCommunity: true,
    submittedAt: Date.now(),
    clues: input.clues
      .filter((clue) => clue.title.trim() && clue.description.trim() && clue.code.trim())
      .map((clue) => ({
        title: clue.title.trim(),
        description: clue.description.trim(),
        code: clue.code.trim(),
        ...(clue.link?.trim() ? { link: clue.link.trim() } : {}),
      })),
  };

  if (isBrowser()) {
    try {
      window.localStorage.setItem(
        COMMUNITY_TEMPLATES_STORAGE_KEY,
        JSON.stringify([template, ...existing])
      );
    } catch (error) {
      logger.warn('Failed to persist community template:', error);
      throw new Error('Could not save your template. Please try again.');
    }
  }

  return template;
}
