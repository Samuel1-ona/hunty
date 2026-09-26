import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  clearSubscriptionStore,
  getOwnerSecretForWallet,
  getSubscriptionsForWallet,
  getSubscriptionCount,
  removeSubscription,
  removeSubscriptionsForWallet,
  upsertSubscription,
} from "../subscriptionStore"

const SUBSCRIPTION_A = {
  endpoint: "https://push.example.com/a1",
  keys: { p256dh: "p256dh-key-a", auth: "auth-key-a" },
}
const SUBSCRIPTION_B = {
  endpoint: "https://push.example.com/a2",
  keys: { p256dh: "p256dh-key-b", auth: "auth-key-b" },
}
const WALLET_A = "GALICE0000000000000000000000000000000000000000000000"
const WALLET_B = "GBOBBY0000000000000000000000000000000000000000000000"

describe("subscriptionStore", () => {
  beforeEach(() => {
    clearSubscriptionStore()
  })

  describe("upsertSubscription", () => {
    it("stores a subscription in memory", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      const records = await getSubscriptionsForWallet(WALLET_A)
      expect(records).toHaveLength(1)
      expect(records[0].subscription.endpoint).toBe(SUBSCRIPTION_A.endpoint)
      expect(records[0].walletAddress).toBe(WALLET_A.toLowerCase())
    })

    it("stores the owner secret alongside the subscription", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A, undefined, "test-secret")
      const secret = await getOwnerSecretForWallet(WALLET_A)
      expect(secret).toBe("test-secret")
    })

    it("updates an existing subscription", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      await upsertSubscription(SUBSCRIPTION_B, WALLET_A)
      const records = await getSubscriptionsForWallet(WALLET_A)
      expect(records).toHaveLength(1)
      expect(records[0].subscription.endpoint).toBe(SUBSCRIPTION_B.endpoint)
    })

    it("preserves registeredAt on update", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      const first = await getSubscriptionsForWallet(WALLET_A)
      const firstRegisteredAt = first[0].registeredAt

      await new Promise((r) => setTimeout(r, 10))
      await upsertSubscription(SUBSCRIPTION_B, WALLET_A)
      const updated = await getSubscriptionsForWallet(WALLET_A)
      expect(updated[0].registeredAt).toBe(firstRegisteredAt)
    })

    it("preserves preferences on update", async () => {
      const prefs = { enabled: true, huntEvents: false }
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A, prefs)
      await upsertSubscription(SUBSCRIPTION_B, WALLET_A)
      const records = await getSubscriptionsForWallet(WALLET_A)
      expect(records[0].preferences).toEqual(prefs)
    })

    it("no-ops when subscription has no endpoint", async () => {
      await upsertSubscription({} as any, WALLET_A)
      const count = await getSubscriptionCount()
      expect(count).toBe(0)
    })
  })

  describe("removeSubscription", () => {
    it("removes a subscription by endpoint", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      expect(await getSubscriptionCount()).toBe(1)

      await removeSubscription(SUBSCRIPTION_A.endpoint)
      expect(await getSubscriptionCount()).toBe(0)
    })

    it("is a no-op for a non-existent endpoint", async () => {
      await removeSubscription("https://push.example.com/nonexistent")
      expect(await getSubscriptionCount()).toBe(0)
    })
  })

  describe("removeSubscriptionsForWallet", () => {
    it("removes all subscriptions for a wallet", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      await upsertSubscription(SUBSCRIPTION_B, WALLET_A)
      expect(await getSubscriptionCount()).toBe(2)

      await removeSubscriptionsForWallet(WALLET_A)
      expect(await getSubscriptionCount()).toBe(0)
    })

    it("does not remove subscriptions for other wallets", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      await upsertSubscription(SUBSCRIPTION_B, WALLET_B)

      await removeSubscriptionsForWallet(WALLET_A)
      expect(await getSubscriptionCount()).toBe(1)
      const bRecords = await getSubscriptionsForWallet(WALLET_B)
      expect(bRecords).toHaveLength(1)
    })
  })

  describe("getSubscriptionsForWallet", () => {
    it("returns an empty array for an unknown wallet", async () => {
      const records = await getSubscriptionsForWallet(WALLET_A)
      expect(records).toHaveLength(0)
    })

    it("returns all subscriptions for a wallet", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      await upsertSubscription(SUBSCRIPTION_B, WALLET_A)
      const records = await getSubscriptionsForWallet(WALLET_A)
      expect(records).toHaveLength(2)
    })

    it("is case-insensitive for wallet addresses", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A.toLowerCase())
      const records = await getSubscriptionsForWallet(WALLET_A.toUpperCase())
      expect(records).toHaveLength(1)
    })
  })

  describe("getSubscriptionsByWallets", () => {
    it("returns subscriptions for multiple wallets", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      await upsertSubscription(SUBSCRIPTION_B, WALLET_B)

      const records = await getSubscriptionsByWallets([WALLET_A, WALLET_B])
      expect(records).toHaveLength(2)
    })

    it("returns an empty array for unknown wallets", async () => {
      const records = await getSubscriptionsByWallets([WALLET_A])
      expect(records).toHaveLength(0)
    })
  })

  describe("getAllSubscriptions", () => {
    it("returns all stored records", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      await upsertSubscription(SUBSCRIPTION_B, WALLET_B)
      const all = await getAllSubscriptions()
      expect(all).toHaveLength(2)
    })
  })

  describe("getSubscriptionCount", () => {
    it("returns 0 when empty", async () => {
      expect(await getSubscriptionCount()).toBe(0)
    })

    it("returns the correct count", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      await upsertSubscription(SUBSCRIPTION_B, WALLET_B)
      expect(await getSubscriptionCount()).toBe(2)
    })
  })

  describe("getOwnerSecretForWallet", () => {
    it("returns undefined for an unknown wallet", async () => {
      const secret = await getOwnerSecretForWallet(WALLET_A)
      expect(secret).toBeUndefined()
    })

    it("returns the owner secret for a registered wallet", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A, undefined, "my-secret")
      const secret = await getOwnerSecretForWallet(WALLET_A)
      expect(secret).toBe("my-secret")
    })
  })

  describe("clearSubscriptionStore", () => {
    it("resets the in-memory store", async () => {
      await upsertSubscription(SUBSCRIPTION_A, WALLET_A)
      expect(await getSubscriptionCount()).toBe(1)

      clearSubscriptionStore()
      expect(await getSubscriptionCount()).toBe(0)
    })
  })
})
