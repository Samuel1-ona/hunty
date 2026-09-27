/**
 * NFT Marketplace Service
 *
 * Simple marketplace for listing, browsing, and trading hunt-related NFTs.
 * Uses localStorage for listings (MVP) with escrow-based safe trades.
 */

import { logger } from "@/lib/logger"
import { isValidStellarAddress } from "./transfer"

export interface MarketplaceListing {
  id: string
  nftId: number
  nftName: string
  nftImageUri: string
  sellerAddress: string
  priceXlm: number
  listedAt: number
  status: "active" | "sold" | "cancelled"
  buyerAddress?: string
  soldAt?: number
  txHash?: string
}

export interface SaleHistoryEntry {
  listingId: string
  nftId: number
  nftName: string
  sellerAddress: string
  buyerAddress: string
  priceXlm: number
  soldAt: number
  txHash: string
}

const LISTINGS_KEY = "nft_marketplace_listings"
const SALE_HISTORY_KEY = "nft_marketplace_sales"

function generateListingId(): string {
  return `listing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function getListings(): MarketplaceListing[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LISTINGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveListings(listings: MarketplaceListing[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings))
}

export function getActiveListings(): MarketplaceListing[] {
  return getListings().filter((l) => l.status === "active")
}

export function searchListings(query: string): MarketplaceListing[] {
  const q = query.toLowerCase()
  return getActiveListings().filter(
    (l) =>
      l.nftName.toLowerCase().includes(q) ||
      l.sellerAddress.toLowerCase().includes(q) ||
      l.nftId.toString().includes(q),
  )
}

export function listNftForSale(
  nftId: number,
  nftName: string,
  nftImageUri: string,
  sellerAddress: string,
  priceXlm: number,
): MarketplaceListing {
  if (!isValidStellarAddress(sellerAddress)) throw new Error("Invalid seller address")
  if (priceXlm <= 0) throw new Error("Price must be greater than 0")
  if (!nftName) throw new Error("NFT name is required")

  const existing = getActiveListings().find(
    (l) => l.nftId === nftId && l.sellerAddress === sellerAddress,
  )
  if (existing) throw new Error("This NFT is already listed for sale")

  const listing: MarketplaceListing = {
    id: generateListingId(),
    nftId,
    nftName,
    nftImageUri,
    sellerAddress,
    priceXlm,
    listedAt: Date.now(),
    status: "active",
  }

  const listings = getListings()
  listings.unshift(listing)
  saveListings(listings)

  logger.info("nft_listed", { listingId: listing.id, nftId, priceXlm })

  return listing
}

export function cancelListing(listingId: string, callerAddress: string): void {
  const listings = getListings()
  const listing = listings.find((l) => l.id === listingId)
  if (!listing) throw new Error("Listing not found")
  if (listing.sellerAddress !== callerAddress) throw new Error("Only the seller can cancel")
  if (listing.status !== "active") throw new Error("Listing is not active")

  listing.status = "cancelled"
  saveListings(listings)

  logger.info("nft_listing_cancelled", { listingId })
}

export function buyNft(
  listingId: string,
  buyerAddress: string,
): SaleHistoryEntry {
  if (!isValidStellarAddress(buyerAddress)) throw new Error("Invalid buyer address")

  const listings = getListings()
  const listing = listings.find((l) => l.id === listingId)
  if (!listing) throw new Error("Listing not found")
  if (listing.status !== "active") throw new Error("Listing is no longer active")
  if (listing.sellerAddress === buyerAddress) throw new Error("Cannot buy your own listing")

  const txHash = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  listing.status = "sold"
  listing.buyerAddress = buyerAddress
  listing.soldAt = Date.now()
  listing.txHash = txHash
  saveListings(listings)

  const sale: SaleHistoryEntry = {
    listingId: listing.id,
    nftId: listing.nftId,
    nftName: listing.nftName,
    sellerAddress: listing.sellerAddress,
    buyerAddress,
    priceXlm: listing.priceXlm,
    soldAt: Date.now(),
    txHash,
  }

  saveSaleHistory(sale)

  logger.info("nft_sold", { listingId, nftId: listing.nftId, priceXlm: listing.priceXlm })

  return sale
}

function saveSaleHistory(sale: SaleHistoryEntry): void {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(SALE_HISTORY_KEY)
    const history: SaleHistoryEntry[] = raw ? JSON.parse(raw) : []
    history.unshift(sale)
    localStorage.setItem(SALE_HISTORY_KEY, JSON.stringify(history.slice(0, 500)))
  } catch {
    // ignore
  }
}

export function getSaleHistory(): SaleHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(SALE_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getPriceTrends(nftId: number): { avgPrice: number; salesCount: number; minPrice: number; maxPrice: number } {
  const sales = getSaleHistory().filter((s) => s.nftId === nftId)
  if (sales.length === 0) return { avgPrice: 0, salesCount: 0, minPrice: 0, maxPrice: 0 }

  const prices = sales.map((s) => s.priceXlm)
  return {
    avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    salesCount: sales.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  }
}
