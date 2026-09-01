/** Public compatibility surface for the split hunt store modules. */

export {
  DEFAULT_HUNT_INVITE_TTL_MS,
  MAX_CLUES_PER_HUNT,
  REWARD_REFUND_GRACE_PERIOD_SECONDS,
  SEED_HUNTS,
  SPOTLIGHT_DURATION_SECONDS,
  SPOTLIGHT_FEE_XLM,
} from "./huntStoreCore";
export type {
  Clue,
  HuntInvite,
  HuntInviteValidation,
  HuntProgressSnapshot,
  HuntStatus,
  HuntStorageGcResult,
  HuntStoreSnapshot,
  StoredHunt,
} from "./huntStoreCore";

export {
  getAllHunts,
  getAllHuntsIncludingPrivate,
  getArchivedHunts,
  getCreatorHunts,
  getEndedPublicHunts,
  getExpiredSoftDeletedHunts,
  getFeaturedHunts,
  getHunt,
  getHuntById,
  getHuntCapacity,
  getHuntsByCreator,
  getRemainingSpots,
  getSoftDeletedHunts,
  getSpotlightHunts,
  isHuntPromoted,
} from "./huntStoreQueries";
export {
  buildHuntInviteUrl,
  generateHuntInvite,
  revokeHuntInvite,
  validateHuntInvite,
  validateHuntInviteToken,
} from "./huntStoreInvites";
export {
  depositToPool,
  getHuntPool,
  isPoolLow,
  setDistributionPlan,
  topUpPool,
  updateHuntRewardEscrow,
  withdrawUnclaimedRewards,
} from "./huntStoreRewards";
export {
  getHuntClues,
  saveClueLocally,
  saveCluesLocallyBatch,
  updateClueAnswer,
} from "./huntStoreClues";
export {
  advanceHuntProgress,
  clearHuntProgress,
  getHuntProgress,
  getWalletProgressKey,
  migrateGuestProgressToWallet,
  startHuntProgress,
} from "./huntStoreProgress";
export { gcHunt } from "./huntStoreGc";
export {
  addHunt,
  archiveHunts,
  deleteHunts,
  duplicateHunt,
  getRegisteredWallets,
  hideHuntsFromPublic,
  permanentDeleteHunts,
  restoreHuntStoreSnapshot,
  restoreHunts,
  setLocalFeaturedHunt,
  softDeleteHunts,
  takeHuntStoreSnapshot,
  unhideHuntsFromPublic,
  updateHuntEndTime,
  updateHuntPromotion,
  updateHuntStatus,
} from "./huntStoreMutations";
