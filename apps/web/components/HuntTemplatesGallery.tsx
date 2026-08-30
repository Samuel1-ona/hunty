'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  STARTER_HUNT_TEMPLATES,
  getTemplateCategories,
  type HuntTemplate,
} from '@/lib/huntTemplates';
import { getCommunityTemplates, type CommunityHuntTemplate } from '@/lib/communityTemplates';
import { SubmitTemplateDialog } from '@/components/SubmitTemplateDialog';

const ALL_CATEGORIES = 'All';

function TemplateCard({
  template,
  community = false,
}: {
  template: HuntTemplate | CommunityHuntTemplate;
  community?: boolean;
}) {
  return (
    <Card className="overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
      <CardHeader className="pb-4">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">
            {template.category}
          </span>
          <span>{template.estimatedDuration}</span>
          {community && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-orange-700">
              <Users className="h-3 w-3" />
              Community
            </span>
          )}
        </div>
        <CardTitle className="text-2xl text-slate-900">{template.title}</CardTitle>
        <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
          {template.description}
        </CardDescription>
        {community && 'author' in template && (
          <p className="mt-2 text-xs font-medium text-slate-500">Shared by {template.author}</p>
        )}
      </CardHeader>

      <CardContent className="pb-6">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Sample clues
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            {template.clues.map((clue, index) => (
              <li key={clue.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="leading-6">{clue.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="border-t border-slate-100 pt-6">
        <Button
          asChild
          className="w-full rounded-2xl bg-[#0C0C4F] py-6 text-base font-semibold text-white hover:bg-slate-800"
        >
          <Link href={`/hunty?template=${template.slug}`} aria-label={`Start ${template.title}`}>
            Start from Template
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function HuntTemplatesGallery() {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [communityTemplates, setCommunityTemplates] = useState<CommunityHuntTemplate[]>([]);

  // Community templates live in localStorage, so read them after mount to keep
  // the server-rendered markup and the first client render in sync.
  useEffect(() => {
    setCommunityTemplates(getCommunityTemplates());
  }, []);

  const refreshCommunityTemplates = () => setCommunityTemplates(getCommunityTemplates());

  const categories = useMemo(() => [ALL_CATEGORIES, ...getTemplateCategories()], []);

  const visibleStarters = useMemo(
    () =>
      activeCategory === ALL_CATEGORIES
        ? STARTER_HUNT_TEMPLATES
        : STARTER_HUNT_TEMPLATES.filter((template) => template.category === activeCategory),
    [activeCategory]
  );

  const visibleCommunity = useMemo(
    () =>
      activeCategory === ALL_CATEGORIES
        ? communityTemplates
        : communityTemplates.filter((template) => template.category === activeCategory),
    [activeCategory, communityTemplates]
  );

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter templates by category"
        >
          {categories.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-[#0C0C4F] bg-[#0C0C4F] text-white'
                    : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <SubmitTemplateDialog
          categories={getTemplateCategories()}
          onSubmitted={refreshCommunityTemplates}
        />
      </div>

      {visibleStarters.length === 0 && visibleCommunity.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-500">
          No templates in this category yet.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleStarters.map((template) => (
            <TemplateCard key={template.slug} template={template} />
          ))}
        </div>
      )}

      {visibleCommunity.length > 0 && (
        <section className="mt-14">
          <div className="mb-6 flex items-center gap-2 text-slate-900">
            <Users className="h-5 w-5 text-orange-500" />
            <h2 className="text-2xl font-bold">Community templates</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleCommunity.map((template) => (
              <TemplateCard key={template.slug} template={template} community />
            ))}
          </div>
        </section>
      )}

      {communityTemplates.length === 0 && (
        <div className="mt-14 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-orange-200 bg-white/70 p-10 text-center">
          <Sparkles className="h-6 w-6 text-orange-500" />
          <p className="max-w-md text-slate-600">
            Built a hunt you love? Share it as a community template so other creators can start from
            your idea.
          </p>
          <SubmitTemplateDialog
            categories={getTemplateCategories()}
            onSubmitted={refreshCommunityTemplates}
          />
        </div>
      )}
    </>
  );
}
