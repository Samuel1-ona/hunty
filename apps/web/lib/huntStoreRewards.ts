import { getHuntById } from "./huntStoreQueries";
import { readHunts, writeHunts } from "./huntStoreCore";

export function updateHuntRewardEscrow(
  huntId: number,
  rewardEscrowBalance: number,
  rewardEscrowTxHash?: string
): void {
  writeHunts(
    readHunts().map((h) =>
      h.id === huntId
        ? {
            ...h,
            rewardEscrowBalance,
            ...(rewardEscrowTxHash ? { rewardEscrowTxHash } : {}),
          }
        : h
    )
  );
}

export function getHuntPool(huntId: number) {
  const hunt = getHuntById(huntId);
  if (!hunt) return null;
  return {
    rewardPool: hunt.rewardPool ?? 0,
    poolBalance: hunt.poolBalance ?? hunt.rewardPool ?? 0,
    distribution: hunt.rewardDistribution ?? [],
    lowThreshold: hunt.poolLowBalanceThreshold ?? Math.max(1, (hunt.rewardPool ?? 0) * 0.2),
  };
}

export function depositToPool(huntId: number, amount: number): boolean {
  if (amount <= 0) return false;
  writeHunts(
    readHunts().map((h) => {
      if (h.id !== huntId) return h;
      const prevTotal = h.rewardPool ?? 0;
      const prevBalance = h.poolBalance ?? prevTotal;
      return { ...h, rewardPool: prevTotal + amount, poolBalance: prevBalance + amount };
    })
  );
  return true;
}

export function topUpPool(huntId: number, amount: number): boolean {
  return depositToPool(huntId, amount);
}

export function withdrawUnclaimedRewards(huntId: number, amount: number): boolean {
  const hunt = getHuntById(huntId);
  if (!hunt || hunt.status === "Active") return false;
  const prevBalance = hunt.poolBalance ?? hunt.rewardPool ?? 0;
  const withdrawAmount = Math.min(amount, prevBalance);
  writeHunts(
    readHunts().map((h) =>
      h.id === huntId
        ? {
            ...h,
            poolBalance: prevBalance - withdrawAmount,
            rewardPool: Math.max(0, (h.rewardPool ?? 0) - withdrawAmount),
          }
        : h
    )
  );
  return true;
}

export function setDistributionPlan(
  huntId: number,
  distribution: { place: number; amount: number }[]
) {
  const total = distribution.reduce((s, d) => s + d.amount, 0);
  writeHunts(
    readHunts().map((h) =>
      h.id === huntId
        ? {
            ...h,
            rewardDistribution: distribution,
            rewardPool: total,
            poolBalance: total,
          }
        : h
    )
  );
}

export function isPoolLow(huntId: number): boolean {
  const hunt = getHuntById(huntId);
  if (!hunt) return false;
  const balance = hunt.poolBalance ?? hunt.rewardPool ?? 0;
  const threshold = hunt.poolLowBalanceThreshold ?? Math.max(1, (hunt.rewardPool ?? 0) * 0.2);
  return balance < threshold;
}
