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
        let contract_id = env.register_contract(None, NftRewardContract);
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
}

// ── issue #1403: metadata URI validation ─────────────────────────────────────
//
// This crate is `#![no_std]`, so the helpers below build byte buffers by hand
// rather than using `format!` / `vec!`.

#[cfg(test)]
mod uri_validation_tests {
    use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

    use crate::{NftError, NftRewardContract, NftRewardContractClient, MAX_URI_LEN};

    /// Byte length of the `ipfs://` scheme prefix.
    const PREFIX_LEN: usize = 7;
    const PREFIX: [u8; PREFIX_LEN] = *b"ipfs://";

    fn setup(env: &Env) -> (Address, NftRewardContractClient<'_>) {
        let contract_id = env.register_contract(None, NftRewardContract);
        let client = NftRewardContractClient::new(env, &contract_id);
        let minter = Address::generate(env);
        (minter, client)
    }

    /// A fixed-size, `ipfs://`-prefixed byte buffer of length `N`.
    ///
    /// Using the ipfs scheme keeps the length assertions independent of the
    /// `require-ipfs-uri` feature, so both builds exercise the same boundary.
    fn ipfs_bytes<const N: usize>() -> [u8; N] {
        let mut bytes = [b'a'; N];
        bytes[..PREFIX_LEN].copy_from_slice(&PREFIX);
        bytes
    }

    /// A plausible URI of exactly `total` bytes: `ipfs://` followed by filler.
    fn uri_of_len(env: &Env, total: usize) -> String {
        assert!(total > PREFIX_LEN, "total must exceed the prefix length");
        let mut bytes = [b'a'; MAX_URI_LEN + 1];
        bytes[..PREFIX_LEN].copy_from_slice(&PREFIX);
        String::from_bytes(env, &bytes[..total])
    }

    /// Assert that `mint` rejected `uri` with the expected contract error.
    fn assert_mint_rejected(
        client: &NftRewardContractClient<'_>,
        minter: &Address,
        recipient: &Address,
        uri: &String,
        expected: NftError,
    ) {
        assert_eq!(
            client.try_mint(minter, recipient, uri),
            Err(Ok(expected)),
            "expected mint to be rejected with {expected:?}",
        );
    }

    #[test]
    fn test_mint_rejects_empty_uri() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let empty = String::from_str(&env, "");
        assert_mint_rejected(&client, &minter, &player, &empty, NftError::EmptyUri);
    }

    #[test]
    fn test_mint_accepts_uri_at_max_len() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let uri = uri_of_len(&env, MAX_URI_LEN);
        assert_eq!(uri.len() as usize, MAX_URI_LEN);

        let id = client.mint(&minter, &player, &uri);
        assert_eq!(client.get_uri(&id), Some(uri));
    }

    #[test]
    fn test_mint_rejects_uri_one_byte_over_max_len() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let uri = uri_of_len(&env, MAX_URI_LEN + 1);
        assert_mint_rejected(&client, &minter, &player, &uri, NftError::UriTooLong);
    }

    #[test]
    fn test_mint_rejected_uri_writes_no_state() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let too_long = uri_of_len(&env, MAX_URI_LEN + 1);
        assert_mint_rejected(&client, &minter, &player, &too_long, NftError::UriTooLong);

        // The supply counter must not have advanced and the recipient must not
        // have been credited, otherwise a rejected mint would burn an id.
        assert_eq!(client.total_supply(), 0);
        assert_eq!(client.balance_of(&player), 0);
        assert_eq!(client.get_player_nfts(&player), Vec::new(&env));
        assert_eq!(client.get_owner(&1), None);
        assert_eq!(client.get_uri(&1), None);
    }

    #[test]
    fn test_mint_after_rejection_still_uses_id_one() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let too_long = uri_of_len(&env, MAX_URI_LEN + 1);
        assert_mint_rejected(&client, &minter, &player, &too_long, NftError::UriTooLong);

        let good = uri_of_len(&env, 32);
        let id = client.mint(&minter, &player, &good);
        assert_eq!(id, 1, "a rejected mint must not consume an id");
        assert_eq!(client.get_uri(&id), Some(good));
    }

    #[test]
    fn test_validate_uri_rejects_empty_bytes() {
        assert_eq!(crate::validate_uri(b""), Err(NftError::EmptyUri));
    }

    #[test]
    fn test_validate_uri_enforces_byte_length_boundaries() {
        // Exactly at the cap is accepted; one byte over is rejected.
        assert_eq!(crate::validate_uri(&ipfs_bytes::<MAX_URI_LEN>()), Ok(()));
        assert_eq!(
            crate::validate_uri(&ipfs_bytes::<{ MAX_URI_LEN + 1 }>()),
            Err(NftError::UriTooLong)
        );
    }

    #[test]
    fn test_validate_uri_counts_bytes_not_characters() {
        // 200 two-byte characters: 200 characters but 400 bytes. The cap is
        // expressed in bytes because rent is charged per stored byte, so this
        // must be rejected even though it is "only" 200 characters long.
        const CHARS: usize = 200;
        let mut multibyte = [0u8; CHARS * 2];
        let e_acute = "é".as_bytes();
        for chunk in multibyte.chunks_exact_mut(2) {
            chunk.copy_from_slice(e_acute);
        }
        assert_eq!(multibyte.len(), 400);
        assert_eq!(crate::validate_uri(&multibyte), Err(NftError::UriTooLong));
    }

    #[test]
    fn test_validate_uri_scheme_rule() {
        // An `ipfs://` URI is accepted in both builds.
        assert_eq!(crate::validate_uri(b"ipfs://QmHash"), Ok(()));

        // Default build: the scheme is not enforced, so other schemes and a
        // differently-cased prefix are all accepted.
        #[cfg(not(feature = "require-ipfs-uri"))]
        {
            assert_eq!(crate::validate_uri(b"https://example.test/a.json"), Ok(()));
            assert_eq!(crate::validate_uri(b"IPFS://QmHash"), Ok(()));
        }

        // Feature build: only a literal `ipfs://` prefix is accepted, and the
        // scheme is checked as a case-sensitive prefix match.
        #[cfg(feature = "require-ipfs-uri")]
        {
            assert_eq!(
                crate::validate_uri(b"https://example.test/a.json"),
                Err(NftError::InvalidUriScheme)
            );
            assert_eq!(
                crate::validate_uri(b"IPFS://QmHash"),
                Err(NftError::InvalidUriScheme)
            );
            // A near-miss that is not the prefix at all.
            assert_eq!(
                crate::validate_uri(b"xipfs://QmHash"),
                Err(NftError::InvalidUriScheme)
            );
        }
    }
}

