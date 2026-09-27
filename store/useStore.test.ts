import { beforeEach, describe, expect, it } from "vitest";
import { usePlayerStore, useWalletStore } from "./useStore";

const walletInitialState = useWalletStore.getState();
const playerInitialState = usePlayerStore.getState();

function resetStores() {
  useWalletStore.setState(walletInitialState);
  usePlayerStore.setState(playerInitialState);
  localStorage.clear();
}

describe("useWalletStore", () => {
  beforeEach(() => {
    resetStores();
  });

  it("starts with the expected default state", () => {
    const state = useWalletStore.getState();

    expect(state.walletAddress).toBe("");
    expect(state.walletBalance).toBeNull();
    expect(state.isConnected).toBe(false);
  });

  it("setWallet updates the address and connection flag", () => {
    useWalletStore.getState().setWallet("GABC123");

    const state = useWalletStore.getState();
    expect(state.walletAddress).toBe("GABC123");
    expect(state.isConnected).toBe(true);
  });

  it("setBalance updates the stored balance", () => {
    useWalletStore.getState().setBalance("42.5000000");

    expect(useWalletStore.getState().walletBalance).toBe("42.5000000");
  });

  it("clearWallet restores the wallet defaults", () => {
    const { setWallet, setBalance, clearWallet } = useWalletStore.getState();

    setWallet("GABC123");
    setBalance("10.0000000");
    clearWallet();

    expect(useWalletStore.getState()).toMatchObject({
      walletAddress: "",
      walletBalance: null,
      isConnected: false,
    });
  });
});

describe("usePlayerStore", () => {
  beforeEach(() => {
    resetStores();
  });

  it("starts with the expected default state", () => {
    expect(usePlayerStore.getState().currentProgress).toBeNull();
  });

  it("setProgress stores the current hunt progress", () => {
    const progress = {
      hunt_id: 7,
      player: "player-1",
      current_clue_index: 0,
      completed: false,
      reward_claimed: false,
    } as const;

    usePlayerStore.getState().setProgress(progress);

    expect(usePlayerStore.getState().currentProgress).toEqual(progress);
  });

  it("updateClueIndex updates only the current clue index", () => {
    usePlayerStore.getState().setProgress({
      hunt_id: 7,
      player: "player-1",
      current_clue_index: 0,
      completed: false,
      reward_claimed: false,
    });

    usePlayerStore.getState().updateClueIndex(3);

    expect(usePlayerStore.getState().currentProgress).toMatchObject({
      hunt_id: 7,
      player: "player-1",
      current_clue_index: 3,
      completed: false,
      reward_claimed: false,
    });
  });

  it("markCompleted marks the active hunt as completed", () => {
    usePlayerStore.getState().setProgress({
      hunt_id: 7,
      player: "player-1",
      current_clue_index: 2,
      completed: false,
      reward_claimed: false,
    });

    usePlayerStore.getState().markCompleted();

    expect(usePlayerStore.getState().currentProgress).toMatchObject({
      hunt_id: 7,
      player: "player-1",
      current_clue_index: 2,
      completed: true,
      reward_claimed: false,
    });
  });

  it("clearProgress removes the active hunt progress", () => {
    usePlayerStore.getState().setProgress({
      hunt_id: 7,
      player: "player-1",
      current_clue_index: 2,
      completed: true,
      reward_claimed: false,
    });

    usePlayerStore.getState().clearProgress();

    expect(usePlayerStore.getState().currentProgress).toBeNull();
  });
});
