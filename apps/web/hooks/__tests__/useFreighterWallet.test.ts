import * as freighterApi from "@stellar/freighter-api"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest"

import * as walletAdapter from "@/lib/walletAdapter"

import { useFreighterWallet } from "../useFreighterWallet"

let watchCallback: ((args: { address: string; network: string; networkPassphrase: string }) => void) | null = null
const mockStop = vi.fn()

vi.mock("@/lib/walletAdapter", () => ({
  connectWalletProvider: vi.fn(),
  getStoredWalletSession: vi.fn(),
  setStoredWalletSession: vi.fn(),
  clearStoredWalletSession: vi.fn(),
}))

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  requestAccess: vi.fn(),
  WatchWalletChanges: vi.fn().mockImplementation(function (this: any) {
    this.watch = (callback: typeof watchCallback) => {
      watchCallback = callback
    }
    this.stop = mockStop
  }),
}))

const storage: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value }),
  removeItem: vi.fn((key: string) => { delete storage[key] }),
  clear: vi.fn(() => { Object.keys(storage).forEach((key) => delete storage[key]) }),
}

function resetMocks() {
  Object.keys(storage).forEach((key) => delete storage[key])
  watchCallback = null
  mockStop.mockClear()

  vi.mocked(walletAdapter.getStoredWalletSession).mockReset()
  vi.mocked(walletAdapter.connectWalletProvider).mockReset()
  vi.mocked(walletAdapter.setStoredWalletSession).mockReset()
  vi.mocked(walletAdapter.clearStoredWalletSession).mockReset()

  vi.mocked(freighterApi.isConnected).mockReset()
  vi.mocked(freighterApi.getAddress).mockReset()
  vi.mocked(freighterApi.requestAccess).mockReset()
  vi.mocked(freighterApi.WatchWalletChanges).mockReset()

  // Re-establish mock implementations
  vi.mocked(freighterApi.WatchWalletChanges).mockImplementation(function (this: any) {
    this.watch = (callback: any) => {
      watchCallback = callback
    }
    this.stop = mockStop
  })
}

describe("useFreighterWallet", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock)
    resetMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("restores a persisted wallet session and updates state", async () => {
    const getStoredWalletSessionMock = vi.mocked(walletAdapter.getStoredWalletSession)
    const connectWalletProviderMock = vi.mocked(walletAdapter.connectWalletProvider)
    const setStoredWalletSessionMock = vi.mocked(walletAdapter.setStoredWalletSession)
    const isConnectedMock = vi.mocked(freighterApi.isConnected)

    getStoredWalletSessionMock.mockReturnValue({ provider: "freighter", publicKey: "GABCDEF1234567890" })
    connectWalletProviderMock.mockResolvedValue("GABCDEF1234567890")
    isConnectedMock.mockResolvedValue({ isConnected: true })

    const { result } = renderHook(() => useFreighterWallet())

    await waitFor(() => expect(result.current.connected).toBe(true))

    expect(result.current.publicKey).toBe("GABCDEF1234567890")
    expect(result.current.walletProvider).toBe("freighter")
    expect(localStorageMock.setItem).toHaveBeenCalledWith("freighter_public_key", "GABCDEF1234567890")
    expect(setStoredWalletSessionMock).toHaveBeenCalledWith("freighter", "GABCDEF1234567890")
  })

  it("returns a useful error when Freighter is not installed", async () => {
    const isConnectedMock = vi.mocked(freighterApi.isConnected)
    const requestAccessMock = vi.mocked(freighterApi.requestAccess)

    isConnectedMock.mockResolvedValue({ isConnected: false })
    requestAccessMock.mockResolvedValue({ address: "", error: "No extension" })

    const { result } = renderHook(() => useFreighterWallet())

    let connectResult: { error?: string } | undefined
    await act(async () => {
      connectResult = await result.current.connect()
    })

    expect(connectResult).toEqual({ error: "Freighter extension not found. Please install it from freighter.app" })
    expect(result.current.connected).toBe(false)
  })

  it("connects using Freighter and persists the session", async () => {
    const isConnectedMock = vi.mocked(freighterApi.isConnected)
    const requestAccessMock = vi.mocked(freighterApi.requestAccess)
    const setStoredWalletSessionMock = vi.mocked(walletAdapter.setStoredWalletSession)

    isConnectedMock.mockResolvedValue({ isConnected: true })
    requestAccessMock.mockResolvedValue({ address: "GNEWADDRESS123", error: undefined })

    const { result } = renderHook(() => useFreighterWallet())

    await act(async () => {
      const response = await result.current.connect()
      expect(response).toEqual({})
    })

    expect(result.current.connected).toBe(true)
    expect(result.current.publicKey).toBe("GNEWADDRESS123")
    expect(result.current.walletProvider).toBe("freighter")
    expect(localStorageMock.setItem).toHaveBeenCalledWith("freighter_public_key", "GNEWADDRESS123")
    expect(setStoredWalletSessionMock).toHaveBeenCalledWith("freighter", "GNEWADDRESS123")
  })

  it("disconnects and cleans up storage state", async () => {
    const isConnectedMock = vi.mocked(freighterApi.isConnected)
    const requestAccessMock = vi.mocked(freighterApi.requestAccess)
    const clearStoredWalletSessionMock = vi.mocked(walletAdapter.clearStoredWalletSession)

    isConnectedMock.mockResolvedValue({ isConnected: true })
    requestAccessMock.mockResolvedValue({ address: "GTESTADDRESS123", error: undefined })

    const { result } = renderHook(() => useFreighterWallet())

    await act(async () => {
      await result.current.connect()
    })

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.publicKey).toBe("")
    expect(result.current.walletProvider).toBe(null)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("freighter_public_key")
    expect(clearStoredWalletSessionMock).toHaveBeenCalled()
  })

  it("updates state when WatchWalletChanges reports an address change", async () => {
    const isConnectedMock = vi.mocked(freighterApi.isConnected)
    const requestAccessMock = vi.mocked(freighterApi.requestAccess)

    isConnectedMock.mockResolvedValue({ isConnected: true })
    requestAccessMock.mockResolvedValue({ address: "GSTART123", error: undefined })

    const { result } = renderHook(() => useFreighterWallet())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.publicKey).toBe("GSTART123")

    await act(async () => {
      watchCallback?.({ address: "GCHANGED456", network: "Public Global Stellar Network ; September 2015", networkPassphrase: "Public Global Stellar Network ; September 2015" })
    })

    expect(result.current.publicKey).toBe("GCHANGED456")
    expect(result.current.connected).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith("freighter_public_key", "GCHANGED456")
  })

  it("stops the watcher when the hook unmounts", () => {
    const isConnectedMock = vi.mocked(freighterApi.isConnected)
    const requestAccessMock = vi.mocked(freighterApi.requestAccess)

    isConnectedMock.mockResolvedValue({ isConnected: true })
    requestAccessMock.mockResolvedValue({ address: "GSTART123", error: undefined })

    const { unmount } = renderHook(() => useFreighterWallet())
    unmount()

    expect(mockStop).toHaveBeenCalled()
  })
})
