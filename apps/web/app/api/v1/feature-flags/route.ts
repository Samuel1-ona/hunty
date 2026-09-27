import { NextResponse } from "next/server"

import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getAllFeatureFlags } from "@/lib/config/feature-flags/server"

export const dynamic = "force-dynamic"

export const GET = withErrorHandling(async () => {
  const flags = getAllFeatureFlags()
  return NextResponse.json({ flags })
})
