#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

const XLM_POOL: Symbol = symbol_short!("XLMPOOL");

#[contracttype]
pub enum RewardKind {
    Xlm,
    Nft,
    Both,
}

#[contract]
pub struct RewardManager;

#[contractimpl]
impl RewardManager {
    pub fn deposit_xlm(env: Env, amount: i128) {
        let current: i128 = env.storage().persistent().get(&XLM_POOL).unwrap_or(0);
        env.storage().persistent().set(&XLM_POOL, &(current + amount));
        env.events().publish((symbol_short!("DEPOSIT"),), amount);
    }

    pub fn get_xlm_pool(env: Env) -> i128 {
        env.storage().persistent().get(&XLM_POOL).unwrap_or(0)
    }

    pub fn distribute_reward(
        env: Env,
        recipient: Address,
        kind: RewardKind,
        amount: i128,
        nft_title: Symbol,
        nft_description: Symbol,
    ) {
        if matches!(kind, RewardKind::Xlm | RewardKind::Both) {
            let pool: i128 = env.storage().persistent().get(&XLM_POOL).unwrap_or(0);
            if amount > pool {
                panic!("Insufficient XLM reward pool.");
            }
            env.storage().persistent().set(&XLM_POOL, &(pool - amount));
            env.events().publish((symbol_short!("XLM_TX"),), (recipient.clone(), amount));
        }

        if matches!(kind, RewardKind::Nft | RewardKind::Both) {
            env.events().publish(
                (symbol_short!("mint_nft"),),
                (recipient, nft_title, nft_description),
            );
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, testutils::Events};

    #[test]
    fn deposit_and_distribute_xlm() {
        let env = Env::default();
        env.mock_all_auths();

        RewardManager::deposit_xlm(env.clone(), 500);
        assert_eq!(RewardManager::get_xlm_pool(env.clone()), 500);

        let recipient = Address::from_str(&env, "GB3JDWCQ5Q4G3M6U4PCDQM367HKI3WQKYQJHTGXE2ZNUPV6QSADJX7CH");
        RewardManager::distribute_reward(
            env.clone(),
            recipient.clone(),
            RewardKind::Xlm,
            100,
            symbol_short!(""),
            symbol_short!(""),
        );
        assert_eq!(RewardManager::get_xlm_pool(env.clone()), 400);

        let events = env.events().all();
        assert_eq!(events.events().len(), 2);
    }
}
