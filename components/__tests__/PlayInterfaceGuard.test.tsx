/**
 * Unit tests for PlayInterfaceGuard component
 * 
 * Tests verify that the component correctly:
 * - Checks registration status before rendering
 * - Displays registration prompt for unregistered players
 * - Renders play interface only for registered players
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PlayInterfaceGuard } from '../PlayInterfaceGuard'
import * as playerRegistration from '@/lib/contracts/player-registration'

// Mock the player registration module
vi.mock('@/lib/contracts/player-registration', () => ({
  checkRegistrationStatus: vi.fn(),
  RegistrationStatus: {},
}))

// Mock the RegistrationButton component
vi.mock('@/components/RegistrationButton', () => ({
  RegistrationButton: ({ huntId, playerAddress }: { huntId: number; playerAddress: string }) => (
    <div data-testid="registration-button">
      Registration Button for Hunt {huntId} and Player {playerAddress}
    </div>
  ),
}))

describe('PlayInterfaceGuard', () => {
  const mockHuntId = 123
  const mockPlayerAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  const mockChildren = <div data-testid="play-interface">Play Interface Content</div>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state while checking registration status', async () => {
    // Mock checkRegistrationStatus to return loading state
    vi.mocked(playerRegistration.checkRegistrationStatus).mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    )

    render(
      <PlayInterfaceGuard huntId={mockHuntId} playerAddress={mockPlayerAddress}>
        {mockChildren}
      </PlayInterfaceGuard>
    )

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('play-interface')).not.toBeInTheDocument()
    expect(screen.queryByTestId('registration-button')).not.toBeInTheDocument()
  })

  it('should display registration prompt for unregistered players', async () => {
    // Mock checkRegistrationStatus to return unregistered status
    vi.mocked(playerRegistration.checkRegistrationStatus).mockResolvedValue({
      isRegistered: false,
      loading: false,
    })

    render(
      <PlayInterfaceGuard huntId={mockHuntId} playerAddress={mockPlayerAddress}>
        {mockChildren}
      </PlayInterfaceGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('Join This Hunt')).toBeInTheDocument()
    })

    expect(screen.getByText(/You need to register for this hunt/)).toBeInTheDocument()
    expect(screen.getByTestId('registration-button')).toBeInTheDocument()
    expect(screen.queryByTestId('play-interface')).not.toBeInTheDocument()
  })

  it('should render play interface for registered players', async () => {
    // Mock checkRegistrationStatus to return registered status
    vi.mocked(playerRegistration.checkRegistrationStatus).mockResolvedValue({
      isRegistered: true,
      loading: false,
      progressData: {
        hunt_id: mockHuntId,
        player: mockPlayerAddress,
        current_clue_index: 0,
        completed: false,
      },
    })

    render(
      <PlayInterfaceGuard huntId={mockHuntId} playerAddress={mockPlayerAddress}>
        {mockChildren}
      </PlayInterfaceGuard>
    )

    await waitFor(() => {
      expect(screen.getByTestId('play-interface')).toBeInTheDocument()
    })

    expect(screen.queryByText('Join This Hunt')).not.toBeInTheDocument()
    expect(screen.queryByTestId('registration-button')).not.toBeInTheDocument()
  })

  it('should display error message when status check fails', async () => {
    // Mock checkRegistrationStatus to return error status
    vi.mocked(playerRegistration.checkRegistrationStatus).mockResolvedValue({
      isRegistered: false,
      loading: false,
      error: 'Network connection failed',
    })

    render(
      <PlayInterfaceGuard huntId={mockHuntId} playerAddress={mockPlayerAddress}>
        {mockChildren}
      </PlayInterfaceGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('Unable to verify registration')).toBeInTheDocument()
    })

    expect(screen.getByText('Network connection failed')).toBeInTheDocument()
    expect(screen.queryByTestId('play-interface')).not.toBeInTheDocument()
  })

  it('should re-check registration status when huntId changes', async () => {
    const checkStatusMock = vi.mocked(playerRegistration.checkRegistrationStatus)
    checkStatusMock.mockResolvedValue({
      isRegistered: false,
      loading: false,
    })

    const { rerender } = render(
      <PlayInterfaceGuard huntId={mockHuntId} playerAddress={mockPlayerAddress}>
        {mockChildren}
      </PlayInterfaceGuard>
    )

    await waitFor(() => {
      expect(checkStatusMock).toHaveBeenCalledWith(mockHuntId, mockPlayerAddress)
    })

    // Change huntId
    const newHuntId = 456
    rerender(
      <PlayInterfaceGuard huntId={newHuntId} playerAddress={mockPlayerAddress}>
        {mockChildren}
      </PlayInterfaceGuard>
    )

    await waitFor(() => {
      expect(checkStatusMock).toHaveBeenCalledWith(newHuntId, mockPlayerAddress)
    })

    expect(checkStatusMock).toHaveBeenCalledTimes(2)
  })

  it('should re-check registration status when playerAddress changes', async () => {
    const checkStatusMock = vi.mocked(playerRegistration.checkRegistrationStatus)
    checkStatusMock.mockResolvedValue({
      isRegistered: false,
      loading: false,
    })

    const { rerender } = render(
      <PlayInterfaceGuard huntId={mockHuntId} playerAddress={mockPlayerAddress}>
        {mockChildren}
      </PlayInterfaceGuard>
    )

    await waitFor(() => {
      expect(checkStatusMock).toHaveBeenCalledWith(mockHuntId, mockPlayerAddress)
    })

    // Change playerAddress
    const newPlayerAddress = 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY'
    rerender(
      <PlayInterfaceGuard huntId={mockHuntId} playerAddress={newPlayerAddress}>
        {mockChildren}
      </PlayInterfaceGuard>
    )

    await waitFor(() => {
      expect(checkStatusMock).toHaveBeenCalledWith(mockHuntId, newPlayerAddress)
    })

    expect(checkStatusMock).toHaveBeenCalledTimes(2)
  })
})
