/**
 * Paymaster module — fee abstraction for new users.
 *
 * Export surface for the paymaster service. Prefer importing from this
 * barrel rather than deep-importing individual files.
 */

export { getPaymaster, resetPaymaster, StellarPaymaster } from "../paymaster";
export { getPaymasterConfig } from "./config";
export * from "./types";

// DB operations (server-side only)
export {
  ensureUser,
  getUser,
  incrementSponsorship,
  getTransactionHistory,
  getAllTransactions,
  listUsers,
  updateUserLimits,
  getConfigValue,
  setConfigValue,
  deleteConfigValue,
} from "./db";
