//! nft-reward — Soroban smart contract for Hunty NFT rewards.
//!
//! # Storage discipline
//!
//! **All** persistent storage access is routed through `crate::storage`.
//! No raw `symbol_short!` keys appear in this file.  See issue #848 for why
//! this discipline matters: the owner-index layout must be encoded in exactly
//! one place so that future changes to key prefixes or counter conventions
//! (e.g. the prefix isolation proposed in #408) cannot silently diverge.

#![no_std]

mod storage;

use soroban_sdk::{contract, contractimpl, Address, Env, String, Symbol, Vec};

const MAX_URI_LEN: u32 = 256;

fn validate_uri(uri: &String) -> bool {
    uri.len() > 0 && uri.len() <= MAX_URI_LEN
}

// ─── access control (issue #1399) ─────────────────────────────────────────────

/// Panic unless `caller` is the admin stored by [`NftRewardContract::initialize`].
///
/// The admin — not the allow-list — owns the allow-list, so a compromised
/// minter cannot widen its own authority.
fn require_admin(env: &Env, caller: &Address) {
    assert_eq!(
        storage::get_admin(env),
        Some(caller.clone()),
        "caller is not the contract admin"
    );
}

#[contract]
pub struct NftRewardContract;

#[contractimpl]
impl NftRewardContract {
    // ── initialisation ────────────────────────────────────────────────────────

    /// One-time contract setup.
    ///
    /// Stores `admin` and the initial minter allow-list. `admin` must authorise
    /// this call, and a second call panics so neither the admin nor the
    /// allow-list can be swapped out after deployment.
    ///
    /// Until this has run no `mint` can succeed: `is_minter_allowed` defaults to
    /// `false`, so a freshly deployed contract is mintable by nobody.
    ///
    /// # Authorization
    ///
    /// `admin` must authorise this call.
    pub fn initialize(env: Env, admin: Address, minters: Vec<Address>) {
        admin.require_auth();

        assert!(!storage::is_initialized(&env), "already initialized");

        storage::set_admin(&env, &admin);

        for i in 0..minters.len() {
            let minter = minters.get(i).unwrap();
            storage::set_minter_allowed(&env, &minter, true);
        }
    }

    /// Add `minter` to the allow-list. Admin-only.
    pub fn add_minter(env: Env, admin: Address, minter: Address) {
        admin.require_auth();
        require_admin(&env, &admin);

        storage::set_minter_allowed(&env, &minter, true);
    }

    /// Remove `minter` from the allow-list. Admin-only.
    pub fn remove_minter(env: Env, admin: Address, minter: Address) {
        admin.require_auth();
        require_admin(&env, &admin);

        storage::set_minter_allowed(&env, &minter, false);
    }

    // ── mint ──────────────────────────────────────────────────────────────────

    pub fn mint(env: Env, minter: Address, recipient: Address, uri: String) -> u64 {
        minter.require_auth();

        // Issue #1399: `require_auth` only proves the caller owns the key it
        // passed as `minter` — any address could therefore mint unlimited
        // reward NFTs for itself. Only an allow-listed minter (in the Hunty
        // deployment, the Reward Manager acting for the hunt creator) may mint.
        assert!(
            storage::is_minter_allowed(&env, &minter),
            "minter is not on the allow-list"
        );

        assert!(validate_uri(&uri), "uri must be non-empty and at most 256 bytes");

        let nft_id = storage::increment_total_supply(&env);
        storage::set_nft_uri(&env, nft_id, &uri);
        storage::set_nft_minter(&env, nft_id, &minter);
        storage::set_nft_owner(&env, nft_id, &recipient);
        storage::add_nft_to_owner(&env, &recipient, nft_id);

        env.events()
            .publish((Symbol::new(&env, "mint"), recipient), nft_id);

        nft_id
    }

    pub fn transfer(env: Env, from: Address, to: Address, nft_id: u64) {
        from.require_auth();

        let owner = storage::get_nft_owner(&env, nft_id).expect("nft does not exist");
        assert_eq!(owner, from, "not owner");

        storage::remove_nft_from_owner(&env, &from, nft_id);
        storage::add_nft_to_owner(&env, &to, nft_id);
        storage::set_nft_owner(&env, nft_id, &to);

        env.events()
            .publish((Symbol::new(&env, "transfer"), from.clone(), to.clone()), nft_id);
    }

    pub fn burn(env: Env, owner: Address, nft_id: u64) {
        owner.require_auth();

        let current_owner = storage::get_nft_owner(&env, nft_id).expect("nft does not exist");
        assert_eq!(current_owner, owner, "not owner");

        storage::remove_nft_from_owner(&env, &owner, nft_id);
        storage::remove_nft_owner(&env, nft_id);

        env.events().publish((Symbol::new(&env, "burn"), owner), nft_id);
    }

