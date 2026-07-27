import { rpc } from "@stellar/stellar-sdk"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }))

import { createSorobanServer } from "../client"

describe("createSorobanServer", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("creates and reuses the typed Stellar RPC server", () => {
    vi.stubEnv("NEXT_PUBLIC_SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org")

    const first = createSorobanServer()
    const second = createSorobanServer()

    expect(first).toBeInstanceOf(rpc.Server)
    expect(second).toBe(first)
    expect(first.serverURL.toString()).toContain("soroban-testnet.stellar.org")
  })
})

