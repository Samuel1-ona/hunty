import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { logger } from "@/lib/logger";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum accepted body size for a CSP report.
 * The W3C CSP spec report payload is tiny; 16 KB is already very generous.
 */
const MAX_BODY_BYTES = 16 * 1024; // 16 KB

/**
 * Rate limit: at most 30 reports per IP per minute.
 * A real browser sends at most one report per policy violation per page load,
 * so 30/min per IP is more than sufficient for legitimate traffic.
 */
const RATE_LIMIT_CONFIG = { limit: 30, windowMs: 60 * 1_000 };

/**
 * Log only 1-in-N valid reports to avoid log flooding while preserving signal.
 * Set CSP_REPORT_SAMPLE_RATE=1 in the environment to log every report (e.g.
 * during initial CSP tuning).
 */
const SAMPLE_RATE = (() => {
  const env = parseInt(process.env.CSP_REPORT_SAMPLE_RATE ?? "10", 10);
  return Number.isFinite(env) && env > 0 ? env : 10;
})();

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/**
 * Zod schema for the nested "csp-report" object as defined by the W3C
 * Content Security Policy Level 2 spec §7.3.
 * All fields are optional because older / spec-non-compliant browsers may
 * omit some of them; we only validate the shape of what is present.
 */
const CspReportSchema = z.object({
  "document-uri": z.string().max(2_048).optional(),
  referrer: z.string().max(2_048).optional(),
  "blocked-uri": z.string().max(2_048).optional(),
  "violated-directive": z.string().max(256).optional(),
  "effective-directive": z.string().max(256).optional(),
  "original-policy": z.string().max(8_192).optional(),
  disposition: z.enum(["enforce", "report"]).optional(),
  "status-code": z.number().int().min(0).max(999).optional(),
  "script-sample": z.string().max(40).optional(),
  "source-file": z.string().max(2_048).optional(),
  "line-number": z.number().int().min(0).optional(),
  "column-number": z.number().int().min(0).optional(),
});

/**
 * Top-level envelope sent by the browser:
 *   { "csp-report": { ... } }
 */
const CspReportEnvelopeSchema = z.object({
  "csp-report": CspReportSchema,
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const POST = withErrorHandling(async (req: NextRequest) => {
  // 1. Rate limiting — applied before reading the body to keep overhead minimal.
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, RATE_LIMIT_CONFIG);
  if (!success) {
    return rateLimitResponse(reset);
  }

  // 2. Body size cap — read raw text and reject anything too large.
  //    We read as text so we can validate JSON ourselves (no body-parser magic).
  const rawBody = await req.text();

  if (!rawBody) {
    throw new ValidationError("Empty body");
  }

  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    throw new ValidationError("Payload too large");
  }

  // 3. JSON parse.
  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new ValidationError("Invalid JSON body");
  }

  // 4. Schema validation — reject structurally invalid reports immediately.
  const parsed = CspReportEnvelopeSchema.safeParse(data);
  if (!parsed.success) {
    // Return 400 but don't log attacker-controlled content verbatim.
    throw new ValidationError("Invalid CSP report payload");
  }

  // 5. Sampling — log only 1-in-SAMPLE_RATE reports to limit log volume.
  //    A deterministic hash on (ip, blocked-uri) would give consistent
  //    sampling per source, but random sampling is simpler and equally
  //    effective for aggregating signal across many reporters.
  if (Math.random() * SAMPLE_RATE < 1) {
    const report = parsed.data["csp-report"];
    logger.warn("CSP Violation Detected:", {
      documentUri: report["document-uri"],
      referrer: report["referrer"],
      blockedUri: report["blocked-uri"],
      violatedDirective: report["violated-directive"],
      originalPolicy: report["original-policy"],
      disposition: report["disposition"],
      sourceFile: report["source-file"],
      lineNumber: report["line-number"],
    });
  }

  return new NextResponse(null, { status: 204 });
});