// ── issue #1401: contract events, re-applied on top of the restored contract ──

#[cfg(test)]
mod event_tests {
    use soroban_sdk::{
        testutils::{Address as _, Events},
        Address, Env, String, Symbol, TryFromVal, Val,
    };

    use crate::{NftRewardContract, NftRewardContractClient};

    fn setup(env: &Env) -> (Address, NftRewardContractClient<'_>) {
        let contract_id = env.register_contract(None, NftRewardContract);
        let client = NftRewardContractClient::new(env, &contract_id);
        let minter = Address::generate(env);
        (minter, client)
    }

    // `Val` has no `PartialEq` in soroban-sdk 20, so topics and data are
    // converted back to their concrete types before being compared.
    fn as_symbol(env: &Env, v: &Val) -> Symbol {
        Symbol::try_from_val(env, v).unwrap()
    }

    fn as_address(env: &Env, v: &Val) -> Address {
        Address::try_from_val(env, v).unwrap()
    }

    fn as_u64(env: &Env, v: &Val) -> u64 {
        u64::try_from_val(env, v).unwrap()
    }

    #[test]
    fn test_mint_event_published() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let uri = String::from_str(&env, "ipfs://QmMint");
        let id = client.mint(&minter, &player, &uri);

        let events = env.events().all();
        assert_eq!(events.len(), 1, "mint must publish exactly one event");

        let (contract_id, topics, data) = events.get(0).unwrap();

        assert_eq!(contract_id, client.address);
        assert_eq!(
            as_symbol(&env, &topics.get(0).unwrap()),
            Symbol::new(&env, "mint")
        );
        assert_eq!(as_address(&env, &topics.get(1).unwrap()), player);
        assert_eq!(as_u64(&env, &data), id);
    }

    #[test]
    fn test_transfer_event_published() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let from = Address::generate(&env);
        let to = Address::generate(&env);

        let uri = String::from_str(&env, "ipfs://QmTransfer");
        let id = client.mint(&minter, &from, &uri);
        client.transfer(&from, &to, &id);

        let events = env.events().all();
        assert_eq!(events.len(), 2, "mint and transfer each publish one event");

        let (contract_id, topics, data) = events.get(1).unwrap();

        assert_eq!(contract_id, client.address);
        assert_eq!(
            as_symbol(&env, &topics.get(0).unwrap()),
            Symbol::new(&env, "transfer")
        );
        assert_eq!(as_address(&env, &topics.get(1).unwrap()), from);
        assert_eq!(as_address(&env, &topics.get(2).unwrap()), to);
        assert_eq!(as_u64(&env, &data), id);
    }

    #[test]
    fn test_burn_event_published() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let owner = Address::generate(&env);

        let uri = String::from_str(&env, "ipfs://QmBurn");
        let id = client.mint(&minter, &owner, &uri);
        client.burn(&owner, &id);

        let events = env.events().all();
        assert_eq!(events.len(), 2, "mint and burn each publish one event");

        let (contract_id, topics, data) = events.get(1).unwrap();

        assert_eq!(contract_id, client.address);
        assert_eq!(
            as_symbol(&env, &topics.get(0).unwrap()),
            Symbol::new(&env, "burn")
        );
        assert_eq!(as_address(&env, &topics.get(1).unwrap()), owner);
        assert_eq!(as_u64(&env, &data), id);
    }

    #[test]
    fn test_rejected_mint_publishes_no_event() {
        let env = Env::default();
        env.mock_all_auths();
        let (minter, client) = setup(&env);
        let player = Address::generate(&env);

        let empty = String::from_str(&env, "");
        assert!(client.try_mint(&minter, &player, &empty).is_err());

        assert_eq!(
            env.events().all().len(),
            0,
            "a rejected mint must not publish an event",
        );
    }
}
