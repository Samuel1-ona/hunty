import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  readReviewsSync,
  writeReviewsSync,
  readReviews,
  writeReviews,
  readCompletionsSync,
  readCompletions,
  writeCompletions,
  getHuntsWithRatings,
} from "../reviews"
import { addHunt } from "../huntStore"
import type { HuntReview, StoredHunt } from "../types"

// Import route handlers
import { POST as completePost } from "@/app/api/v1/hunts/[id]/complete/route"
import { GET as reviewsGet, POST as reviewsPost } from "@/app/api/v1/hunts/[id]/reviews/route"
import { POST as moderatePost } from "@/app/api/v1/hunts/[id]/reviews/[reviewId]/moderate/route"

describe("Hunt Reviews System Helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("Synchronous Storage", () => {
    it("should read empty reviews when storage is empty", () => {
      const reviews = readReviewsSync()
      expect(reviews).toEqual([])
    })

    it("should write and read reviews correctly", () => {
      const review: HuntReview = {
        id: "r1",
        huntId: 1,
        playerAddress: "0xPlayer",
        rating: 5,
        text: "Amazing!",
        createdAt: Date.now(),
      }
      writeReviewsSync([review])
      const retrieved = readReviewsSync()
      expect(retrieved).toEqual([review])
    })

    it("should read empty completions when storage is empty", () => {
      const completions = readCompletionsSync()
      expect(completions).toEqual({})
    })
  })

  describe("Asynchronous Storage", () => {
    it("should read empty reviews asynchronously", async () => {
      const reviews = await readReviews()
      expect(reviews).toEqual([])
    })

    it("should write and read reviews asynchronously", async () => {
      const review: HuntReview = {
        id: "r2",
        huntId: 2,
        playerAddress: "0xPlayer2",
        rating: 4,
        text: "Fun!",
        createdAt: Date.now(),
      }
      await writeReviews([review])
      const retrieved = await readReviews()
      expect(retrieved).toEqual([review])
    })

    it("should read and write completions asynchronously", async () => {
      const completions = {
        1: { "0xPlayer": true },
      }
      await writeCompletions(completions)
      const retrieved = await readCompletions()
      expect(retrieved).toEqual(completions)
    })
  })

  describe("getHuntsWithRatings", () => {
    const mockHunts: StoredHunt[] = [
      {
        id: 1,
        title: "Hunt 1",
        description: "Desc 1",
        cluesCount: 2,
        status: "Active",
        rewardType: "XLM",
      },
      {
        id: 2,
        title: "Hunt 2",
        description: "Desc 2",
        cluesCount: 3,
        status: "Active",
        rewardType: "NFT",
      },
    ]

    it("should return hunts with undefined ratings if no reviews exist", () => {
      const result = getHuntsWithRatings(mockHunts)
      expect(result[0].averageRating).toBeUndefined()
      expect(result[0].reviewCount).toBe(0)
      expect(result[1].averageRating).toBeUndefined()
      expect(result[1].reviewCount).toBe(0)
    })

    it("should compute average rating and count correctly", () => {
      const reviews: HuntReview[] = [
        {
          id: "1",
          huntId: 1,
          playerAddress: "p1",
          rating: 5,
          createdAt: Date.now(),
        },
        {
          id: "2",
          huntId: 1,
          playerAddress: "p2",
          rating: 4,
          createdAt: Date.now(),
        },
        {
          id: "3",
          huntId: 2,
          playerAddress: "p3",
          rating: 3,
          createdAt: Date.now(),
        },
      ]
      writeReviewsSync(reviews)

      const result = getHuntsWithRatings(mockHunts)
      expect(result[0].averageRating).toBe(4.5)
      expect(result[0].reviewCount).toBe(2)
      expect(result[1].averageRating).toBe(3)
      expect(result[1].reviewCount).toBe(1)
    })

    it("should exclude moderated reviews", () => {
      const reviews: HuntReview[] = [
        {
          id: "1",
          huntId: 1,
          playerAddress: "p1",
          rating: 5,
          createdAt: Date.now(),
        },
        {
          id: "2",
          huntId: 1,
          playerAddress: "p2",
          rating: 1,
          moderated: true,
          createdAt: Date.now(),
        },
      ]
      writeReviewsSync(reviews)

      const result = getHuntsWithRatings(mockHunts)
      expect(result[0].averageRating).toBe(5)
      expect(result[0].reviewCount).toBe(1)
    })
  })
})

