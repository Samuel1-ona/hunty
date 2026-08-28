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

    use crate::{NftRewardContract, NftRewardContractClient};

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

    // ── issue #849: update_nft_metadata URI validation ────────────────────────

    /// `update_nft_metadata` must reject `javascript:` URIs.
    ///
    /// This is the primary acceptance criterion from issue #849: an owner must
    /// not be able to rewrite a validated ipfs:// URI to an arbitrary scheme
    /// that mint_reward_nft_from_map would reject.
    #[test]
    #[should_panic]
    fn test_update_nft_metadata_rejects_javascript_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        // Mint with a valid URI.
        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmValidHash"),
        );

        // Attempt to overwrite with a javascript: URI — must panic (InvalidUri).
        client.update_nft_metadata(
            &player,
            &id,
            &String::from_str(&env, "javascript:alert(1)"),
        );
    }

    /// `update_nft_metadata` must reject an empty image URI.
    ///
    /// The original bug allowed `allow_empty: true` inside
    /// `sanitize_metadata_field`, which let callers blank out the URI field
    /// entirely after a valid mint.
    #[test]
    #[should_panic]
    fn test_update_nft_metadata_rejects_empty_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "https://example.com/nft.json"),
        );

        // Attempt to overwrite with an empty string — must panic (InvalidUri).
        client.update_nft_metadata(&player, &id, &String::from_str(&env, ""));
    }

    /// `update_nft_metadata` must reject plain `http://` URIs (not in the
    /// allowlist of `https://` and `ipfs://`).
    #[test]
    #[should_panic]
    fn test_update_nft_metadata_rejects_http_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmValidHash"),
        );

        client.update_nft_metadata(
            &player,
            &id,
            &String::from_str(&env, "http://attacker.example/evil.json"),
        );
    }

    /// `update_nft_metadata` must reject `data:` URIs.
    #[test]
    #[should_panic]
    fn test_update_nft_metadata_rejects_data_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmValidHash"),
        );

        client.update_nft_metadata(
            &player,
            &id,
            &String::from_str(&env, "data:text/html,<script>alert(1)</script>"),
        );
    }

    /// A valid `https://` URI must succeed.
    #[test]
    fn test_update_nft_metadata_accepts_https_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmValidHash"),
        );

        let new_uri = String::from_str(&env, "https://cdn.example.com/nft/1.json");
        client.update_nft_metadata(&player, &id, &new_uri);

        assert_eq!(client.get_uri(&id), Some(new_uri));
    }

    /// A valid `ipfs://` URI must succeed.
    #[test]
    fn test_update_nft_metadata_accepts_ipfs_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "https://cdn.example.com/nft/original.json"),
        );

        let new_uri = String::from_str(&env, "ipfs://QmNewHashAfterUpdate");
        client.update_nft_metadata(&player, &id, &new_uri);

        assert_eq!(client.get_uri(&id), Some(new_uri));
    }

    /// `update_nft_metadata` by a non-owner must be rejected.
    #[test]
    #[should_panic]
    fn test_update_nft_metadata_rejects_non_owner() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let alice = Address::generate(&env);
        let eve = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &alice,
            &String::from_str(&env, "ipfs://QmValidHash"),
        );

        client.update_nft_metadata(
            &eve,
            &id,
            &String::from_str(&env, "ipfs://QmEvilHash"),
        );
    }

    // ── issue #849: mint_reward_nft_from_map URI validation ───────────────────

    /// `mint_reward_nft_from_map` must reject an empty URI.
    #[test]
    #[should_panic]
    fn test_mint_reward_nft_from_map_rejects_empty_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        client.mint_reward_nft_from_map(&minter, &player, &String::from_str(&env, ""));
    }

    /// `mint_reward_nft_from_map` must reject a `javascript:` URI.
    #[test]
    #[should_panic]
    fn test_mint_reward_nft_from_map_rejects_javascript_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "javascript:evil()"),
        );
    }

    /// `mint_reward_nft_from_map` must accept a valid `ipfs://` URI.
    #[test]
    fn test_mint_reward_nft_from_map_accepts_ipfs_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let uri = String::from_str(&env, "ipfs://QmValidCid");
        let id = client.mint_reward_nft_from_map(&minter, &player, &uri);

        assert_eq!(client.get_uri(&id), Some(uri));
        assert_eq!(client.get_owner(&id), Some(player));
    }

    /// `mint_reward_nft_from_map` must accept a valid `https://` URI.
    #[test]
    fn test_mint_reward_nft_from_map_accepts_https_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let uri = String::from_str(&env, "https://example.com/metadata/1.json");
        let id = client.mint_reward_nft_from_map(&minter, &player, &uri);

        assert_eq!(client.get_uri(&id), Some(uri));
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

    // ── issue #850: NftLocked guard ───────────────────────────────────────────

    /// `update_nft_metadata` must return `NftLocked` when the token is locked.
    ///
    /// This is one of the two acceptance criteria from issue #850: metadata
    /// updates on a locked token must be rejected.
    #[test]
    #[should_panic]
    fn test_update_nft_metadata_locked_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmOriginal"),
        );

        // Lock the token.
        client.lock_nft(&player, &id);
        assert!(client.is_locked(&id), "token should be locked after lock_nft");

        // Attempt to update metadata on a locked token — must panic (NftLocked).
        client.update_nft_metadata(
            &player,
            &id,
            &String::from_str(&env, "ipfs://QmNewHash"),
        );
    }

    /// `update_nft_metadata` succeeds after the token is unlocked.
    ///
    /// Locking is reversible: `unlock_nft` should restore normal metadata
    /// update behaviour.
    #[test]
    fn test_update_nft_metadata_after_unlock_succeeds() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmOriginal"),
        );

        client.lock_nft(&player, &id);
        client.unlock_nft(&player, &id);
        assert!(!client.is_locked(&id), "token should be unlocked after unlock_nft");

        let new_uri = String::from_str(&env, "ipfs://QmAfterUnlock");
        client.update_nft_metadata(&player, &id, &new_uri);

        assert_eq!(client.get_uri(&id), Some(new_uri));
    }

    /// `admin_update_image_uri` must also respect the locked state.
    #[test]
    #[should_panic]
    fn test_admin_update_image_uri_locked_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);
        let admin = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmOriginal"),
        );

        client.lock_nft(&player, &id);

        // Even admin cannot override a locked token — must panic (NftLocked).
        client.admin_update_image_uri(
            &admin,
            &id,
            &String::from_str(&env, "ipfs://QmAdminHash"),
        );
    }

    // ── issue #850: MetadataFrozen guard ──────────────────────────────────────

    /// `update_nft_metadata` must return `MetadataFrozen` after `freeze_metadata`.
    ///
    /// This is the second acceptance criterion from issue #850: MetadataFrozen
    /// must be wired to a real code path, not just a dead enum variant.
    #[test]
    #[should_panic]
    fn test_update_nft_metadata_frozen_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmOriginal"),
        );

        // Permanently freeze the metadata.
        client.freeze_metadata(&player, &id);
        assert!(
            client.is_metadata_frozen(&id),
            "token should be frozen after freeze_metadata"
        );

        // Attempt to update metadata on a frozen token — must panic (MetadataFrozen).
        client.update_nft_metadata(
            &player,
            &id,
            &String::from_str(&env, "ipfs://QmShouldFail"),
        );
    }

    /// Freezing is permanent: the URI is unchanged and the token stays frozen
    /// even if the owner tries to update it repeatedly.
    #[test]
    #[should_panic]
    fn test_update_nft_metadata_frozen_is_permanent() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let original_uri = String::from_str(&env, "ipfs://QmFrozenForever");
        let id = client.mint_reward_nft_from_map(&minter, &player, &original_uri);

        client.freeze_metadata(&player, &id);

        // URI must not have changed.
        assert_eq!(client.get_uri(&id), Some(original_uri));

        // Any update must still fail.
        client.update_nft_metadata(
            &player,
            &id,
            &String::from_str(&env, "ipfs://QmAttemptedChange"),
        );
    }

    /// `admin_update_image_uri` must also respect the frozen state.  The
    /// immutability guarantee offered by `freeze_metadata` must hold even
    /// against the admin entry-point.
    #[test]
    #[should_panic]
    fn test_admin_update_image_uri_frozen_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);
        let admin = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmOriginal"),
        );

        client.freeze_metadata(&player, &id);

        // Admin must be blocked by the frozen flag — must panic (MetadataFrozen).
        client.admin_update_image_uri(
            &admin,
            &id,
            &String::from_str(&env, "ipfs://QmAdminAttempt"),
        );
    }

    /// `admin_update_image_uri` succeeds on an unfrozen, unlocked token.
    #[test]
    fn test_admin_update_image_uri_succeeds_when_unlocked_and_unfrozen() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);
        let admin = Address::generate(&env);

        let id = client.mint_reward_nft_from_map(
            &minter,
            &player,
            &String::from_str(&env, "ipfs://QmOriginal"),
        );

        let new_uri = String::from_str(&env, "https://cdn.example.com/migrated.json");
        client.admin_update_image_uri(&admin, &id, &new_uri);

        assert_eq!(client.get_uri(&id), Some(new_uri));
    }
}
