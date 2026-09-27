import { FeeBumpTransaction, Keypair, Networks, TransactionBuilder } from "soroban-client"

/**
 * Utility for creating fee-bump (gasless) transactions.
 * The paymaster signs the fee-bump transaction, covering the fee for the user.
 */
export class StellarPaymaster {
  private readonly paymasterKey: Keypair
  private readonly network: string

  constructor(paymasterSecret: string, network: string = Networks.TESTNET) {
    this.paymasterKey = Keypair.fromSecret(paymasterSecret)
    this.network = network
  }

  async createFeeBump(userTxXdr: string, maxFee = 100): Promise<string> {
    const userTx = TransactionBuilder.fromXDR(userTxXdr, this.network)

    if (userTx instanceof FeeBumpTransaction) {
      throw new Error("Expected a standard transaction XDR, received a fee-bump transaction.")
    }

    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      this.paymasterKey,
      String(maxFee),
      userTx,
      this.network
    )

    feeBumpTx.sign(this.paymasterKey)

    return feeBumpTx.toXDR()
  }
}
