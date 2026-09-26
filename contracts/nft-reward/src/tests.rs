//! Tests for the nft-reward contract.
//!
//! # Issue #848 — consistency test
//!
//! The primary requirement from issue #848 is a test asserting that the owner
//! index is internally consistent (count matches enumerable entries, exist-keys
//! match) after an interleaved mint / transfer / burn sequence.
//!
//! All verification goes through the contract's public client API rather than
//! reaching into `storage` directly, since Soroban SDK v22 forbids storage
//! access outside of a contract execution context.

#[cfg(test)]
mod nft_reward_tests {
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    use crate::{
        NftRewardContract, NftRewardContractClient, DEFAULT_NFT_PAGE_SIZE, MAX_NFT_PAGE_SIZE,
    };

    // ── helpers ───────────────────────────────────────────────────────────────

    /// Assert that the owner index for `owner` is internally consistent,
    /// using only the contract's public API:
    ///
    /// 1. `balance_of` equals the length of `get_player_nfts`.
    /// 2. No duplicate ids appear in `get_player_nfts`.
    fn assert_owner_index_consistent(client: &NftRewardContractClient, owner: &Address) {
        let count = client.balance_of(owner);
        let nfts = client.get_player_nfts(owner);

        assert_eq!(
            nfts.len(),
            count,
            "balance_of={count} but get_player_nfts returned {} ids",
            nfts.len()
        );

        // no duplicates
        for i in 0..nfts.len() {
            for j in (i + 1)..nfts.len() {
                assert_ne!(
                    nfts.get(i).unwrap(),
                    nfts.get(j).unwrap(),
                    "duplicate id in get_player_nfts at positions {i} and {j}"
                );
            }
        }
    }

    /// Assert that `nft_id` is NOT present in `owner`'s NFT list.
    fn assert_nft_absent(client: &NftRewardContractClient, owner: &Address, nft_id: u64) {
        let nfts = client.get_player_nfts(owner);
        for i in 0..nfts.len() {
            assert_ne!(
                nfts.get(i).unwrap(),
                nft_id,
                "id {nft_id} still present in get_player_nfts at index {i} after removal"
            );
        }
    }

    /// Assert that `nft_id` IS present in `owner`'s NFT list.
    fn assert_nft_present(client: &NftRewardContractClient, owner: &Address, nft_id: u64) {
        let nfts = client.get_player_nfts(owner);
        let found = (0..nfts.len()).any(|i| nfts.get(i).unwrap() == nft_id);
        assert!(
            found,
            "id {nft_id} expected in get_player_nfts but not found"
        );
    }

    fn setup(env: &Env) -> (Address, NftRewardContractClient<'_>) {
        let contract_id = env.register(NftRewardContract, ());
        let client = NftRewardContractClient::new(env, &contract_id);
        let minter = Address::generate(env);
        (minter, client)
    }

    fn test_uri(env: &Env, n: u32) -> String {
        let uris = [
            "ipfs://QmTest1",
            "ipfs://QmTest2",
            "ipfs://QmTest3",
            "ipfs://QmTest4",
            "ipfs://QmTest5",
            "ipfs://QmTest6",
            "ipfs://QmTest7",
            "ipfs://QmTest8",
            "ipfs://QmTest9",
        ];
        let idx = ((n.saturating_sub(1)) % 9) as usize;
        String::from_str(env, uris[idx])
    }

    // ── individual operation tests ────────────────────────────────────────────

    #[test]
    fn test_mint_updates_owner_index() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint(&minter, &player, &test_uri(&env, 1));

