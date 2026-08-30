'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { autocompleteTags, normalizeTag, suggestTagsFromContent } from '@/lib/tags';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Known tags for autocomplete (from other hunts / corpus). */
  corpus?: string[];
  /** Content used to suggest tags. */
  suggestFrom?: { title?: string; description?: string; questions?: string[] };
  maxTags?: number;
  className?: string;
  placeholder?: string;
}

export function TagInput({
  tags,
  onChange,
  corpus = [],
  suggestFrom,
  maxTags = 12,
  className,
  placeholder = 'Add a tag…',
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const suggestions = useMemo(() => {
    const auto = autocompleteTags(draft, [...corpus, ...tags], 8);
    const content = suggestFrom && !draft ? suggestTagsFromContent(suggestFrom, tags, 6) : [];
    const merged = [...auto];
    for (const t of content) {
      if (!merged.includes(t) && !tags.includes(t)) merged.push(t);
    }
    return merged.filter((t) => !tags.includes(t)).slice(0, 8);
  }, [draft, corpus, tags, suggestFrom]);

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag || tags.includes(tag) || tags.length >= maxTags) return;
    onChange([...tags, tag]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-slate-200">Tags</label>
      <div className="flex flex-wrap gap-1.5 min-h-[2.25rem] rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-teal-500/20 text-teal-200 px-2 py-0.5 text-xs"
          >
            #{tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => removeTag(tag)}
              className="hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag(draft);
            } else if (e.key === 'Backspace' && !draft && tags.length) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length >= maxTags ? 'Tag limit reached' : placeholder}
          disabled={tags.length >= maxTags}
          className="flex-1 min-w-[8rem] bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-slate-500 self-center">Suggestions:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-slate-300 hover:bg-white/10"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
