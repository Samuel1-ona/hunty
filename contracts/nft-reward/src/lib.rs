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

// ─── constants ────────────────────────────────────────────────────────────────

/// Maximum byte length accepted for any NFT URI field.
const MAX_NFT_URI_BYTES: u32 = 512;

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
    /// The supplied URI is empty, uses a forbidden scheme (not https:// or
    /// ipfs://), or contains invalid characters.
    ///
    /// This error is returned by both `mint_reward_nft_from_map` and
    /// `update_nft_metadata` so that the two entry-points enforce identical
    /// URI rules and cannot drift apart (issue #849).
    InvalidUri = 5,
    /// A metadata text field exceeds the maximum allowed byte length or
    /// contains invalid / disallowed characters.
    InvalidField = 6,
}

// ─── contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct NftRewardContract;

#[contractimpl]
impl NftRewardContract {
    // ── private helpers ───────────────────────────────────────────────────────

    /// Return `true` when `uri` is acceptable for on-chain storage.
    ///
    /// Rules (must all hold):
    /// 1. Non-empty.
    /// 2. Does not exceed `MAX_NFT_URI_BYTES` bytes.
    /// 3. Starts with `https://` or `ipfs://` (case-sensitive).
    ///
    /// This is the single source of truth for URI scheme validation.  Both
    /// `mint_reward_nft_from_map` and `update_nft_metadata` delegate here so
    /// they cannot drift (issue #849 root cause).
    fn image_uri_is_valid(uri: &String) -> bool {
        let len = uri.len();

        // Rule 1: non-empty.
        if len == 0 {
            return false;
        }

        // Rule 2: not too long.
        if len > MAX_NFT_URI_BYTES {
            return false;
        }

        // Rule 3: must start with an allowed scheme.
        //
        // We copy only the first 8 bytes (the length of "https://") into a
        // stack buffer so we can do a prefix comparison without alloc.
        // `ipfs://` is 7 bytes, `https://` is 8 bytes — 8 is the maximum we
        // need to inspect.
        const PREFIX_BUF_LEN: usize = 8;
        let read_len = if len as usize >= PREFIX_BUF_LEN {
            PREFIX_BUF_LEN
        } else {
            len as usize
        };

        // Build a String that contains only the first `read_len` bytes of the
        // URI so we can call copy_into_slice on it.  We do this by comparing
        // the full URI against prefix strings using the Soroban String
        // comparison helpers available in the SDK.
        //
        // Soroban SDK v22 String exposes `copy_into_slice`, which copies the
        // entire string into a caller-supplied slice.  We use a fixed-size
        // stack buffer and fill only up to read_len bytes.
        let mut prefix_buf = [0u8; PREFIX_BUF_LEN];
        // copy_into_slice requires the slice length to exactly equal the string
        // length, so we need a slice of the right size.  We use a temporary
        // full buffer and only look at the first `read_len` bytes.
        if len as usize <= PREFIX_BUF_LEN {
            // Short URI: copy all bytes and examine them.
            let slice = &mut prefix_buf[..len as usize];
            uri.copy_into_slice(slice);
        } else {
            // URI is longer than our buffer; we can only copy the first part by
            // constructing a sub-string — but Soroban String has no substr API.
            //
            // Instead, allocate a larger buffer on the stack (up to 512 bytes
            // maximum, guarded by MAX_NFT_URI_BYTES above) and copy the whole
            // string, then examine the prefix.
            //
            // NOTE: 512 bytes is safe here because we have already rejected
            // URIs longer than MAX_NFT_URI_BYTES (512) above.
            let mut full_buf = [0u8; MAX_NFT_URI_BYTES as usize];
            uri.copy_into_slice(&mut full_buf[..len as usize]);
            prefix_buf.copy_from_slice(&full_buf[..PREFIX_BUF_LEN]);
        };

        let has_https = read_len >= 8 && &prefix_buf[..8] == b"https://";
        let has_ipfs = read_len >= 7 && &prefix_buf[..7] == b"ipfs://";

        has_https || has_ipfs
    }

