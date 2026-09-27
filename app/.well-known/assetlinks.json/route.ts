import { NextResponse } from "next/server"

const ANDROID_SHA256_CERT_FINGERPRINTS = process.env.ANDROID_SHA256_CERT_FINGERPRINTS
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || "com.yourorg.hunty"

function parseFingerprints(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

export function GET() {
  if (!ANDROID_SHA256_CERT_FINGERPRINTS) {
    return NextResponse.json(
      {
        error:
          "Android App Links are not configured. Add ANDROID_SHA256_CERT_FINGERPRINTS (comma-separated SHA-256 cert fingerprints) to environment variables.",
      },
      { status: 503 }
    )
  }

  const fingerprints = parseFingerprints(ANDROID_SHA256_CERT_FINGERPRINTS)

  if (fingerprints.length === 0) {
    return NextResponse.json(
      { error: "ANDROID_SHA256_CERT_FINGERPRINTS is set but empty." },
      { status: 503 }
    )
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE_NAME,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  )
}

