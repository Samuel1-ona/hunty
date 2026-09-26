import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  followCreator,
  unfollowCreator,
  isFollowing,
  getFollowing,
  getFollowers,
  getFollowersCount,
  notifyFollowersOfNewHunt,
  getFollowNotifications,
  resetFollowsStore,
} from "@/lib/follows"

const FOLLOWER = "GALICE00000000000000000000000000000000000000000000000"
const CREATOR = "GCREATOR0000000000000000000000000000000000000000000000"
const OTHER = "GOTHER000000000000000000000000000000000000000000000000"

describe("follows domain", () => {
  beforeEach(() => resetFollowsStore())
  afterEach(() => resetFollowsStore())

  it("follows a creator and reports following", async () => {
    const record = await followCreator(FOLLOWER, CREATOR)
    expect(record.followerWallet).toBe(FOLLOWER.toLowerCase())
    expect(record.creatorWallet).toBe(CREATOR.toLowerCase())
    expect(await isFollowing(FOLLOWER, CREATOR)).toBe(true)
  })

  it("follow is idempotent", async () => {
    await followCreator(FOLLOWER, CREATOR)
    await followCreator(FOLLOWER, CREATOR)
    expect(await getFollowers(CREATOR)).toEqual([FOLLOWER.toLowerCase()])
  })

  it("unfollow removes the follow", async () => {
    await followCreator(FOLLOWER, CREATOR)
    expect(await unfollowCreator(FOLLOWER, CREATOR)).toBe(true)
    expect(await isFollowing(FOLLOWER, CREATOR)).toBe(false)
    expect(await unfollowCreator(FOLLOWER, CREATOR)).toBe(false)
  })

  it("lists following and followers", async () => {
    await followCreator(FOLLOWER, CREATOR)
    await followCreator(OTHER, CREATOR)
    expect(await getFollowing(FOLLOWER)).toEqual([CREATOR.toLowerCase()])
    expect((await getFollowers(CREATOR)).sort()).toEqual(
      [FOLLOWER.toLowerCase(), OTHER.toLowerCase()].sort()
    )
    expect(await getFollowersCount(CREATOR)).toBe(2)
  })

  it("is case-insensitive for wallets", async () => {
    await followCreator(FOLLOWER.toLowerCase(), CREATOR.toUpperCase())
    expect(await isFollowing(FOLLOWER.toUpperCase(), CREATOR.toLowerCase())).toBe(true)
  })

  it("rejects following without wallets", async () => {
    await expect(followCreator("", CREATOR)).rejects.toThrow()
    await expect(followCreator(FOLLOWER, "")).rejects.toThrow()
  })

  it("rejects following yourself", async () => {
    await expect(followCreator(FOLLOWER, FOLLOWER)).rejects.toThrow()
  })

  it("notifies followers when a creator publishes a hunt", async () => {
    await followCreator(FOLLOWER, CREATOR)
    await followCreator(OTHER, CREATOR)

    const notifications = await notifyFollowersOfNewHunt(CREATOR, { id: 42, title: "City Secrets" })

    expect(notifications).toHaveLength(2)
    expect(notifications.every((n) => n.huntId === 42 && n.huntTitle === "City Secrets")).toBe(true)
    expect(await getFollowNotifications(FOLLOWER)).toHaveLength(1)
    expect(await getFollowNotifications(OTHER)).toHaveLength(1)
  })

  it("returns no notifications when creator has no followers", async () => {
    expect(await notifyFollowersOfNewHunt(CREATOR, { id: 1, title: "X" })).toHaveLength(0)
  })

  it("requires a numeric hunt id", async () => {
    await expect(
      notifyFollowersOfNewHunt(CREATOR, { id: NaN as unknown as number, title: "X" })
    ).rejects.toThrow()
  })

  it("does not notify followers of other creators", async () => {
    await followCreator(FOLLOWER, OTHER)
    const notifications = await notifyFollowersOfNewHunt(CREATOR, { id: 7, title: "Solo" })
    expect(notifications).toHaveLength(0)
    expect(await getFollowNotifications(FOLLOWER)).toHaveLength(0)
  })
})