    /// Validate and return a sanitised copy of a generic metadata text field.
    ///
    /// Checks performed:
    /// * Length does not exceed `max_bytes`.
    /// * No ASCII control characters (bytes 0x00–0x1F and 0x7F).
    ///
    /// `allow_empty` controls whether a zero-length string is accepted.  For
    /// URI fields pass `allow_empty: false` in addition to calling
    /// `image_uri_is_valid` to enforce the scheme allowlist.
    ///
    /// Returns `Err(NftError::InvalidField)` on any violation.
    fn sanitize_metadata_field(
        field: &String,
        max_bytes: u32,
        allow_empty: bool,
    ) -> Result<String, NftError> {
        let len = field.len();

        if len == 0 {
            if allow_empty {
                return Ok(field.clone());
            } else {
                return Err(NftError::InvalidField);
            }
        }

        if len > max_bytes {
            return Err(NftError::InvalidField);
        }

        // Copy the full string into a stack buffer and scan for control chars.
        // len <= max_bytes <= MAX_NFT_URI_BYTES (512), so this is safe.
        let mut buf = [0u8; MAX_NFT_URI_BYTES as usize];
        field.copy_into_slice(&mut buf[..len as usize]);

        for i in 0..len as usize {
            let b = buf[i];
            if b < 0x20 || b == 0x7F {
                return Err(NftError::InvalidField);
            }
        }

        Ok(field.clone())
    }

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
    /// # Note
    ///
    /// This low-level entry-point stores `uri` without scheme validation.  For
    /// validated minting use `mint_reward_nft_from_map`.
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

    /// Mint a new NFT to `recipient` using a validated image URI.
    ///
    /// Unlike the bare `mint` entry-point, this function enforces:
    ///
    /// * The URI must use the `https://` or `ipfs://` scheme (via
    ///   `image_uri_is_valid`).
    /// * The URI must not be empty and must not exceed `MAX_NFT_URI_BYTES`.
    ///
    /// Returns `Err(NftError::InvalidUri)` when any URI check fails.
    ///
    /// # Authorization
    ///
    /// The `minter` must authorise this call.
    pub fn mint_reward_nft_from_map(
        env: Env,
        minter: Address,
        recipient: Address,
        image_uri: String,
    ) -> Result<u64, NftError> {
        minter.require_auth();

        // ── URI validation (issue #849: shared rule, same as update_nft_metadata)
        if !Self::image_uri_is_valid(&image_uri) {
            return Err(NftError::InvalidUri);
        }

        let nft_id = storage::increment_total_supply(&env);

        storage::set_nft_uri(&env, nft_id, &image_uri);
        storage::set_nft_minter(&env, nft_id, &minter);
        storage::set_nft_owner(&env, nft_id, &recipient);
        storage::add_nft_to_owner(&env, &recipient, nft_id);

        Ok(nft_id)
    }

    // ── metadata update ───────────────────────────────────────────────────────

    /// Update the image URI stored for `nft_id`.
    ///
    /// The caller must be the current owner of the token.  The new URI is
    /// validated with the same `image_uri_is_valid` check that
    /// `mint_reward_nft_from_map` applies, so the two entry-points cannot
    /// drift apart (issue #849 fix).
    ///
    /// Additional sanitisation (length, control characters) is performed by
    /// `sanitize_metadata_field`.
    ///
    /// # Errors
    ///
    /// * `NftError::TokenNotFound` — the token does not exist.
    /// * `NftError::NotOwner` — `owner` is not the current token owner.
    /// * `NftError::InvalidUri` — `new_image_uri` fails URI scheme / emptiness
    ///   validation.  This includes `javascript:`, `data:`, plain `http://`,
    ///   and empty strings.
    /// * `NftError::InvalidField` — `new_image_uri` contains control characters
    ///   or exceeds `MAX_NFT_URI_BYTES`.
    ///
    /// # Authorization
    ///
    /// `owner` must authorise this call.
    pub fn update_nft_metadata(
        env: Env,
        owner: Address,
        nft_id: u64,
        new_image_uri: String,
    ) -> Result<(), NftError> {
        owner.require_auth();

        // Verify token existence and ownership.
        let current_owner =
            storage::get_nft_owner(&env, nft_id).ok_or(NftError::TokenNotFound)?;
        if current_owner != owner {
            return Err(NftError::NotOwner);
        }

        // ── URI scheme validation (issue #849) ────────────────────────────────
        //
        // This MUST happen before sanitize_metadata_field, which only checks
        // length and control characters.  Without this call an owner could
        // bypass the https:// / ipfs:// restriction enforced at mint time and
        // write javascript:, data:, http://, or an empty string.
        if !Self::image_uri_is_valid(&new_image_uri) {
            return Err(NftError::InvalidUri);
        }

        // ── Field sanitisation (length, control characters) ───────────────────
        //
        // allow_empty: false — image_uri_is_valid already rejects empty
        // strings, but we keep allow_empty: false here as defence-in-depth
        // so the two checks stay in agreement.
        let sanitized_uri =
            Self::sanitize_metadata_field(&new_image_uri, MAX_NFT_URI_BYTES, false)?;

        storage::set_nft_uri(&env, nft_id, &sanitized_uri);

        Ok(())
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
