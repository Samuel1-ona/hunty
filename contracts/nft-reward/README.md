# nft-reward

Soroban smart contract that mints, transfers, and burns non-fungible tokens (NFTs) as hunt-completion rewards on the Stellar/Soroban network.

- **Crate:** `nft-reward` v0.1.0
- **SDK:** `soroban-sdk = "=20.0.0"`
- **Profile:** `no_std`, compiled to `cdylib` + `rlib`

---

## Entry Points

All functions are exposed on `NftRewardContract`.

### Write operations

#### `mint(minter, recipient, uri) → u64`

Mints a new NFT and assigns it to `recipient`.

| Parameter   | Type      | Description                                   |
|-------------|-----------|-----------------------------------------------|
| `minter`    | `Address` | Account authorizing the mint                  |
| `recipient` | `Address` | Address that will own the newly minted token  |
| `uri`       | `String`  | Metadata URI (IPFS CID or HTTPS URL)          |

**Returns:** the new `nft_id` (a monotonically increasing `u64` starting at 1).

**Auth:** `minter.require_auth()` — the minter must sign the transaction.

**Panics:** never under normal conditions (counter overflow aside).

**Event emitted:**
```
topics: [Symbol("mint"), recipient]
data:   nft_id (u64)
```

---

#### `transfer(from, to, nft_id)`

Transfers ownership of `nft_id` from `from` to `to`.

| Parameter | Type      | Description                        |
|-----------|-----------|------------------------------------|
| `from`    | `Address` | Current owner initiating transfer  |
| `to`      | `Address` | Recipient of the token             |
| `nft_id`  | `u64`     | ID of the token to transfer        |

**Auth:** `from.require_auth()`.

**Panics:** see [Error Conditions](#error-conditions).

**Event emitted:**
```
topics: [Symbol("transfer"), from, to]
data:   nft_id (u64)
```

---

#### `burn(owner, nft_id)`

Permanently destroys `nft_id`. The token's URI and minter metadata are retained in storage, but the ownership record is removed and the token disappears from the owner's index.

| Parameter | Type      | Description               |
|-----------|-----------|---------------------------|
| `owner`   | `Address` | Current owner of the NFT  |
| `nft_id`  | `u64`     | ID of the token to burn   |

**Auth:** `owner.require_auth()`.

**Panics:** see [Error Conditions](#error-conditions).

**Event emitted:**
```
topics: [Symbol("burn"), owner]
data:   nft_id (u64)
```

---

### Read-only operations

These functions perform no state mutations and require no auth.

| Function                                          | Returns          | Description                                                                                      |
|---------------------------------------------------|------------------|--------------------------------------------------------------------------------------------------|
| `balance_of(owner)`                               | `u32`            | Number of NFTs currently owned by `owner`                                                        |
| `total_supply()`                                  | `u64`            | Total number of NFTs ever minted (monotonically increasing; burned tokens are not subtracted)    |
| `get_owner(nft_id)`                               | `Option<Address>`| Current owner of `nft_id`, or `None` if the token has been burned                               |
| `get_nft_uri(nft_id)`                             | `Option<String>` | Metadata URI for `nft_id`, or `None` if the token was never minted                              |
| `get_nft_minter(nft_id)`                          | `Option<Address>`| Address that originally minted `nft_id`, or `None` if the token was never minted                |
| `get_player_nfts(owner)`                          | `Vec<u64>`       | All NFT ids currently owned by `owner` (unordered, allocation proportional to `balance_of`)     |
| `get_player_nfts_page(owner, start, limit)` | `Vec<u64>`       | Paginated slice of `owner`'s NFT list; returns an empty vec when `start >= balance_of` or `limit == 0` |

#### `get_player_nfts_page` parameters

| Parameter | Type  | Description                                            |
|-----------|-------|--------------------------------------------------------|
| `owner`   | `Address` | Owner whose NFT list to page through             |
| `start`   | `u32` | 0-based index into the owner's enumerable slot list   |
| `limit`   | `u32` | Maximum number of ids to return                       |

---

## Error Conditions

The contract uses `assert!` / `Option::expect` rather than a typed error enum. The following panic messages map to distinct failure modes:

| Panic message                                         | Trigger                                                                                  |
|-------------------------------------------------------|------------------------------------------------------------------------------------------|
| `"nft does not exist"`                                | `transfer` or `burn` called with an `nft_id` whose owner record is absent (never minted or already burned) |
| `"not owner"`                                         | `transfer` or `burn` called by an address that is not the current owner of `nft_id`     |
| `"index corruption: slot missing"`                    | Internal: an expected slot entry in the owner index was absent during `remove_nft_from_owner` |
| `"index corruption: exist-key set but slot not found"`| Internal: the existence sentinel for an NFT was set but the matching slot was not found during linear scan |
| `"index corruption: last slot missing"`               | Internal: the last-slot entry was absent when attempting swap-and-pop                    |

The three `"index corruption: …"` panics indicate a storage inconsistency and should not occur during normal contract operation.

---

## Storage Layout

All entries use `env.storage().persistent()`. There is no instance or temporary storage.

### Global counter

| Key symbol | Type  | Description                                               |
|------------|-------|-----------------------------------------------------------|
| `TOTAL`    | `u64` | Next NFT id minus 1; i.e. the count of all minted tokens |

### Per-NFT metadata

Keyed by `(symbol, nft_id: u64)`:

| Key tuple       | Value type | Description                                        |
|-----------------|------------|----------------------------------------------------|
| `(NFTU, nft_id)` | `String`  | Metadata URI (IPFS or HTTPS)                       |
| `(NFTM, nft_id)` | `Address` | Minter address (set at mint time, never updated)   |
| `(NFTO, nft_id)` | `Address` | Current owner; **removed** (not zeroed) on burn    |

### Per-owner index

The owner index is a compact enumerable list maintained via **swap-and-pop**. Three key shapes compose it:

| Key tuple                  | Value type | Description                                                         |
|----------------------------|------------|---------------------------------------------------------------------|
| `(ONFC, owner)`            | `u32`      | Number of NFTs currently owned; the authoritative count             |
| `(ONFX, owner, nft_id)`    | `bool`     | Existence sentinel — present and `true` iff `owner` holds `nft_id` |
| `(ONFT, owner, slot_index)`| `u64`      | NFT id stored at 0-based `slot_index` for `owner`                  |

#### Swap-and-pop removal

When an NFT is removed from an owner's list (on `transfer` or `burn`):

1. The slot that holds the target `nft_id` is located via a linear scan of `ONFT` entries.
2. The last slot (`ONFC - 1`) is moved into the vacated slot.
3. The last slot entry is deleted.
4. The `ONFX` existence sentinel for `nft_id` is deleted.
5. `ONFC` is decremented by one.

This keeps the slot list compact (no holes) without preserving insertion order.

---

## Building

```bash
# from contracts/nft-reward/
cargo build --target wasm32-unknown-unknown --release
```

## Testing

```bash
# unit + integration tests (uses soroban-sdk testutils)
cargo test

# with feature flag for snapshot testing
cargo test --features testutils
```

Tests live in `src/tests.rs` and `src/lib.rs` (inline `mod test`). Ledger snapshots for each test case are stored under `test_snapshots/`.
