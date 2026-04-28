#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

const NFT_ID_COUNTER: Symbol = symbol_short!("NFTID");

#[contracttype]
pub struct NftMetadata {
    id: u32,
    title: Symbol,
    description: Symbol,
    issued_to: Address,
}

#[contract]
pub struct NftReward;

#[contractimpl]
impl NftReward {
    pub fn mint_reward_nft(env: Env, recipient: Address, title: Symbol, description: Symbol) {
        let id: u32 = env.storage().persistent().get(&NFT_ID_COUNTER).unwrap_or(0) + 1;
        env.storage().persistent().set(&NFT_ID_COUNTER, &id);

        let metadata = NftMetadata {
            id,
            title,
            description,
            issued_to: recipient.clone(),
        };

        env.events().publish((symbol_short!("MINTNFT"),), (recipient, metadata));
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, testutils::Events};

    #[test]
    fn mint_reward_nft_event() {
        let env = Env::default();
        env.mock_all_auths();

        let recipient = Address::from_str(&env, "GB3JDWCQ5Q4G3M6U4PCDQM367HKI3WQKYQJHTGXE2ZNUPV6QSADJX7CH");
        NftReward::mint_reward_nft(
            env.clone(),
            recipient.clone(),
            symbol_short!("CTROPHY"),
            symbol_short!("REWARDNFT"),
        );
        let events = env.events().all();
        assert_eq!(events.events().len(), 1);
    }
}
