import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({
  getDb: () => new Proxy({}, { get: () => async () => [] }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import {
  clearSubscriptionStore,
  getSubscriptionCount,
  getAllSubscriptions,
  getSubscriptionsForWallet,
  getSubscriptionsByWallets,
  removeSubscription,
  removeSubscriptionsForWallet,
  upsertSubscription,
} from "../subscriptionStore"

const WALLET_A = "GALICE0000000000000000000000000000000000000000000000"
const WALLET_B = "GBOBBY0000000000000000000000000000000000000000000000"

function subscriptionFor(endpoint: string) {
  return {
    endpoint,
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  }
}

describe("subscriptionStore", () => {
  beforeEach(() => {
    clearSubscriptionStore()
    vi.resetModules()
  })

  describe("upsertSubscription", () => {
    it("adds a subscription to the store", async () => {
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      const subs = await getSubscriptionsForWallet(WALLET_A)
      expect(subs).toHaveLength(1)
      expect(subs[0].subscription.endpoint).toBe("https://push.example.com/a1")
    })

    it("updates an existing subscription by endpoint", async () => {
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A, {
        huntStart: false,
      })
      const subs = await getSubscriptionsForWallet(WALLET_A)
      expect(subs).toHaveLength(1)
      expect(subs[0].preferences?.huntStart).toBe(false)
    })

    it("preserves registeredAt on update", async () => {
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      const first = await getSubscriptionsForWallet(WALLET_A)
      const firstTime = first[0].registeredAt

      // Wait a tick so the timestamp would differ if it were regenerated
      await new Promise((r) => setTimeout(r, 10))

      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      const updated = await getSubscriptionsForWallet(WALLET_A)
      expect(updated[0].registeredAt).toBe(firstTime)
    })

    it("keeps existing preferences when none are provided on update", async () => {
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A, {
        huntStart: true,
      })
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      const subs = await getSubscriptionsForWallet(WALLET_A)
      expect(subs[0].preferences?.huntStart).toBe(true)
    })

    it("ignores subscriptions without an endpoint", async () => {
      // @ts-expect-error – testing invalid input
      await upsertSubscription({ keys: {} }, WALLET_A)
      const count = await getSubscriptionCount()
      expect(count).toBe(0)
    })
  })

  describe("removeSubscription", () => {
    it("removes a subscription by endpoint", async () => {
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      expect(await getSubscriptionCount()).toBe(1)

      await removeSubscription("https://push.example.com/a1")
      expect(await getSubscriptionCount()).toBe(0)
      expect(await getSubscriptionsForWallet(WALLET_A)).toHaveLength(0)
    })

    it("is idempotent for unknown endpoints", async () => {
      await removeSubscription("https://push.example.com/unknown")
      expect(await getSubscriptionCount()).toBe(0)
    })
  })

  describe("removeSubscriptionsForWallet", () => {
    it("removes all subscriptions for a wallet", async () => {
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      await upsertSubscription(subscriptionFor("https://push.example.com/a2"), WALLET_A)
      await upsertSubscription(subscriptionFor("https://push.example.com/b1"), WALLET_B)
      expect(await getSubscriptionCount()).toBe(3)

      await removeSubscriptionsForWallet(WALLET_A)
      expect(await getSubscriptionCount()).toBe(1)
      expect(await getSubscriptionsForWallet(WALLET_A)).toHaveLength(0)
      expect(await getSubscriptionsForWallet(WALLET_B)).toHaveLength(1)
    })
  })

  describe("getSubscriptionsForWallet", () => {
    it("returns an empty array for an unknown wallet", async () => {
      const subs = await getSubscriptionsForWallet("GUNKNOWN0000000000000000000000000000000000000000000000")
      expect(subs).toHaveLength(0)
    })

    it("is case-insensitive for wallet addresses", async () => {
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      const subs = await getSubscriptionsForWallet(WALLET_A.toUpperCase())
      expect(subs).toHaveLength(1)
    })
  })

  describe("getSubscriptionsByWallets", () => {
    it("returns subscriptions for multiple wallets", async () => {
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      await upsertSubscription(subscriptionFor("https://push.example.com/b1"), WALLET_B)

      const subs = await getSubscriptionsByWallets([WALLET_A, WALLET_B])
      expect(subs).toHaveLength(2)
    })

    it("returns an empty array for an empty wallet list", async () => {
      const subs = await getSubscriptionsByWallets([])
      expect(subs).toHaveLength(0)
    })
  })

  describe("getAllSubscriptions", () => {
    it("returns all stored subscriptions", async () => {
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      await upsertSubscription(subscriptionFor("https://push.example.com/b1"), WALLET_B)

      const all = await getAllSubscriptions()
      expect(all).toHaveLength(2)
    })
  })

  describe("getSubscriptionCount", () => {
    it("returns the number of stored subscriptions", async () => {
      expect(await getSubscriptionCount()).toBe(0)
      await upsertSubscription(subscriptionFor("https://push.example.com/a1"), WALLET_A)
      expect(await getSubscriptionCount()).toBe(1)
    })
  })
})
