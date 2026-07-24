"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addHunt, takeHuntStoreSnapshot, restoreHuntStoreSnapshot, updateHuntStatus } from "@/lib/huntStore"
import type { StoredHunt } from "@/lib/types"
import { queryKeys } from "@/lib/queryKeys"

export function useCreateHuntMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (hunt: StoredHunt) => {
      addHunt(hunt)
      return hunt
    },
    onMutate: async (hunt) => {
      const snapshot = takeHuntStoreSnapshot()
      await queryClient.cancelQueries({ queryKey: queryKeys.hunts.active() })
      queryClient.setQueryData<StoredHunt[]>(queryKeys.hunts.active(), (existing = []) => [...existing, hunt])
      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreHuntStoreSnapshot(context.snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hunts.active() })
    },
  })
}

export function useActivateHuntMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (huntId: number) => {
      updateHuntStatus(huntId, "Active")
      return huntId
    },
    onMutate: async (huntId) => {
      const snapshot = takeHuntStoreSnapshot()
      await queryClient.cancelQueries({ queryKey: queryKeys.hunts.active() })
      queryClient.setQueryData<StoredHunt[]>(queryKeys.hunts.active(), (existing = []) =>
        existing.map((hunt) => (hunt.id === huntId ? { ...hunt, status: "Active" } : hunt))
      )
      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreHuntStoreSnapshot(context.snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hunts.active() })
    },
  })
}
