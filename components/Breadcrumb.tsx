"use client";

// components/Breadcrumb.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  generateBreadcrumbs,
  truncateBreadcrumbs,
  type BreadcrumbItem,
  type DynamicLabelResolver,
} from "@/lib/breadcrumbs";

interface BreadcrumbProps {
  /**
   * Override specific path segments with custom labels.
   * e.g. { "/hunts/abc-123": "Summer City Hunt" }
   */
  customLabels?: Record<string, string>;
  /** Custom resolver for dynamic segments (e.g. fetch hunt title by ID) */
  resolver?: DynamicLabelResolver;
  /** Max breadcrumbs before collapsing with an ellipsis (default: 4) */
  maxVisible?: number;
  /** Extra classes on the <nav> wrapper */
  className?: string;
}

/** Home icon SVG */
function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline", verticalAlign: "-2px" }}
    >
      <path
        d="M1 6.5L7 1.5L13 6.5V12.5H9.5V9H4.5V12.5H1V6.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Separator chevron */
function Chevron() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline", flexShrink: 0, opacity: 0.45 }}
    >
      <path
        d="M4 2.5L7.5 6L4 9.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Breadcrumb({
  customLabels = {},
  resolver,
  maxVisible = 4,
  className = "",
}: BreadcrumbProps) {
  const pathname = usePathname();

  const crumbs = useMemo(
    () => generateBreadcrumbs(pathname, customLabels, resolver),
    [pathname, customLabels, resolver]
  );

  const visible = useMemo(
    () => truncateBreadcrumbs(crumbs, maxVisible),
    [crumbs, maxVisible]
  );

  if (crumbs.length <= 1) return null; // Don't render on the homepage

  // --- Schema.org BreadcrumbList JSON-LD ---
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://hunty.app"}${c.href}`,
    })),
  };

  return (
    <>
      {/* Schema.org markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label="Breadcrumb"
        className={`hunty-breadcrumb ${className}`}
      >
        <ol
          itemScope
          itemType="https://schema.org/BreadcrumbList"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.25rem",
            listStyle: "none",
            margin: 0,
            padding: 0,
            fontSize: "0.8125rem", // 13px
            lineHeight: 1.4,
          }}
        >
          {visible.map((item, index) => {
            const isFirst = index === 0;

            // Ellipsis sentinel
            if ("ellipsis" in item) {
              return (
                <li
                  key="ellipsis"
                  style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
                >
                  <Chevron />
                  <span
                    aria-hidden="true"
                    title="More pages"
                    style={{
                      padding: "0.1rem 0.35rem",
                      borderRadius: "4px",
                      background: "rgba(var(--color-accent-rgb, 124,58,237), 0.08)",
                      color: "var(--color-muted, #888)",
                      cursor: "default",
                      letterSpacing: "0.05em",
                    }}
                  >
                    ···
                  </span>
                </li>
              );
            }

            const crumb = item as BreadcrumbItem;
            const position = crumbs.findIndex((c) => c.href === crumb.href) + 1;

            return (
              <li
                key={crumb.href}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
                style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
              >
                {!isFirst && <Chevron />}

                {crumb.isCurrent ? (
                  // Current page — not a link, aria-current for a11y
                  <span
                    aria-current="page"
                    itemProp="name"
                    style={{
                      color: "var(--color-foreground, #111)",
                      fontWeight: 500,
                      maxWidth: "18ch",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={crumb.label}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    itemProp="item"
                    style={{
                      color: "var(--color-muted, #666)",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      borderRadius: "4px",
                      padding: "0.1rem 0.2rem",
                      transition: "color 0.15s",
                      maxWidth: "18ch",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={crumb.label}
                    // Inline hover handled via CSS class below
                    className="breadcrumb-link"
                  >
                    {isFirst && (
                      <span style={{ marginRight: "2px" }}>
                        <HomeIcon />
                      </span>
                    )}
                    <span itemProp="name">{crumb.label}</span>
                  </Link>
                )}

                <meta itemProp="position" content={String(position)} />
              </li>
            );
          })}
        </ol>

        {/* Scoped hover styles — no CSS module needed */}
        <style>{`
          .breadcrumb-link:hover {
            color: var(--color-accent, #7c3aed) !important;
          }
          .breadcrumb-link:focus-visible {
            outline: 2px solid var(--color-accent, #7c3aed);
            outline-offset: 2px;
          }
          @media (prefers-reduced-motion: reduce) {
            .breadcrumb-link { transition: none !important; }
          }
        `}</style>
      </nav>
    </>
  );
}