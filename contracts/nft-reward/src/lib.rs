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

#[cfg(test)]
mod tests;

use soroban_sdk::{contract, contractimpl, contracterror, Address, Env, String, Vec};

// ─── errors ───────────────────────────────────────────────────────────────────

/// Contract-level errors returned by NFT operations.
///
/// The `#[contracterror]` derive macro generates the `From / TryFrom`
/// implementations that `#[contractimpl]` requires for `Result<T, NftError>`
/// return types.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum NftError {
    /// The caller is not the current owner of the token.
    NotOwner = 1,
    /// The token does not exist (never minted or already burned).
    TokenNotFound = 2,
    /// The recipient already owns this token (double-mint guard).
    AlreadyOwned = 3,
    /// Attempt to mint to the zero-address equivalent.
    InvalidRecipient = 4,
}

// ─── contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct NftRewardContract;

#[contractimpl]
impl NftRewardContract {
    // ── mint ──────────────────────────────────────────────────────────────────

    /// Mint a new NFT to `recipient` with the given metadata URI.
    ///
    /// Returns the newly assigned NFT id (1-based sequential).
    ///
    /// # Authorization
    ///
    /// The `minter` must authorise this call.  In the Hunty context this is
    /// the Reward Manager contract acting on behalf of the hunt creator.
    pub fn mint(
        env: Env,
        minter: Address,
        recipient: Address,
        uri: String,
    ) -> Result<u64, NftError> {
        minter.require_auth();

        let nft_id = storage::increment_total_supply(&env);

        storage::set_nft_uri(&env, nft_id, &uri);
        storage::set_nft_minter(&env, nft_id, &minter);
        storage::set_nft_owner(&env, nft_id, &recipient);
        storage::add_nft_to_owner(&env, &recipient, nft_id);

        Ok(nft_id)
    }

    // ── transfer ──────────────────────────────────────────────────────────────

    /// Transfer ownership of `nft_id` from `from` to `to`.
    ///
    /// # Authorization
    ///
    /// `from` must authorise this call.
    pub fn transfer(
        env: Env,
        from: Address,
        to: Address,
        nft_id: u64,
    ) -> Result<(), NftError> {
        from.require_auth();

        let owner = storage::get_nft_owner(&env, nft_id).ok_or(NftError::TokenNotFound)?;

        if owner != from {
            return Err(NftError::NotOwner);
        }

        // Remove from sender's index, add to recipient's index.
        storage::remove_nft_from_owner(&env, &from, nft_id);
        storage::set_nft_owner(&env, nft_id, &to);
        storage::add_nft_to_owner(&env, &to, nft_id);

        Ok(())
    }

    // ── burn ──────────────────────────────────────────────────────────────────

    /// Permanently destroy `nft_id`.
    ///
    /// After a successful call the token no longer exists: `get_owner` returns
    /// `None`, the owner's count and enumerable slots are updated atomically,
    /// and no existence key remains.
    ///
    /// # Authorization
    ///
    /// `owner` must authorise this call and must be the current holder of the
    /// token.
    ///
    /// # Design note (issue #848)
    ///
    /// Previously this function contained ~35 lines of inline swap-and-pop
    /// surgery using raw `symbol_short!("ONFC")`, `symbol_short!("ONFX")`, and
    /// `symbol_short!("ONFT")` keys, duplicating the layout knowledge that
    /// `storage::add_nft_to_owner` owns.  The inline copy had a bug: when the
    /// NFT was missing from the ONFT enumerable list but the ONFX existence key
    /// was present, the counter was not decremented while the existence key was
    /// removed, leaving the two structures inconsistent.
    ///
    /// The fix moves all index surgery into `storage::remove_nft_from_owner`,
    /// so that add and remove live side-by-side and any future layout change
    /// only needs to happen in one place.
    pub fn burn(env: Env, owner: Address, nft_id: u64) -> Result<(), NftError> {
        owner.require_auth();

        let current_owner =
            storage::get_nft_owner(&env, nft_id).ok_or(NftError::TokenNotFound)?;

        if current_owner != owner {
            return Err(NftError::NotOwner);
        }

        // Remove from owner's index — all ONFC / ONFX / ONFT key surgery lives
        // here, next to add_nft_to_owner, in storage.rs.
        storage::remove_nft_from_owner(&env, &owner, nft_id);

        // Erase the token-level records.
        storage::remove_nft_owner(&env, nft_id);

        Ok(())
    }

    // ── queries ───────────────────────────────────────────────────────────────

    /// Return the current owner of `nft_id`, or `None` if burned / not found.
    pub fn get_owner(env: Env, nft_id: u64) -> Option<Address> {
        storage::get_nft_owner(&env, nft_id)
    }

    /// Return the metadata URI for `nft_id`.
    pub fn get_uri(env: Env, nft_id: u64) -> Option<String> {
        storage::get_nft_uri(&env, nft_id)
    }

    /// Return the original minter of `nft_id`.
    pub fn get_minter(env: Env, nft_id: u64) -> Option<Address> {
        storage::get_nft_minter(&env, nft_id)
    }

    /// Return all NFT ids currently owned by `owner`.
    pub fn get_player_nfts(env: Env, owner: Address) -> Vec<u64> {
        storage::get_owner_nfts(&env, &owner)
    }

    /// Return the number of NFTs currently owned by `owner`.
    pub fn balance_of(env: Env, owner: Address) -> u32 {
        storage::get_owner_nft_count(&env, &owner)
    }

    /// Return the total number of tokens minted (includes burned tokens).
    pub fn total_supply(env: Env) -> u64 {
        storage::get_total_supply(&env)
    }
}
