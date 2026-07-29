import { calculateCluePoints, DEFAULT_SCORING_WEIGHTS } from "@/lib/scoring";
import { resolveImageSrc, GATEWAY_COUNT } from "@/lib/ipfs";
import { getClueMediaKind, getClueMediaSource } from "@/lib/clueMedia";
import type { ClueHint, HuntCard as Hunt } from "@/lib/types";