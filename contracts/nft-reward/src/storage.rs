//! Storage layer for the nft-reward contract.
//!
//! All persistent storage access goes through this module.  No other file in
//! the crate should construct raw `symbol_short!` keys or touch
//! `env.storage()` directly — see issue #848 for the motivation.
//!
//! # Owner-index layout
//!
//! Three keys compose the per-owner NFT index:
//!
//! | Key                         | Type | Purpose                                     |
//! |-----------------------------|------|---------------------------------------------|
//! | `(ONFC, owner)`             | u32  | Number of NFTs currently owned              |
//! | `(ONFX, owner, nft_id)`     | bool | Existence sentinel for fast membership test |
//! | `(ONFT, owner, slot_index)` | u64  | NFT id stored at slot `i` (0-based)         |
//!
//! The enumerable list is kept compact via *swap-and-pop*: when removing entry
//! `i`, the last slot is moved into `i` and the last slot is deleted.

use soroban_sdk::{symbol_short, Address, Env};

// ─── key-symbol constants ─────────────────────────────────────────────────────

/// Counter: number of NFTs owned by an address.
const KEY_OWNER_COUNT: soroban_sdk::Symbol = symbol_short!("ONFC");
/// Existence flag: whether `owner` owns `nft_id`.
const KEY_OWNER_EXIST: soroban_sdk::Symbol = symbol_short!("ONFX");
/// Enumerable slot: the NFT id at index `i` for `owner`.
const KEY_OWNER_SLOT: soroban_sdk::Symbol = symbol_short!("ONFT");

// ─── NFT metadata storage ─────────────────────────────────────────────────────

/// Store the URI (IPFS CID or HTTP URL) for a given `nft_id`.
pub fn set_nft_uri(env: &Env, nft_id: u64, uri: &soroban_sdk::String) {
    let key = (symbol_short!("NFTU"), nft_id);
    env.storage().persistent().set(&key, uri);
}

/// Retrieve the URI for `nft_id`, or `None` if not found.
pub fn get_nft_uri(env: &Env, nft_id: u64) -> Option<soroban_sdk::String> {
    let key = (symbol_short!("NFTU"), nft_id);
    env.storage().persistent().get(&key)
}

/// Store the minter (creator) address for `nft_id`.
pub fn set_nft_minter(env: &Env, nft_id: u64, minter: &Address) {
    let key = (symbol_short!("NFTM"), nft_id);
    env.storage().persistent().set(&key, minter);
}

/// Retrieve the minter address for `nft_id`, or `None`.
pub fn get_nft_minter(env: &Env, nft_id: u64) -> Option<Address> {
    let key = (symbol_short!("NFTM"), nft_id);
    env.storage().persistent().get(&key)
}

// ─── token ownership ──────────────────────────────────────────────────────────

/// Store the current owner of `nft_id`.
pub fn set_nft_owner(env: &Env, nft_id: u64, owner: &Address) {
    let key = (symbol_short!("NFTO"), nft_id);
    env.storage().persistent().set(&key, owner);
}

/// Retrieve the current owner of `nft_id`, or `None` if the token does not
/// exist (e.g. it has been burned).
pub fn get_nft_owner(env: &Env, nft_id: u64) -> Option<Address> {
    let key = (symbol_short!("NFTO"), nft_id);
    env.storage().persistent().get(&key)
}

/// Remove the ownership record for `nft_id` (called on burn).
pub fn remove_nft_owner(env: &Env, nft_id: u64) {
    let key = (symbol_short!("NFTO"), nft_id);
    env.storage().persistent().remove(&key);
}

// ─── NFT state flags ──────────────────────────────────────────────────────────

/// Return `true` when `nft_id` is locked (transfers and metadata updates are
/// blocked while locked).
pub fn get_nft_locked(env: &Env, nft_id: u64) -> bool {
    let key = (symbol_short!("NFTL"), nft_id);
    env.storage()
        .persistent()
        .get::<_, bool>(&key)
        .unwrap_or(false)
}

/// Set or clear the locked flag for `nft_id`.
pub fn set_nft_locked(env: &Env, nft_id: u64, locked: bool) {
    let key = (symbol_short!("NFTL"), nft_id);
    env.storage().persistent().set(&key, &locked);
}

/// Return `true` when the metadata for `nft_id` has been permanently frozen.
/// Once set, this flag cannot be unset.
pub fn get_nft_metadata_frozen(env: &Env, nft_id: u64) -> bool {
    let key = (symbol_short!("NFTF"), nft_id);
    env.storage()
        .persistent()
        .get::<_, bool>(&key)
        .unwrap_or(false)
}

/// Permanently freeze the metadata for `nft_id`.  This is a one-way operation.
pub fn set_nft_metadata_frozen(env: &Env, nft_id: u64) {
    let key = (symbol_short!("NFTF"), nft_id);
    env.storage().persistent().set(&key, &true);
}

// ─── NFT counter (total supply) ───────────────────────────────────────────────

/// Return the total number of NFTs ever minted (monotonically increasing).
pub fn get_total_supply(env: &Env) -> u64 {
    env.storage()
        .persistent()
        .get(&symbol_short!("TOTAL"))
        .unwrap_or(0u64)
}

