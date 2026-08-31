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

  it("follows a creator and reports following", () => {
    const record = followCreator(FOLLOWER, CREATOR)
    expect(record.followerWallet).toBe(FOLLOWER.toLowerCase())
    expect(record.creatorWallet).toBe(CREATOR.toLowerCase())
    expect(isFollowing(FOLLOWER, CREATOR)).toBe(true)
  })

  it("follow is idempotent", () => {
    followCreator(FOLLOWER, CREATOR)
    followCreator(FOLLOWER, CREATOR)
    expect(getFollowers(CREATOR)).toEqual([FOLLOWER.toLowerCase()])
  })

  it("unfollow removes the follow", () => {
    followCreator(FOLLOWER, CREATOR)
    expect(unfollowCreator(FOLLOWER, CREATOR)).toBe(true)
    expect(isFollowing(FOLLOWER, CREATOR)).toBe(false)
    expect(unfollowCreator(FOLLOWER, CREATOR)).toBe(false)
  })

  it("lists following and followers", () => {
    followCreator(FOLLOWER, CREATOR)
    followCreator(OTHER, CREATOR)
    expect(getFollowing(FOLLOWER)).toEqual([CREATOR.toLowerCase()])
    expect(getFollowers(CREATOR).sort()).toEqual([FOLLOWER.toLowerCase(), OTHER.toLowerCase()].sort())
    expect(getFollowersCount(CREATOR)).toBe(2)
  })

  it("is case-insensitive for wallets", () => {
    followCreator(FOLLOWER.toLowerCase(), CREATOR.toUpperCase())
    expect(isFollowing(FOLLOWER.toUpperCase(), CREATOR.toLowerCase())).toBe(true)
  })

  it("rejects following without wallets", () => {
    expect(() => followCreator("", CREATOR)).toThrow()
    expect(() => followCreator(FOLLOWER, "")).toThrow()
  })

  it("rejects following yourself", () => {
    expect(() => followCreator(FOLLOWER, FOLLOWER)).toThrow()
  })

  it("notifies followers when a creator publishes a hunt", () => {
    followCreator(FOLLOWER, CREATOR)
    followCreator(OTHER, CREATOR)

    const notifications = notifyFollowersOfNewHunt(CREATOR, { id: 42, title: "City Secrets" })

    expect(notifications).toHaveLength(2)
    expect(notifications.every((n) => n.huntId === 42 && n.huntTitle === "City Secrets")).toBe(true)
    expect(getFollowNotifications(FOLLOWER)).toHaveLength(1)
    expect(getFollowNotifications(OTHER)).toHaveLength(1)
  })

  it("returns no notifications when creator has no followers", () => {
    expect(notifyFollowersOfNewHunt(CREATOR, { id: 1, title: "X" })).toHaveLength(0)
  })

  it("requires a numeric hunt id", () => {
    expect(() => notifyFollowersOfNewHunt(CREATOR, { id: NaN as unknown as number, title: "X" })).toThrow()
  })

  it("does not notify followers of other creators", () => {
    followCreator(FOLLOWER, OTHER)
    const notifications = notifyFollowersOfNewHunt(CREATOR, { id: 7, title: "Solo" })
    expect(notifications).toHaveLength(0)
    expect(getFollowNotifications(FOLLOWER)).toHaveLength(0)
  })
})
