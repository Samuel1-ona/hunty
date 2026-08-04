import { describe, expect, it } from "vitest"
import {
  attachMediaTypeToCid,
  getClueMediaKind,
  getClueMediaSource,
} from "@/lib/clueMedia"

describe("clueMedia", () => {
  it("attaches the top-level mime type to the media URI", () => {
    expect(attachMediaTypeToCid("ipfs://bafy123", "audio/mpeg")).toBe(
      "ipfs://bafy123?type=audio"
    )
  })

  it("detects the media kind from the query tag", () => {
    expect(getClueMediaKind("ipfs://bafy123?type=video")).toBe("video")
  })

  it("resolves a gateway URL for stored clue media", () => {
    expect(getClueMediaSource("ipfs://bafy123?type=image")).toContain("/ipfs/bafy123")
  })
})
