#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[contract]
pub struct NftRewardContract;

#[contractimpl]
impl NftRewardContract {
    pub fn mint(env: Env, recipient: Address, nft_id: u64) {
        env.events().publish((Symbol::new(&env, "mint"), recipient), nft_id);
    }

    pub fn transfer(env: Env, from: Address, to: Address, nft_id: u64) {
        env.events().publish((Symbol::new(&env, "transfer"), from, to), nft_id);
    }

    pub fn burn(env: Env, owner: Address, nft_id: u64) {
        env.events().publish((Symbol::new(&env, "burn"), owner), nft_id);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Events, vec, Address, Env, IntoVal, Symbol};

    #[test]
    fn test_mint_event_published() {
        let env = Env::default();
        let contract_id = env.register_contract(None, NftRewardContract);
        let client = NftRewardContractClient::new(&env, &contract_id);

        let recipient = Address::generate(&env);
        let nft_id = 42u64;

        client.mint(&recipient, &nft_id);

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
        assert_eq!(event.2, nft_id.into_val(&env));
    }

    #[test]
    fn test_transfer_event_published() {
        let env = Env::default();
        let contract_id = env.register_contract(None, NftRewardContract);
        let client = NftRewardContractClient::new(&env, &contract_id);

        let from = Address::generate(&env);
        let to = Address::generate(&env);
        let nft_id = 101u64;

        client.transfer(&from, &to, &nft_id);

        let events = env.events().all();
        assert_eq!(events.len(), 1);

        let event = events.get(0).unwrap();
        assert_eq!(
            event.1,
            vec![
                &env,
                Symbol::new(&env, "transfer").into_val(&env),
                from.into_val(&env),
                to.into_val(&env)
            ]
        );
        assert_eq!(event.2, nft_id.into_val(&env));
    }

    #[test]
    fn test_burn_event_published() {
        let env = Env::default();
        let contract_id = env.register_contract(None, NftRewardContract);
        let client = NftRewardContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let nft_id = 999u64;

        client.burn(&owner, &nft_id);

        let events = env.events().all();
        assert_eq!(events.len(), 1);

        let event = events.get(0).unwrap();
        assert_eq!(
            event.1,
            vec![
                &env,
                Symbol::new(&env, "burn").into_val(&env),
                owner.into_val(&env)
            ]
        );
        assert_eq!(event.2, nft_id.into_val(&env));
    }
}
