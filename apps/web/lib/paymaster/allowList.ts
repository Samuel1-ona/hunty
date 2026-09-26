/**
 * Paymaster contract allow-list.
 *
 * When `PAYMASTER_ALLOWED_CONTRACTS` is configured (comma-separated Soroban
 * contract ids) the sponsor route will only sponsor transactions that invoke
 * contracts from that list. When the variable is unset the allow-list is
 * disabled and any valid transaction may be sponsored.
 */

import { NextResponse } from "next/server";
import { Address, FeeBumpTransaction, Networks, TransactionBuilder } from "@stellar/stellar-sdk";

/** Network passphrase used to decode the submitted transaction envelope. */
function networkPassphrase(): string {
  return process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ?? Networks.TESTNET;
}

/** Contract ids the paymaster is willing to sponsor. */
export function getAllowedContracts(): string[] {
  return (process.env.PAYMASTER_ALLOWED_CONTRACTS ?? "")
    .split(",")
    .map((contract) => contract.trim())
    .filter(Boolean);
}

/**
 * Extract the Soroban contract ids invoked by a list of operations.
 *
 * Returns an empty array for operations that do not invoke a contract
 * (payments, create-contract, undecodable host functions, …) so callers can
 * fail closed when an allow-list is configured.
 */
export function extractInvokedContracts(operations: readonly unknown[]): string[] {
  const contracts: string[] = [];

  for (const operation of operations) {
    const op = operation as {
      type?: string;
      func?: { invokeContract?: () => { contractAddress?: () => unknown } };
    };

    if (op?.type !== "invokeHostFunction" || typeof op.func?.invokeContract !== "function") {
      continue;
    }

    try {
      const scAddress = op.func.invokeContract()?.contractAddress?.();
      if (scAddress) {
        contracts.push(Address.fromScAddress(scAddress as never).toString());
      }
    } catch {
      // A host function we cannot decode contributes no contract id; with an
      // allow-list configured that makes the transaction fail closed below.
    }
  }

  return contracts;
}

/**
 * Enforce the contract allow-list. Returns a 400 for an undecodable
 * envelope and a 403 when the transaction invokes anything that is not
 * allow-listed. Returns `null` when the transaction may be sponsored.
 */
export function enforceContractAllowList(txXdr: string): NextResponse | null {
  const allowed = getAllowedContracts();
  if (allowed.length === 0) return null;

  let tx: unknown;
  try {
    tx = TransactionBuilder.fromXDR(txXdr, networkPassphrase());
  } catch {
    return NextResponse.json({ error: "Invalid transaction XDR" }, { status: 400 });
  }

  if (tx instanceof FeeBumpTransaction) {
    return NextResponse.json({ error: "Invalid transaction XDR" }, { status: 400 });
  }

  const operations = (tx as { operations?: readonly unknown[] }).operations ?? [];
  const invoked = extractInvokedContracts(operations);

  if (invoked.length === 0 || invoked.some((contract) => !allowed.includes(contract))) {
    return NextResponse.json(
      {
        error: "Transaction invokes a contract that is not permitted by the paymaster allow-list",
      },
      { status: 403 }
    );
  }

  return null;
}
