"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addHunt,
  takeHuntStoreSnapshot,
  restoreHuntStoreSnapshot,
  updateHuntStatus,
} from "@/lib/huntStore";
import type { StoredHunt } from "@/lib/types";
import { queryKeys } from "@/lib/queryKeys";

export function useCreateHuntMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hunt: StoredHunt) => {
      addHunt(hunt);
      return hunt;
    },
    onMutate: async (hunt) => {
      const snapshot = takeHuntStoreSnapshot();
      await queryClient.cancelQueries({ queryKey: queryKeys.hunts.active() });
      queryClient.setQueryData<StoredHunt[]>(queryKeys.hunts.active(), (existing = []) => [
        ...existing,
        hunt,
      ]);
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreHuntStoreSnapshot(context.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hunts.active() });
    },
  });
}

export function useActivateHuntMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (huntId: number) => {
      updateHuntStatus(huntId, "Active");
      return huntId;
    },
    onMutate: async (huntId) => {
      const snapshot = takeHuntStoreSnapshot();
      await queryClient.cancelQueries({ queryKey: queryKeys.hunts.active() });
      queryClient.setQueryData<StoredHunt[]>(queryKeys.hunts.active(), (existing = []) =>
        existing.map((hunt) => (hunt.id === huntId ? { ...hunt, status: "Active" } : hunt))
      );
      return { snapshot };
    },
    // NOTE: this mutation used to POST directly to /api/push/send from the
    // browser on success, to fire a hunt_start push to registered players.
    // That endpoint now requires a service/admin credential (a browser
    // can't hold a secret without exposing it), so this was removed rather
    // than left to silently 401. Hunt activation is a purely client-side
    // store mutation (see updateHuntStatus above) with no server-side
    // endpoint to hang a credentialed push trigger off of yet — restoring
    // hunt_start pushes needs one.
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreHuntStoreSnapshot(context.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hunts.active() });
    },
  });
}
 