import { notFound } from "next/navigation";
import Link from "next/link";
import { getHuntById } from "@/lib/huntStore";
import type { HuntStatus } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

function statusConfig(status: HuntStatus) {
  switch (status) {
    case "Active":
      return { label: "Live Now", dot: "bg-emerald-400", text: "text-emerald-600" };
    case "Completed":
      return { label: "Ended", dot: "bg-slate-400", text: "text-slate-500" };
    case "Draft":
      return { label: "Coming Soon", dot: "bg-amber-400", text: "text-amber-600" };
    case "Cancelled":
      return { label: "Cancelled", dot: "bg-red-400", text: "text-red-500" };
    default:
      return { label: status, dot: "bg-slate-400", text: "text-slate-500" };
  }
}

export default async function EmbedPage({ params }: PageProps) {
  const { id } = await params;
  const huntId = parseInt(id, 10);

  if (isNaN(huntId)) notFound();

  const hunt = getHuntById(huntId);

  if (!hunt) notFound();

  // Private hunts must not be embedded
  if (hunt.is_private) {
    return (
      <div className="embed-root private">
        <div className="lock-icon" aria-hidden="true">🔒</div>
        <p className="private-msg">This hunt is private and cannot be embedded.</p>
        <style>{embedStyles}</style>
      </div>
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app";
  const huntUrl = `${baseUrl}/hunt/${hunt.id}`;
  const { label, dot, text } = statusConfig(hunt.status as HuntStatus);

  const rewardLabel =
    hunt.rewardType === "Both"
      ? "XLM + NFT"
      : hunt.rewardType === "XLM"
      ? "XLM Reward"
      : "NFT Reward";

  return (
    <>
      {/*
        Minimal, iframe-friendly layout.
        No app shell — just the card. Tailwind is not available here
        because we're rendering inside a cross-origin iframe; we use an
        inline <style> block so the widget is fully self-contained.
      */}
      <div className="embed-root">
        {/* Cover image strip */}
        {hunt.coverImageCid && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hunt.coverImageCid}
            alt={`${hunt.title} cover`}
            className="cover"
          />
        )}

        <div className="body">
          {/* Status badge */}
          <span className={`badge ${text}`}>
            <span className={`dot ${dot}`} aria-hidden="true" />
            {label}
          </span>

          {/* Title */}
          <h1 className="title">{hunt.title}</h1>

          {/* Description */}
          {hunt.description && (
            <p className="description">{hunt.description}</p>
          )}

          {/* Meta row */}
          <div className="meta">
            <span className="meta-item">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              {hunt.cluesCount} {hunt.cluesCount === 1 ? "clue" : "clues"}
            </span>
            <span className="meta-item reward">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="7" />
                <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
              </svg>
              {rewardLabel}
            </span>
          </div>

          {/* CTA */}
          <a
            href={huntUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cta"
            aria-label={`Play ${hunt.title} on Hunty`}
          >
            {hunt.status === "Active" ? "Play Hunt →" : "View Hunt →"}
          </a>

          {/* Powered by */}
          <a
            href={baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="powered"
            aria-label="Powered by Hunty"
          >
            Powered by <strong>Hunty</strong>
          </a>
        </div>
      </div>

      <style>{embedStyles}</style>
    </>
  );
}

// Self-contained styles — no Tailwind dependency inside the iframe
const embedStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #ffffff;
    color: #1e1b4b;
  }

  @media (prefers-color-scheme: dark) {
    body { background: #0f0e1a; color: #e2e8f0; }
  }

  .embed-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100vh;
    border-radius: 12px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }

  @media (prefers-color-scheme: dark) {
    .embed-root { background: #0f0e1a; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
  }

  .embed-root.private {
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    text-align: center;
    color: #6b7280;
  }

  .lock-icon { font-size: 2rem; }
  .private-msg { font-size: 0.875rem; }

  .cover {
    width: 100%;
    height: 140px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px 20px 16px;
    flex: 1;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  .bg-emerald-400 { background-color: #34d399; }
  .bg-amber-400   { background-color: #fbbf24; }
  .bg-red-400     { background-color: #f87171; }
  .bg-slate-400   { background-color: #94a3b8; }

  .text-emerald-600 { color: #059669; }
  .text-amber-600   { color: #d97706; }
  .text-red-500     { color: #ef4444; }
  .text-slate-500   { color: #64748b; }

  @media (prefers-color-scheme: dark) {
    .text-emerald-600 { color: #34d399; }
    .text-amber-600   { color: #fbbf24; }
    .text-red-500     { color: #f87171; }
    .text-slate-500   { color: #94a3b8; }
  }

  .title {
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.3;
    color: #1e1b4b;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (prefers-color-scheme: dark) {
    .title { color: #f1f5f9; }
  }

  .description {
    font-size: 0.82rem;
    line-height: 1.55;
    color: #475569;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (prefers-color-scheme: dark) {
    .description { color: #94a3b8; }
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 2px;
  }

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    color: #64748b;
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .meta-item { color: #94a3b8; }
  }

  .meta-item.reward { color: #3737a4; }
  @media (prefers-color-scheme: dark) {
    .meta-item.reward { color: #818cf8; }
  }

  .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding: 10px 20px;
    background: linear-gradient(135deg, #3737a4, #0c0c4f);
    color: #ffffff !important;
    font-size: 0.875rem;
    font-weight: 700;
    border-radius: 10px;
    text-decoration: none;
    transition: opacity 0.15s ease;
    width: 100%;
  }

  .cta:hover { opacity: 0.88; }

  .powered {
    display: block;
    text-align: center;
    font-size: 0.68rem;
    color: #94a3b8;
    text-decoration: none;
    margin-top: 6px;
  }

  .powered:hover { color: #64748b; }
  .powered strong { color: #3737a4; }

  @media (prefers-color-scheme: dark) {
    .powered { color: #64748b; }
    .powered strong { color: #818cf8; }
  }
`;