/// Increment and persist the total-supply counter; return the *new* value.
pub fn increment_total_supply(env: &Env) -> u64 {
    let next = get_total_supply(env) + 1;
    env.storage()
        .persistent()
        .set(&symbol_short!("TOTAL"), &next);
    next
}

// ─── owner index ──────────────────────────────────────────────────────────────

/// Return the number of NFTs currently owned by `owner`.
pub fn get_owner_nft_count(env: &Env, owner: &Address) -> u32 {
    let key = (KEY_OWNER_COUNT, owner.clone());
    env.storage().persistent().get(&key).unwrap_or(0u32)
}

/// Return the NFT id stored at `slot` for `owner`.
///
/// Panics if `slot >= get_owner_nft_count(env, owner)`.
pub fn get_owner_nft_at(env: &Env, owner: &Address, slot: u32) -> u64 {
    let key = (KEY_OWNER_SLOT, owner.clone(), slot);
    env.storage()
        .persistent()
        .get(&key)
        .expect("slot out of range")
}

/// Return `true` when `owner` currently holds `nft_id`.
pub fn owner_has_nft(env: &Env, owner: &Address, nft_id: u64) -> bool {
    let key = (KEY_OWNER_EXIST, owner.clone(), nft_id);
    env.storage()
        .persistent()
        .get::<_, bool>(&key)
        .unwrap_or(false)
}

/// Add `nft_id` to `owner`'s enumerable index.
///
/// The function is idempotent: if `nft_id` is already present for `owner` the
/// call is a no-op.
pub fn add_nft_to_owner(env: &Env, owner: &Address, nft_id: u64) {
    // Guard against double-registration.
    if owner_has_nft(env, owner, nft_id) {
        return;
    }

    let count = get_owner_nft_count(env, owner);

    // Append nft_id at the next available slot.
    let slot_key = (KEY_OWNER_SLOT, owner.clone(), count);
    env.storage().persistent().set(&slot_key, &nft_id);

    // Mark existence.
    let exist_key = (KEY_OWNER_EXIST, owner.clone(), nft_id);
    env.storage().persistent().set(&exist_key, &true);

    // Increment the counter.
    let count_key = (KEY_OWNER_COUNT, owner.clone());
    env.storage()
        .persistent()
        .set(&count_key, &(count + 1));
}

/// Remove `nft_id` from `owner`'s enumerable index using *swap-and-pop*.
///
/// The function is idempotent: if `nft_id` is not present for `owner` the call
/// is a no-op.  The owner-index invariants maintained by this function are:
///
/// * `ONFC` equals the number of `ONFT` slots that exist.
/// * Every `ONFX` existence key matches exactly one `ONFT` slot.
/// * No `ONFX` key remains for `nft_id` after removal (fixes the partial-
///   removal bug described in issue #848 §"found guard").
pub fn remove_nft_from_owner(env: &Env, owner: &Address, nft_id: u64) {
    // Nothing to do if the NFT is not in the owner's index.
    if !owner_has_nft(env, owner, nft_id) {
        return;
    }

    let count = get_owner_nft_count(env, owner);
    // count > 0 is guaranteed because owner_has_nft returned true.

    // ── Step 1: find the slot that holds nft_id ───────────────────────────────
    let mut target_slot: u32 = 0;
    let mut found = false;
    for i in 0..count {
        let slot_key = (KEY_OWNER_SLOT, owner.clone(), i);
        let stored: u64 = env
            .storage()
            .persistent()
            .get(&slot_key)
            .expect("index corruption: slot missing");
        if stored == nft_id {
            target_slot = i;
            found = true;
            break;
        }
    }

    // The existence key said the NFT is here, so we must find it.
    assert!(found, "index corruption: exist-key set but slot not found");

    // ── Step 2: swap-and-pop ──────────────────────────────────────────────────
    let last_slot = count - 1;
    if target_slot != last_slot {
        // Move the last entry into the vacated slot.
        let last_slot_key = (KEY_OWNER_SLOT, owner.clone(), last_slot);
        let last_id: u64 = env
            .storage()
            .persistent()
            .get(&last_slot_key)
            .expect("index corruption: last slot missing");

        let target_slot_key = (KEY_OWNER_SLOT, owner.clone(), target_slot);
        env.storage()
            .persistent()
            .set(&target_slot_key, &last_id);
        env.storage().persistent().remove(&last_slot_key);
    } else {
        // nft_id was already the last element — just delete the slot.
        let slot_key = (KEY_OWNER_SLOT, owner.clone(), target_slot);
        env.storage().persistent().remove(&slot_key);
    }

    // ── Step 3: remove the existence key for nft_id ──────────────────────────
    let exist_key = (KEY_OWNER_EXIST, owner.clone(), nft_id);
    env.storage().persistent().remove(&exist_key);

    // ── Step 4: decrement the counter ────────────────────────────────────────
    let count_key = (KEY_OWNER_COUNT, owner.clone());
    env.storage()
        .persistent()
        .set(&count_key, &(last_slot));
}

/// Return all NFT ids currently owned by `owner` as a `soroban_sdk::Vec`.
pub fn get_owner_nfts(env: &Env, owner: &Address) -> soroban_sdk::Vec<u64> {
    let count = get_owner_nft_count(env, owner);
    let mut ids = soroban_sdk::Vec::new(env);
    for i in 0..count {
        ids.push_back(get_owner_nft_at(env, owner, i));
    }
    ids
}
