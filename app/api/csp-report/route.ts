import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!rawBody) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 })
    }

    const data = JSON.parse(rawBody)
    const report = data["csp-report"]

    if (report) {
      console.warn("CSP Violation Detected:", {
        documentUri: report["document-uri"],
        referrer: report["referrer"],
        blockedUri: report["blocked-uri"],
        violatedDirective: report["violated-directive"],
        originalPolicy: report["original-policy"],
        disposition: report["disposition"],
      })
    } else {
      console.warn("Received report payload without 'csp-report' field:", data)
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Failed to process CSP report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
