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
    /// The token is locked; metadata updates are not permitted.
    NftLocked = 5,
    /// The token's metadata has been permanently frozen; it cannot be changed.
    MetadataFrozen = 6,
    /// The caller is not the contract admin.
    NotAdmin = 7,
    /// The contract admin has already been initialised.
    AlreadyInitialised = 8,
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

    // ── admin bootstrap ───────────────────────────────────────────────────────

    /// Initialise the contract admin.  Must be called exactly once.
    ///
    /// # Authorization
    ///
    /// `admin` must authorise this call, proving they control the address
    /// being installed as admin.
    pub fn initialise(env: Env, admin: Address) -> Result<(), NftError> {
        if storage::get_admin(&env).is_some() {
            return Err(NftError::AlreadyInitialised);
        }
        admin.require_auth();
        storage::set_admin(&env, &admin);
        Ok(())
    }

    // ── metadata update ───────────────────────────────────────────────────────

    /// Update the metadata URI of `nft_id`.
    ///
    /// # Rules
    ///
    /// 1. The token must exist.
    /// 2. `updater` must be the current owner.
    /// 3. The token must not be locked (`NftError::NftLocked`).
    /// 4. The token's metadata must not be frozen (`NftError::MetadataFrozen`).
    ///
    /// # Authorization
    ///
    /// `updater` must authorise this call.
    pub fn update_nft_metadata(
        env: Env,
        updater: Address,
        nft_id: u64,
        new_uri: String,
    ) -> Result<(), NftError> {
        updater.require_auth();

        let owner =
            storage::get_nft_owner(&env, nft_id).ok_or(NftError::TokenNotFound)?;

        if owner != updater {
            return Err(NftError::NotOwner);
        }

        // Check locked state before frozen — locked is a reversible operational
        // guard while frozen is the permanent immutability guarantee.
        if storage::get_nft_locked(&env, nft_id) {
            return Err(NftError::NftLocked);
        }

        if storage::get_nft_frozen(&env, nft_id) {
            return Err(NftError::MetadataFrozen);
        }

        storage::set_nft_uri(&env, nft_id, &new_uri);
        Ok(())
    }

    /// Batch-update the image URIs for a list of NFTs.
    ///
    /// This is an admin-only privilege intended for migrating a collection to a
    /// new IPFS gateway or fixing a corrupt CID.  It respects the frozen flag:
    /// an individual token whose metadata has been frozen cannot be overwritten
    /// even by the admin.
    ///
    /// # Authorization
    ///
    /// The stored contract admin must authorise this call.
    pub fn admin_update_image_uris(
        env: Env,
        admin: Address,
        nft_ids: Vec<u64>,
        new_uris: Vec<String>,
    ) -> Result<(), NftError> {
        admin.require_auth();

        // Verify caller is the stored admin.
        let stored_admin = storage::get_admin(&env).ok_or(NftError::NotAdmin)?;
        if stored_admin != admin {
            return Err(NftError::NotAdmin);
        }

        let len = nft_ids.len();
        for i in 0..len {
            let nft_id = nft_ids.get(i).unwrap();
            let new_uri = new_uris.get(i).unwrap();

            // Token must exist.
            storage::get_nft_owner(&env, nft_id).ok_or(NftError::TokenNotFound)?;

            // Admin respects the frozen flag — frozen metadata is immutable for
            // everyone, including the admin.
            if storage::get_nft_frozen(&env, nft_id) {
                return Err(NftError::MetadataFrozen);
            }

            storage::set_nft_uri(&env, nft_id, &new_uri);
        }

        Ok(())
    }

    // ── freeze / lock ─────────────────────────────────────────────────────────

    /// Permanently freeze the metadata of `nft_id`.
    ///
    /// Once frozen, neither the owner nor the admin can change the URI.  This
    /// is a one-way operation — there is intentionally no `unfreeze` entrypoint.
    ///
    /// # Authorization
    ///
    /// `caller` must be the current owner of the token.
    pub fn freeze_metadata(env: Env, caller: Address, nft_id: u64) -> Result<(), NftError> {
        caller.require_auth();

        let owner =
            storage::get_nft_owner(&env, nft_id).ok_or(NftError::TokenNotFound)?;

        if owner != caller {
            return Err(NftError::NotOwner);
        }

        storage::set_nft_frozen(&env, nft_id, true);
        Ok(())
    }

    /// Lock `nft_id`, preventing metadata updates until unlocked.
    ///
    /// Unlike `freeze_metadata`, locking is reversible.  Only the contract
    /// admin may lock or unlock tokens (e.g. during a hunt claim window).
    ///
    /// # Authorization
    ///
    /// The stored contract admin must authorise this call.
    pub fn set_nft_locked(
        env: Env,
        admin: Address,
        nft_id: u64,
        locked: bool,
    ) -> Result<(), NftError> {
        admin.require_auth();

        let stored_admin = storage::get_admin(&env).ok_or(NftError::NotAdmin)?;
        if stored_admin != admin {
            return Err(NftError::NotAdmin);
        }

        // Token must exist before we can lock/unlock it.
        storage::get_nft_owner(&env, nft_id).ok_or(NftError::TokenNotFound)?;

        storage::set_nft_locked(&env, nft_id, locked);
        Ok(())
    }

    // ── state queries ─────────────────────────────────────────────────────────

    /// Return `true` if the token's metadata is permanently frozen.
    pub fn is_metadata_frozen(env: Env, nft_id: u64) -> bool {
        storage::get_nft_frozen(&env, nft_id)
    }

    /// Return `true` if the token is currently locked.
    pub fn is_locked(env: Env, nft_id: u64) -> bool {
        storage::get_nft_locked(&env, nft_id)
    }
}