describe("Hunt Reviews System API Routes", () => {
  beforeEach(() => {
    localStorage.clear()
    // Seed some hunts
    const testHunt: StoredHunt = {
      id: 100,
      title: "Test Hunt",
      description: "A test hunt",
      cluesCount: 1,
      status: "Active",
      rewardType: "XLM",
      creator: "0xCreator",
    }
    addHunt(testHunt)
  })

  describe("POST /api/v1/hunts/[id]/complete", () => {
    it("should fail with 400 if playerAddress is missing", async () => {
      const req = new Request("http://localhost/api/v1/hunts/100/complete", {
        method: "POST",
        body: JSON.stringify({}),
      })
      const res = await completePost(req, { params: Promise.resolve({ id: "100" }) })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe("Invalid player address")
    })

    it("should successfully record completion", async () => {
      const req = new Request("http://localhost/api/v1/hunts/100/complete", {
        method: "POST",
        body: JSON.stringify({ playerAddress: "0xPlayerAddress" }),
      })
      const res = await completePost(req, { params: Promise.resolve({ id: "100" }) })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)

      const completions = await readCompletions()
      expect(completions[100]["0xPlayerAddress"]).toBe(true)
    })
  })

  describe("GET /api/v1/hunts/[id]/reviews", () => {
    it("should return empty reviews list initially", async () => {
      const req = new Request("http://localhost/api/v1/hunts/100/reviews", {
        method: "GET",
      })
      const res = await reviewsGet(req, { params: Promise.resolve({ id: "100" }) })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
    })

    it("should return active reviews and filter moderated ones", async () => {
      const review1: HuntReview = {
        id: "r1",
        huntId: 100,
        playerAddress: "p1",
        rating: 5,
        text: "Nice",
        createdAt: Date.now(),
      }
      const review2: HuntReview = {
        id: "r2",
        huntId: 100,
        playerAddress: "p2",
        rating: 1,
        text: "Bad",
        moderated: true,
        createdAt: Date.now(),
      }
      const review3: HuntReview = {
        id: "r3",
        huntId: 101, // different hunt
        playerAddress: "p3",
        rating: 4,
        createdAt: Date.now(),
      }
      await writeReviews([review1, review2, review3])

      const req = new Request("http://localhost/api/v1/hunts/100/reviews", {
        method: "GET",
      })
      const res = await reviewsGet(req, { params: Promise.resolve({ id: "100" }) })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([review1])
    })
  })

  describe("POST /api/v1/hunts/[id]/reviews", () => {
    it("should reject review if playerAddress is missing", async () => {
      const req = new Request("http://localhost/api/v1/hunts/100/reviews", {
        method: "POST",
        body: JSON.stringify({ rating: 5 }),
      })
      const res = await reviewsPost(req, { params: Promise.resolve({ id: "100" }) })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe("Player address is required")
    })

    it("should reject review if rating is invalid", async () => {
      const req = new Request("http://localhost/api/v1/hunts/100/reviews", {
        method: "POST",
        body: JSON.stringify({ playerAddress: "p1", rating: 6 }),
      })
      const res = await reviewsPost(req, { params: Promise.resolve({ id: "100" }) })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe("Rating must be a number between 1 and 5")
    })

    it("should reject review if hunt is not completed", async () => {
      const req = new Request("http://localhost/api/v1/hunts/100/reviews", {
        method: "POST",
        body: JSON.stringify({ playerAddress: "p1", rating: 5 }),
      })
      const res = await reviewsPost(req, { params: Promise.resolve({ id: "100" }) })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toBe("You must complete this hunt before submitting a review")
    })

    it("should accept review if hunt is completed", async () => {
      // Record completion
      const completions = { 100: { p1: true } }
      await writeCompletions(completions)

      const req = new Request("http://localhost/api/v1/hunts/100/reviews", {
        method: "POST",
        body: JSON.stringify({ playerAddress: "p1", rating: 5, text: "Best ever!" }),
      })
      const res = await reviewsPost(req, { params: Promise.resolve({ id: "100" }) })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.rating).toBe(5)
      expect(body.data.text).toBe("Best ever!")
      expect(body.data.playerAddress).toBe("p1")

      // Verify stored review
      const reviews = await readReviews()
      expect(reviews.length).toBe(1)
      expect(reviews[0].rating).toBe(5)
      expect(reviews[0].text).toBe("Best ever!")
    })

    it("should prevent duplicate reviews from the same wallet", async () => {
      // Record completion
      const completions = { 100: { p1: true } }
      await writeCompletions(completions)

      // Submit first review
      const req1 = new Request("http://localhost/api/v1/hunts/100/reviews", {
        method: "POST",
        body: JSON.stringify({ playerAddress: "p1", rating: 5 }),
      })
      await reviewsPost(req1, { params: Promise.resolve({ id: "100" }) })

      // Try duplicate review
      const req2 = new Request("http://localhost/api/v1/hunts/100/reviews", {
        method: "POST",
        body: JSON.stringify({ playerAddress: "p1", rating: 4 }),
      })
      const res = await reviewsPost(req2, { params: Promise.resolve({ id: "100" }) })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe("You have already reviewed this hunt")
    })
  })

  describe("POST /api/v1/hunts/[id]/reviews/[reviewId]/moderate", () => {
    const reviewId = "test-review-id"

    beforeEach(async () => {
      const review: HuntReview = {
        id: reviewId,
        huntId: 100,
        playerAddress: "p1",
        rating: 4,
        createdAt: Date.now(),
      }
      await writeReviews([review])
    })

    it("should fail if moderator is not the creator", async () => {
      const req = new Request("http://localhost/api/v1/hunts/100/reviews/test-review-id/moderate", {
        method: "POST",
        body: JSON.stringify({ action: "delete", moderatorAddress: "0xNotCreator" }),
      })
      const res = await moderatePost(req, {
        params: Promise.resolve({ id: "100", reviewId }),
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toBe("Unauthorized: only the hunt creator can moderate reviews")
    })

    it("should successfully flag a review if creator requests", async () => {
      const req = new Request("http://localhost/api/v1/hunts/100/reviews/test-review-id/moderate", {
        method: "POST",
        body: JSON.stringify({ action: "flag", moderatorAddress: "0xCreator" }),
      })
      const res = await moderatePost(req, {
        params: Promise.resolve({ id: "100", reviewId }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.flagged).toBe(true)

      const stored = await readReviews()
      expect(stored[0].flagged).toBe(true)
    })

    it("should successfully delete a review if creator requests", async () => {
      const req = new Request("http://localhost/api/v1/hunts/100/reviews/test-review-id/moderate", {
        method: "POST",
        body: JSON.stringify({ action: "delete", moderatorAddress: "0xCreator" }),
      })
      const res = await moderatePost(req, {
        params: Promise.resolve({ id: "100", reviewId }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.moderated).toBe(true)

      const stored = await readReviews()
      expect(stored[0].moderated).toBe(true)
    })
  })
})
