import { describe, it, expect, beforeEach } from "vitest"
import { useWalletStore } from "../wallets/walletStore"

// Reset zustand store state before each test
beforeEach(() => {
  useWalletStore.setState({
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

  describe("setConnected", () => {
    it("marks wallet as connected and sets publicKey and provider", () => {
      useWalletStore.getState().setConnected("GTEST123", "freighter")
      const state = useWalletStore.getState()
      expect(state.connected).toBe(true)
      expect(state.publicKey).toBe("GTEST123")
      expect(state.provider).toBe("freighter")
      expect(state.lastUsedProvider).toBe("freighter")
      expect(state.connecting).toBe(false)
      expect(state.error).toBeNull()
    })

    it("persists lastUsedProvider when changed", () => {
      useWalletStore.getState().setConnected("GALB123", "albedo")
      expect(useWalletStore.getState().lastUsedProvider).toBe("albedo")
    })
  })

  describe("setDisconnected", () => {
    it("clears connection state but preserves lastUsedProvider", () => {
      useWalletStore.getState().setConnected("GTEST123", "xbull")
      useWalletStore.getState().setDisconnected()

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

  describe("setConnecting", () => {
    it("sets connecting flag and clears error", () => {
      useWalletStore.setState({ error: "previous error" })
      useWalletStore.getState().setConnecting(true)
      const state = useWalletStore.getState()
      expect(state.connecting).toBe(true)
      expect(state.error).toBeNull()
    })

    it("can clear connecting flag", () => {
      useWalletStore.getState().setConnecting(true)
      useWalletStore.getState().setConnecting(false)
      expect(useWalletStore.getState().connecting).toBe(false)
    })
  })

  describe("setError", () => {
    it("stores error and clears connecting flag", () => {
      useWalletStore.setState({ connecting: true })
      useWalletStore.getState().setError("Connection failed")
      const state = useWalletStore.getState()
      expect(state.error).toBe("Connection failed")
      expect(state.connecting).toBe(false)
    })

    it("can clear error by passing null", () => {
      useWalletStore.getState().setError("some error")
      useWalletStore.getState().setError(null)
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
      const store = useWalletStore.getState()

      // Start connecting
      store.setConnecting(true)
      expect(useWalletStore.getState().connecting).toBe(true)

      // Connection succeeds
      store.setConnected("GFREIGHTER123", "freighter")
      let state = useWalletStore.getState()
      expect(state.connected).toBe(true)
      expect(state.publicKey).toBe("GFREIGHTER123")
      expect(state.provider).toBe("freighter")
      expect(state.lastUsedProvider).toBe("freighter")

      // Disconnect
      store.setDisconnected()
      state = useWalletStore.getState()
      expect(state.connected).toBe(false)
      expect(state.publicKey).toBe("")
      expect(state.provider).toBeNull()
      // lastUsedProvider preserved
      expect(state.lastUsedProvider).toBe("freighter")
    })

    it("error during connect sets error and stops connecting", () => {
      const store = useWalletStore.getState()
      store.setConnecting(true)
      store.setError("Extension not found")
      const state = useWalletStore.getState()
      expect(state.error).toBe("Extension not found")
      expect(state.connecting).toBe(false)
      expect(state.connected).toBe(false)
    })
  })
})
