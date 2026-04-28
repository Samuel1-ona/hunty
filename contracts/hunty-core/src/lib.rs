#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, Map, Symbol, Vec};

const HUNT_ID_COUNTER: Symbol = symbol_short!("HUNTID");
const HUNTS: Symbol = symbol_short!("HUNTS");
const PLAYER_PROGRESS: Symbol = symbol_short!("PROGRESS");

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum HuntStatus {
    Draft,
    Active,
    Completed,
}

#[contracttype]
#[derive(Clone)]
pub struct Hunt {
    creator: Address,
    title: Symbol,
    description: Symbol,
    clue_hashes: Vec<Bytes>,
    status: HuntStatus,
}

#[contract]
pub struct HuntyCore;

#[contractimpl]
impl HuntyCore {
    pub fn create_hunt(env: Env, title: Symbol, description: Symbol) -> u32 {
        let count: u32 = env.storage().persistent().get(&HUNT_ID_COUNTER).unwrap_or(0);
        let id = count + 1;
        env.storage().persistent().set(&HUNT_ID_COUNTER, &id);

        let mut hunts: Map<u32, Hunt> = env
            .storage()
            .persistent()
            .get(&HUNTS)
            .unwrap_or(Map::new(&env));

        let hunt = Hunt {
            creator: Self::invoker(&env),
            title,
            description,
            clue_hashes: Vec::new(&env),
            status: HuntStatus::Draft,
        };

        hunts.set(id, hunt);
        env.storage().persistent().set(&HUNTS, &hunts);
        id
    }

    pub fn add_clue(env: Env, hunt_id: u32, answer_hash: Bytes) {
        let mut hunts: Map<u32, Hunt> = env
            .storage()
            .persistent()
            .get(&HUNTS)
            .unwrap_or(Map::new(&env));
        let mut hunt: Hunt = hunts.get(hunt_id).expect("Hunt not found");
        match hunt.status {
            HuntStatus::Draft => {
                hunt.clue_hashes.push_back(answer_hash);
                hunts.set(hunt_id, hunt);
                env.storage().persistent().set(&HUNTS, &hunts);
            }
            _ => panic!("Only draft hunts can be modified."),
        }
    }

    pub fn activate_hunt(env: Env, hunt_id: u32) {
        let mut hunts: Map<u32, Hunt> = env
            .storage()
            .persistent()
            .get(&HUNTS)
            .unwrap_or(Map::new(&env));
        let mut hunt: Hunt = hunts.get(hunt_id).expect("Hunt not found");
        if hunt.clue_hashes.is_empty() {
            panic!("Cannot activate a hunt without clues.");
        }
        hunt.status = HuntStatus::Active;
        hunts.set(hunt_id, hunt);
        env.storage().persistent().set(&HUNTS, &hunts);
    }

    pub fn register_player(env: Env, hunt_id: u32) {
        let hunts: Map<u32, Hunt> = env
            .storage()
            .persistent()
            .get(&HUNTS)
            .unwrap_or(Map::new(&env));
        let hunt: Hunt = hunts.get(hunt_id).expect("Hunt not found");
        if hunt.status != HuntStatus::Active {
            panic!("Hunt must be active to register.");
        }

        let mut by_hunt: Map<u32, Map<Address, Vec<u32>>> = env
            .storage()
            .persistent()
            .get(&PLAYER_PROGRESS)
            .unwrap_or(Map::new(&env));
        let mut players: Map<Address, Vec<u32>> = by_hunt
            .get(hunt_id)
            .unwrap_or(Map::new(&env));

        let invoker = Self::invoker(&env);
        if players.get(invoker.clone()).is_some() {
            panic!("Player already registered.");
        }

        players.set(invoker.clone(), Vec::new(&env));
        by_hunt.set(hunt_id, players);
        env.storage().persistent().set(&PLAYER_PROGRESS, &by_hunt);
    }

    pub fn submit_answer(env: Env, hunt_id: u32, clue_index: u32, answer_hash: Bytes) -> bool {
        let hunts: Map<u32, Hunt> = env
            .storage()
            .persistent()
            .get(&HUNTS)
            .unwrap_or(Map::new(&env));
        let hunt: Hunt = hunts.get(hunt_id).expect("Hunt not found");
        if hunt.status != HuntStatus::Active {
            panic!("Hunt must be active to submit answers.");
        }

        let expected = hunt
            .clue_hashes
            .get(clue_index)
            .expect("Clue not found");
        if expected != answer_hash {
            return false;
        }

        let mut by_hunt: Map<u32, Map<Address, Vec<u32>>> = env
            .storage()
            .persistent()
            .get(&PLAYER_PROGRESS)
            .unwrap_or(Map::new(&env));
        let mut players: Map<Address, Vec<u32>> = by_hunt
            .get(hunt_id)
            .expect("Players not registered for this hunt");
        let invoker = Self::invoker(&env);
        let mut completed_clues: Vec<u32> = players
            .get(invoker.clone())
            .expect("Player must register before submitting answers");

        if completed_clues.contains(&clue_index) {
            return true;
        }

        completed_clues.push_back(clue_index);
        players.set(invoker.clone(), completed_clues.clone());
        by_hunt.set(hunt_id, players);
        env.storage().persistent().set(&PLAYER_PROGRESS, &by_hunt);

        let all_done = completed_clues.len() as u32 == hunt.clue_hashes.len();
        if all_done {
            env.events().publish((symbol_short!("HUNT_DONE"),), (hunt_id, invoker));
        }

        true
    }

    pub fn get_player_progress(env: Env, hunt_id: u32, player: Address) -> Vec<u32> {
        let by_hunt: Map<u32, Map<Address, Vec<u32>>> = env
            .storage()
            .persistent()
            .get(&PLAYER_PROGRESS)
            .unwrap_or(Map::new(&env));
        let players: Map<Address, Vec<u32>> = by_hunt
            .get(hunt_id)
            .unwrap_or(Map::new(&env));
        players.get(player).unwrap_or(Vec::new(&env))
    }

    pub fn get_hunt(env: Env, hunt_id: u32) -> Hunt {
        let hunts: Map<u32, Hunt> = env
            .storage()
            .persistent()
            .get(&HUNTS)
            .unwrap_or(Map::new(&env));
        hunts.get(hunt_id).expect("Hunt not found")
    }

    fn invoker(env: &Env) -> Address {
        env.auths()
            .first()
            .expect("No authorized invoker")
            .0
            .clone()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn create_and_register_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(HuntyCore, ());
        let client = HuntyCoreClient::new(&env, &contract_id);

        let title = symbol_short!("office");
        let description = symbol_short!("onboard");
        let id = client.create_hunt(&title, &description);
        assert_eq!(id, 1);

        let answer_hash = Bytes::from_slice(&env, b"paris");
        client.add_clue(&id, &answer_hash);
        client.activate_hunt(&id);

        client.register_player(&id);
        let invoker = HuntyCore::invoker(&env);
        let progress = client.get_player_progress(&id, &invoker);
        assert_eq!(progress.events().len(), 0);

        let success = client.submit_answer(&id, &0_u32, &answer_hash);
        assert!(success);
        let progress = client.get_player_progress(&id, &invoker);
        assert_eq!(progress.events().len(), 1);
    }
}