    pub fn balance_of(env: Env, owner: Address) -> u32 {
        storage::get_owner_nft_count(&env, &owner)
    }

    pub fn total_supply(env: Env) -> u64 {
        storage::get_total_supply(&env)
    }

    pub fn get_owner(env: Env, nft_id: u64) -> Option<Address> {
        storage::get_nft_owner(&env, nft_id)
    }

    pub fn get_nft_uri(env: Env, nft_id: u64) -> Option<String> {
        storage::get_nft_uri(&env, nft_id)
    }

    pub fn get_nft_minter(env: Env, nft_id: u64) -> Option<Address> {
        storage::get_nft_minter(&env, nft_id)
    }

    pub fn get_player_nfts(env: Env, owner: Address) -> Vec<u64> {
        storage::get_owner_nfts(&env, &owner)
    }

    pub fn get_player_nfts_page(env: Env, owner: Address, start: u32, limit: u32) -> Vec<u64> {
        let count = storage::get_owner_nft_count(&env, &owner);
        if start >= count || limit == 0 {
            return Vec::new(&env);
        }

        let end = (start + limit).min(count);
        let mut page = Vec::new(&env);
        for i in start..end {
            page.push_back(storage::get_owner_nft_at(&env, &owner, i));
        }
        page
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events},
        vec, IntoVal, TryFromVal,
    };

    /// Register-and-initialise a single-minter contract for the event tests:
    /// with the issue #1399 allow-list in place, `mint` panics unless its minter
    /// was allow-listed by `initialize`.
    fn initialize_single_minter(env: &Env, client: &NftRewardContractClient) -> Address {
        let admin = Address::generate(env);
        let minter = Address::generate(env);
        let mut minters = Vec::new(env);
        minters.push_back(minter.clone());
        client.initialize(&admin, &minters);
        minter
    }

    #[test]
    fn test_mint_event_published() {
        let env = Env::default();
        let contract_id = env.register_contract(None, NftRewardContract);
        let client = NftRewardContractClient::new(&env, &contract_id);

        let recipient = Address::generate(&env);

        env.mock_all_auths();
        let minter = initialize_single_minter(&env, &client);
        let minted_id = client.mint(&minter, &recipient, &String::from_str(&env, "ipfs://mint"));
        assert_eq!(minted_id, 1);

        let events = env.events().all();
        assert_eq!(events.len(), 1);

        let event = events.get(0).unwrap();
        assert_eq!(
            event.1,
            vec![
                &env,
                Symbol::new(&env, "mint").into_val(&env),
                recipient.into_val(&env)
            ]
        );
        let payload: u64 = u64::try_from_val(&env, &event.2).unwrap();
        assert_eq!(payload, minted_id);
    }

    #[test]
    fn test_transfer_event_published() {
        let env = Env::default();
        let contract_id = env.register_contract(None, NftRewardContract);
        let client = NftRewardContractClient::new(&env, &contract_id);

        let from = Address::generate(&env);
        let to = Address::generate(&env);

        env.mock_all_auths();
        let minter = initialize_single_minter(&env, &client);
        let nft_id = client.mint(&minter, &from, &String::from_str(&env, "ipfs://transfer"));
        client.transfer(&from, &to, &nft_id);

        let events = env.events().all();
        assert_eq!(events.len(), 2);

        let event = events.get(1).unwrap();
        assert_eq!(
            event.1,
            vec![
                &env,
                Symbol::new(&env, "transfer").into_val(&env),
                from.into_val(&env),
                to.into_val(&env)
            ]
        );
        let payload: u64 = u64::try_from_val(&env, &event.2).unwrap();
        assert_eq!(payload, nft_id);
    }

    #[test]
    fn test_burn_event_published() {
        let env = Env::default();
        let contract_id = env.register_contract(None, NftRewardContract);
        let client = NftRewardContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);

        env.mock_all_auths();
        let minter = initialize_single_minter(&env, &client);
        let nft_id = client.mint(&minter, &owner, &String::from_str(&env, "ipfs://burn"));
        client.burn(&owner, &nft_id);

        let events = env.events().all();
        assert_eq!(events.len(), 2);

        let event = events.get(1).unwrap();
        assert_eq!(
            event.1,
            vec![
                &env,
                Symbol::new(&env, "burn").into_val(&env),
                owner.into_val(&env)
            ]
        );
        let payload: u64 = u64::try_from_val(&env, &event.2).unwrap();
        assert_eq!(payload, nft_id);
    }
}

#[cfg(test)]
mod tests;
