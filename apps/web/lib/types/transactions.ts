export type CreateHuntResult = {
  txHash: string;
};

export type ClaimRewardResult = {
  txHash: string;
  /** ipfs:// URI for the SEP-0039 compliant metadata JSON uploaded before minting. */
  metadataUri: string;
};

export type SubmitAnswerResult = {
  txHash: string;
  /** The contract event emitted on success. */
  event: "ClueCompleted";
};

export type ActivateHuntResult = {
  txHash: string;
};

export type AddClueResult = {
  txHash: string;
};

export type ExtendHuntResult = {
  txHash: string;
  newEndTime: number;
};