        assert_eq!(client.balance_of(&player), 1);
        assert_owner_index_consistent(&client, &player);
        assert_eq!(client.get_owner(&id), Some(player));
    }

    #[test]
    fn test_burn_removes_from_owner_index() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint(&minter, &player, &test_uri(&env, 1));
        assert_eq!(client.balance_of(&player), 1);

        client.burn(&player, &id);

        assert_eq!(client.balance_of(&player), 0);
        assert_owner_index_consistent(&client, &player);
        assert_nft_absent(&client, &player, id);
        assert_eq!(client.get_owner(&id), None);
    }

    #[test]
    fn test_transfer_updates_both_indexes() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let id = client.mint(&minter, &alice, &test_uri(&env, 1));

        client.transfer(&alice, &bob, &id);

        assert_eq!(client.balance_of(&alice), 0);
        assert_eq!(client.balance_of(&bob), 1);
        assert_owner_index_consistent(&client, &alice);
        assert_owner_index_consistent(&client, &bob);
        assert_nft_absent(&client, &alice, id);
        assert_nft_present(&client, &bob, id);
        assert_eq!(client.get_owner(&id), Some(bob));
    }

    // ── issue #848 core test: mint → transfer → burn consistency ─────────────

    /// Interleaved mint / transfer / burn sequence.
    ///
    /// This is the acceptance criterion from issue #848: the owner index must be
    /// internally consistent at every stage — `balance_of` must match the length
    /// of `get_player_nfts`, no duplicates, and burned / transferred ids must
    /// not appear in the former owner's list.
    #[test]
    fn test_mint_transfer_burn_owner_index_consistency() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        // ── 1. Mint three NFTs to alice ───────────────────────────────────────
        let id1 = client.mint(&minter, &alice, &test_uri(&env, 1));
        let id2 = client.mint(&minter, &alice, &test_uri(&env, 2));
        let id3 = client.mint(&minter, &alice, &test_uri(&env, 3));

        assert_eq!(client.balance_of(&alice), 3);
        assert_owner_index_consistent(&client, &alice);

        // ── 2. Transfer id2 from alice to bob ─────────────────────────────────
        client.transfer(&alice, &bob, &id2);

        assert_eq!(client.balance_of(&alice), 2);
        assert_eq!(client.balance_of(&bob), 1);
        assert_owner_index_consistent(&client, &alice);
        assert_owner_index_consistent(&client, &bob);
        assert_nft_absent(&client, &alice, id2);
        assert_nft_present(&client, &alice, id1);
        assert_nft_present(&client, &alice, id3);

        // ── 3. Mint a fourth NFT directly to bob ─────────────────────────────
        let id4 = client.mint(&minter, &bob, &test_uri(&env, 4));

        assert_eq!(client.balance_of(&bob), 2);
        assert_owner_index_consistent(&client, &bob);

        // ── 4. Burn id3 from alice (middle-of-list removal) ──────────────────
        client.burn(&alice, &id3);

        assert_eq!(client.balance_of(&alice), 1);
        assert_owner_index_consistent(&client, &alice);
        assert_nft_absent(&client, &alice, id3);
        assert_nft_present(&client, &alice, id1);

        // ── 5. Burn id1 from alice (last remaining) ──────────────────────────
        client.burn(&alice, &id1);

        assert_eq!(client.balance_of(&alice), 0);
        assert_owner_index_consistent(&client, &alice);
        assert_nft_absent(&client, &alice, id1);

        // ── 6. Bob transfers id4 back to alice, then alice burns it ──────────
        client.transfer(&bob, &alice, &id4);

        assert_eq!(client.balance_of(&bob), 1); // still has id2
        assert_eq!(client.balance_of(&alice), 1);
        assert_owner_index_consistent(&client, &bob);
        assert_owner_index_consistent(&client, &alice);

        client.burn(&alice, &id4);

        assert_eq!(client.balance_of(&alice), 0);
        assert_owner_index_consistent(&client, &alice);
        assert_nft_absent(&client, &alice, id4);

        // ── 7. Bob burns his remaining NFT (id2) ─────────────────────────────
        client.burn(&bob, &id2);

        assert_eq!(client.balance_of(&bob), 0);
        assert_owner_index_consistent(&client, &bob);
        assert_nft_absent(&client, &bob, id2);

        // ── 8. All tokens are gone; total supply is still 4 ──────────────────
        assert_eq!(client.total_supply(), 4);
        assert_eq!(client.get_owner(&id1), None);
        assert_eq!(client.get_owner(&id2), None);
        assert_eq!(client.get_owner(&id3), None);
        assert_eq!(client.get_owner(&id4), None);
    }

    // ── error-path tests ──────────────────────────────────────────────────────

    #[test]
    #[should_panic]
    fn test_burn_wrong_owner_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let alice = Address::generate(&env);
        let eve = Address::generate(&env);

        let id = client.mint(&minter, &alice, &test_uri(&env, 1));
        client.burn(&eve, &id);
    }

    #[test]
    #[should_panic]
    fn test_burn_nonexistent_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let alice = Address::generate(&env);

        let id = client.mint(&minter, &alice, &test_uri(&env, 1));
        client.burn(&alice, &id);
        // second burn must fail — token no longer exists
        client.burn(&alice, &id);
    }

    #[test]
    #[should_panic]
    fn test_transfer_wrong_owner_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let eve = Address::generate(&env);

        let id = client.mint(&minter, &alice, &test_uri(&env, 1));
        // eve claims to be 'from' but is not the owner
        client.transfer(&eve, &bob, &id);
    }

    // ── swap-and-pop edge cases ───────────────────────────────────────────────

    /// Burn the *first* NFT when more are present — exercises moving the last
    /// element into slot 0.
    #[test]
    fn test_burn_first_nft_of_many() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id1 = client.mint(&minter, &player, &test_uri(&env, 1));
        let id2 = client.mint(&minter, &player, &test_uri(&env, 2));
        let id3 = client.mint(&minter, &player, &test_uri(&env, 3));

        client.burn(&player, &id1);

        assert_eq!(client.balance_of(&player), 2);
        assert_owner_index_consistent(&client, &player);
        assert_nft_absent(&client, &player, id1);
        assert_nft_present(&client, &player, id2);
        assert_nft_present(&client, &player, id3);
    }

    /// Burn the *last* NFT in the list — no swap needed, just pop.
    #[test]
    fn test_burn_last_nft_of_many() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id1 = client.mint(&minter, &player, &test_uri(&env, 1));
        let id2 = client.mint(&minter, &player, &test_uri(&env, 2));
        let id3 = client.mint(&minter, &player, &test_uri(&env, 3));

        client.burn(&player, &id3);

        assert_eq!(client.balance_of(&player), 2);
        assert_owner_index_consistent(&client, &player);
        assert_nft_absent(&client, &player, id3);
        assert_nft_present(&client, &player, id1);
        assert_nft_present(&client, &player, id2);
    }

    // ── issue #1404 — bounded paginated reads ────────────────────────────────

    /// Mint `count` NFTs to a fresh player.
    fn seeded_player(
        env: &Env,
        minter: &Address,
        client: &NftRewardContractClient,
        count: u32,
    ) -> Address {
        let player = Address::generate(env);
        for i in 0..count {
            client.mint(minter, &player, &test_uri(env, i));
        }
        player
    }

    /// #1404: a page returns exactly the requested window, and walking the pages
    /// reproduces the full unpaginated read in order, with no gaps or overlaps.
    #[test]
    fn page_returns_the_requested_window_and_matches_the_full_read() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = seeded_player(&env, &minter, &client, 25);

        let all = client.get_player_nfts(&player);
        assert_eq!(all.len(), 25);

        let first = client.get_player_nfts_page(&player, &0u32, &10u32);
        let second = client.get_player_nfts_page(&player, &10u32, &10u32);
        let third = client.get_player_nfts_page(&player, &20u32, &10u32);
        assert_eq!(first.len(), 10, "first page should be full");
        assert_eq!(second.len(), 10, "second page should be full");
        assert_eq!(third.len(), 5, "last page should be the remainder");

        let pages = [first, second, third];
        let mut seen = 0u32;
        for (page_i, page) in pages.iter().enumerate() {
            for i in 0..page.len() {
                assert_eq!(
                    page.get(i).unwrap(),
                    all.get(seen).unwrap(),
                    "page {page_i} diverged from the full read at offset {seen}"
                );
                seen += 1;
            }
        }
        assert_eq!(seen, 25, "pages did not cover the whole collection");
    }

    /// #1404: `page_size == 0` means the documented default, and an oversized
    /// request is clamped to the ceiling instead of being served unbounded.
    #[test]
    fn page_size_defaults_and_clamps() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = seeded_player(&env, &minter, &client, MAX_NFT_PAGE_SIZE + 50);

        let default_page = client.get_player_nfts_page(&player, &0u32, &0u32);
        assert_eq!(
            default_page.len(),
            DEFAULT_NFT_PAGE_SIZE,
            "0 should mean the default page size"
        );

        let clamped = client.get_player_nfts_page(&player, &0u32, &u32::MAX);
        assert_eq!(
            clamped.len(),
            MAX_NFT_PAGE_SIZE,
            "oversized page_size should clamp to the ceiling"
        );

        let full = client.get_player_nfts(&player);
        assert_eq!(clamped.get(0).unwrap(), full.get(0).unwrap());
        assert_eq!(
            clamped.get(MAX_NFT_PAGE_SIZE - 1).unwrap(),
            full.get(MAX_NFT_PAGE_SIZE - 1).unwrap()
        );
    }

    /// #1404: a cursor at or past the end is an empty page, not a panic — a client
    /// paginating to the end should not need a special case.
    #[test]
    fn cursor_at_or_past_the_end_is_an_empty_page() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = seeded_player(&env, &minter, &client, 7);

        assert_eq!(
            client.get_player_nfts_page(&player, &6u32, &10u32).len(),
            1,
            "cursor at the last element should return one id"
        );
        assert_eq!(
            client.get_player_nfts_page(&player, &7u32, &10u32).len(),
            0,
            "cursor exactly at the end should be empty"
        );
        assert_eq!(
            client.get_player_nfts_page(&player, &999u32, &10u32).len(),
            0,
            "cursor far past the end should be empty"
        );

        let empty_owner = Address::generate(&env);
        assert_eq!(
            client.get_player_nfts_page(&empty_owner, &0u32, &10u32).len(),
            0,
            "an owner with no NFTs should page to nothing"
        );
    }
}
