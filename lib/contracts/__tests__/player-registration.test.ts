/**
 * Unit tests for player registration functionality
 * 
 * Note: These tests require a testing framework like vitest or jest to run.
 * Install with: npm install -D vitest @vitest/ui
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkRegistrationStatus,
  clearRegistrationCache,
  type PlayerProgress,
} from '../player-registration'

describe('checkRegistrationStatus', () => {
  const mockHuntId = 123
  const mockPlayerAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // 56 chars

  beforeEach(() => {
    // Clear cache before each test
    clearRegistrationCache(mockHuntId, mockPlayerAddress)
  })

  it('should return isRegistered: false when player has no progress data', async () => {
    // Mock getPlayerProgress to return null (not registered)
    const mockGetProgress = vi.fn().mockResolvedValue(null)

    const status = await checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)

    expect(status.isRegistered).toBe(false)
    expect(status.progressData).toBeUndefined()
    expect(status.loading).toBe(false)
    expect(status.error).toBeUndefined()
  })

  it('should return isRegistered: true when player has progress data', async () => {
    // Mock getPlayerProgress to return progress data
    const mockProgress: PlayerProgress = {
      hunt_id: mockHuntId,
      player: mockPlayerAddress,
      current_clue_index: 0,
      completed: false,
    }
    const mockGetProgress = vi.fn().mockResolvedValue(mockProgress)

    const status = await checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)

    expect(status.isRegistered).toBe(true)
    expect(status.progressData).toEqual(mockProgress)
    expect(status.loading).toBe(false)
    expect(status.error).toBeUndefined()
  })

  it('should return error status when query fails', async () => {
    // Mock getPlayerProgress to throw an error
    const mockGetProgress = vi.fn().mockRejectedValue(new Error('Network error'))

    const status = await checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)

    expect(status.isRegistered).toBe(false)
    expect(status.loading).toBe(false)
    expect(status.error).toBeDefined()
    expect(status.error).toContain('Network error')
  })

  it('should cache registration status to avoid redundant queries', async () => {
    // Mock getPlayerProgress to return null
    const mockGetProgress = vi.fn().mockResolvedValue(null)

    // First call
    await checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)
    expect(mockGetProgress).toHaveBeenCalledTimes(1)

    // Second call should use cache
    await checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)
    expect(mockGetProgress).toHaveBeenCalledTimes(1) // Still 1, not 2
  })

  it('should reuse one in-flight registration status request for concurrent callers', async () => {
    const mockProgress: PlayerProgress = {
      hunt_id: mockHuntId,
      player: mockPlayerAddress,
      current_clue_index: 0,
      completed: false,
    }
    let resolveProgress!: (value: PlayerProgress | null) => void
    const progressPromise = new Promise<PlayerProgress | null>((resolve) => {
      resolveProgress = resolve
    })
    const mockGetProgress = vi.fn().mockReturnValue(progressPromise)

    const firstStatus = checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)
    const secondStatus = checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)

    expect(mockGetProgress).toHaveBeenCalledTimes(1)

    resolveProgress(mockProgress)

    await expect(Promise.all([firstStatus, secondStatus])).resolves.toEqual([
      {
        isRegistered: true,
        progressData: mockProgress,
        loading: false,
      },
      {
        isRegistered: true,
        progressData: mockProgress,
        loading: false,
      },
    ])
  })

  it('should query again after cache is cleared', async () => {
    // Mock getPlayerProgress to return null
    const mockGetProgress = vi.fn().mockResolvedValue(null)

    // First call
    await checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)
    expect(mockGetProgress).toHaveBeenCalledTimes(1)

    // Clear cache
    clearRegistrationCache(mockHuntId, mockPlayerAddress)

    // Second call should query again
    await checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)
    expect(mockGetProgress).toHaveBeenCalledTimes(2)
  })

  it('should use separate cache entries for different hunt/player combinations', async () => {
    const anotherHuntId = 456
    const anotherPlayerAddress = 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY' // 56 chars

    const mockGetProgress = vi.fn().mockResolvedValue(null)

    // Call with first combination
    await checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)
    expect(mockGetProgress).toHaveBeenCalledTimes(1)

    // Call with different combination should query again
    await checkRegistrationStatus(anotherHuntId, anotherPlayerAddress, mockGetProgress)
    expect(mockGetProgress).toHaveBeenCalledTimes(2)

    // Call with first combination again should use cache
    await checkRegistrationStatus(mockHuntId, mockPlayerAddress, mockGetProgress)
    expect(mockGetProgress).toHaveBeenCalledTimes(2) // Still 2
  })
})
