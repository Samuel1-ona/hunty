import { describe, expect, it } from "vitest";

import {
  HUNT_TRANSFER_FORMAT,
  HUNT_TRANSFER_VERSION,
  HuntImportError,
  buildHuntTransfer,
  collectImageReferences,
  exportHuntJson,
  parseHuntTransfer,
  type HuntTransferInput,
} from "@/lib/huntTransfer";

function makeInput(): HuntTransferInput {
  return {
    hunt: {
      id: 7,
      title: "City Cipher",
      description: "A backup of the city hunt",
      image: "ipfs://bafy-cover?type=image",
      category: "Urban",
      difficulty: "Medium",
      sequential: true,
    },
    clues: [
      {
        id: 1,
        huntId: 7,
        question: "Find the mural",
        answer: "blue",
        points: 10,
        type: "image",
        imageCid: "ipfs://bafy-image?type=image",
        mediaCid: "https://cdn.example.test/audio.mp3#fragment",
        imageMode: "spot-difference",
      },
      {
        id: 2,
        huntId: 7,
        question: "Scan the checkpoint",
        answer: "",
        points: 15,
        type: "qr",
        qrPayload: "hunty://checkpoint/7",
      },
    ],
    settings: {
      rewardType: "Both",
      rewards: [{ place: 1, amount: 25 }],
      sequential: true,
      isPrivate: true,
      timerEnabled: true,
    },
  };
}

describe("hunt JSON transfer", () => {
  it("round-trips a versioned hunt with clues, settings, and image references", () => {
    const json = exportHuntJson(makeInput());
    const parsed = parseHuntTransfer(json);

    expect(parsed.format).toBe(HUNT_TRANSFER_FORMAT);
    expect(parsed.version).toBe(HUNT_TRANSFER_VERSION);
    expect(parsed.hunt.title).toBe("City Cipher");
    expect(parsed.clues).toHaveLength(2);
    expect(parsed.clues[0].imageCid).toBe("ipfs://bafy-image?type=image");
    expect(parsed.clues[0].mediaCid).toBe("https://cdn.example.test/audio.mp3#fragment");
    expect(parsed.settings.rewardType).toBe("Both");
    expect(parsed.settings.sequential).toBe(true);
    expect(collectImageReferences(parsed)).toEqual([
      "ipfs://bafy-cover?type=image",
      "ipfs://bafy-image?type=image",
      "https://cdn.example.test/audio.mp3#fragment",
    ]);
  });

  it("does not mutate the source while normalizing references", () => {
    const input = makeInput();
    const transfer = buildHuntTransfer({
      ...input,
      clues: input.clues.map((clue) => ({
        ...clue,
        imageCid: clue.imageCid ? `  ${clue.imageCid}  ` : undefined,
      })),
    });

    expect(transfer.clues[0].imageCid).toBe("ipfs://bafy-image?type=image");
    expect(input.clues[0].imageCid).toBe("ipfs://bafy-image?type=image");
  });

  it("rejects malformed JSON and unsupported versions", () => {
    expect(() => parseHuntTransfer("not json")).toThrow(HuntImportError);
    expect(() =>
      parseHuntTransfer(
        JSON.stringify({
          format: HUNT_TRANSFER_FORMAT,
          version: HUNT_TRANSFER_VERSION + 1,
          hunt: { title: "Future hunt" },
          clues: [{ question: "Q", answer: "A", points: 1 }],
        })
      )
    ).toThrow(/version|invalid/i);
  });

  it("rejects transfers without clues or with invalid image references", () => {
    const valid = buildHuntTransfer(makeInput());
    expect(() => parseHuntTransfer(JSON.stringify({ ...valid, clues: [] }))).toThrow(
      /at least one clue/i
    );

    const invalidImage = structuredClone(valid) as Record<string, unknown>;
    invalidImage.clues = [
      {
        ...(valid.clues[0] as Record<string, unknown>),
        imageCid: "   ",
      },
    ];
    expect(() => parseHuntTransfer(JSON.stringify(invalidImage))).toThrow(/image reference|image/i);
  });
});
