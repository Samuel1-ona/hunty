"use client"

import { useCallback, useEffect, useState } from "react"

type XlmUsdPriceState = {
  price: number | null
  isLoading: boolean
  error: string | null
  lastUpdated: number | null
}

// 5-minute polling to respect free-tier API rate limits
const DEFAULT_POLLING_MS = 300_000

async function fetchFromCoinbase(): Promise<number> {
  const res = await fetch("https://api.coinbase.com/v2/prices/XLM-USD/spot", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Coinbase price request failed (${res.status})`)
  const json = (await res.json()) as { data?: { amount?: string } }
  const amount = Number(json?.data?.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid Coinbase price response")
  return amount
}

async function fetchFromCoinGecko(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd",
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    }
  )
  if (!res.ok) throw new Error(`CoinGecko price request failed (${res.status})`)
  const json = (await res.json()) as { stellar?: { usd?: number } }
  const amount = Number(json?.stellar?.usd)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid CoinGecko price response")
  return amount
}

async function fetchXlmUsdPrice(): Promise<number> {
  try {
    return await fetchFromCoinbase()
  } catch {
    return fetchFromCoinGecko()
  }
}

export function useXlmUsdPrice(pollingMs = DEFAULT_POLLING_MS): XlmUsdPriceState {
  const [state, setState] = useState<XlmUsdPriceState>({
    price: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
  })

  const load = useCallback(async () => {
    try {
      const price = await fetchXlmUsdPrice()
      setState({
        price,
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: prev.price == null,
        error: error instanceof Error ? error.message : "Failed to fetch XLM/USD price",
      }))
    }
  }, [])

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null
    void load()
    timerId = setInterval(() => {
      void load()
    }, pollingMs)
    return () => {
      if (timerId) clearInterval(timerId)
    }
  }, [load, pollingMs])

  return state
}

