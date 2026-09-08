import { usePlayerStore } from '@store/useStore';

jest.mock('expo-secure-store');

describe('player progress offline reconciliation', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentProgress: {
        hunt_id: 4,
        player: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ2',
        current_clue_index: 3,
        completed: true,
        reward_claimed: false,
      },
      completedClues: { 4: new Set([0, 1, 2]) },
    });
  });

  it('rewinds optimistic progress when the server rejects a queued clue', () => {
    usePlayerStore.getState().rejectClueSubmission(4, 2);

    const state = usePlayerStore.getState();
    expect(state.currentProgress).toEqual(
      expect.objectContaining({ hunt_id: 4, current_clue_index: 2, completed: false }),
    );
    expect([...state.completedClues[4]]).toEqual([0, 1]);
  });

  it('does not rewind another active hunt', () => {
    usePlayerStore.getState().rejectClueSubmission(9, 0);

    expect(usePlayerStore.getState().currentProgress).toEqual(
      expect.objectContaining({ hunt_id: 4, current_clue_index: 3, completed: true }),
    );
  });
});
