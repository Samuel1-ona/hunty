#![no_std]

mod storage;

use soroban_sdk::{contract, contractimpl, Address, Env, String, Symbol, Vec};

#[contract]
pub struct NftRewardContract;

#[contractimpl]
impl NftRewardContract {
    pub fn mint(env: Env, minter: Address, recipient: Address, uri: String) -> u64 {
        minter.require_auth();

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

    #[test]
    fn test_mint_event_published() {
        let env = Env::default();
        let contract_id = env.register_contract(None, NftRewardContract);
        let client = NftRewardContractClient::new(&env, &contract_id);

        let recipient = Address::generate(&env);
        let minter = Address::generate(&env);

        env.mock_all_auths();
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
        let minter = Address::generate(&env);

        env.mock_all_auths();
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
        let minter = Address::generate(&env);

        env.mock_all_auths();
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
