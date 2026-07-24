"use client"

import { useEnvironmentConfig } from "@/lib/config/environment";

/**
 * EnvironmentIndicator Component
 * Shows the current environment in the UI (only in staging/development)
 */
export function EnvironmentIndicator() {
  const config = useEnvironmentConfig();

  // Only show in staging or development
  if (config.isProduction) {
    return null;
  }

  const bgColor = config.isStaging ? "bg-yellow-100 dark:bg-yellow-900" : "bg-blue-100 dark:bg-blue-900";
  const textColor = config.isStaging ? "text-yellow-800 dark:text-yellow-200" : "text-blue-800 dark:text-blue-200";
  const borderColor = config.isStaging ? "border-yellow-300 dark:border-yellow-700" : "border-blue-300 dark:border-blue-700";

  return (
    <div
      className={`fixed bottom-4 right-4 px-3 py-2 rounded-md border ${bgColor} ${textColor} ${borderColor} text-sm font-semibold z-50 pointer-events-none`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${config.isStaging ? "bg-yellow-600" : "bg-blue-600"}`} />
        <span className="uppercase tracking-wide">
          {config.isStaging
            ? `Staging (${config.networkType === "mainnet" ? "Mainnet" : "Testnet"})`
            : `Dev (${config.networkType === "mainnet" ? "Mainnet" : "Testnet"})`}
        </span>
      </div>
    </div>
  );
}

/**
 * EnvironmentBadge Component
 * Compact badge for showing environment in headers/navigation
 */
export function EnvironmentBadge() {
  const config = useEnvironmentConfig();

  if (config.isProduction) {
    return null;
  }

  const bgColor = config.isStaging ? "bg-yellow-500/10" : "bg-blue-500/10";
  const textColor = config.isStaging ? "text-yellow-700 dark:text-yellow-400" : "text-blue-700 dark:text-blue-400";
  const borderColor = config.isStaging ? "border-yellow-200 dark:border-yellow-800" : "border-blue-200 dark:border-blue-800";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${bgColor} ${textColor} border ${borderColor}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.isStaging ? "Staging" : "Dev"}
    </span>
  );
}
