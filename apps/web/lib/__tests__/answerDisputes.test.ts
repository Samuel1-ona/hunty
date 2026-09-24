import { beforeEach, describe, expect, it } from "vitest"

import {
  __resetAnswerDisputeStoreForTests,
  createAnswerDispute,
  getAnswerDisputeAuditLog,
  getAnswerDisputesForAnswer,
  resolveAnswerDispute,
} from "@/lib/answerDisputes"

describe("answer dispute workflow", () => {
  beforeEach(() => {
    __resetAnswerDisputeStoreForTests()
  })

  it("creates a dispute and records the initial audit entry", () => {
    const dispute = createAnswerDispute({
      answerId: "answer-42",
      huntId: 7,
      clueId: 3,
      playerWallet: "GPLAYER",
      submittedAnswer: "Paris",
      rejectedReason: "Mismatch with expected answer",
    })

    expect(dispute.status).toBe("pending")
    expect(dispute.auditTrail.some((entry) => entry.type === "created")).toBe(true)
    expect(getAnswerDisputesForAnswer("answer-42")).toHaveLength(1)
  })

  it("allows a creator to override a rejected answer and records the override in the audit log", () => {
    const dispute = createAnswerDispute({
      answerId: "answer-99",
      huntId: 9,
      clueId: 4,
      playerWallet: "GPLAYER",
      submittedAnswer: "london",
      rejectedReason: "case mismatch",
    })

    const resolved = resolveAnswerDispute(dispute.id, {
      reviewer: "creator@example.com",
      decision: "override",
      note: "Accepted after review because the answer was valid",
    })

    expect(resolved?.status).toBe("overridden")
    expect(resolved?.overrideDecision).toBe("accepted")
    expect(resolved?.reviewedBy).toBe("creator@example.com")
    expect(getAnswerDisputeAuditLog(dispute.id).some((entry) => entry.type === "override")).toBe(true)
  })
})
