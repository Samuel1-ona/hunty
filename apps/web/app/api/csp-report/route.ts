import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { logger } from "@/lib/logger";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const rawBody = await req.text();
  if (!rawBody) {
    throw new ValidationError("Empty body");
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
  const report = data["csp-report"] as Record<string, unknown> | undefined;

  if (report) {
    logger.warn("CSP Violation Detected:", {
      documentUri: report["document-uri"],
      referrer: report["referrer"],
      blockedUri: report["blocked-uri"],
      violatedDirective: report["violated-directive"],
      originalPolicy: report["original-policy"],
      disposition: report["disposition"],
    });
  } else {
    logger.warn("Received report payload without 'csp-report' field:", data);
  }

  return new NextResponse(null, { status: 204 });
});
 