//! nft-reward — Soroban smart contract for Hunty NFT rewards.
//!
//! # Storage discipline
//!
//! **All** persistent storage access is routed through `crate::storage`.
//! No raw `symbol_short!` *storage keys* appear in this file.  See issue #848
//! for why this discipline matters: the owner-index layout must be encoded in
//! exactly one place so that future changes to key prefixes or counter
//! conventions (e.g. the prefix isolation proposed in #408) cannot silently
//! diverge.
//!
//! `symbol_short!` does appear below, but only to name *event topics* for the
//! `mint` / `transfer` / `burn` events from issue #1401.  Event topics are part
//! of a published log rather than ledger state, so they are deliberately kept
//! next to the call that publishes them instead of living in `storage`.

#![no_std]

mod storage;

#[cfg(test)]
mod tests;

use soroban_sdk::{contract, contracterror, contractimpl, symbol_short, Address, Env, String, Vec};

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
    /// The metadata URI was empty (issue #1403).
    EmptyUri = 5,
    /// The metadata URI exceeded [`MAX_URI_LEN`] bytes (issue #1403).
    UriTooLong = 6,
    /// The metadata URI did not use the `ipfs://` scheme while the
    /// `require-ipfs-uri` feature is enabled (issue #1403).
    InvalidUriScheme = 7,
}

// ─── metadata URI limits (issue #1403) ────────────────────────────────────────

/// Maximum accepted length of a metadata URI, in bytes.
///
/// A URI is written to persistent storage on every mint, so its size directly
/// drives the storage rent the minter has to pay.  256 bytes is enough for an
/// `ipfs://` CID plus a short path and keeps that cost bounded and predictable.
pub const MAX_URI_LEN: usize = 256;

/// The scheme prefix for IPFS metadata, used by [`validate_uri`].
#[cfg(feature = "require-ipfs-uri")]
const IPFS_URI_PREFIX: &[u8] = b"ipfs://";

/// Validate a metadata URI, given its raw bytes.
///
/// This is the canonical, framework-independent form of the #1403 rules and is
/// what the unit tests exercise, because it can be handed an arbitrary byte
/// slice.  [`validate_uri_str`] is the on-chain entry point.
///
/// # Errors
///
/// * [`NftError::EmptyUri`] when `uri` has no bytes.
/// * [`NftError::UriTooLong`] when `uri` is longer than [`MAX_URI_LEN`] bytes.
/// * [`NftError::InvalidUriScheme`] when the `require-ipfs-uri` feature is
///   enabled and `uri` does not start with `ipfs://`.
///
/// The length is checked in **bytes**, not characters: rent is charged per
/// stored byte, and a multi-byte UTF-8 URI is charged for every one of its
/// bytes.  The empty check runs first so an empty URI reports `EmptyUri`
/// rather than a scheme error.
#[cfg_attr(not(feature = "require-ipfs-uri"), allow(dead_code))]
fn validate_uri(uri: &[u8]) -> Result<(), NftError> {
    if uri.is_empty() {
        return Err(NftError::EmptyUri);
    }

    if uri.len() > MAX_URI_LEN {
        return Err(NftError::UriTooLong);
    }

    #[cfg(feature = "require-ipfs-uri")]
    {
        if !uri.starts_with(IPFS_URI_PREFIX) {
            return Err(NftError::InvalidUriScheme);
        }
    }

    Ok(())
}

/// Validate the `uri` argument of [`NftRewardContract::mint`] on-chain.
///
/// # Errors
///
/// * [`NftError::EmptyUri`] when `uri` has no bytes.
/// * [`NftError::UriTooLong`] when `uri` is longer than [`MAX_URI_LEN`] bytes.
///
/// # SDK limitation: the scheme check
///
/// `soroban-sdk` 20.0.0 (pinned by this workspace) exposes no way to read a
/// variable-length prefix out of a `soroban_sdk::String`.  The type offers
/// only `len()` plus `copy_into_slice()`, and `copy_into_slice` *panics* unless
/// the destination slice is exactly the string's length — a runtime value, so a
/// fixed-size stack buffer cannot satisfy it.  `to_bytes()` does not exist in
/// this SDK version, and the underlying `Env::string_copy_to_slice` host
/// function is private.
///
/// The consequence is that `require-ipfs-uri` cannot be enforced from `mint`
/// today.  The rule is fully implemented and unit-tested in [`validate_uri`],
/// so lifting this restriction is a matter of calling `validate_uri(&bytes[..])`
/// once the SDK grows a byte accessor (or the workspace moves to SDK 22+,
/// where `String::to_bytes` exists).  It is deliberately *not* pretended to be
/// enforced here: a `require-ipfs-uri` build performs the same two checks as a
/// default build.
fn validate_uri_str(uri: &String) -> Result<(), NftError> {
    let len = uri.len() as usize;

    if len == 0 {
        return Err(NftError::EmptyUri);
    }

    if len > MAX_URI_LEN {
        return Err(NftError::UriTooLong);
    }

    Ok(())
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
    ///
    /// # Errors
    ///
    /// `mint` rejects a `uri` that is empty ([`NftError::EmptyUri`]) or longer
    /// than [`MAX_URI_LEN`] bytes ([`NftError::UriTooLong`]).  See issue #1403
    /// and [`validate_uri_str`] — which also documents why the optional
    /// `ipfs://` scheme rule cannot be enforced from here on SDK 20.
    pub fn mint(
        env: Env,
        minter: Address,
        recipient: Address,
        uri: String,
    ) -> Result<u64, NftError> {
        minter.require_auth();

        // Validate before any storage is touched or the supply counter is
        // bumped, so a rejected mint costs the minter nothing and leaves no
        // partial state behind.
        validate_uri_str(&uri)?;

        let nft_id = storage::increment_total_supply(&env);

        storage::set_nft_uri(&env, nft_id, &uri);
        storage::set_nft_minter(&env, nft_id, &minter);
        storage::set_nft_owner(&env, nft_id, &recipient);
        storage::add_nft_to_owner(&env, &recipient, nft_id);

        env.events()
            .publish((symbol_short!("mint"), recipient), nft_id);

        Ok(nft_id)
    }

    // ── transfer ──────────────────────────────────────────────────────────────

    /// Transfer ownership of `nft_id` from `from` to `to`.
    ///
    /// # Authorization
    ///
    /// `from` must authorise this call.
    pub fn transfer(env: Env, from: Address, to: Address, nft_id: u64) -> Result<(), NftError> {
        from.require_auth();

        let owner = storage::get_nft_owner(&env, nft_id).ok_or(NftError::TokenNotFound)?;

        if owner != from {
            return Err(NftError::NotOwner);
        }

        // Remove from sender's index, add to recipient's index.
        storage::remove_nft_from_owner(&env, &from, nft_id);
        storage::set_nft_owner(&env, nft_id, &to);
        storage::add_nft_to_owner(&env, &to, nft_id);

        env.events()
            .publish((symbol_short!("transfer"), from, to), nft_id);

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

        let current_owner = storage::get_nft_owner(&env, nft_id).ok_or(NftError::TokenNotFound)?;

        if current_owner != owner {
            return Err(NftError::NotOwner);
        }

        // Remove from owner's index — all ONFC / ONFX / ONFT key surgery lives
        // here, next to add_nft_to_owner, in storage.rs.
        storage::remove_nft_from_owner(&env, &owner, nft_id);

        // Erase the token-level records.
        storage::remove_nft_owner(&env, nft_id);

        env.events().publish((symbol_short!("burn"), owner), nft_id);

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
