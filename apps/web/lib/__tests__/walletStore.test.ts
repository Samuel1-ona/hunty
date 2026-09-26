import { describe, it, expect, beforeEach } from "vitest"
import { useWalletStore } from "../wallets/walletStore"
import type { WalletState } from "../wallets/walletStore"

// Reset zustand store state before each test
beforeEach(() => {
  useWalletStore.setState({
    status: "idle",
    connected: false,
    publicKey: "",
    provider: null,
    lastUsedProvider: null,
    connecting: false,
    error: null,
  })
})

describe("useWalletStore", () => {
  it("starts disconnected with no provider", () => {
    const state = useWalletStore.getState()
    expect(state.connected).toBe(false)
    expect(state.publicKey).toBe("")
    expect(state.provider).toBeNull()
    expect(state.lastUsedProvider).toBeNull()
    expect(state.connecting).toBe(false)
    expect(state.error).toBeNull()
  })

  describe("syncFromMachine — connected", () => {
    it("marks wallet as connected and sets publicKey and provider", () => {
      useWalletStore.getState().syncFromMachine({
        status: "connected",
        publicKey: "GTEST123",
        provider: "freighter",
        error: null,
      })
      const state = useWalletStore.getState()
      expect(state.connected).toBe(true)
      expect(state.publicKey).toBe("GTEST123")
      expect(state.provider).toBe("freighter")
      expect(state.lastUsedProvider).toBe("freighter")
      expect(state.connecting).toBe(false)
      expect(state.error).toBeNull()
    })

    it("persists lastUsedProvider when changed", () => {
      useWalletStore.getState().syncFromMachine({
        status: "connected",
        publicKey: "GALB123",
        provider: "albedo",
        error: null,
      })
      expect(useWalletStore.getState().lastUsedProvider).toBe("albedo")
    })
  })

  describe("syncFromMachine — disconnected", () => {
    it("clears connection state but preserves lastUsedProvider", () => {
      // First connect
      useWalletStore.getState().syncFromMachine({
        status: "connected",
        publicKey: "GTEST123",
        provider: "xbull",
        error: null,
      })
      // Then disconnect
      useWalletStore.getState().syncFromMachine({
        status: "disconnected",
        publicKey: "",
        provider: null,
        error: null,
      })

      const state = useWalletStore.getState()
      expect(state.connected).toBe(false)
      expect(state.publicKey).toBe("")
      expect(state.provider).toBeNull()
      expect(state.connecting).toBe(false)
      expect(state.error).toBeNull()
      // lastUsedProvider should be preserved for UX
      expect(state.lastUsedProvider).toBe("xbull")
    })
  })

  describe("syncFromMachine — connecting", () => {
    it("sets connecting flag and clears error", () => {
      useWalletStore.setState({ error: "previous error" } as Partial<WalletState>)
      useWalletStore.getState().syncFromMachine({
        status: "connecting",
        publicKey: "",
        provider: null,
        error: null,
      })
      const state = useWalletStore.getState()
      expect(state.connecting).toBe(true)
      expect(state.error).toBeNull()
    })

    it("can clear connecting flag when moving to idle", () => {
      useWalletStore.getState().syncFromMachine({
        status: "connecting",
        publicKey: "",
        provider: null,
        error: null,
      })
      useWalletStore.getState().syncFromMachine({
        status: "idle",
        publicKey: "",
        provider: null,
        error: null,
      })
      expect(useWalletStore.getState().connecting).toBe(false)
    })
  })

  describe("syncFromMachine — error", () => {
    it("stores error and clears connecting flag", () => {
      useWalletStore.setState({ connecting: true } as Partial<WalletState>)
      useWalletStore.getState().syncFromMachine({
        status: "error",
        publicKey: "",
        provider: null,
        error: "Connection failed",
      })
      const state = useWalletStore.getState()
      expect(state.error).toBe("Connection failed")
      expect(state.connecting).toBe(false)
    })

    it("can clear error by transitioning back to idle", () => {
      useWalletStore.getState().syncFromMachine({
        status: "error",
        publicKey: "",
        provider: null,
        error: "some error",
      })
      useWalletStore.getState().syncFromMachine({
        status: "idle",
        publicKey: "",
        provider: null,
        error: null,
      })
      expect(useWalletStore.getState().error).toBeNull()
    })
  })

  describe("setLastUsedProvider", () => {
    it("updates lastUsedProvider without affecting connection state", () => {
      useWalletStore.getState().setLastUsedProvider("albedo")
      const state = useWalletStore.getState()
      expect(state.lastUsedProvider).toBe("albedo")
      expect(state.connected).toBe(false)
    })
  })

  describe("connection lifecycle", () => {
    it("full connect → disconnect cycle works correctly", () => {
      const { syncFromMachine } = useWalletStore.getState()

      // Start connecting
      syncFromMachine({ status: "connecting", publicKey: "", provider: null, error: null })
      expect(useWalletStore.getState().connecting).toBe(true)

      // Connection succeeds
      syncFromMachine({ status: "connected", publicKey: "GFREIGHTER123", provider: "freighter", error: null })
      let state = useWalletStore.getState()
      expect(state.connected).toBe(true)
      expect(state.publicKey).toBe("GFREIGHTER123")
      expect(state.provider).toBe("freighter")
      expect(state.lastUsedProvider).toBe("freighter")

      // Disconnect
      syncFromMachine({ status: "disconnected", publicKey: "", provider: null, error: null })
      state = useWalletStore.getState()
      expect(state.connected).toBe(false)
      expect(state.publicKey).toBe("")
      expect(state.provider).toBeNull()
      // lastUsedProvider preserved
      expect(state.lastUsedProvider).toBe("freighter")
    })

    it("error during connect sets error and stops connecting", () => {
      const { syncFromMachine } = useWalletStore.getState()
      syncFromMachine({ status: "connecting", publicKey: "", provider: null, error: null })
      syncFromMachine({ status: "error", publicKey: "", provider: null, error: "Extension not found" })
      const state = useWalletStore.getState()
      expect(state.error).toBe("Extension not found")
      expect(state.connecting).toBe(false)
      expect(state.connected).toBe(false)
    })
  })
})
