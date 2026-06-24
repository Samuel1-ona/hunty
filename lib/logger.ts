
const ENV = process.env.NODE_ENV ?? "development"
const isProduction = ENV === "production"

type LogLevel = "error" | "warn" | "info" | "debug"

const shouldLog = (level: LogLevel) => {
  if (level === "debug" || level === "info") {
    return !isProduction
  }
  return true
}

type ConsoleRef = Record<LogLevel, (...args: unknown[]) => void>

const getConsole = (): ConsoleRef | undefined => {
  if (typeof globalThis === "undefined") return undefined
  return (globalThis as typeof globalThis & { console?: ConsoleRef }).console
}

const writeLog = (level: LogLevel, message: unknown, ...meta: unknown[]) => {
  if (!shouldLog(level)) return
  const consoleRef = getConsole()
  if (!consoleRef?.[level]) return
  consoleRef[level](`[Hunty] ${message}`, ...meta)
}

export const error = (message: unknown, ...meta: unknown[]) => writeLog("error", message, ...meta)
export const warn = (message: unknown, ...meta: unknown[]) => writeLog("warn", message, ...meta)
export const info = (message: unknown, ...meta: unknown[]) => writeLog("info", message, ...meta)
export const debug = (message: unknown, ...meta: unknown[]) => writeLog("debug", message, ...meta)

export const logger = {
  error,
  warn,
  info,
  debug,
}
