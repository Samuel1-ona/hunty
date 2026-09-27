import { describe, it, expect, beforeEach, vi } from "vitest"

describe("Apple App Site Association (.well-known/apple-app-site-association)", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.APPLE_TEAM_ID
    delete process.env.IOS_BUNDLE_ID
  })

  it("returns 200 with correct JSON when APPLE_TEAM_ID is set", async () => {
    process.env.APPLE_TEAM_ID = "ABC123XYZ"
    process.env.IOS_BUNDLE_ID = "com.hunty.app"
    const { GET } = await import("@/app/.well-known/apple-app-site-association/route")
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.applinks.details[0].appID).toBe("ABC123XYZ.com.hunty.app")
    expect(body.applinks.details[0].paths).toEqual(["/hunt", "/hunt/*"])
    expect(response.headers.get("Content-Type")).toMatch(/application\/json/)
  })

  it("returns 200 with default bundle ID when IOS_BUNDLE_ID is not set", async () => {
    process.env.APPLE_TEAM_ID = "ABC123XYZ"
    const { GET } = await import("@/app/.well-known/apple-app-site-association/route")
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.applinks.details[0].appID).toBe("ABC123XYZ.com.yourorg.hunty")
  })

  it("returns 503 when APPLE_TEAM_ID is missing", async () => {
    const { GET } = await import("@/app/.well-known/apple-app-site-association/route")
    const response = await GET()
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body).toHaveProperty("error")
  })
})

describe("Android Asset Links (.well-known/assetlinks.json)", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.ANDROID_SHA256_CERT_FINGERPRINTS
    delete process.env.ANDROID_PACKAGE_NAME
  })

  it("returns 200 with correct JSON when fingerprints are set", async () => {
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS = "AA:BB:CC:DD,11:22:33:44"
    process.env.ANDROID_PACKAGE_NAME = "com.hunty.app"
    const { GET } = await import("@/app/.well-known/assetlinks.json/route")
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
    expect(body[0].relation).toEqual(["delegate_permission/common.handle_all_urls"])
    expect(body[0].target.package_name).toBe("com.hunty.app")
    expect(body[0].target.sha256_cert_fingerprints).toEqual(["AA:BB:CC:DD", "11:22:33:44"])
  })

  it("returns 200 with default package name when ANDROID_PACKAGE_NAME is not set", async () => {
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS = "AA:BB:CC:DD"
    const { GET } = await import("@/app/.well-known/assetlinks.json/route")
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body[0].target.package_name).toBe("com.yourorg.hunty")
  })

  it("returns 503 when ANDROID_SHA256_CERT_FINGERPRINTS is missing", async () => {
    const { GET } = await import("@/app/.well-known/assetlinks.json/route")
    const response = await GET()
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body).toHaveProperty("error")
  })

  it("returns 503 when ANDROID_SHA256_CERT_FINGERPRINTS is empty", async () => {
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS = ""
    const { GET } = await import("@/app/.well-known/assetlinks.json/route")
    const response = await GET()
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body).toHaveProperty("error")
  })
})
