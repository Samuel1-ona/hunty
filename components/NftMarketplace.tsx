"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Search,
  ShoppingCart,
  Tag,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react"
import { resolveImageSrc } from "@/lib/ipfs"
import {
  getActiveListings,
  searchListings,
  buyNft,
  getSaleHistory,
  getPriceTrends,
  type MarketplaceListing,
  type SaleHistoryEntry,
} from "@/lib/nft/marketplace"

interface NftMarketplaceProps {
  buyerAddress: string
}

export function NftMarketplace({ buyerAddress }: NftMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null)
  const [buyDialogOpen, setBuyDialogOpen] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyResult, setBuyResult] = useState<SaleHistoryEntry | null>(null)
  const [error, setError] = useState("")
  const [salesHistory, setSalesHistory] = useState<SaleHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setListings(getActiveListings())
    setSalesHistory(getSaleHistory().slice(0, 20))
  }, [])

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    setListings(q ? searchListings(q) : getActiveListings())
  }

  const handleBuyClick = (listing: MarketplaceListing) => {
    setSelectedListing(listing)
    setBuyDialogOpen(true)
    setBuyResult(null)
    setError("")
  }

  const handleBuy = async () => {
    if (!selectedListing) return
    setBuying(true)
    setError("")
    try {
      const result = buyNft(selectedListing.id, buyerAddress)
      setBuyResult(result)
      setListings(getActiveListings())
      setSalesHistory(getSaleHistory().slice(0, 20))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed")
    } finally {
      setBuying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-slate-900">NFT Marketplace</h2>
        <div className="flex gap-2">
          <Button
            variant={showHistory ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="rounded-xl"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Sales History
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search NFTs by name or ID..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {showHistory && salesHistory.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Recent Sales</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {salesHistory.map((sale) => (
              <div key={sale.listingId} className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-800">{sale.nftName}</span>
                <span className="text-indigo-600 font-bold">{sale.priceXlm} XLM</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No NFTs listed for sale</p>
          <p className="text-sm mt-1">Check back later or list your own!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {listings.map((listing, idx) => {
            const trends = getPriceTrends(listing.nftId)
            return (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
              >
                <Card className="rounded-2xl border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
                    <Image
                      src={resolveImageSrc(listing.nftImageUri)}
                      alt={listing.nftName}
                      fill
                      className="object-contain p-4"
                    />
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-900 truncate">{listing.nftName}</h3>
                      <p className="text-xs text-slate-400">
                        by {listing.sellerAddress.slice(0, 6)}...{listing.sellerAddress.slice(-4)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-bold text-indigo-700">{listing.priceXlm} XLM</span>
                      </div>
                      {trends.salesCount > 0 && (
                        <span className="text-[10px] text-slate-400">
                          Avg: {trends.avgPrice.toFixed(1)} XLM
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleBuyClick(listing)}
                      disabled={listing.sellerAddress === buyerAddress}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-9 text-sm"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                      {listing.sellerAddress === buyerAddress ? "Your listing" : "Buy Now"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {buyResult ? "Purchase Complete" : `Buy "${selectedListing?.nftName}"`}
            </DialogTitle>
            <DialogDescription>
              {buyResult
                ? "You now own this NFT"
                : `Confirm purchase for ${selectedListing?.priceXlm} XLM`}
            </DialogDescription>
          </DialogHeader>

          {!buyResult && !error && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">NFT</span>
                  <span className="font-semibold">{selectedListing?.nftName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Price</span>
                  <span className="font-bold text-indigo-700">
                    {selectedListing?.priceXlm} XLM
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setBuyDialogOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBuy}
                  disabled={buying}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Purchase"}
                </Button>
              </div>
            </div>
          )}

          {buyResult && (
            <div className="flex flex-col items-center py-4 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-xs text-slate-400 font-mono">{buyResult.txHash}</p>
              <Button onClick={() => setBuyDialogOpen(false)} className="w-full rounded-xl">
                Done
              </Button>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center py-4 space-y-3">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <Button onClick={() => setError("")} className="w-full rounded-xl">
                Try Again
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
