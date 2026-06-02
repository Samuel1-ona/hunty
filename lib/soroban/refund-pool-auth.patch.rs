use soroban_sdk::{Address, Env};

use crate::{PoolConfig, PoolError, PoolStorage};

pub fn refund_pool(env: Env, creator: Address) -> Result<(), PoolError> {
    let pool_config = PoolStorage::get_config(&env)?;

    if creator != pool_config.creator {
        return Err(PoolError::Unauthorized);
    }

    creator.require_auth();

    PoolStorage::refund_remaining_balance(&env, &pool_config)
}
