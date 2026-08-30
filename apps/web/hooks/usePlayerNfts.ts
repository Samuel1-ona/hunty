import { useState, useEffect } from 'react';

export interface NftAttribute {
  trait_type: string;
  value: string;
}

export interface NftItem {
  id: string;
  name: string;
  description: string;
  image: string;
  huntName: string;
  earnedAt: string;
  attributes: NftAttribute[];
}

export function usePlayerNfts() {
  const [address, setAddress] = useState<string>('GABC123DEF456');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nfts, setNfts] = useState<NftItem[]>([
    {
      id: '1',
      name: 'Soroban Scavenger Champion',
      description: 'Awarded for completing the ultimate Soroban smart contract scavenger hunt.',
      image: 'ipfs://QmYwAPJg0hGc2bS4Z4A69A1sZ42Z84B79A3A4a5b6c7D8e',
      huntName: 'Stellar smart contracts',
      earnedAt: '2026-07-20',
      attributes: [
        { trait_type: 'Rarity', value: 'Legendary' },
        { trait_type: 'Points', value: '100' },
      ],
    },
    {
      id: '2',
      name: 'Stellar Pioneer Badge',
      description: 'Awarded to early participants of the Hunty scavenger challenges.',
      image: 'ipfs://QmXoypizjW3WknFi2WDauHCX8Aax5b3BF6696s9a5b6c7D',
      huntName: 'Stellar Basics',
      earnedAt: '2026-07-24',
      attributes: [
        { trait_type: 'Rarity', value: 'Rare' },
        { trait_type: 'Points', value: '50' },
      ],
    },
  ]);

  return { address, nfts, loading, error };
}
