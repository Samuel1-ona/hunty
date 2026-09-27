import { NextResponse } from "next/server"

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || "com.yourorg.hunty"

export function GET() {
  if (!APPLE_TEAM_ID) {
    return NextResponse.json(
      {
        error:
          "Apple Universal Links are not configured. Add APPLE_TEAM_ID (your 10-character Apple Team ID) to environment variables.",
      },
      { status: 503 }
    )
  }

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`,
            paths: ["/hunt", "/hunt/*"],
          },
        ],
      },
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  )
}

