import { Keypair } from "@stellar/stellar-base";
import { generateChallenge, verifySignedMessage } from "../signature";

describe("signature helper", () => {
  it("verifies a valid signed challenge", () => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();
    const challenge = generateChallenge(address, "test");
    const signature = keypair.sign(Buffer.from(challenge, "utf8")).toString("base64");

    expect(
      verifySignedMessage({ address, challenge, signature, purpose: "test" })
    ).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();
    const challenge = generateChallenge(address, "test");
    const signature = "invalid-signature";

    expect(
      verifySignedMessage({ address, challenge, signature, purpose: "test" })
    ).toBe(false);
  });

  it("rejects a challenge signed for a different address", () => {
    const keypair = Keypair.random();
    const other = Keypair.random();
    const challenge = generateChallenge(keypair.publicKey(), "test");
    const signature = keypair.sign(Buffer.from(challenge, "utf8")).toString("base64");

    expect(
      verifySignedMessage({ address: other.publicKey(), challenge, signature, purpose: "test" })
    ).toBe(false);
  });

  it("rejects a challenge with the wrong purpose", () => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();
    const challenge = generateChallenge(address, "create-hunt");
    const signature = keypair.sign(Buffer.from(challenge, "utf8")).toString("base64");

    expect(
      verifySignedMessage({ address, challenge, signature, purpose: "moderation-submit" })
    ).toBe(false);
  });

  it("rejects an expired challenge", () => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();
    const issuedAt = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    const challenge = `huntly-challenge:test:${address.toLowerCase()}:${issuedAt}:nonce`;
    const signature = keypair.sign(Buffer.from(challenge, "utf8")).toString("base64");

    expect(
      verifySignedMessage({ address, challenge, signature, purpose: "test" })
    ).toBe(false);
  });
});
